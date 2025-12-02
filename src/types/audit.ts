/**
 * EntityType - Types of entities that can be audited
 */
export type EntityType =
  | 'risk'
  | 'process'
  | 'control'
  | 'controlLink'
  | 'rctRow'
  | 'customColumn'
  | 'controlTest'
  | 'remediationPlan'
  | 'weight'
  | 'ticket'
  | 'ticketControlLink'
  | 'pendingChange'

/**
 * ChangeType - Types of change operations
 */
export type ChangeType = 'create' | 'update' | 'delete'

/**
 * FieldChange - Record of a single field change
 */
export interface FieldChange {
  /** Field path (e.g., 'grossProbability', 'controls[0].netScore') */
  field: string
  /** Value before change (null for creates) */
  oldValue: unknown
  /** Value after change (null for deletes) */
  newValue: unknown
}

/**
 * AuditEntry - Record of a change to an entity
 */
export interface AuditEntry {
  /** Unique identifier (nanoid) */
  id: string
  /** ISO 8601 timestamp */
  timestamp: string
  /** Type of entity changed */
  entityType: EntityType
  /** UUID of changed entity */
  entityId: string
  /** Human-readable name for display (captured at change time for historical accuracy) */
  entityName?: string
  /** Type of change operation */
  changeType: ChangeType
  /** Array of individual field changes */
  fieldChanges: FieldChange[]
  /** Role that made change ('risk-manager' | 'control-owner') */
  user: string
  /** Optional human-readable summary for bulk operations */
  summary?: string
}
