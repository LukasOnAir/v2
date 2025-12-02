import { useMemo } from 'react'
import { startOfDay, endOfDay } from 'date-fns'
import { useAuditStore } from '@/stores/auditStore'
import type { EntityType, ChangeType, AuditEntry } from '@/types/audit'

/**
 * Filter state for audit log queries
 */
export interface AuditFilters {
  dateRange: { start: Date | null; end: Date | null }
  entityTypes: EntityType[] // Empty means all
  changeTypes: ChangeType[] // Empty means all
  searchQuery: string // Filter by entityName
}

/**
 * Default filter state - shows all entries
 */
export const DEFAULT_AUDIT_FILTERS: AuditFilters = {
  dateRange: { start: null, end: null },
  entityTypes: [],
  changeTypes: [],
  searchQuery: '',
}

/**
 * Human-readable labels for entity types
 */
export const ENTITY_TYPE_LABELS: Record<EntityType, string> = {
  risk: 'Risk',
  process: 'Process',
  control: 'Control',
  rctRow: 'RCT Row',
  customColumn: 'Custom Column',
  controlTest: 'Control Test',
  remediationPlan: 'Remediation Plan',
  weight: 'Weight',
}

/**
 * Human-readable labels for change types
 */
export const CHANGE_TYPE_LABELS: Record<ChangeType, string> = {
  create: 'Created',
  update: 'Updated',
  delete: 'Deleted',
}

/**
 * Color classes for change type badges
 */
export const CHANGE_TYPE_COLORS: Record<ChangeType, string> = {
  create: 'bg-green-500/20 text-green-400',
  update: 'bg-amber-500/20 text-amber-400',
  delete: 'bg-red-500/20 text-red-400',
}

/**
 * Color classes for entity type badges
 */
export const ENTITY_TYPE_COLORS: Record<EntityType, string> = {
  risk: 'bg-red-500/20 text-red-400',
  process: 'bg-blue-500/20 text-blue-400',
  control: 'bg-emerald-500/20 text-emerald-400',
  rctRow: 'bg-purple-500/20 text-purple-400',
  customColumn: 'bg-cyan-500/20 text-cyan-400',
  controlTest: 'bg-amber-500/20 text-amber-400',
  remediationPlan: 'bg-orange-500/20 text-orange-400',
  weight: 'bg-zinc-500/20 text-zinc-400',
}

/**
 * Hook for filtered audit log queries
 *
 * @param filters - Filter criteria for audit entries
 * @returns Filtered entries, total count, and filtered count
 */
export function useAuditLog(filters: AuditFilters) {
  const entries = useAuditStore((state) => state.entries)

  const filteredEntries = useMemo(() => {
    let result = [...entries]

    // Date range filter (normalize to start/end of day for inclusive comparison)
    if (filters.dateRange.start) {
      const startTime = startOfDay(filters.dateRange.start).getTime()
      result = result.filter(
        (e) => new Date(e.timestamp).getTime() >= startTime
      )
    }
    if (filters.dateRange.end) {
      const endTime = endOfDay(filters.dateRange.end).getTime()
      result = result.filter((e) => new Date(e.timestamp).getTime() <= endTime)
    }

    // Entity type filter (empty means all)
    if (filters.entityTypes.length > 0) {
      result = result.filter((e) => filters.entityTypes.includes(e.entityType))
    }

    // Change type filter (empty means all)
    if (filters.changeTypes.length > 0) {
      result = result.filter((e) => filters.changeTypes.includes(e.changeType))
    }

    // Search query filter (entityName or summary)
    if (filters.searchQuery.trim()) {
      const query = filters.searchQuery.toLowerCase()
      result = result.filter(
        (e) =>
          e.entityName?.toLowerCase().includes(query) ||
          e.summary?.toLowerCase().includes(query)
      )
    }

    // Sort newest first
    return result.sort(
      (a, b) =>
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    )
  }, [entries, filters])

  return {
    entries: filteredEntries,
    totalCount: entries.length,
    filteredCount: filteredEntries.length,
  }
}

/**
 * Hook for entity-specific audit history
 *
 * @param entityId - UUID of the entity
 * @param limit - Maximum entries to return (default 20)
 * @returns Entries for the entity, sorted newest first
 */
export function useEntityHistory(entityId: string, limit: number = 20) {
  const getEntriesForEntity = useAuditStore(
    (state) => state.getEntriesForEntity
  )

  const entries = useMemo(() => {
    return getEntriesForEntity(entityId).slice(0, limit)
  }, [getEntriesForEntity, entityId, limit])

  return entries
}

/**
 * All entity types for filter UI
 */
export const ALL_ENTITY_TYPES: EntityType[] = [
  'risk',
  'process',
  'control',
  'rctRow',
  'customColumn',
  'controlTest',
  'remediationPlan',
  'weight',
]

/**
 * All change types for filter UI
 */
export const ALL_CHANGE_TYPES: ChangeType[] = ['create', 'update', 'delete']
