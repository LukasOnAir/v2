import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase/client'
import { useEffectiveTenant } from '@/hooks/useEffectiveTenant'
import type { AuditEntry, FieldChange, EntityType, ChangeType } from '@/types/audit'
import type { AuditLog } from '@/lib/supabase/types'
import type { AuditFilters } from '@/hooks/useAuditLog'

/**
 * Extract field changes from old_data and new_data JSONB columns.
 * Compares top-level fields and returns array of changes.
 */
function extractFieldChanges(
  oldData: unknown,
  newData: unknown
): FieldChange[] {
  const changes: FieldChange[] = []
  const oldObj = (oldData || {}) as Record<string, unknown>
  const newObj = (newData || {}) as Record<string, unknown>

  const allKeys = new Set([...Object.keys(oldObj), ...Object.keys(newObj)])
  for (const key of allKeys) {
    // Skip internal/metadata fields
    if (key === 'tenant_id' || key === 'created_at' || key === 'updated_at') {
      continue
    }

    if (JSON.stringify(oldObj[key]) !== JSON.stringify(newObj[key])) {
      changes.push({
        field: key,
        oldValue: oldObj[key] ?? null,
        newValue: newObj[key] ?? null,
      })
    }
  }
  return changes
}

/**
 * Transform database audit_log row to AuditEntry type.
 */
function toAuditEntry(row: AuditLog): AuditEntry {
  // Map database entity_type to app EntityType
  // Database stores: taxonomy_nodes, controls, rct_rows, control_tests, etc.
  // App expects: risk, process, control, rctRow, controlTest, etc.
  const entityTypeMap: Record<string, EntityType> = {
    taxonomy_nodes: 'risk', // Will need context to distinguish risk/process
    controls: 'control',
    control_links: 'controlLink',
    rct_rows: 'rctRow',
    control_tests: 'controlTest',
    remediation_plans: 'remediationPlan',
    custom_columns: 'customColumn',
    tickets: 'ticket',
    pending_changes: 'pendingChange',
  }

  const mappedType = entityTypeMap[row.entity_type] || (row.entity_type as EntityType)

  return {
    id: row.id,
    timestamp: row.created_at,
    entityType: mappedType,
    entityId: row.entity_id || '',
    entityName: row.entity_name || undefined,
    changeType: row.change_type as ChangeType,
    fieldChanges: extractFieldChanges(row.old_data, row.new_data),
    user: row.user_email || 'system',
  }
}

/**
 * Query audit_log table with optional filters.
 * Returns entries sorted by timestamp descending (newest first).
 */
export function useAuditLogDb(filters?: AuditFilters) {
  const { effectiveTenantId, isImpersonating } = useEffectiveTenant()

  return useQuery({
    queryKey: ['auditLog', filters, effectiveTenantId],
    queryFn: async () => {
      let query = supabase
        .from('audit_log')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(1000) // Reasonable limit for UI performance

      // When impersonating, add explicit tenant filter
      if (isImpersonating && effectiveTenantId) {
        query = query.eq('tenant_id', effectiveTenantId)
      }

      // Apply date range filter
      if (filters?.dateRange.start) {
        query = query.gte('created_at', filters.dateRange.start.toISOString())
      }
      if (filters?.dateRange.end) {
        query = query.lte('created_at', filters.dateRange.end.toISOString())
      }

      // Apply entity type filter (map app types back to DB types)
      if (filters?.entityTypes && filters.entityTypes.length > 0) {
        const dbEntityTypes = filters.entityTypes.map((type) => {
          const reverseMap: Record<string, string> = {
            risk: 'taxonomy_nodes',
            process: 'taxonomy_nodes',
            control: 'controls',
            controlLink: 'control_links',
            rctRow: 'rct_rows',
            controlTest: 'control_tests',
            remediationPlan: 'remediation_plans',
            customColumn: 'custom_columns',
            ticket: 'tickets',
            pendingChange: 'pending_changes',
          }
          return reverseMap[type] || type
        })
        query = query.in('entity_type', dbEntityTypes)
      }

      // Apply change type filter
      if (filters?.changeTypes && filters.changeTypes.length > 0) {
        query = query.in('change_type', filters.changeTypes)
      }

      // Note: searchQuery filter applied client-side after fetch
      // (entity_name may be null, and we want to search summaries too)

      const { data, error } = await query

      if (error) throw error

      let entries = data.map(toAuditEntry)

      // Client-side search filter
      if (filters?.searchQuery?.trim()) {
        const searchLower = filters.searchQuery.toLowerCase()
        entries = entries.filter(
          (e) =>
            e.entityName?.toLowerCase().includes(searchLower) ||
            e.user?.toLowerCase().includes(searchLower)
        )
      }

      return entries
    },
  })
}

/**
 * Get total count of audit entries (for stats display).
 */
export function useAuditLogCount() {
  const { effectiveTenantId, isImpersonating } = useEffectiveTenant()

  return useQuery({
    queryKey: ['auditLog', 'count', effectiveTenantId],
    queryFn: async () => {
      let query = supabase
        .from('audit_log')
        .select('*', { count: 'exact', head: true })

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
