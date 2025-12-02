import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase/client'
import type { TaxonomyItem } from '@/types/taxonomy'
import type { TaxonomyNode, TaxonomyType } from '@/lib/supabase/types'
import { useEffectiveTenant } from '@/hooks/useEffectiveTenant'
import { toast } from 'sonner'

/**
 * Build tree structure from flat list of taxonomy nodes.
 * Converts database rows into nested TaxonomyItem structure.
 */
function buildTree(nodes: TaxonomyNode[]): TaxonomyItem[] {
  const nodeMap = new Map<string, TaxonomyItem>()

  // First pass: create TaxonomyItem for each node
  for (const node of nodes) {
    nodeMap.set(node.id, {
      id: node.id,
      name: node.name,
      description: node.description || '',
      hierarchicalId: node.hierarchical_id,
      children: [],
    })
  }

  // Second pass: build parent-child relationships
  const roots: TaxonomyItem[] = []
  for (const node of nodes) {
    const item = nodeMap.get(node.id)!
    if (node.parent_id && nodeMap.has(node.parent_id)) {
      nodeMap.get(node.parent_id)!.children!.push(item)
    } else {
      roots.push(item)
    }
  }

  return roots
}

/**
 * Query taxonomy nodes by type (risk or process).
 * Returns nested TaxonomyItem[] structure built from flat DB rows.
 */
export function useTaxonomy(type: TaxonomyType) {
  const { effectiveTenantId, isImpersonating } = useEffectiveTenant()

  return useQuery({
    queryKey: ['taxonomy', type, effectiveTenantId],
    queryFn: async () => {
      let query = supabase.from('taxonomy_nodes').select('*').eq('type', type)

      // When impersonating, add explicit tenant filter
      if (isImpersonating && effectiveTenantId) {
        query = query.eq('tenant_id', effectiveTenantId)
      }

      const { data, error } = await query.order('sort_order')

      if (error) throw error
      return buildTree(data)
    },
  })
}

/**
 * Query raw taxonomy nodes (flat list) by type.
 * Useful when tree structure is not needed.
 */
export function useTaxonomyNodes(type: TaxonomyType) {
  const { effectiveTenantId, isImpersonating } = useEffectiveTenant()

  return useQuery({
    queryKey: ['taxonomy', type, 'flat', effectiveTenantId],
    queryFn: async () => {
      let query = supabase.from('taxonomy_nodes').select('*').eq('type', type)

      // When impersonating, add explicit tenant filter
      if (isImpersonating && effectiveTenantId) {
        query = query.eq('tenant_id', effectiveTenantId)
      }

      const { data, error } = await query.order('sort_order')

      if (error) throw error
      return data
    },
  })
}

/**
 * Add a new taxonomy node.
 * Invalidates taxonomy queries on success.
 */
export function useAddTaxonomyNode(type: TaxonomyType) {
  const queryClient = useQueryClient()
  const { isReadOnly } = useEffectiveTenant()

  return useMutation({
    mutationFn: async (node: {
      name: string
      description?: string
      parentId?: string | null
      sortOrder?: number
    }) => {
      if (isReadOnly) {
        toast.error('Cannot modify data while viewing as another user')
        throw new Error('Read-only mode: modifications disabled')
      }

      const { data, error } = await supabase
        .from('taxonomy_nodes')
        .insert({
          type,
          name: node.name,
          description: node.description || '',
          parent_id: node.parentId || null,
          sort_order: node.sortOrder ?? 0,
        })
        .select()
        .single()

      if (error) throw error
      return data
    },
    onSuccess: () => {
      // Invalidate both tree and flat queries
      queryClient.invalidateQueries({ queryKey: ['taxonomy', type] })
    },
  })
}

/**
 * Update an existing taxonomy node.
 * Invalidates taxonomy queries on success.
 */
export function useUpdateTaxonomyNode(type: TaxonomyType) {
  const queryClient = useQueryClient()
  const { isReadOnly } = useEffectiveTenant()

  return useMutation({
    mutationFn: async ({
      id,
      ...updates
    }: {
      id: string
      name?: string
      description?: string
      parentId?: string | null
      sortOrder?: number
    }) => {
      if (isReadOnly) {
        toast.error('Cannot modify data while viewing as another user')
        throw new Error('Read-only mode: modifications disabled')
      }

      const updateData: Record<string, unknown> = {
        updated_at: new Date().toISOString(),
      }

      if (updates.name !== undefined) updateData.name = updates.name
      if (updates.description !== undefined) updateData.description = updates.description
      if (updates.parentId !== undefined) updateData.parent_id = updates.parentId
      if (updates.sortOrder !== undefined) updateData.sort_order = updates.sortOrder

      const { data, error } = await supabase
        .from('taxonomy_nodes')
        .update(updateData)
        .eq('id', id)
        .select()
        .single()

      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['taxonomy', type] })
    },
  })
}

/**
 * Delete a taxonomy node.
 * Note: This will fail if the node has children (FK constraint).
 * Invalidates taxonomy queries on success.
 */
export function useDeleteTaxonomyNode(type: TaxonomyType) {
  const queryClient = useQueryClient()
  const { isReadOnly } = useEffectiveTenant()

  return useMutation({
    mutationFn: async (id: string) => {
      if (isReadOnly) {
        toast.error('Cannot modify data while viewing as another user')
        throw new Error('Read-only mode: modifications disabled')
      }

      const { error } = await supabase
        .from('taxonomy_nodes')
        .delete()
        .eq('id', id)

      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['taxonomy', type] })
    },
  })
}

/**
 * Batch update sort order for multiple nodes.
 * Useful for drag-and-drop reordering.
 */
export function useReorderTaxonomyNodes(type: TaxonomyType) {
  const queryClient = useQueryClient()
  const { isReadOnly } = useEffectiveTenant()

  return useMutation({
    mutationFn: async (updates: Array<{ id: string; sortOrder: number; parentId?: string | null }>) => {
      if (isReadOnly) {
        toast.error('Cannot modify data while viewing as another user')
        throw new Error('Read-only mode: modifications disabled')
      }

      // Execute updates in parallel
      const promises = updates.map(({ id, sortOrder, parentId }) => {
        const updateData: Record<string, unknown> = {
          sort_order: sortOrder,
          updated_at: new Date().toISOString(),
        }
        if (parentId !== undefined) {
          updateData.parent_id = parentId
        }

        return supabase
          .from('taxonomy_nodes')
          .update(updateData)
          .eq('id', id)
      })

      const results = await Promise.all(promises)
      const errors = results.filter(r => r.error)
      if (errors.length > 0) {
        throw errors[0].error
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['taxonomy', type] })
    },
  })
}
