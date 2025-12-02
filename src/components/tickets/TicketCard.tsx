import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { parseISO, startOfDay, isBefore, format, isValid } from 'date-fns'
import type { Ticket, TicketCategory, TicketPriority } from '@/types/tickets'

interface TicketCardProps {
  ticket: Ticket
  isDragging?: boolean
  onClick?: () => void
  linksCount?: number
}

/**
 * Priority badge styling (matches RemediationSummary)
 */
const PRIORITY_STYLES: Record<TicketPriority, { bg: string; text: string }> = {
  critical: { bg: 'bg-red-500/20', text: 'text-red-400' },
  high: { bg: 'bg-orange-500/20', text: 'text-orange-400' },
  medium: { bg: 'bg-amber-500/20', text: 'text-amber-400' },
  low: { bg: 'bg-green-500/20', text: 'text-green-400' },
}

/**
 * Category badge styling
 */
const CATEGORY_STYLES: Record<TicketCategory, { bg: string; text: string }> = {
  maintenance: { bg: 'bg-cyan-500/20', text: 'text-cyan-400' },
  'periodic-review': { bg: 'bg-violet-500/20', text: 'text-violet-400' },
  'update-change': { bg: 'bg-emerald-500/20', text: 'text-emerald-400' },
  other: { bg: 'bg-gray-500/20', text: 'text-gray-400' },
}

/**
 * Category display labels
 */
const CATEGORY_LABELS: Record<TicketCategory, string> = {
  maintenance: 'Maintenance',
  'periodic-review': 'Periodic Review',
  'update-change': 'Update/Change',
  other: 'Other',
}

/**
 * TicketCard - Draggable ticket card for Kanban board
 */
export function TicketCard({ ticket, isDragging, onClick, linksCount = 0 }: TicketCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging: isSortableDragging,
  } = useSortable({ id: ticket.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  // Calculate if ticket is overdue (deadline passed and not done)
  const isOverdue = (() => {
    if (ticket.status === 'done') return false
    const deadline = parseISO(ticket.deadline)
    if (!isValid(deadline)) return false
    return isBefore(deadline, startOfDay(new Date()))
  })()

  // Format deadline for display
  const formattedDeadline = (() => {
    const deadline = parseISO(ticket.deadline)
    if (!isValid(deadline)) return 'No date'
    return format(deadline, 'MMM d')
  })()

  const priorityStyle = PRIORITY_STYLES[ticket.priority]
  const categoryStyle = CATEGORY_STYLES[ticket.category]
  const showDragging = isDragging || isSortableDragging

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onClick={onClick}
      className={`
        p-3 bg-surface-overlay rounded-lg border cursor-grab active:cursor-grabbing
        hover:bg-surface-base transition-colors
        ${showDragging ? 'opacity-50' : ''}
        ${isOverdue ? 'border-red-500' : 'border-surface-border'}
      `}
    >
      {/* Title */}
      <div className="font-medium text-text-primary truncate mb-2">
        {ticket.title}
      </div>

      {/* Badges row */}
      <div className="flex flex-wrap gap-1.5 mb-2">
        {/* Category badge */}
        <span className={`px-1.5 py-0.5 text-xs rounded ${categoryStyle.bg} ${categoryStyle.text}`}>
          {CATEGORY_LABELS[ticket.category]}
        </span>

        {/* Priority badge */}
        <span className={`px-1.5 py-0.5 text-xs rounded capitalize ${priorityStyle.bg} ${priorityStyle.text}`}>
          {ticket.priority}
        </span>

        {/* Linked items badge */}
        {linksCount > 0 && (
          <span className="px-1.5 py-0.5 text-xs rounded bg-blue-500/20 text-blue-400">
            {linksCount} linked
          </span>
        )}
      </div>

      {/* Footer row: owner and deadline */}
      <div className="flex items-center justify-between text-xs">
        <span className="text-text-muted truncate max-w-[60%]">
          {ticket.owner}
        </span>
        <span className={`${isOverdue ? 'text-red-400 font-medium' : 'text-text-muted'}`}>
          Due: {formattedDeadline}
        </span>
      </div>
    </div>
  )
}
