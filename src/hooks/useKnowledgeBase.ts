import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase/client'
import { useEffectiveTenant } from '@/hooks/useEffectiveTenant'
import { toast } from 'sonner'
import type { KnowledgeBaseEntry, KnowledgeBaseCategory } from '@/types/collaboration'
import type { KnowledgeBaseRow } from '@/lib/supabase/types'

/**
 * Transform database row to app type.
 */
function toKnowledgeBaseEntry(row: KnowledgeBaseRow): KnowledgeBaseEntry {
  return {
    id: row.id,
    title: row.title,
    content: row.content,
    category: row.category as KnowledgeBaseCategory,
    tags: row.tags || [],
    author: row.author,
    relatedControlTypes: row.related_control_types || [],
    createdAt: row.created_at,
    updatedAt: row.updated_at || undefined,
  }
}

/**
 * Query all knowledge base entries for the tenant.
 */
export function useKnowledgeBase() {
  const { effectiveTenantId, isImpersonating } = useEffectiveTenant()

  return useQuery({
    queryKey: ['knowledgeBase', effectiveTenantId],
    queryFn: async () => {
      let query = supabase.from('knowledge_base').select('*')

      // When impersonating, add explicit tenant filter
      if (isImpersonating && effectiveTenantId) {
        query = query.eq('tenant_id', effectiveTenantId)
      }

      const { data, error } = await query.order('created_at', { ascending: false })

      if (error) throw error
      return data.map(toKnowledgeBaseEntry)
    },
  })
}

/**
 * Query knowledge base entries by category.
 */
export function useKnowledgeBaseByCategory(category: KnowledgeBaseCategory) {
  const { effectiveTenantId, isImpersonating } = useEffectiveTenant()

  return useQuery({
    queryKey: ['knowledgeBase', 'category', category, effectiveTenantId],
    queryFn: async () => {
      let query = supabase.from('knowledge_base').select('*').eq('category', category)

      // When impersonating, add explicit tenant filter
      if (isImpersonating && effectiveTenantId) {
        query = query.eq('tenant_id', effectiveTenantId)
      }

      const { data, error } = await query.order('created_at', { ascending: false })

      if (error) throw error
      return data.map(toKnowledgeBaseEntry)
    },
  })
}

/**
 * Create a new knowledge base entry.
 */
export function useCreateKnowledgeBaseEntry() {
  const queryClient = useQueryClient()
  const { isReadOnly } = useEffectiveTenant()

  return useMutation({
    mutationFn: async (entry: Omit<KnowledgeBaseEntry, 'id' | 'createdAt'>) => {
      if (isReadOnly) {
        toast.error('Cannot modify data while viewing as another user')
        throw new Error('Read-only mode: modifications disabled')
      }

      const { data, error } = await supabase
        .from('knowledge_base')
        .insert({
          title: entry.title,
          content: entry.content,
          category: entry.category,
          tags: entry.tags,
          author: entry.author,
          related_control_types: entry.relatedControlTypes || [],
        })
        .select()
        .single()

      if (error) throw error
      return toKnowledgeBaseEntry(data)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['knowledgeBase'] })
      toast.success('Article created')
    },
    onError: (error) => {
      toast.error(`Failed to create article: ${error.message}`)
    },
  })
}

/**
 * Update an existing knowledge base entry.
 */
export function useUpdateKnowledgeBaseEntry() {
  const queryClient = useQueryClient()
  const { isReadOnly } = useEffectiveTenant()

  return useMutation({
    mutationFn: async ({
      id,
      updates,
    }: {
      id: string
      updates: Partial<Omit<KnowledgeBaseEntry, 'id' | 'createdAt'>>
    }) => {
      if (isReadOnly) {
        toast.error('Cannot modify data while viewing as another user')
        throw new Error('Read-only mode: modifications disabled')
      }

      const dbUpdates: Record<string, unknown> = {
        updated_at: new Date().toISOString(),
      }
      if (updates.title !== undefined) dbUpdates.title = updates.title
      if (updates.content !== undefined) dbUpdates.content = updates.content
      if (updates.category !== undefined) dbUpdates.category = updates.category
      if (updates.tags !== undefined) dbUpdates.tags = updates.tags
      if (updates.author !== undefined) dbUpdates.author = updates.author
      if (updates.relatedControlTypes !== undefined) {
        dbUpdates.related_control_types = updates.relatedControlTypes
      }

      const { data, error } = await supabase
        .from('knowledge_base')
        .update(dbUpdates)
        .eq('id', id)
        .select()
        .single()

      if (error) throw error
      return toKnowledgeBaseEntry(data)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['knowledgeBase'] })
      toast.success('Article updated')
    },
    onError: (error) => {
      toast.error(`Failed to update article: ${error.message}`)
    },
  })
}

/**
 * Delete a knowledge base entry.
 */
export function useDeleteKnowledgeBaseEntry() {
  const queryClient = useQueryClient()
  const { isReadOnly } = useEffectiveTenant()

  return useMutation({
    mutationFn: async (id: string) => {
      if (isReadOnly) {
        toast.error('Cannot modify data while viewing as another user')
        throw new Error('Read-only mode: modifications disabled')
      }

      const { error } = await supabase
        .from('knowledge_base')
        .delete()
        .eq('id', id)

      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['knowledgeBase'] })
      toast.success('Article deleted')
    },
    onError: (error) => {
      toast.error(`Failed to delete article: ${error.message}`)
    },
  })
}
