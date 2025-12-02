import { useMemo } from 'react'
import { useRCTStore } from '@/stores/rctStore'
import { useIsDemoMode } from '@/hooks/useTenantData'
import { useRemediationPlans } from '@/hooks/useRemediationPlans'
import type { RemediationStatus, RemediationPlan } from '@/types/rct'

/**
 * Priority styling configuration
 */
const PRIORITY_STYLES: Record<RemediationPlan['priority'], { bg: string; text: string }> = {
  critical: { bg: 'bg-red-500/20', text: 'text-red-400' },
  high: { bg: 'bg-orange-500/20', text: 'text-orange-400' },
  medium: { bg: 'bg-amber-500/20', text: 'text-amber-400' },
  low: { bg: 'bg-green-500/20', text: 'text-green-400' },
}

/**
 * Status styling configuration
 */
const STATUS_STYLES: Record<RemediationStatus, { bg: string; text: string }> = {
  open: { bg: 'bg-blue-500/20', text: 'text-blue-400' },
  'in-progress': { bg: 'bg-amber-500/20', text: 'text-amber-400' },
  resolved: { bg: 'bg-green-500/20', text: 'text-green-400' },
  closed: { bg: 'bg-gray-500/20', text: 'text-gray-400' },
}

/**
 * Hook to compute remediation summary statistics
 */
function useRemediationSummary() {
  const isDemoMode = useIsDemoMode()

  // Store data (demo mode)
  const storeRemediationPlans = useRCTStore((state) => state.remediationPlans)

  // Database hook (auth mode)
  const { data: dbRemediationPlans } = useRemediationPlans()

  // Dual-source selection
  const remediationPlans = isDemoMode ? storeRemediationPlans : (dbRemediationPlans || [])

  return useMemo(() => {
    const byStatus: Record<RemediationStatus, number> = {
      open: 0,
      'in-progress': 0,
      resolved: 0,
      closed: 0,
    }

    const byPriority: Record<RemediationPlan['priority'], number> = {
      critical: 0,
      high: 0,
      medium: 0,
      low: 0,
    }

    for (const plan of remediationPlans) {
      byStatus[plan.status]++
      // Only count active items (open, in-progress) in priority breakdown
      if (plan.status === 'open' || plan.status === 'in-progress') {
        byPriority[plan.priority]++
      }
    }

    const totalActive = byStatus.open + byStatus['in-progress']

    return { byStatus, byPriority, totalActive }
  }, [remediationPlans])
}

/**
 * Summary statistics widget showing counts by status and priority
 */
export function RemediationSummary() {
  const { byStatus, byPriority, totalActive } = useRemediationSummary()

  return (
    <div className="space-y-4">
      {/* Total Active */}
      <div className="p-4 bg-surface-elevated rounded-lg border border-surface-border">
        <div className="text-3xl font-bold text-text-primary">{totalActive}</div>
        <div className="text-sm text-text-muted">Active Remediation Plans</div>
      </div>

      {/* By Status */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {(Object.entries(byStatus) as [RemediationStatus, number][]).map(([status, count]) => (
          <div
            key={status}
            className={`p-3 rounded-lg border border-surface-border ${STATUS_STYLES[status].bg}`}
          >
            <div className={`text-2xl font-bold ${STATUS_STYLES[status].text}`}>{count}</div>
            <div className="text-xs text-text-muted capitalize">
              {status === 'in-progress' ? 'In Progress' : status}
            </div>
          </div>
        ))}
      </div>

      {/* By Priority (non-closed only) */}
      <div>
        <h3 className="text-sm font-medium text-text-muted mb-2">Active by Priority</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {(Object.entries(byPriority) as [RemediationPlan['priority'], number][]).map(
            ([priority, count]) => (
              <div
                key={priority}
                className={`p-3 rounded-lg border border-surface-border ${PRIORITY_STYLES[priority].bg}`}
              >
                <div className={`text-2xl font-bold ${PRIORITY_STYLES[priority].text}`}>
                  {count}
                </div>
                <div className="text-xs text-text-muted capitalize">{priority}</div>
              </div>
            )
          )}
        </div>
      </div>
    </div>
  )
}
