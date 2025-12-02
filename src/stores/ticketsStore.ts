import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import { immer } from 'zustand/middleware/immer'
import { nanoid } from 'nanoid'
import { addDays, addMonths, addYears, parseISO, startOfDay, isBefore, isAfter, isValid } from 'date-fns'
import type {
  Ticket,
  TicketStatus,
  TicketControlLink,
  TicketEntityLink,
  TicketLinkEntityType,
  TicketRecurrence,
  RecurrenceInterval,
} from '@/types/tickets'
import { useAuditStore } from '@/stores/auditStore'
import { useUIStore } from '@/stores/uiStore'

interface TicketsState {
  tickets: Ticket[]
  ticketEntityLinks: TicketEntityLink[]
  /** @deprecated Use ticketEntityLinks instead */
  ticketControlLinks: TicketControlLink[]
  archivedTickets: Ticket[]
  archiveDaysAfterDone: number

  // CRUD
  createTicket: (
    ticket: Omit<Ticket, 'id' | 'createdDate' | 'archived'>
  ) => string
  updateTicket: (ticketId: string, updates: Partial<Ticket>) => void
  updateTicketStatus: (ticketId: string, status: TicketStatus) => void
  deleteTicket: (ticketId: string) => void
  getTicketById: (ticketId: string) => Ticket | undefined

  // Entity link operations (generic)
  linkTicketToEntity: (
    ticketId: string,
    entityType: TicketLinkEntityType,
    entityId: string,
    entityName: string
  ) => string
  unlinkTicketFromEntity: (ticketId: string, entityType: TicketLinkEntityType, entityId: string) => void
  getEntityLinksForTicket: (ticketId: string) => TicketEntityLink[]
  getTicketsForEntity: (entityType: TicketLinkEntityType, entityId: string) => Ticket[]

  // Control link operations (convenience methods, use entity links internally)
  linkTicketToControl: (ticketId: string, controlId: string, controlName?: string) => string
  unlinkTicketFromControl: (ticketId: string, controlId: string) => void
  getControlIdsForTicket: (ticketId: string) => string[]
  getTicketsForControl: (controlId: string) => Ticket[]

  // Queries
  getActiveTickets: () => Ticket[]
  getOverdueTickets: () => Ticket[]
  getUpcomingTickets: (days: number) => Ticket[]

  // Archive management
  archiveEligibleTickets: () => void

  // Settings
  setArchiveDaysAfterDone: (days: number) => void

  // Bulk setters for mock data loading
  setTickets: (tickets: Ticket[]) => void
  setTicketEntityLinks: (links: TicketEntityLink[]) => void
}

/** Fields to track for audit logging */
const TRACKED_TICKET_FIELDS = [
  'title',
  'category',
  'status',
  'priority',
  'owner',
  'deadline',
] as const

/**
 * Calculate the next due date based on recurrence configuration
 */
function calculateNextDueDate(
  currentDue: string,
  interval: RecurrenceInterval,
  customDays?: number
): string {
  const date = parseISO(currentDue)
  if (!isValid(date)) {
    return currentDue
  }

  let nextDate: Date
  switch (interval) {
    case 'monthly':
      nextDate = addMonths(date, 1)
      break
    case 'quarterly':
      nextDate = addMonths(date, 3)
      break
    case 'annually':
      nextDate = addYears(date, 1)
      break
    case 'custom':
      nextDate = addDays(date, customDays ?? 30)
      break
    default:
      nextDate = addMonths(date, 1)
  }

  return nextDate.toISOString().split('T')[0]
}

export const useTicketsStore = create<TicketsState>()(
  persist(
    immer((set, get) => ({
      tickets: [],
      ticketEntityLinks: [],
      ticketControlLinks: [], // deprecated, kept for migration
      archivedTickets: [],
      archiveDaysAfterDone: 7,

      createTicket: (ticket) => {
        const id = nanoid()
        const role = useUIStore.getState().selectedRole

        set((state) => {
          const newTicket: Ticket = {
            ...ticket,
            id,
            createdDate: new Date().toISOString(),
            archived: false,
          }
          state.tickets.push(newTicket)
        })

        // Log to audit
        useAuditStore.getState().addEntry({
          timestamp: new Date().toISOString(),
          entityType: 'ticket',
          entityId: id,
          entityName: ticket.title,
          changeType: 'create',
          fieldChanges: [],
          user: role,
        })

        return id
      },

      updateTicket: (ticketId, updates) => {
        const state = get()
        const ticket = state.tickets.find((t) => t.id === ticketId)
        if (!ticket) return

        const role = useUIStore.getState().selectedRole
        const fieldChanges: { field: string; oldValue: unknown; newValue: unknown }[] = []

        // Track changes for audit
        for (const field of TRACKED_TICKET_FIELDS) {
          if (field in updates && updates[field as keyof Ticket] !== ticket[field]) {
            fieldChanges.push({
              field,
              oldValue: ticket[field],
              newValue: updates[field as keyof Ticket],
            })
          }
        }

        set((state) => {
          const idx = state.tickets.findIndex((t) => t.id === ticketId)
          if (idx === -1) return
          Object.assign(state.tickets[idx], updates)
        })

        // Log to audit only if tracked fields changed
        if (fieldChanges.length > 0) {
          useAuditStore.getState().addEntry({
            timestamp: new Date().toISOString(),
            entityType: 'ticket',
            entityId: ticketId,
            entityName: ticket.title,
            changeType: 'update',
            fieldChanges,
            user: role,
          })
        }
      },

      updateTicketStatus: (ticketId, status) => {
        const state = get()
        const ticket = state.tickets.find((t) => t.id === ticketId)
        if (!ticket) return

        const oldStatus = ticket.status
        const updates: Partial<Ticket> = { status }

        // Set doneDate when status becomes 'done'
        if (status === 'done' && oldStatus !== 'done') {
          updates.doneDate = new Date().toISOString()
        }
        // Clear doneDate if moving away from done
        if (status !== 'done' && oldStatus === 'done') {
          updates.doneDate = undefined
        }

        // Apply the update
        get().updateTicket(ticketId, updates)

        // Process recurrence ONLY if ticket completed AND has valid recurrence config
        // Extra defensive checks to prevent unexpected ticket creation
        const hasValidRecurrence =
          ticket.recurrence != null &&
          typeof ticket.recurrence === 'object' &&
          ticket.recurrence.interval != null &&
          typeof ticket.recurrence.interval === 'string' &&
          ticket.recurrence.interval.length > 0

        if (status === 'done' && oldStatus !== 'done' && hasValidRecurrence) {
          get().processRecurringTicket(ticket)
        }
      },

      deleteTicket: (ticketId) => {
        const state = get()
        const ticket = state.tickets.find((t) => t.id === ticketId)
        if (!ticket) return

        const role = useUIStore.getState().selectedRole

        set((state) => {
          // Remove the ticket
          state.tickets = state.tickets.filter((t) => t.id !== ticketId)
          // Remove all entity links for this ticket
          state.ticketEntityLinks = state.ticketEntityLinks.filter(
            (l) => l.ticketId !== ticketId
          )
        })

        // Log to audit
        useAuditStore.getState().addEntry({
          timestamp: new Date().toISOString(),
          entityType: 'ticket',
          entityId: ticketId,
          entityName: ticket.title,
          changeType: 'delete',
          fieldChanges: [],
          user: role,
        })
      },

      getTicketById: (ticketId) => {
        return get().tickets.find((t) => t.id === ticketId)
      },

      // Generic entity link operations
      linkTicketToEntity: (ticketId, entityType, entityId, entityName) => {
        const id = nanoid()
        const role = useUIStore.getState().selectedRole
        const ticket = get().tickets.find((t) => t.id === ticketId)

        set((state) => {
          const newLink: TicketEntityLink = {
            id,
            ticketId,
            entityType,
            entityId,
            entityName,
            createdAt: new Date().toISOString(),
          }
          state.ticketEntityLinks.push(newLink)
        })

        // Log to audit
        useAuditStore.getState().addEntry({
          timestamp: new Date().toISOString(),
          entityType: 'ticketControlLink', // Using same audit type for compatibility
          entityId: id,
          entityName: ticket?.title ? `Link: ${ticket.title} → ${entityName}` : undefined,
          changeType: 'create',
          fieldChanges: [
            { field: 'ticketId', oldValue: null, newValue: ticketId },
            { field: 'entityType', oldValue: null, newValue: entityType },
            { field: 'entityId', oldValue: null, newValue: entityId },
          ],
          user: role,
        })

        return id
      },

      unlinkTicketFromEntity: (ticketId, entityType, entityId) => {
        const state = get()
        const link = state.ticketEntityLinks.find(
          (l) => l.ticketId === ticketId && l.entityType === entityType && l.entityId === entityId
        )
        if (!link) return

        const role = useUIStore.getState().selectedRole
        const ticket = state.tickets.find((t) => t.id === ticketId)

        set((state) => {
          state.ticketEntityLinks = state.ticketEntityLinks.filter(
            (l) => l.id !== link.id
          )
        })

        // Log to audit
        useAuditStore.getState().addEntry({
          timestamp: new Date().toISOString(),
          entityType: 'ticketControlLink',
          entityId: link.id,
          entityName: ticket?.title ? `Unlink: ${ticket.title}` : undefined,
          changeType: 'delete',
          fieldChanges: [],
          user: role,
        })
      },

      getEntityLinksForTicket: (ticketId) => {
        return get().ticketEntityLinks.filter((l) => l.ticketId === ticketId)
      },

      getTicketsForEntity: (entityType, entityId) => {
        const state = get()
        const ticketIds = state.ticketEntityLinks
          .filter((l) => l.entityType === entityType && l.entityId === entityId)
          .map((l) => l.ticketId)
        return state.tickets.filter((t) => ticketIds.includes(t.id) && !t.archived)
      },

      // Control-specific convenience methods (use entity links internally)
      linkTicketToControl: (ticketId, controlId, controlName = 'Control') => {
        return get().linkTicketToEntity(ticketId, 'control', controlId, controlName)
      },

      unlinkTicketFromControl: (ticketId, controlId) => {
        get().unlinkTicketFromEntity(ticketId, 'control', controlId)
      },

      getControlIdsForTicket: (ticketId) => {
        return get()
          .ticketEntityLinks
          .filter((l) => l.ticketId === ticketId && l.entityType === 'control')
          .map((l) => l.entityId)
      },

      getTicketsForControl: (controlId) => {
        return get().getTicketsForEntity('control', controlId)
      },

      getActiveTickets: () => {
        return get().tickets.filter((t) => !t.archived)
      },

      getOverdueTickets: () => {
        const today = startOfDay(new Date())
        return get().tickets.filter((t) => {
          if (t.archived || t.status === 'done') return false
          const deadline = parseISO(t.deadline)
          return isValid(deadline) && isBefore(deadline, today)
        })
      },

      getUpcomingTickets: (days) => {
        const today = startOfDay(new Date())
        const futureDate = addDays(today, days)
        return get().tickets.filter((t) => {
          if (t.archived || t.status === 'done') return false
          const deadline = parseISO(t.deadline)
          if (!isValid(deadline)) return false
          // Deadline is between today and futureDate (inclusive)
          return (
            (isAfter(deadline, today) || deadline.getTime() === today.getTime()) &&
            (isBefore(deadline, futureDate) || deadline.getTime() === futureDate.getTime())
          )
        })
      },

      archiveEligibleTickets: () => {
        const state = get()
        const today = startOfDay(new Date())
        const archiveDays = state.archiveDaysAfterDone

        set((state) => {
          const toArchive: Ticket[] = []
          const remaining: Ticket[] = []

          for (const ticket of state.tickets) {
            if (ticket.status === 'done' && ticket.doneDate) {
              const doneDate = parseISO(ticket.doneDate)
              if (isValid(doneDate)) {
                const archiveAfterDate = addDays(startOfDay(doneDate), archiveDays)
                if (isBefore(archiveAfterDate, today) || archiveAfterDate.getTime() === today.getTime()) {
                  toArchive.push({ ...ticket, archived: true })
                  continue
                }
              }
            }
            remaining.push(ticket)
          }

          state.tickets = remaining
          state.archivedTickets.push(...toArchive)
        })
      },

      setArchiveDaysAfterDone: (days) => {
        set((state) => {
          state.archiveDaysAfterDone = days
        })
      },

      // Bulk setters for mock data loading
      setTickets: (tickets) => {
        set((state) => {
          state.tickets = tickets
        })
      },

      setTicketEntityLinks: (links) => {
        set((state) => {
          state.ticketEntityLinks = links
        })
      },

      // Internal: Process recurring ticket when completed
      processRecurringTicket: (completedTicket: Ticket) => {
        if (!completedTicket.recurrence) return

        const recurrence = completedTicket.recurrence
        const nextDueDate = calculateNextDueDate(
          recurrence.nextDue,
          recurrence.interval,
          recurrence.customDays
        )

        // Create new ticket with next deadline
        const newTicket: Omit<Ticket, 'id' | 'createdDate' | 'archived'> = {
          title: completedTicket.title,
          description: completedTicket.description,
          category: completedTicket.category,
          status: 'todo',
          priority: completedTicket.priority,
          owner: completedTicket.owner,
          deadline: nextDueDate,
          recurrence: {
            interval: recurrence.interval,
            customDays: recurrence.customDays,
            nextDue: nextDueDate,
          },
          notes: completedTicket.notes,
        }

        const newTicketId = get().createTicket(newTicket)

        // Copy entity links to new ticket
        const links = get().ticketEntityLinks.filter(
          (l) => l.ticketId === completedTicket.id
        )
        for (const link of links) {
          get().linkTicketToEntity(newTicketId, link.entityType, link.entityId, link.entityName)
        }
      },
    })),
    {
      name: 'riskguard-tickets',
      storage: createJSONStorage(() => localStorage),
      // Clean up any malformed recurrence data on rehydration
      onRehydrateStorage: () => (state) => {
        if (!state) return
        // Clean up tickets with malformed recurrence
        for (const ticket of state.tickets) {
          if (ticket.recurrence) {
            // Remove recurrence if interval is missing or invalid
            if (
              !ticket.recurrence.interval ||
              typeof ticket.recurrence.interval !== 'string' ||
              ticket.recurrence.interval.length === 0
            ) {
              ticket.recurrence = undefined
            }
          }
        }
      },
    }
  )
)

// Add processRecurringTicket to interface for internal use
declare module 'zustand' {
  interface StoreApi<T> {
    processRecurringTicket?: (ticket: Ticket) => void
  }
}
