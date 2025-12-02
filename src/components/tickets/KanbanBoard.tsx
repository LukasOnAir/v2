import { useState, useMemo } from 'react'
import {
  DndContext,
  DragOverlay,
  closestCorners,
  PointerSensor,
  useSensor,
  useSensors,
  DragStartEvent,
  DragEndEvent,
} from '@dnd-kit/core'
import type { Ticket, TicketStatus, TicketCategory, TicketPriority, TicketEntityLink } from '@/types/tickets'
import { useTicketsStore } from '@/stores/ticketsStore'
import { useUpdateTicket } from '@/hooks/useTickets'
import { KanbanColumn } from './KanbanColumn'
import { TicketCard } from './TicketCard'

export interface TicketFilters {
  categories: TicketCategory[]
  priorities: TicketPriority[]
  searchQuery: string
}

interface KanbanBoardProps {
  filters: TicketFilters
  onEditTicket: (ticket: Ticket) => void
  isDemoMode: boolean
  tickets: Ticket[]
  ticketEntityLinks: TicketEntityLink[]
}

/** All status columns in order */
const STATUSES: TicketStatus[] = ['todo', 'in-progress', 'review', 'done']

/**
 * KanbanBoard - Drag-and-drop ticket board with 4 status columns
 */
export function KanbanBoard({ filters, onEditTicket, isDemoMode, tickets, ticketEntityLinks }: KanbanBoardProps) {
  // Store function for demo mode
  const storeUpdateTicketStatus = useTicketsStore((state) => state.updateTicketStatus)

  // Database mutation for authenticated mode
  const updateMutation = useUpdateTicket()

  const [activeTicket, setActiveTicket] = useState<Ticket | null>(null)

  // Configure pointer sensor with activation constraint
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    })
  )

  // Apply filters to tickets
  const filteredTickets = useMemo(() => {
    return tickets.filter((ticket) => {
      // Skip archived tickets
      if (ticket.archived) return false

      // Category filter (empty = show all)
      if (
        filters.categories.length > 0 &&
        !filters.categories.includes(ticket.category)
      ) {
        return false
      }

      // Priority filter (empty = show all)
      if (
        filters.priorities.length > 0 &&
        !filters.priorities.includes(ticket.priority)
      ) {
        return false
      }

      // Search filter
      if (filters.searchQuery.trim()) {
        const query = filters.searchQuery.toLowerCase()
        const matchesTitle = ticket.title.toLowerCase().includes(query)
        const matchesOwner = ticket.owner.toLowerCase().includes(query)
        const matchesDescription = ticket.description?.toLowerCase().includes(query)
        if (!matchesTitle && !matchesOwner && !matchesDescription) {
          return false
        }
      }

      return true
    })
  }, [tickets, filters])

  // Group tickets by status
  const ticketsByStatus = useMemo(() => {
    const result: Record<TicketStatus, Ticket[]> = {
      todo: [],
      'in-progress': [],
      review: [],
      done: [],
    }

    for (const ticket of filteredTickets) {
      result[ticket.status].push(ticket)
    }

    return result
  }, [filteredTickets])

  // Get linked entity count for a ticket
  const getLinksCount = (ticketId: string): number => {
    return ticketEntityLinks.filter((link) => link.ticketId === ticketId).length
  }

  // Drag handlers
  const handleDragStart = (event: DragStartEvent) => {
    const ticketId = event.active.id as string
    const ticket = tickets.find((t) => t.id === ticketId)
    if (ticket) {
      setActiveTicket(ticket)
    }
  }

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event

    if (over) {
      const ticketId = active.id as string
      const overId = over.id as string

      // Determine target status - either dropping on a column or on a ticket in that column
      let targetStatus: TicketStatus | undefined

      // Check if dropping directly on a status column
      if (STATUSES.includes(overId as TicketStatus)) {
        targetStatus = overId as TicketStatus
      } else {
        // Dropping on another ticket - find which column that ticket is in
        const targetTicket = tickets.find((t) => t.id === overId)
        if (targetTicket) {
          targetStatus = targetTicket.status
        }
      }

      // Update status if valid target found and different from current
      if (targetStatus) {
        const ticket = tickets.find((t) => t.id === ticketId)
        if (ticket && ticket.status !== targetStatus) {
          if (isDemoMode) {
            storeUpdateTicketStatus(ticketId, targetStatus)
          } else {
            // For database mode, we need to handle doneDate logic
            const updates: Partial<Ticket> = { status: targetStatus }

            // Set doneDate when status becomes 'done'
            if (targetStatus === 'done' && ticket.status !== 'done') {
              updates.doneDate = new Date().toISOString()
            }
            // Clear doneDate if moving away from done
            if (targetStatus !== 'done' && ticket.status === 'done') {
              updates.doneDate = undefined
            }

            updateMutation.mutate({ id: ticketId, ...updates })
          }
        }
      }
    }

    setActiveTicket(null)
  }

  const handleDragCancel = () => {
    setActiveTicket(null)
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragCancel={handleDragCancel}
    >
      <div className="flex gap-4 overflow-x-auto pb-4">
        {STATUSES.map((status) => (
          <KanbanColumn
            key={status}
            status={status}
            tickets={ticketsByStatus[status]}
            onEditTicket={onEditTicket}
            getLinksCount={getLinksCount}
          />
        ))}
      </div>

      {/* Drag overlay - shows ticket being dragged */}
      <DragOverlay>
        {activeTicket && (
          <TicketCard
            ticket={activeTicket}
            isDragging
            linksCount={getLinksCount(activeTicket.id)}
          />
        )}
      </DragOverlay>
    </DndContext>
  )
}
