import { detailedDiff } from 'deep-object-diff'
import { useUIStore } from '@/stores/uiStore'
import type { FieldChange } from '@/types/audit'

/**
 * Fields that should be excluded from audit logging
 * These are computed or derived fields that change as side effects
 */
export const EXCLUDED_FIELDS = [
  'grossScore',
  'netScore',
  'withinAppetite',
  'hasControls',
] as const

/**
 * Convert detailedDiff output to FieldChange array
 * @param oldValue Previous state of the entity
 * @param newValue New state of the entity
 * @param excludeFields Fields to exclude from the diff
 * @returns Array of field changes
 */
export function diffToFieldChanges(
  oldValue: Record<string, unknown>,
  newValue: Record<string, unknown>,
  excludeFields: readonly string[] = EXCLUDED_FIELDS
): FieldChange[] {
  const diff = detailedDiff(oldValue, newValue)
  const fieldChanges: FieldChange[] = []
  const excludeSet = new Set(excludeFields)

  // Process added fields
  if (diff.added && typeof diff.added === 'object') {
    for (const [field, value] of Object.entries(diff.added)) {
      if (!excludeSet.has(field)) {
        fieldChanges.push({
          field,
          oldValue: null,
          newValue: value,
        })
      }
    }
  }

  // Process updated fields
  if (diff.updated && typeof diff.updated === 'object') {
    for (const [field, value] of Object.entries(diff.updated)) {
      if (!excludeSet.has(field)) {
        fieldChanges.push({
          field,
          oldValue: oldValue[field],
          newValue: value,
        })
      }
    }
  }

  // Process deleted fields
  if (diff.deleted && typeof diff.deleted === 'object') {
    for (const [field] of Object.entries(diff.deleted)) {
      if (!excludeSet.has(field)) {
        fieldChanges.push({
          field,
          oldValue: oldValue[field],
          newValue: null,
        })
      }
    }
  }

  return fieldChanges
}

/**
 * Check if there are any significant (non-excluded) field changes
 * @param fieldChanges Array of field changes to check
 * @returns True if there are any changes
 */
export function hasSignificantChanges(fieldChanges: FieldChange[]): boolean {
  return fieldChanges.length > 0
}

/**
 * Get the current user's role from uiStore
 * @returns Current user role
 */
export function getCurrentUser(): string {
  return useUIStore.getState().selectedRole
}

/**
 * Build field changes for specific tracked fields
 * More explicit than diffToFieldChanges - use when you know exact fields to track
 * @param oldValue Previous state
 * @param newValue New state (updates)
 * @param trackedFields Fields to track changes for
 * @returns Array of field changes
 */
export function buildFieldChanges<T extends Record<string, unknown>>(
  oldValue: T,
  newValue: Partial<T>,
  trackedFields: (keyof T)[]
): FieldChange[] {
  const fieldChanges: FieldChange[] = []

  for (const field of trackedFields) {
    if (field in newValue && newValue[field] !== oldValue[field]) {
      fieldChanges.push({
        field: String(field),
        oldValue: oldValue[field],
        newValue: newValue[field],
      })
    }
  }

  return fieldChanges
}
