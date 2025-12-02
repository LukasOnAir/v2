import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase/client'
import { useEffectiveTenant } from '@/hooks/useEffectiveTenant'
import type { Comment, CommentableEntityType } from '@/types/collaboration'
import type { CommentRow } from '@/lib/supabase/types'
import { toast } from 'sonner'

function toComment(row: CommentRow): Comment {
  return {
    id: row.id,
    entityType: row.entity_type,
    entityId: row.entity_id,
    parentId: row.parent_id ?? undefined,
    content: row.content,
    author: row.author_role as Comment['author'],
    authorId: row.author_id ?? undefined,
    authorRole: row.author_role,
    isEdited: row.is_edited ?? false,
    createdAt: row.created_at,
    updatedAt: row.updated_at ?? undefined,
  }
}

export function useComments(entityType: CommentableEntityType, entityId: string) {
  const { effectiveTenantId, isImpersonating } = useEffectiveTenant()

  return useQuery({
    queryKey: ['comments', entityType, entityId, effectiveTenantId],
    queryFn: async () => {
      let query = supabase
        .from('comments')
        .select('*')
        .eq('entity_type', entityType)
        .eq('entity_id', entityId)

      // When impersonating, add explicit tenant filter
      if (isImpersonating && effectiveTenantId) {
        query = query.eq('tenant_id', effectiveTenantId)
      }

      const { data, error } = await query.order('created_at')

      if (error) throw error
      return data.map(toComment)
    },
    enabled: !!entityId,
  })
}

export function useAddComment() {
  const queryClient = useQueryClient()
  const { isReadOnly } = useEffectiveTenant()

  return useMutation({
    mutationFn: async (comment: Omit<Comment, 'id' | 'createdAt' | 'isEdited'>) => {
      if (isReadOnly) {
        toast.error('Cannot modify data while viewing as another user')
        throw new Error('Read-only mode: modifications disabled')
      }

      const { data, error } = await supabase
        .from('comments')
        .insert({
          entity_type: comment.entityType,
          entity_id: comment.entityId,
          parent_id: comment.parentId || null,
          content: comment.content,
          author_id: comment.authorId || null,
          author_role: comment.authorRole || comment.author,
        })
        .select()
        .single()

      if (error) throw error
      return toComment(data)
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['comments', data.entityType, data.entityId] })
    },
  })
}

export function useUpdateComment() {
  const queryClient = useQueryClient()
  const { isReadOnly } = useEffectiveTenant()

  return useMutation({
    mutationFn: async ({ id, content, entityType, entityId }: {
      id: string
      content: string
      entityType: CommentableEntityType
      entityId: string
    }) => {
      if (isReadOnly) {
        toast.error('Cannot modify data while viewing as another user')
        throw new Error('Read-only mode: modifications disabled')
      }

      const { data, error } = await supabase
        .from('comments')
        .update({
          content,
          is_edited: true,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select()
        .single()

      if (error) throw error
      return { comment: toComment(data), entityType, entityId }
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['comments', data.entityType, data.entityId] })
    },
  })
}

export function useDeleteComment() {
  const queryClient = useQueryClient()
  const { isReadOnly } = useEffectiveTenant()

  return useMutation({
    mutationFn: async ({ id, entityType, entityId }: {
      id: string
      entityType: CommentableEntityType
      entityId: string
    }) => {
      if (isReadOnly) {
        toast.error('Cannot modify data while viewing as another user')
        throw new Error('Read-only mode: modifications disabled')
      }

      // CASCADE delete handles replies
      const { error } = await supabase
        .from('comments')
        .delete()
        .eq('id', id)

      if (error) throw error
      return { entityType, entityId }
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['comments', data.entityType, data.entityId] })
    },
  })
}
