import { useState, useMemo } from 'react'
import { ChevronDown, ChevronRight, Plus, Ticket, Calendar } from 'lucide-react'
import { parseISO, startOfDay, isBefore, isValid, format } from 'date-fns'
import { useTicketsStore } from '@/stores/ticketsStore'
import { usePermissions } from '@/hooks/usePermissions'
import { TicketForm } from './TicketForm'
import { isDemoMode } from '@/utils/authStorage'
import type { Ticket as TicketType, TicketStatus, TicketPriority } from '@/types/tickets'

interface TicketsSectionProps {
  controlId: string
  controlName: string
}

/**
 * Priority badge styling
 */
const PRIORITY_STYLES: Record<TicketPriority, string> = {
  critical: 'bg-red-500/20 text-red-400',
  high: 'bg-orange-500/20 text-orange-400',
  medium: 'bg-amber-500/20 text-amber-400',
  low: 'bg-green-500/20 text-green-400',
}

/**
 * Status badge styling
 */
const STATUS_STYLES: Record<TicketStatus, string> = {
  todo: 'bg-blue-500/20 text-blue-400',
  'in-progress': 'bg-amber-500/20 text-amber-400',
  review: 'bg-purple-500/20 text-purple-400',
  done: 'bg-green-500/20 text-green-400',
}

const STATUS_LABELS: Record<TicketStatus, string> = {
  todo: 'To Do',
  'in-progress': 'In Progress',
  review: 'Review',
  done: 'Done',
}

/**
 * TicketsSection - Collapsible tickets section for ControlPanel
 */
export function TicketsSection({ controlId, controlName }: TicketsSectionProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [editTicket, setEditTicket] = useState<TicketType | undefined>(undefined)
  const [formKey, setFormKey] = useState(0)

  const { canEditControlDefinitions } = usePermissions()
  const getTicketsForControl = useTicketsStore((s) => s.getTicketsForControl)
  const ticketEntityLinks = useTicketsStore((s) => s.ticketEntityLinks)

  // Get tickets for this control
  const tickets = useMemo(() => {
    return getTicketsForControl(controlId)
  }, [getTicketsForControl, controlId])

  // Filter to active tickets (not archived and not done)
  const activeTickets = useMemo(() => {
    return tickets.filter((t) => !t.archived && t.status !== 'done')
  }, [tickets])

  const handleEditTicket = (ticket: TicketType) => {
    setEditTicket(ticket)
    setShowForm(true)
    setFormKey((k) => k + 1) // Force remount to read fresh data
  }

  const handleCreateTicket = () => {
    setEditTicket(undefined)
    setShowForm(true)
    setFormKey((k) => k + 1) // Force remount
  }

  const handleFormClose = () => {
    setShowForm(false)
    setEditTicket(undefined)
  }

  return (
    <div className="mt-3 pt-3 border-t border-surface-border">
      {/* Header - always visible */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex items-center gap-2 w-full text-left"
      >
        {isExpanded ? (
          <ChevronDown size={16} className="text-text-muted" />
        ) : (
          <ChevronRight size={16} className="text-text-muted" />
        )}
        <Ticket size={16} className="text-text-muted" />
        <span className="text-sm font-medium text-text-primary">Tickets</span>

        {/* Active count indicator */}
        {activeTickets.length > 0 && (
          <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-accent-500/20 text-accent-400">
            {activeTickets.length} active
          </span>
        )}
      </button>

      {/* Expanded content */}
      {isExpanded && (
        <div className="mt-3 space-y-3 pl-6">
          {/* Ticket list */}
          {activeTickets.length > 0 ? (
            <div className="space-y-2">
              {activeTickets.map((ticket) => (
                <TicketListItem
                  key={ticket.id}
                  ticket={ticket}
                  onClick={() => handleEditTicket(ticket)}
                />
              ))}
            </div>
          ) : (
            <p className="text-sm text-text-muted">No active tickets for this control.</p>
          )}

          {/* Create Ticket button */}
          {canEditControlDefinitions && (
            <button
              onClick={handleCreateTicket}
              className="flex items-center gap-1.5 px-2 py-1.5 text-xs text-accent-400 hover:text-accent-300 hover:bg-accent-500/10 rounded transition-colors"
            >
              <Plus size={14} />
              Create Ticket
            </button>
          )}
        </div>
      )}

      {/* Ticket Form Modal - formKey forces complete remount to read fresh data */}
      <TicketForm
        key={formKey}
        isOpen={showForm}
        onClose={handleFormClose}
        ticket={editTicket}
        preselectedLink={{
          entityType: 'control',
          entityId: controlId,
          entityName: controlName,
        }}
        isDemoMode={isDemoMode()}
        ticketEntityLinks={ticketEntityLinks}
      />
    </div>
  )
}

/**
 * TicketListItem - Single ticket card in the list
 */
function TicketListItem({ ticket, onClick }: { ticket: TicketType; onClick: () => void }) {
  const isOverdue = useMemo(() => {
    if (ticket.status === 'done') return false
    const deadline = parseISO(ticket.deadline)
    if (!isValid(deadline)) return false
    return isBefore(deadline, startOfDay(new Date()))
  }, [ticket.deadline, ticket.status])

  const formattedDeadline = useMemo(() => {
    const deadline = parseISO(ticket.deadline)
    if (!isValid(deadline)) return 'No date'
    return format(deadline, 'MMM d')
  }, [ticket.deadline])

  return (
    <button
      onClick={onClick}
      className={`w-full text-left p-2 rounded border transition-colors hover:bg-surface-base ${
        isOverdue ? 'border-red-500 bg-red-500/5' : 'border-surface-border bg-surface-overlay'
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <span className="text-sm text-text-primary font-medium truncate flex-1">
          {ticket.title}
        </span>
        <span className={`px-1.5 py-0.5 text-xs rounded ${PRIORITY_STYLES[ticket.priority]}`}>
          {ticket.priority}
        </span>
      </div>
      <div className="flex items-center gap-2 mt-1 text-xs">
        <span className={`px-1.5 py-0.5 rounded ${STATUS_STYLES[ticket.status]}`}>
          {STATUS_LABELS[ticket.status]}
        </span>
        <span className={`flex items-center gap-1 ${isOverdue ? 'text-red-400' : 'text-text-muted'}`}>
          <Calendar size={12} />
          {formattedDeadline}
        </span>
      </div>
    </button>
  )
}
