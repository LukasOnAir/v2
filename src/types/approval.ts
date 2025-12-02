/**
 * PendingChangeEntityType - entities subject to four-eye approval
 */
export type PendingChangeEntityType = 'control' | 'risk' | 'process'

/**
 * ApprovalStatus - lifecycle states for pending changes
 */
export type ApprovalStatus = 'pending' | 'approved' | 'rejected'

/**
 * PendingChange - a proposed modification awaiting manager review
 */
export interface PendingChange {
  /** Unique identifier (nanoid) */
  id: string
  /** Type of entity being modified */
  entityType: PendingChangeEntityType
  /** ID of entity being modified */
  entityId: string
  /** Captured name for display */
  entityName: string
  /** Type of change operation */
  changeType: 'create' | 'update' | 'delete'
  /** New values (full for create, delta for update) */
  proposedValues: Record<string, unknown>
  /** Snapshot at submission time */
  currentValues: Record<string, unknown>
  /** Current status in approval workflow */
  status: ApprovalStatus
  /** Role who made change */
  submittedBy: string
  /** ISO timestamp */
  submittedAt: string
  /** Manager who reviewed */
  reviewedBy?: string
  /** ISO timestamp */
  reviewedAt?: string
  /** Optional reason text for rejection */
  rejectionReason?: string
  /** Increment on re-edit */
  version: number
}

/**
 * ApprovalSettings - configuration for four-eye requirements
 */
export interface ApprovalSettings {
  /** Master toggle for four-eye approval */
  globalEnabled: boolean
  /** New control creation requires approval */
  requireForNewControls: boolean
  /** New risk items require approval */
  requireForNewRisks: boolean
  /** New process items require approval */
  requireForNewProcesses: boolean
  /** Per-entity enable/disable overrides (entityId -> enabled) */
  entityOverrides: Record<string, boolean>
}
