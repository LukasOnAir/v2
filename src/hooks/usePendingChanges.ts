import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase/client'
import { useEffectiveTenant } from '@/hooks/useEffectiveTenant'
import type { PendingChange, PendingChangeEntityType, ApprovalStatus } from '@/types/approval'
import type { PendingChangeRow } from '@/lib/supabase/types'
import { toast } from 'sonner'

function toPendingChange(row: PendingChangeRow): PendingChange {
  return {
    id: row.id,
    entityType: row.entity_type,
    entityId: row.entity_id,
    entityName: row.entity_name,
    changeType: row.change_type,
    currentValues: (row.current_values as Record<string, unknown>) || {},
    proposedValues: row.proposed_values as Record<string, unknown>,
    status: row.status,
    submittedBy: row.submitted_by,
    submittedAt: row.submitted_at,
    reviewedBy: row.reviewed_by ?? undefined,
    reviewedAt: row.reviewed_at ?? undefined,
    rejectionReason: row.rejection_reason ?? undefined,
    version: row.version ?? 1,
  }
}

export function usePendingChanges() {
  const { effectiveTenantId, isImpersonating } = useEffectiveTenant()

  return useQuery({
    queryKey: ['pendingChanges', effectiveTenantId],
    queryFn: async () => {
      let query = supabase.from('pending_changes').select('*')

      // When impersonating, add explicit tenant filter
      if (isImpersonating && effectiveTenantId) {
        query = query.eq('tenant_id', effectiveTenantId)
      }

      const { data, error } = await query.order('submitted_at', { ascending: false })

      if (error) throw error
      return data.map(toPendingChange)
    },
  })
}

export function usePendingChangesByStatus(status: ApprovalStatus) {
  const { effectiveTenantId, isImpersonating } = useEffectiveTenant()

  return useQuery({
    queryKey: ['pendingChanges', 'status', status, effectiveTenantId],
    queryFn: async () => {
      let query = supabase.from('pending_changes').select('*').eq('status', status)

      // When impersonating, add explicit tenant filter
      if (isImpersonating && effectiveTenantId) {
        query = query.eq('tenant_id', effectiveTenantId)
      }

      const { data, error } = await query.order('submitted_at', { ascending: false })

      if (error) throw error
      return data.map(toPendingChange)
    },
  })
}

export function usePendingCount() {
  const { effectiveTenantId, isImpersonating } = useEffectiveTenant()

  return useQuery({
    queryKey: ['pendingChanges', 'count', effectiveTenantId],
    queryFn: async () => {
      let query = supabase
        .from('pending_changes')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'pending')

      // When impersonating, add explicit tenant filter
      if (isImpersonating && effectiveTenantId) {
        query = query.eq('tenant_id', effectiveTenantId)
      }

      const { count, error } = await query

      if (error) throw error
      return count || 0
    },
  })
}

export function useCreatePendingChange() {
  const queryClient = useQueryClient()
  const { isReadOnly } = useEffectiveTenant()

  return useMutation({
    mutationFn: async (change: Omit<PendingChange, 'id' | 'status' | 'submittedAt' | 'version'>) => {
      if (isReadOnly) {
        toast.error('Cannot modify data while viewing as another user')
        throw new Error('Read-only mode: modifications disabled')
      }

      const { data, error } = await supabase
        .from('pending_changes')
        .insert({
          entity_type: change.entityType,
          entity_id: change.entityId,
          entity_name: change.entityName,
          change_type: change.changeType,
          current_values: change.currentValues,
          proposed_values: change.proposedValues,
          submitted_by: change.submittedBy,
        })
        .select()
        .single()

      if (error) throw error
      return toPendingChange(data)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pendingChanges'] })
    },
  })
}

export function useApproveChange() {
  const queryClient = useQueryClient()
  const { isReadOnly } = useEffectiveTenant()

  return useMutation({
    mutationFn: async ({ id, reviewedBy }: { id: string; reviewedBy: string }) => {
      if (isReadOnly) {
        toast.error('Cannot modify data while viewing as another user')
        throw new Error('Read-only mode: modifications disabled')
      }

      const { data, error } = await supabase
        .from('pending_changes')
        .update({
          status: 'approved',
          reviewed_by: reviewedBy,
          reviewed_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select()
        .single()

      if (error) throw error
      return toPendingChange(data)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pendingChanges'] })
    },
  })
}

export function useRejectChange() {
  const queryClient = useQueryClient()
  const { isReadOnly } = useEffectiveTenant()

  return useMutation({
    mutationFn: async ({ id, reviewedBy, reason }: { id: string; reviewedBy: string; reason?: string }) => {
      if (isReadOnly) {
        toast.error('Cannot modify data while viewing as another user')
        throw new Error('Read-only mode: modifications disabled')
      }

      const { data, error } = await supabase
        .from('pending_changes')
        .update({
          status: 'rejected',
          reviewed_by: reviewedBy,
          reviewed_at: new Date().toISOString(),
          rejection_reason: reason || null,
        })
        .eq('id', id)
        .select()
        .single()

      if (error) throw error
      return toPendingChange(data)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pendingChanges'] })
    },
  })
}

export function useDeletePendingChange() {
  const queryClient = useQueryClient()
  const { isReadOnly } = useEffectiveTenant()

  return useMutation({
    mutationFn: async (id: string) => {
      if (isReadOnly) {
        toast.error('Cannot modify data while viewing as another user')
        throw new Error('Read-only mode: modifications disabled')
      }

      const { error } = await supabase
        .from('pending_changes')
        .delete()
        .eq('id', id)

      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pendingChanges'] })
    },
  })
}
