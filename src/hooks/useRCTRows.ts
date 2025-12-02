import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase/client'
import type { Database, Json } from '@/lib/supabase/types'
import { toast } from 'sonner'
import { useEffectiveTenant } from '@/hooks/useEffectiveTenant'

type RCTRowDB = Database['public']['Tables']['rct_rows']['Row']

/**
 * RCT row data from database
 *
 * Note: Full RCTRow type has denormalized taxonomy columns (riskL1Name, etc.)
 * that we don't store in DB. Those are joined/computed in the component layer
 * or via a database view. This type represents the core stored data.
 */
export interface RCTRowData {
  id: string
  rowId: string
  riskId: string
  processId: string
  grossProbability: number | null
  grossImpact: number | null
  grossScore: number | null
  grossProbabilityComment: string | null
  grossImpactComment: string | null
  riskAppetite: number
  withinAppetite: number | null
  customValues: Record<string, unknown>
  createdAt: string
  updatedAt: string
}

/**
 * Transform database row to RCTRowData type
 * Handles snake_case to camelCase mapping
 */
function toRCTRow(row: RCTRowDB): RCTRowData {
  return {
    id: row.id,
    rowId: row.row_id,
    riskId: row.risk_id,
    processId: row.process_id,
    grossProbability: row.gross_probability,
    grossImpact: row.gross_impact,
    grossScore: row.gross_score,
    grossProbabilityComment: row.gross_probability_comment,
    grossImpactComment: row.gross_impact_comment,
    riskAppetite: row.risk_appetite ?? 9,
    withinAppetite: row.within_appetite,
    customValues: (row.custom_values as Record<string, unknown>) || {},
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

/**
 * Fetch all RCT rows for the current tenant
 */
export function useRCTRows() {
  const { effectiveTenantId, isImpersonating } = useEffectiveTenant()

  return useQuery({
    queryKey: ['rctRows', effectiveTenantId],
    queryFn: async () => {
      let query = supabase.from('rct_rows').select('*')

      // When impersonating, super-admin RLS allows all reads
      // Add explicit filter to get only the impersonated tenant's data
      if (isImpersonating && effectiveTenantId) {
        query = query.eq('tenant_id', effectiveTenantId)
      }

      const { data, error } = await query.order('row_id')

      if (error) throw error
      return data.map(toRCTRow)
    },
  })
}

/**
 * Fetch a single RCT row by ID
 */
export function useRCTRowById(id: string | undefined) {
  const { effectiveTenantId, isImpersonating } = useEffectiveTenant()

  return useQuery({
    queryKey: ['rctRows', 'byId', id, effectiveTenantId],
    queryFn: async () => {
      if (!id) return null
      let query = supabase.from('rct_rows').select('*').eq('id', id)

      // When impersonating, add explicit tenant filter
      if (isImpersonating && effectiveTenantId) {
        query = query.eq('tenant_id', effectiveTenantId)
      }

      const { data, error } = await query.single()

      if (error) throw error
      return toRCTRow(data)
    },
    enabled: !!id,
  })
}

/**
 * Update an RCT row with optimistic updates
 */
export function useUpdateRCTRow() {
  const queryClient = useQueryClient()
  const { effectiveTenantId, isReadOnly } = useEffectiveTenant()

  return useMutation({
    mutationFn: async ({ id, ...updates }: {
      id: string
      grossProbability?: number | null
      grossImpact?: number | null
      grossProbabilityComment?: string | null
      grossImpactComment?: string | null
      riskAppetite?: number
      customValues?: Record<string, unknown>
    }) => {
      if (isReadOnly) {
        toast.error('Cannot modify data while viewing as another user')
        throw new Error('Read-only mode: modifications disabled')
      }

      const dbUpdates: Record<string, unknown> = {
        updated_at: new Date().toISOString(),
      }

      if (updates.grossProbability !== undefined) dbUpdates.gross_probability = updates.grossProbability
      if (updates.grossImpact !== undefined) dbUpdates.gross_impact = updates.grossImpact
      if (updates.grossProbabilityComment !== undefined) dbUpdates.gross_probability_comment = updates.grossProbabilityComment
      if (updates.grossImpactComment !== undefined) dbUpdates.gross_impact_comment = updates.grossImpactComment
      if (updates.riskAppetite !== undefined) dbUpdates.risk_appetite = updates.riskAppetite
      if (updates.customValues !== undefined) dbUpdates.custom_values = updates.customValues as Json

      const { data, error } = await supabase
        .from('rct_rows')
        .update(dbUpdates)
        .eq('id', id)
        .select()
        .single()

      if (error) throw error
      return toRCTRow(data)
    },
    onMutate: async ({ id, ...updates }) => {
      await queryClient.cancelQueries({ queryKey: ['rctRows'] })
      const previousRows = queryClient.getQueryData<RCTRowData[]>(['rctRows', effectiveTenantId])

      queryClient.setQueryData<RCTRowData[]>(['rctRows', effectiveTenantId], (old) =>
        old?.map((r) => (r.id === id ? { ...r, ...updates } : r))
      )

      return { previousRows }
    },
    onError: (_err, _variables, context) => {
      if (context?.previousRows) {
        queryClient.setQueryData(['rctRows', effectiveTenantId], context.previousRows)
      }
      toast.error('Failed to update row')
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['rctRows'] })
    },
  })
}

/**
 * Create a new RCT row
 */
export function useCreateRCTRow() {
  const queryClient = useQueryClient()
  const { isReadOnly } = useEffectiveTenant()

  return useMutation({
    mutationFn: async (row: {
      rowId: string
      riskId: string
      processId: string
      grossProbability?: number | null
      grossImpact?: number | null
      riskAppetite?: number
    }) => {
      if (isReadOnly) {
        toast.error('Cannot modify data while viewing as another user')
        throw new Error('Read-only mode: modifications disabled')
      }

      const { data, error } = await supabase
        .from('rct_rows')
        .insert({
          row_id: row.rowId,
          risk_id: row.riskId,
          process_id: row.processId,
          gross_probability: row.grossProbability ?? null,
          gross_impact: row.grossImpact ?? null,
          risk_appetite: row.riskAppetite ?? 9,
        })
        .select()
        .single()

      if (error) throw error
      return toRCTRow(data)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rctRows'] })
    },
  })
}

/**
 * Delete an RCT row
 */
export function useDeleteRCTRow() {
  const queryClient = useQueryClient()
  const { isReadOnly } = useEffectiveTenant()

  return useMutation({
    mutationFn: async (id: string) => {
      if (isReadOnly) {
        toast.error('Cannot modify data while viewing as another user')
        throw new Error('Read-only mode: modifications disabled')
      }

      const { error } = await supabase
        .from('rct_rows')
        .delete()
        .eq('id', id)

      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rctRows'] })
      // Cascade invalidate control links (orphaned links removed via FK cascade)
      queryClient.invalidateQueries({ queryKey: ['controlLinks'] })
    },
  })
}

/**
 * Bulk create RCT rows (for seeding from taxonomy pairings)
 */
export function useBulkCreateRCTRows() {
  const queryClient = useQueryClient()
  const { isReadOnly } = useEffectiveTenant()

  return useMutation({
    mutationFn: async (rows: Array<{
      rowId: string
      riskId: string
      processId: string
      riskAppetite?: number
    }>) => {
      if (isReadOnly) {
        toast.error('Cannot modify data while viewing as another user')
        throw new Error('Read-only mode: modifications disabled')
      }

      const inserts = rows.map((row) => ({
        row_id: row.rowId,
        risk_id: row.riskId,
        process_id: row.processId,
        risk_appetite: row.riskAppetite ?? 9,
      }))

      const { data, error } = await supabase
        .from('rct_rows')
        .insert(inserts)
        .select()

      if (error) throw error
      return data.map(toRCTRow)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rctRows'] })
    },
  })
}

/**
 * Bulk upsert RCT rows (for regenerating RCT when taxonomy changes)
 *
 * This hook preserves existing row data when taxonomy changes:
 * - Queries existing rows to find which combinations already exist
 * - Only inserts new risk:process combinations
 * - Does NOT delete orphaned rows (preserves existing data)
 */
export function useBulkUpsertRCTRows() {
  const queryClient = useQueryClient()
  const { isReadOnly } = useEffectiveTenant()

  return useMutation({
    mutationFn: async (rows: Array<{
      riskId: string
      processId: string
      riskAppetite?: number
    }>) => {
      if (isReadOnly) {
        toast.error('Cannot modify data while viewing as another user')
        throw new Error('Read-only mode: modifications disabled')
      }

      // 1. Fetch existing rows to find which combinations already exist
      const { data: existingRows, error: fetchError } = await supabase
        .from('rct_rows')
        .select('risk_id, process_id')

      if (fetchError) throw fetchError

      // 2. Build set of existing combinations
      const existingKeys = new Set(
        existingRows.map(r => `${r.risk_id}:${r.process_id}`)
      )

      // 3. Filter to only new combinations
      const newRows = rows.filter(r =>
        !existingKeys.has(`${r.riskId}:${r.processId}`)
      )

      // 4. If no new rows, return empty array
      if (newRows.length === 0) {
        return []
      }

      // 5. Insert only new rows
      const inserts = newRows.map(row => ({
        row_id: `${row.riskId}:${row.processId}`,
        risk_id: row.riskId,
        process_id: row.processId,
        risk_appetite: row.riskAppetite ?? 9,
      }))

      const { data, error } = await supabase
        .from('rct_rows')
        .insert(inserts)
        .select()

      if (error) throw error
      return data.map(toRCTRow)
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['rctRows'] })
      if (data.length > 0) {
        toast.success(`Added ${data.length} new row${data.length > 1 ? 's' : ''}`)
      } else {
        toast.info('RCT is up to date')
      }
    },
  })
}
