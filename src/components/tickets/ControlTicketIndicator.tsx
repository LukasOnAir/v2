import { useMemo } from 'react'
import { parseISO, startOfDay, isBefore, isValid } from 'date-fns'
import { useTicketsStore } from '@/stores/ticketsStore'

interface ControlTicketIndicatorProps {
  controlId: string
}

/**
 * ControlTicketIndicator - Badge showing ticket count and status color for Controls Hub table
 *
 * Color logic:
 * - Red: any ticket is overdue (deadline passed)
 * - Amber: any ticket has critical or high priority
 * - Green: normal (has tickets but no urgent issues)
 */
export function ControlTicketIndicator({ controlId }: ControlTicketIndicatorProps) {
  const getTicketsForControl = useTicketsStore((s) => s.getTicketsForControl)

  const { count, color } = useMemo(() => {
    const tickets = getTicketsForControl(controlId)

    // Filter to active tickets (not archived and not done)
    const activeTickets = tickets.filter((t) => !t.archived && t.status !== 'done')

    if (activeTickets.length === 0) {
      return { count: 0, color: null }
    }

    const today = startOfDay(new Date())

    // Check for overdue tickets
    const hasOverdue = activeTickets.some((t) => {
      const deadline = parseISO(t.deadline)
      return isValid(deadline) && isBefore(deadline, today)
    })

    // Check for high priority tickets
    const hasHighPriority = activeTickets.some(
      (t) => t.priority === 'critical' || t.priority === 'high'
    )

    // Determine badge color
    let color: 'red' | 'amber' | 'green'
    if (hasOverdue) {
      color = 'red'
    } else if (hasHighPriority) {
      color = 'amber'
    } else {
      color = 'green'
    }

    return { count: activeTickets.length, color }
  }, [getTicketsForControl, controlId])

  // Return null if no active tickets
  if (count === 0) {
    return null
  }

  const colorStyles = {
    red: 'bg-red-500/20 text-red-400',
    amber: 'bg-amber-500/20 text-amber-400',
    green: 'bg-green-500/20 text-green-400',
  }

  return (
    <span
      className={`px-1.5 py-0.5 text-xs rounded ${color ? colorStyles[color] : ''}`}
      title={`${count} active ticket${count !== 1 ? 's' : ''}`}
    >
      {count} {count === 1 ? 'ticket' : 'tickets'}
    </span>
  )
}
