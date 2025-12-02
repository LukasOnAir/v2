/**
 * TicketStatus - Status of a control maintenance ticket
 */
export type TicketStatus = 'todo' | 'in-progress' | 'review' | 'done'

/**
 * TicketCategory - Category of control maintenance work
 */
export type TicketCategory = 'maintenance' | 'periodic-review' | 'update-change' | 'other'

/**
 * TicketPriority - Priority level (matches RemediationPlan)
 */
export type TicketPriority = 'critical' | 'high' | 'medium' | 'low'

/**
 * RecurrenceInterval - How often a recurring ticket should repeat
 */
export type RecurrenceInterval = 'monthly' | 'quarterly' | 'annually' | 'custom'

/**
 * TicketRecurrence - Configuration for recurring tickets
 */
export interface TicketRecurrence {
  /** Recurrence interval type */
  interval: RecurrenceInterval
  /** Custom interval in days (only used when interval is 'custom') */
  customDays?: number
  /** Next due date for the recurrence (ISO date string) */
  nextDue: string
}

/**
 * Ticket - Control maintenance ticket
 */
export interface Ticket {
  /** Unique identifier (nanoid) */
  id: string
  /** Short title for the ticket */
  title: string
  /** Detailed description of the work */
  description?: string
  /** Category of maintenance work */
  category: TicketCategory
  /** Current status */
  status: TicketStatus
  /** Priority level */
  priority: TicketPriority
  /** Person responsible for the ticket */
  owner: string
  /** Deadline date (ISO date string yyyy-MM-dd) */
  deadline: string
  /** Optional recurrence configuration for repeating tickets */
  recurrence?: TicketRecurrence
  /** When the ticket was created (ISO timestamp) */
  createdDate: string
  /** When status changed to done (ISO timestamp) */
  doneDate?: string
  /** Whether the ticket is archived */
  archived: boolean
  /** Additional notes */
  notes?: string
}

/**
 * TicketLinkEntityType - Types of entities that can be linked to a ticket
 * 'other' allows custom free-text links for items not in the predefined list
 */
export type TicketLinkEntityType = 'control' | 'risk' | 'process' | 'rctRow' | 'other'

/**
 * TicketEntityLink - Links a ticket to any supported entity (many-to-many junction)
 * Allows one ticket to cover multiple entities of different types
 */
export interface TicketEntityLink {
  /** Unique identifier (nanoid) */
  id: string
  /** Reference to Ticket */
  ticketId: string
  /** Type of entity being linked */
  entityType: TicketLinkEntityType
  /** Reference to the entity (controlId, riskId, processId, or rctRowId) */
  entityId: string
  /** Display name of the entity (for quick reference without lookup) */
  entityName: string
  /** When the link was created (ISO timestamp) */
  createdAt: string
}

/**
 * @deprecated Use TicketEntityLink instead
 * TicketControlLink - Links a ticket to a control (many-to-many junction)
 * Kept for backward compatibility during migration
 */
export interface TicketControlLink {
  /** Unique identifier (nanoid) */
  id: string
  /** Reference to Ticket */
  ticketId: string
  /** Reference to Control */
  controlId: string
  /** When the link was created (ISO timestamp) */
  createdAt: string
}
