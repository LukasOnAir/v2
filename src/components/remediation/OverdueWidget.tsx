import { useMemo } from 'react'
import { AlertCircle, CheckCircle2 } from 'lucide-react'
import { useRCTStore } from '@/stores/rctStore'
import { useIsDemoMode } from '@/hooks/useTenantData'
import { useRemediationPlans } from '@/hooks/useRemediationPlans'
import { useRCTRows } from '@/hooks/useRCTRows'
import { differenceInDays, parseISO, startOfDay, isValid } from 'date-fns'
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
 * Hook to get overdue remediation items with enriched data
 */
function useOverdueRemediations() {
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

    const overdueItems = remediationPlans
      .filter((p) => {
        if (p.status !== 'open' && p.status !== 'in-progress') return false
        // Skip invalid dates (can happen during editing)
        const parsed = parseISO(p.deadline)
        if (!isValid(parsed)) return false
        return startOfDay(parsed) < today
      })
      .map((plan) => {
        const row = rows.find((r: { id: string }) => r.id === plan.rowId)
        const parsed = parseISO(plan.deadline)
        const daysOverdue = isValid(parsed) ? differenceInDays(today, startOfDay(parsed)) : 0

        return {
          ...plan,
          riskName: (row as { riskName?: string })?.riskName || 'Unknown Risk',
          daysOverdue,
        }
      })
      .sort((a, b) => b.daysOverdue - a.daysOverdue) // Most overdue first

    return overdueItems
  }, [remediationPlans, rows])
}

/**
 * Widget displaying overdue remediation items
 */
export function OverdueWidget() {
  const overdueItems = useOverdueRemediations()

  const hasOverdue = overdueItems.length > 0

  return (
    <div
      className={`p-4 rounded-lg border ${
        hasOverdue
          ? 'border-red-500/50 bg-red-500/5'
          : 'border-green-500/50 bg-green-500/5'
      }`}
    >
      {/* Header */}
      <div className="flex items-center gap-2 mb-3">
        {hasOverdue ? (
          <AlertCircle size={20} className="text-red-400" />
        ) : (
          <CheckCircle2 size={20} className="text-green-400" />
        )}
        <h3 className={`text-lg font-semibold ${hasOverdue ? 'text-red-400' : 'text-green-400'}`}>
          {hasOverdue ? `Overdue Items (${overdueItems.length})` : 'No Overdue Items'}
        </h3>
      </div>

      {/* Content */}
      {hasOverdue ? (
        <div className="space-y-2 max-h-[300px] overflow-y-auto">
          {overdueItems.map((item) => (
            <div
              key={item.id}
              className="p-3 bg-surface-elevated rounded-lg border border-surface-border hover:border-red-500/30 transition-colors"
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
                  <span className="text-red-400 text-sm font-medium">
                    {item.daysOverdue} day{item.daysOverdue !== 1 ? 's' : ''} overdue
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-sm text-green-400/80">
          All remediation items are on schedule.
        </p>
      )}
    </div>
  )
}
