import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase/client'
import { useEffectiveTenant } from '@/hooks/useEffectiveTenant'
import type { CustomColumn } from '@/types/rct'
import type { Database } from '@/lib/supabase/types'
import { toast } from 'sonner'

type CustomColumnRow = Database['public']['Tables']['custom_columns']['Row']

/**
 * Transform database row to CustomColumn type
 * Handles snake_case to camelCase mapping
 */
function toCustomColumn(row: CustomColumnRow): CustomColumn {
  return {
    id: row.id,
    name: row.name,
    type: row.type as CustomColumn['type'],
    options: row.options ?? undefined,
    formula: row.formula ?? undefined,
    width: row.width ?? undefined,
  }
}

/**
 * Fetch all custom columns for the current tenant, ordered by sort_order
 */
export function useCustomColumns() {
  const { effectiveTenantId, isImpersonating } = useEffectiveTenant()

  return useQuery({
    queryKey: ['customColumns', effectiveTenantId],
    queryFn: async () => {
      let query = supabase.from('custom_columns').select('*')

      // When impersonating, add explicit tenant filter
      if (isImpersonating && effectiveTenantId) {
        query = query.eq('tenant_id', effectiveTenantId)
      }

      const { data, error } = await query.order('sort_order')

      if (error) throw error
      return data.map(toCustomColumn)
    },
  })
}

/**
 * Add a new custom column
 */
export function useAddCustomColumn() {
  const queryClient = useQueryClient()
  const { isReadOnly } = useEffectiveTenant()

  return useMutation({
    mutationFn: async (column: Omit<CustomColumn, 'id'> & { sortOrder?: number }) => {
      if (isReadOnly) {
        toast.error('Cannot modify data while viewing as another user')
        throw new Error('Read-only mode: modifications disabled')
      }

      const { data, error } = await supabase
        .from('custom_columns')
        .insert({
          name: column.name,
          type: column.type,
          options: column.options || null,
          formula: column.formula || null,
          width: column.width || null,
          sort_order: column.sortOrder ?? 0,
        })
        .select()
        .single()

      if (error) throw error
      return toCustomColumn(data)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customColumns'] })
    },
  })
}

/**
 * Update an existing custom column
 */
export function useUpdateCustomColumn() {
  const queryClient = useQueryClient()
  const { isReadOnly } = useEffectiveTenant()

  return useMutation({
    mutationFn: async ({ id, ...updates }: { id: string } & Partial<CustomColumn> & { sortOrder?: number }) => {
      if (isReadOnly) {
        toast.error('Cannot modify data while viewing as another user')
        throw new Error('Read-only mode: modifications disabled')
      }

      const dbUpdates: Record<string, unknown> = {}

      if (updates.name !== undefined) dbUpdates.name = updates.name
      if (updates.type !== undefined) dbUpdates.type = updates.type
      if (updates.options !== undefined) dbUpdates.options = updates.options
      if (updates.formula !== undefined) dbUpdates.formula = updates.formula
      if (updates.width !== undefined) dbUpdates.width = updates.width
      if (updates.sortOrder !== undefined) dbUpdates.sort_order = updates.sortOrder

      const { data, error } = await supabase
        .from('custom_columns')
        .update(dbUpdates)
        .eq('id', id)
        .select()
        .single()

      if (error) throw error
      return toCustomColumn(data)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customColumns'] })
    },
  })
}

/**
 * Delete a custom column
 */
export function useDeleteCustomColumn() {
  const queryClient = useQueryClient()
  const { isReadOnly } = useEffectiveTenant()

  return useMutation({
    mutationFn: async (id: string) => {
      if (isReadOnly) {
        toast.error('Cannot modify data while viewing as another user')
        throw new Error('Read-only mode: modifications disabled')
      }

      const { error } = await supabase
        .from('custom_columns')
        .delete()
        .eq('id', id)

      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customColumns'] })
      // Custom column values are stored in rct_rows.custom_values JSONB
      // Invalidate rct rows to refetch (column definition changed)
      queryClient.invalidateQueries({ queryKey: ['rctRows'] })
    },
  })
}

/**
 * Reorder custom columns by updating sort_order
 */
export function useReorderCustomColumns() {
  const queryClient = useQueryClient()
  const { isReadOnly } = useEffectiveTenant()

  return useMutation({
    mutationFn: async (orderedIds: string[]) => {
      if (isReadOnly) {
        toast.error('Cannot modify data while viewing as another user')
        throw new Error('Read-only mode: modifications disabled')
      }

      // Update sort_order for each column
      const updates = orderedIds.map((id, index) =>
        supabase
          .from('custom_columns')
          .update({ sort_order: index })
          .eq('id', id)
      )

      await Promise.all(updates)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customColumns'] })
    },
  })
}
