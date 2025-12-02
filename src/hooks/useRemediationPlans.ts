import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase/client'
import { useEffectiveTenant } from '@/hooks/useEffectiveTenant'
import type { RemediationPlan, RemediationStatus, ActionItem } from '@/types/rct'
import type { RemediationPlanRow } from '@/lib/supabase/types'
import { format } from 'date-fns'
import { toast } from 'sonner'

function toRemediationPlan(row: RemediationPlanRow): RemediationPlan {
  return {
    id: row.id,
    controlTestId: row.control_test_id,
    controlId: row.control_id,
    rowId: row.rct_row_id || '',
    title: row.title,
    description: row.description ?? undefined,
    owner: row.owner,
    deadline: row.deadline,
    status: row.status,
    priority: row.priority,
    actionItems: (row.action_items as ActionItem[]) || [],
    createdDate: row.created_date,
    resolvedDate: row.resolved_date ?? undefined,
    closedDate: row.closed_date ?? undefined,
    notes: row.notes ?? undefined,
  }
}

export function useRemediationPlans() {
  const { effectiveTenantId, isImpersonating } = useEffectiveTenant()

  return useQuery({
    queryKey: ['remediationPlans', effectiveTenantId],
    queryFn: async () => {
      let query = supabase.from('remediation_plans').select('*')

      // When impersonating, add explicit tenant filter
      if (isImpersonating && effectiveTenantId) {
        query = query.eq('tenant_id', effectiveTenantId)
      }

      const { data, error } = await query.order('deadline')

      if (error) throw error
      return data.map(toRemediationPlan)
    },
  })
}

export function useRemediationForControl(controlId: string) {
  const { effectiveTenantId, isImpersonating } = useEffectiveTenant()

  return useQuery({
    queryKey: ['remediationPlans', 'byControl', controlId, effectiveTenantId],
    queryFn: async () => {
      let query = supabase.from('remediation_plans').select('*').eq('control_id', controlId)

      // When impersonating, add explicit tenant filter
      if (isImpersonating && effectiveTenantId) {
        query = query.eq('tenant_id', effectiveTenantId)
      }

      const { data, error } = await query.order('deadline')

      if (error) throw error
      return data.map(toRemediationPlan)
    },
    enabled: !!controlId,
  })
}

export function useCreateRemediationPlan() {
  const queryClient = useQueryClient()
  const { isReadOnly } = useEffectiveTenant()

  return useMutation({
    mutationFn: async (plan: Omit<RemediationPlan, 'id' | 'createdDate'>) => {
      if (isReadOnly) {
        toast.error('Cannot modify data while viewing as another user')
        throw new Error('Read-only mode: modifications disabled')
      }

      const { data, error } = await supabase
        .from('remediation_plans')
        .insert({
          control_test_id: plan.controlTestId,
          control_id: plan.controlId,
          rct_row_id: plan.rowId || null,
          title: plan.title,
          description: plan.description || null,
          owner: plan.owner,
          deadline: plan.deadline,
          status: plan.status,
          priority: plan.priority,
          action_items: plan.actionItems,
          notes: plan.notes || null,
          created_date: format(new Date(), 'yyyy-MM-dd'),
        })
        .select()
        .single()

      if (error) throw error
      return toRemediationPlan(data)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['remediationPlans'] })
    },
  })
}

export function useUpdateRemediationPlan() {
  const queryClient = useQueryClient()
  const { isReadOnly } = useEffectiveTenant()

  return useMutation({
    mutationFn: async ({ id, ...updates }: { id: string } & Partial<RemediationPlan>) => {
      if (isReadOnly) {
        toast.error('Cannot modify data while viewing as another user')
        throw new Error('Read-only mode: modifications disabled')
      }

      const dbUpdates: Record<string, unknown> = {
        updated_at: new Date().toISOString(),
      }

      if (updates.title !== undefined) dbUpdates.title = updates.title
      if (updates.description !== undefined) dbUpdates.description = updates.description
      if (updates.owner !== undefined) dbUpdates.owner = updates.owner
      if (updates.deadline !== undefined) dbUpdates.deadline = updates.deadline
      if (updates.priority !== undefined) dbUpdates.priority = updates.priority
      if (updates.actionItems !== undefined) dbUpdates.action_items = updates.actionItems
      if (updates.notes !== undefined) dbUpdates.notes = updates.notes

      const { data, error } = await supabase
        .from('remediation_plans')
        .update(dbUpdates)
        .eq('id', id)
        .select()
        .single()

      if (error) throw error
      return toRemediationPlan(data)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['remediationPlans'] })
    },
  })
}

export function useUpdateRemediationStatus() {
  const queryClient = useQueryClient()
  const { isReadOnly } = useEffectiveTenant()

  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: RemediationStatus }) => {
      if (isReadOnly) {
        toast.error('Cannot modify data while viewing as another user')
        throw new Error('Read-only mode: modifications disabled')
      }

      const updates: Record<string, unknown> = {
        status,
        updated_at: new Date().toISOString(),
      }

      const today = format(new Date(), 'yyyy-MM-dd')
      if (status === 'resolved') updates.resolved_date = today
      if (status === 'closed') updates.closed_date = today

      const { data, error } = await supabase
        .from('remediation_plans')
        .update(updates)
        .eq('id', id)
        .select()
        .single()

      if (error) throw error
      return toRemediationPlan(data)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['remediationPlans'] })
    },
  })
}

export function useDeleteRemediationPlan() {
  const queryClient = useQueryClient()
  const { isReadOnly } = useEffectiveTenant()

  return useMutation({
    mutationFn: async (id: string) => {
      if (isReadOnly) {
        toast.error('Cannot modify data while viewing as another user')
        throw new Error('Read-only mode: modifications disabled')
      }

      const { error } = await supabase
        .from('remediation_plans')
        .delete()
        .eq('id', id)

      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['remediationPlans'] })
    },
  })
}
