import { useDroppable } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import type { Ticket, TicketStatus } from '@/types/tickets'
import { TicketCard } from './TicketCard'

interface KanbanColumnProps {
  status: TicketStatus
  tickets: Ticket[]
  onEditTicket: (ticket: Ticket) => void
  getLinksCount: (ticketId: string) => number
}

/**
 * Status display labels
 */
const STATUS_LABELS: Record<TicketStatus, string> = {
  todo: 'To Do',
  'in-progress': 'In Progress',
  review: 'Review',
  done: 'Done',
}

/**
 * Status header colors
 */
const STATUS_COLORS: Record<TicketStatus, string> = {
  todo: 'bg-blue-500/20 text-blue-400',
  'in-progress': 'bg-amber-500/20 text-amber-400',
  review: 'bg-purple-500/20 text-purple-400',
  done: 'bg-green-500/20 text-green-400',
}

/**
 * KanbanColumn - Single status column with droppable area
 */
export function KanbanColumn({ status, tickets, onEditTicket, getLinksCount }: KanbanColumnProps) {
  const { setNodeRef, isOver } = useDroppable({ id: status })

  return (
    <div
      className={`
        w-72 flex-shrink-0 bg-surface-elevated rounded-lg p-3
        ${isOver ? 'ring-2 ring-accent-500' : ''}
      `}
    >
      {/* Column header */}
      <div className="flex items-center gap-2 mb-3">
        <span className={`px-2 py-0.5 text-xs font-medium rounded ${STATUS_COLORS[status]}`}>
          {STATUS_LABELS[status]}
        </span>
        <span className="text-sm text-text-muted">({tickets.length})</span>
      </div>

      {/* Droppable area with tickets */}
      <div
        ref={setNodeRef}
        className="space-y-2 min-h-[100px]"
      >
        <SortableContext
          items={tickets.map((t) => t.id)}
          strategy={verticalListSortingStrategy}
        >
          {tickets.map((ticket) => (
            <TicketCard
              key={ticket.id}
              ticket={ticket}
              onClick={() => onEditTicket(ticket)}
              linksCount={getLinksCount(ticket.id)}
            />
          ))}
        </SortableContext>

        {/* Empty state */}
        {tickets.length === 0 && (
          <div className="py-8 text-center text-sm text-text-muted">
            Drop tickets here
          </div>
        )}
      </div>
    </div>
  )
}
