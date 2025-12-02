import { useState } from 'react'
import { Plus } from 'lucide-react'
import type { Ticket, TicketEntityLink } from '@/types/tickets'
import { useTicketsStore } from '@/stores/ticketsStore'
import { TicketsSummary } from './TicketsSummary'
import { TicketFilters as TicketFiltersComponent, type TicketFiltersValue } from './TicketFilters'
import { KanbanBoard } from './KanbanBoard'
import { TicketForm } from './TicketForm'

/** Form mode union type for consistent state management */
type FormMode =
  | { type: 'closed' }
  | { type: 'create' }
  | { type: 'edit'; ticket: Ticket }

interface TicketsDashboardProps {
  isDemoMode: boolean
  dbTickets: Ticket[]
  dbLinks: TicketEntityLink[]
}

/**
 * TicketsDashboard - Main dashboard composing summary, filters, and Kanban board
 */
export function TicketsDashboard({ isDemoMode, dbTickets, dbLinks }: TicketsDashboardProps) {
  // Zustand for demo mode
  const storeTickets = useTicketsStore((s) => s.tickets)
  const storeLinks = useTicketsStore((s) => s.ticketEntityLinks)

  // Use appropriate data source
  const tickets = isDemoMode ? storeTickets : dbTickets
  const ticketEntityLinks = isDemoMode ? storeLinks : dbLinks

  // Filter state
  const [filters, setFilters] = useState<TicketFiltersValue>({
    categories: [],
    priorities: [],
    searchQuery: '',
  })

  // Modal state - single source of truth for form mode
  // formKey forces complete remount when opening
  const [formMode, setFormMode] = useState<FormMode>({ type: 'closed' })
  const [formKey, setFormKey] = useState(0)

  const handleEditTicket = (ticket: Ticket) => {
    setFormMode({ type: 'edit', ticket })
    setFormKey((k) => k + 1) // Force remount to read fresh data
  }

  const handleCreateTicket = () => {
    setFormMode({ type: 'create' })
    setFormKey((k) => k + 1) // Force remount
  }

  const handleCloseForm = () => {
    setFormMode({ type: 'closed' })
  }

  return (
    <div className="space-y-6">
      {/* Page header with Create button */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-text-primary">Tickets</h1>
        <button
          onClick={handleCreateTicket}
          className="flex items-center gap-2 px-4 py-2 bg-accent-600 hover:bg-accent-700 text-white rounded-lg transition-colors"
        >
          <Plus size={18} />
          Create Ticket
        </button>
      </div>

      {/* Summary statistics */}
      <section>
        <TicketsSummary tickets={tickets} />
      </section>

      {/* Filters */}
      <section>
        <TicketFiltersComponent filters={filters} onFiltersChange={setFilters} />
      </section>

      {/* Kanban board */}
      <section>
        <KanbanBoard
          filters={filters}
          onEditTicket={handleEditTicket}
          isDemoMode={isDemoMode}
          tickets={tickets}
          ticketEntityLinks={ticketEntityLinks}
        />
      </section>

      {/* Create/Edit modal - formKey forces complete remount to read fresh data */}
      <TicketForm
        key={formKey}
        isOpen={formMode.type !== 'closed'}
        onClose={handleCloseForm}
        ticket={formMode.type === 'edit' ? formMode.ticket : undefined}
        isDemoMode={isDemoMode}
        ticketEntityLinks={ticketEntityLinks}
      />
    </div>
  )
}
