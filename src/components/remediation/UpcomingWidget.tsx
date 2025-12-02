import { useMemo } from 'react'
import { Clock } from 'lucide-react'
import { useRCTStore } from '@/stores/rctStore'
import { useIsDemoMode } from '@/hooks/useTenantData'
import { useRemediationPlans } from '@/hooks/useRemediationPlans'
import { useRCTRows } from '@/hooks/useRCTRows'
import { differenceInDays, parseISO, startOfDay, addDays, isValid } from 'date-fns'
import type { RemediationPlan } from '@/types/rct'

/**
 * Priority badge styling
 */
const PRIORITY_STYLES: Record<RemediationPlan['priority'], string> = {
  critical: 'bg-red-500/20 text-red-400',
  high: 'bg-orange-500/20 text-orange-400',
  medium: 'bg-amber-500/20 text-amber-400',
  low: 'bg-green-500/20 text-green-400',
}

/**
 * Hook to get upcoming remediation items (next 7 days, not overdue)
 */
function useUpcomingRemediations() {
  const isDemoMode = useIsDemoMode()

  // Store data (demo mode)
  const storeRemediationPlans = useRCTStore((state) => state.remediationPlans)
  const storeRows = useRCTStore((state) => state.rows)

  // Database hooks (auth mode)
  const { data: dbRemediationPlans } = useRemediationPlans()
  const { data: dbRows } = useRCTRows()

  // Dual-source selection
  const remediationPlans = isDemoMode ? storeRemediationPlans : (dbRemediationPlans || [])
  const rows = isDemoMode ? storeRows : (dbRows || [])

  return useMemo(() => {
    const today = startOfDay(new Date())
    const futureDate = addDays(today, 7)

    const upcomingItems = remediationPlans
      .filter((p) => {
        if (p.status !== 'open' && p.status !== 'in-progress') return false
        // Skip invalid dates (can happen during editing)
        const parsed = parseISO(p.deadline)
        if (!isValid(parsed)) return false
        // Normalize deadline to start of day for consistent comparison
        const deadline = startOfDay(parsed)
        // Not overdue and within next 7 days (inclusive of today)
        return deadline >= today && deadline <= futureDate
      })
      .map((plan) => {
        const row = rows.find((r: { id: string }) => r.id === plan.rowId)
        const parsed = parseISO(plan.deadline)
        const daysUntil = isValid(parsed) ? differenceInDays(startOfDay(parsed), today) : 0

        return {
          ...plan,
          riskName: (row as { riskName?: string })?.riskName || 'Unknown Risk',
          daysUntil,
        }
      })
      .sort((a, b) => a.daysUntil - b.daysUntil) // Soonest first

    return upcomingItems
  }, [remediationPlans, rows])
}

/**
 * Widget displaying upcoming deadline items (next 7 days)
 */
export function UpcomingWidget() {
  const upcomingItems = useUpcomingRemediations()

  const hasUpcoming = upcomingItems.length > 0

  return (
    <div className="p-4 rounded-lg border border-amber-500/50 bg-amber-500/5">
      {/* Header */}
      <div className="flex items-center gap-2 mb-3">
        <Clock size={20} className="text-amber-400" />
        <h3 className="text-lg font-semibold text-amber-400">
          Upcoming Deadlines ({upcomingItems.length})
        </h3>
      </div>

      {/* Content */}
      {hasUpcoming ? (
        <div className="space-y-2 max-h-[300px] overflow-y-auto">
          {upcomingItems.map((item) => (
            <div
              key={item.id}
              className="p-3 bg-surface-elevated rounded-lg border border-surface-border hover:border-amber-500/30 transition-colors"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-text-primary truncate">{item.title}</div>
                  <div className="text-sm text-text-muted truncate">{item.riskName}</div>
                  <div className="text-xs text-text-muted mt-1">Owner: {item.owner}</div>
                </div>
                <div className="flex flex-col items-end gap-1 flex-shrink-0">
                  <span className={`px-2 py-0.5 rounded text-xs font-medium ${PRIORITY_STYLES[item.priority]}`}>
                    {item.priority}
                  </span>
                  <span className="text-amber-400 text-sm font-medium">
                    {item.daysUntil === 0
                      ? 'Due today'
                      : `${item.daysUntil} day${item.daysUntil !== 1 ? 's' : ''} left`}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-sm text-text-muted">
          No deadlines in the next 7 days.
        </p>
      )}
    </div>
  )
}
