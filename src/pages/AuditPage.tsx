import { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router'
import { AuditTimeline, AuditFilters } from '@/components/audit'
import { usePermissions } from '@/hooks/usePermissions'
import {
  useAuditLog,
  DEFAULT_AUDIT_FILTERS,
  type AuditFilters as AuditFiltersType,
} from '@/hooks/useAuditLog'
import { useAuditLogDb, useAuditLogCount } from '@/hooks/useAuditLogDb'

/**
 * Main audit trail page
 * Displays chronological timeline of all changes with filtering
 *
 * Dual-source pattern:
 * - Demo mode: reads from localStorage store (useAuditLog)
 * - Authenticated: reads from database audit_log table (useAuditLogDb)
 */
export function AuditPage() {
  const [searchParams] = useSearchParams()
  const { isDemoMode } = usePermissions()

  // Initialize filters from URL params (for deep linking from EntityHistoryPanel)
  const [filters, setFilters] = useState<AuditFiltersType>(() => {
    const searchQuery = searchParams.get('search') || ''
    return {
      ...DEFAULT_AUDIT_FILTERS,
      searchQuery,
    }
  })

  // Update search query if URL changes
  useEffect(() => {
    const searchQuery = searchParams.get('search')
    if (searchQuery && searchQuery !== filters.searchQuery) {
      setFilters((prev) => ({ ...prev, searchQuery }))
    }
  }, [searchParams])

  // Store data (demo mode)
  const storeAuditLog = useAuditLog(filters)

  // Database data (authenticated mode)
  const { data: dbEntries, isLoading: dbLoading } = useAuditLogDb(filters)
  const { data: dbTotalCount } = useAuditLogCount()

  // Dual-source selection
  const entries = isDemoMode ? storeAuditLog.entries : (dbEntries || [])
  const totalCount = isDemoMode ? storeAuditLog.totalCount : (dbTotalCount || 0)
  const filteredCount = entries.length

  // Show loading indicator only in authenticated mode during fetch
  if (!isDemoMode && dbLoading) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-semibold text-text-primary">Audit Trail</h1>
        <div className="flex items-center justify-center p-8">
          <div className="animate-spin rounded-full h-8 w-8 border-2 border-accent-500 border-t-transparent" />
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Page header */}
      <h1 className="text-2xl font-semibold text-text-primary">Audit Trail</h1>

      {/* Filters toolbar */}
      <section>
        <AuditFilters
          filters={filters}
          onChange={setFilters}
          totalCount={totalCount}
          filteredCount={filteredCount}
        />
      </section>

      {/* Timeline */}
      <section className="bg-surface-elevated rounded-lg border border-surface-border p-4">
        <AuditTimeline entries={entries} />
      </section>
    </div>
  )
}
