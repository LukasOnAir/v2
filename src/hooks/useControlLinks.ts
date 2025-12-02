import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase/client'
import { useEffectiveTenant } from '@/hooks/useEffectiveTenant'
import type { ControlLink } from '@/types/rct'
import type { Database } from '@/lib/supabase/types'
import { toast } from 'sonner'

type LinkRow = Database['public']['Tables']['control_links']['Row']

/**
 * Transform database row to ControlLink type
 * Handles snake_case to camelCase mapping
 */
function toControlLink(row: LinkRow): ControlLink {
  return {
    id: row.id,
    controlId: row.control_id,
    rowId: row.rct_row_id,
    netProbability: row.net_probability ?? undefined,
    netImpact: row.net_impact ?? undefined,
    netScore: row.net_score ?? undefined,
    createdAt: row.created_at,
  }
}

/**
 * Fetch all control links for the current tenant
 */
export function useControlLinks() {
  const { effectiveTenantId, isImpersonating } = useEffectiveTenant()

  return useQuery({
    queryKey: ['controlLinks', effectiveTenantId],
    queryFn: async () => {
      let query = supabase.from('control_links').select('*')

      // When impersonating, add explicit tenant filter
      if (isImpersonating && effectiveTenantId) {
        query = query.eq('tenant_id', effectiveTenantId)
      }

      const { data, error } = await query

      if (error) throw error
      return data.map(toControlLink)
    },
  })
}

/**
 * Fetch control links for a specific RCT row
 */
export function useLinksForRow(rowId: string) {
  const { effectiveTenantId, isImpersonating } = useEffectiveTenant()

  return useQuery({
    queryKey: ['controlLinks', 'byRow', rowId, effectiveTenantId],
    queryFn: async () => {
      let query = supabase.from('control_links').select('*').eq('rct_row_id', rowId)

      // When impersonating, add explicit tenant filter
      if (isImpersonating && effectiveTenantId) {
        query = query.eq('tenant_id', effectiveTenantId)
      }

      const { data, error } = await query

      if (error) throw error
      return data.map(toControlLink)
    },
  })
}

/**
 * Fetch control links for a specific control
 */
export function useLinksForControl(controlId: string) {
  const { effectiveTenantId, isImpersonating } = useEffectiveTenant()

  return useQuery({
    queryKey: ['controlLinks', 'byControl', controlId, effectiveTenantId],
    queryFn: async () => {
      let query = supabase.from('control_links').select('*').eq('control_id', controlId)

      // When impersonating, add explicit tenant filter
      if (isImpersonating && effectiveTenantId) {
        query = query.eq('tenant_id', effectiveTenantId)
      }

      const { data, error } = await query

      if (error) throw error
      return data.map(toControlLink)
    },
  })
}

/**
 * Link a control to an RCT row
 */
export function useLinkControl() {
  const queryClient = useQueryClient()
  const { isReadOnly } = useEffectiveTenant()

  return useMutation({
    mutationFn: async ({ controlId, rowId }: { controlId: string; rowId: string }) => {
      if (isReadOnly) {
        toast.error('Cannot modify data while viewing as another user')
        throw new Error('Read-only mode: modifications disabled')
      }

      const { data, error } = await supabase
        .from('control_links')
        .insert({ control_id: controlId, rct_row_id: rowId })
        .select()
        .single()

      if (error) throw error
      return toControlLink(data)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['controlLinks'] })
    },
  })
}

/**
 * Unlink a control from an RCT row
 */
export function useUnlinkControl() {
  const queryClient = useQueryClient()
  const { isReadOnly } = useEffectiveTenant()

  return useMutation({
    mutationFn: async (linkId: string) => {
      if (isReadOnly) {
        toast.error('Cannot modify data while viewing as another user')
        throw new Error('Read-only mode: modifications disabled')
      }

      const { error } = await supabase
        .from('control_links')
        .delete()
        .eq('id', linkId)

      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['controlLinks'] })
    },
  })
}

/**
 * Update link-specific scoring overrides
 */
export function useUpdateLink() {
  const queryClient = useQueryClient()
  const { isReadOnly } = useEffectiveTenant()

  return useMutation({
    mutationFn: async ({ id, netProbability, netImpact }: {
      id: string
      netProbability?: number | null
      netImpact?: number | null
    }) => {
      if (isReadOnly) {
        toast.error('Cannot modify data while viewing as another user')
        throw new Error('Read-only mode: modifications disabled')
      }

      const { data, error } = await supabase
        .from('control_links')
        .update({
          net_probability: netProbability,
          net_impact: netImpact,
        })
        .eq('id', id)
        .select()
        .single()

      if (error) throw error
      return toControlLink(data)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['controlLinks'] })
    },
  })
}
