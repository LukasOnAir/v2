import { useMemo } from 'react'
import { parseISO, startOfDay, isBefore, isValid } from 'date-fns'
import { ChevronDown, ChevronRight } from 'lucide-react'
import type { Ticket, TicketStatus, TicketCategory, TicketPriority } from '@/types/tickets'
import { useUIStore } from '@/stores/uiStore'

/**
 * Status styling configuration
 */
const STATUS_STYLES: Record<TicketStatus, { bg: string; text: string; label: string }> = {
  todo: { bg: 'bg-blue-500/20', text: 'text-blue-400', label: 'To Do' },
  'in-progress': { bg: 'bg-amber-500/20', text: 'text-amber-400', label: 'In Progress' },
  review: { bg: 'bg-purple-500/20', text: 'text-purple-400', label: 'Review' },
  done: { bg: 'bg-green-500/20', text: 'text-green-400', label: 'Done' },
}

/**
 * Category styling configuration
 */
const CATEGORY_STYLES: Record<TicketCategory, { bg: string; text: string; label: string }> = {
  maintenance: { bg: 'bg-cyan-500/20', text: 'text-cyan-400', label: 'Maintenance' },
  'periodic-review': { bg: 'bg-violet-500/20', text: 'text-violet-400', label: 'Periodic Review' },
  'update-change': { bg: 'bg-emerald-500/20', text: 'text-emerald-400', label: 'Update/Change' },
  other: { bg: 'bg-gray-500/20', text: 'text-gray-400', label: 'Other' },
}

/**
 * Priority styling configuration
 */
const PRIORITY_STYLES: Record<TicketPriority, { bg: string; text: string }> = {
  critical: { bg: 'bg-red-500/20', text: 'text-red-400' },
  high: { bg: 'bg-orange-500/20', text: 'text-orange-400' },
  medium: { bg: 'bg-amber-500/20', text: 'text-amber-400' },
  low: { bg: 'bg-green-500/20', text: 'text-green-400' },
}

interface TicketsSummaryProps {
  tickets: Ticket[]
}

/**
 * Hook to compute ticket summary statistics
 */
function useTicketsSummary(tickets: Ticket[]) {
  return useMemo(() => {
    const byStatus: Record<TicketStatus, number> = {
      todo: 0,
      'in-progress': 0,
      review: 0,
      done: 0,
    }

    const byCategory: Record<TicketCategory, number> = {
      maintenance: 0,
      'periodic-review': 0,
      'update-change': 0,
      other: 0,
    }

    const byPriority: Record<TicketPriority, number> = {
      critical: 0,
      high: 0,
      medium: 0,
      low: 0,
    }

    let overdueCount = 0
    const today = startOfDay(new Date())

    for (const ticket of tickets) {
      // Skip archived tickets
      if (ticket.archived) continue

      byStatus[ticket.status]++
      byCategory[ticket.category]++

      // Only count non-done tickets in priority breakdown
      if (ticket.status !== 'done') {
        byPriority[ticket.priority]++

        // Check if overdue
        const deadline = parseISO(ticket.deadline)
        if (isValid(deadline) && isBefore(deadline, today)) {
          overdueCount++
        }
      }
    }

    const totalActive = byStatus.todo + byStatus['in-progress'] + byStatus.review

    return { byStatus, byCategory, byPriority, overdueCount, totalActive }
  }, [tickets])
}

/**
 * TicketsSummary - Summary statistics widget showing counts by status, category, and priority
 */
export function TicketsSummary({ tickets }: TicketsSummaryProps) {
  const { byStatus, byCategory, byPriority, overdueCount, totalActive } = useTicketsSummary(tickets)
  const {
    showStatusStats,
    showPriorityStats,
    showCategoryStats,
    toggleStatusStats,
    togglePriorityStats,
    toggleCategoryStats,
  } = useUIStore()

  return (
    <div className="space-y-4">
      {/* Top row: Total Active and Overdue */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Total Active */}
        <div className="p-4 bg-surface-elevated rounded-lg border border-surface-border">
          <div className="text-3xl font-bold text-text-primary">{totalActive}</div>
          <div className="text-sm text-text-muted">Active Tickets</div>
        </div>

        {/* Overdue */}
        <div
          className={`p-4 rounded-lg border ${
            overdueCount > 0
              ? 'bg-red-500/10 border-red-500/30'
              : 'bg-green-500/10 border-green-500/30'
          }`}
        >
          <div
            className={`text-3xl font-bold ${
              overdueCount > 0 ? 'text-red-400' : 'text-green-400'
            }`}
          >
            {overdueCount}
          </div>
          <div className="text-sm text-text-muted">
            {overdueCount > 0 ? 'Overdue' : 'No Overdue Tickets'}
          </div>
        </div>
      </div>

      {/* By Status */}
      <div>
        <button
          type="button"
          onClick={toggleStatusStats}
          className="flex items-center gap-2 text-sm font-medium text-text-muted mb-2 hover:text-text-secondary transition-colors"
        >
          {showStatusStats ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
          By Status
        </button>
        {showStatusStats && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {(Object.entries(byStatus) as [TicketStatus, number][]).map(([status, count]) => (
              <div
                key={status}
                className={`p-3 rounded-lg border border-surface-border ${STATUS_STYLES[status].bg}`}
              >
                <div className={`text-2xl font-bold ${STATUS_STYLES[status].text}`}>{count}</div>
                <div className="text-xs text-text-muted">{STATUS_STYLES[status].label}</div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* By Priority (non-done only) */}
      <div>
        <button
          type="button"
          onClick={togglePriorityStats}
          className="flex items-center gap-2 text-sm font-medium text-text-muted mb-2 hover:text-text-secondary transition-colors"
        >
          {showPriorityStats ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
          Active by Priority
        </button>
        {showPriorityStats && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {(Object.entries(byPriority) as [TicketPriority, number][]).map(([priority, count]) => (
              <div
                key={priority}
                className={`p-3 rounded-lg border border-surface-border ${PRIORITY_STYLES[priority].bg}`}
              >
                <div className={`text-2xl font-bold ${PRIORITY_STYLES[priority].text}`}>
                  {count}
                </div>
                <div className="text-xs text-text-muted capitalize">{priority}</div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* By Category */}
      <div>
        <button
          type="button"
          onClick={toggleCategoryStats}
          className="flex items-center gap-2 text-sm font-medium text-text-muted mb-2 hover:text-text-secondary transition-colors"
        >
          {showCategoryStats ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
          By Category
        </button>
        {showCategoryStats && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {(Object.entries(byCategory) as [TicketCategory, number][]).map(([category, count]) => (
              <div
                key={category}
                className={`p-3 rounded-lg border border-surface-border ${CATEGORY_STYLES[category].bg}`}
              >
                <div className={`text-2xl font-bold ${CATEGORY_STYLES[category].text}`}>
                  {count}
                </div>
                <div className="text-xs text-text-muted">{CATEGORY_STYLES[category].label}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
