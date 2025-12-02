import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase/client'
import { useAuth } from '@/contexts/AuthContext'
import { useEffectiveTenant } from '@/hooks/useEffectiveTenant'
import type { Control, TestStep } from '@/types/rct'
import type { Database } from '@/lib/supabase/types'
import { toast } from 'sonner'

type ControlRow = Database['public']['Tables']['controls']['Row']

/**
 * Transform database row to Control type
 * Handles snake_case to camelCase mapping
 */
function toControl(row: ControlRow): Control {
  return {
    id: row.id,
    name: row.name,
    description: row.description || undefined,
    controlType: row.control_type,
    netProbability: row.net_probability,
    netImpact: row.net_impact,
    netScore: row.net_score,
    comment: row.comment || undefined,
    testFrequency: row.test_frequency,
    nextTestDate: row.next_test_date,
    lastTestDate: row.last_test_date,
    testProcedure: row.test_procedure || undefined,
    testSteps: (row.test_steps as TestStep[] | null) ?? undefined,
    assignedTesterId: row.assigned_tester_id,
  }
}

/**
 * Fetch all controls for the current tenant
 */
export function useControls() {
  const { effectiveTenantId, isImpersonating } = useEffectiveTenant()

  return useQuery({
    queryKey: ['controls', effectiveTenantId],
    queryFn: async () => {
      let query = supabase.from('controls').select('*')

      // When impersonating, add explicit tenant filter
      if (isImpersonating && effectiveTenantId) {
        query = query.eq('tenant_id', effectiveTenantId)
      }

      const { data, error } = await query.order('name')

      if (error) throw error

      // Debug: log all controls and their assigned_tester_id values
      console.log('[useControls] All controls assigned_tester_ids:', data?.map(c => ({
        name: c.name,
        assigned_tester_id: c.assigned_tester_id
      })))

      return data.map(toControl)
    },
  })
}

/**
 * Fetch controls assigned to a specific tester
 *
 * @param testerId - Optional tester ID to query for. If provided, queries for that tester.
 *                   If not provided, queries for the authenticated user's ID (or impersonated profile ID).
 *
 * Usage:
 * - For actual control testers viewing their own dashboard: call without parameter
 * - For directors/managers viewing a tester's dashboard: pass the selected tester ID
 * - For super-admin impersonating a tester: uses effectiveProfileId automatically
 */
export function useMyAssignedControls(testerId?: string) {
  const { user } = useAuth()
  const { effectiveTenantId, effectiveProfileId, isImpersonating } = useEffectiveTenant()

  // Use provided testerId if given, otherwise:
  // - When impersonating with a profile selected, use the impersonated profile's ID
  // - Otherwise fall back to the authenticated user's ID
  const effectiveTesterId = testerId ?? (isImpersonating && effectiveProfileId ? effectiveProfileId : user?.id)

  return useQuery({
    queryKey: ['controls', 'assigned', effectiveTesterId, effectiveTenantId],
    queryFn: async () => {
      if (!effectiveTesterId) {
        console.log('[useMyAssignedControls] No testerId available, returning empty')
        return []
      }

      console.log('[useMyAssignedControls] Querying for testerId:', effectiveTesterId)

      let query = supabase
        .from('controls')
        .select('*')
        .eq('assigned_tester_id', effectiveTesterId)

      // When impersonating, add explicit tenant filter
      if (isImpersonating && effectiveTenantId) {
        query = query.eq('tenant_id', effectiveTenantId)
      }

      const { data, error } = await query.order('name')

      if (error) {
        console.error('[useMyAssignedControls] Query error:', error)
        throw error
      }

      console.log('[useMyAssignedControls] Query returned:', data?.length, 'controls')

      return data.map(toControl)
    },
    enabled: !!effectiveTesterId,
  })
}

/**
 * Fetch a single control by ID
 */
export function useControlById(id: string | undefined) {
  const { effectiveTenantId, isImpersonating } = useEffectiveTenant()

  return useQuery({
    queryKey: ['controls', 'byId', id, effectiveTenantId],
    queryFn: async () => {
      if (!id) return null
      let query = supabase.from('controls').select('*').eq('id', id)

      // When impersonating, add explicit tenant filter
      if (isImpersonating && effectiveTenantId) {
        query = query.eq('tenant_id', effectiveTenantId)
      }

      const { data, error } = await query.single()

      if (error) throw error
      return toControl(data)
    },
    enabled: !!id,
  })
}

/**
 * Add a new control
 */
export function useAddControl() {
  const queryClient = useQueryClient()
  const { isReadOnly } = useEffectiveTenant()

  return useMutation({
    mutationFn: async (control: Omit<Control, 'id' | 'netScore'>) => {
      if (isReadOnly) {
        toast.error('Cannot modify data while viewing as another user')
        throw new Error('Read-only mode: modifications disabled')
      }

      const { data, error } = await supabase
        .from('controls')
        .insert({
          name: control.name,
          description: control.description || null,
          control_type: control.controlType,
          net_probability: control.netProbability,
          net_impact: control.netImpact,
          test_frequency: control.testFrequency,
          next_test_date: control.nextTestDate,
          last_test_date: control.lastTestDate,
          test_procedure: control.testProcedure || null,
          test_steps: control.testSteps || null,
          assigned_tester_id: control.assignedTesterId,
          comment: control.comment || null,
        })
        .select()
        .single()

      if (error) throw error
      return toControl(data)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['controls'] })
    },
  })
}

/**
 * Update an existing control with optimistic updates
 */
export function useUpdateControl() {
  const queryClient = useQueryClient()
  const { effectiveTenantId, isReadOnly } = useEffectiveTenant()

  return useMutation({
    mutationFn: async ({ id, ...updates }: { id: string } & Partial<Control>) => {
      if (isReadOnly) {
        toast.error('Cannot modify data while viewing as another user')
        throw new Error('Read-only mode: modifications disabled')
      }

      const dbUpdates: Record<string, unknown> = {
        updated_at: new Date().toISOString(),
      }

      // Map Control fields to database columns
      if (updates.name !== undefined) dbUpdates.name = updates.name
      if (updates.description !== undefined) dbUpdates.description = updates.description || null
      if (updates.controlType !== undefined) dbUpdates.control_type = updates.controlType
      if (updates.netProbability !== undefined) dbUpdates.net_probability = updates.netProbability
      if (updates.netImpact !== undefined) dbUpdates.net_impact = updates.netImpact
      if (updates.testFrequency !== undefined) dbUpdates.test_frequency = updates.testFrequency
      if (updates.nextTestDate !== undefined) dbUpdates.next_test_date = updates.nextTestDate
      if (updates.lastTestDate !== undefined) dbUpdates.last_test_date = updates.lastTestDate
      if (updates.testProcedure !== undefined) dbUpdates.test_procedure = updates.testProcedure || null
      if (updates.testSteps !== undefined) dbUpdates.test_steps = updates.testSteps || null
      if (updates.assignedTesterId !== undefined) dbUpdates.assigned_tester_id = updates.assignedTesterId
      if (updates.comment !== undefined) dbUpdates.comment = updates.comment || null

      const { data, error } = await supabase
        .from('controls')
        .update(dbUpdates)
        .eq('id', id)
        .select()
        .single()

      if (error) throw error
      return toControl(data)
    },
    // Optimistic update
    onMutate: async ({ id, ...updates }) => {
      await queryClient.cancelQueries({ queryKey: ['controls'] })
      const previousControls = queryClient.getQueryData<Control[]>(['controls', effectiveTenantId])

      queryClient.setQueryData<Control[]>(['controls', effectiveTenantId], (old) =>
        old?.map((c) => (c.id === id ? { ...c, ...updates } : c))
      )

      return { previousControls }
    },
    onError: (_err, _variables, context) => {
      if (context?.previousControls) {
        queryClient.setQueryData(['controls', effectiveTenantId], context.previousControls)
      }
      toast.error('Failed to update control')
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['controls'] })
    },
  })
}

/**
 * Delete a control with optimistic updates
 */
export function useDeleteControl() {
  const queryClient = useQueryClient()
  const { effectiveTenantId, isReadOnly } = useEffectiveTenant()

  return useMutation({
    mutationFn: async (id: string) => {
      if (isReadOnly) {
        toast.error('Cannot modify data while viewing as another user')
        throw new Error('Read-only mode: modifications disabled')
      }

      const { error } = await supabase
        .from('controls')
        .delete()
        .eq('id', id)

      if (error) throw error
    },
    // Optimistic delete
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: ['controls'] })
      const previousControls = queryClient.getQueryData<Control[]>(['controls', effectiveTenantId])

      queryClient.setQueryData<Control[]>(['controls', effectiveTenantId], (old) =>
        old?.filter((c) => c.id !== id)
      )

      return { previousControls }
    },
    onError: (_err, _variables, context) => {
      if (context?.previousControls) {
        queryClient.setQueryData(['controls', effectiveTenantId], context.previousControls)
      }
      toast.error('Failed to delete control')
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['controls'] })
      // Cascade invalidate control links when deleting control
      queryClient.invalidateQueries({ queryKey: ['controlLinks'] })
    },
  })
}
