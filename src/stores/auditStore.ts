import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import { immer } from 'zustand/middleware/immer'
import { nanoid } from 'nanoid'
import type { AuditEntry, EntityType } from '@/types/audit'

/** Maximum number of audit entries to retain */
const MAX_AUDIT_ENTRIES = 10000
/** Number of oldest entries to remove when limit reached */
const PRUNE_AMOUNT = 1000

interface AuditState {
  /** All audit entries (newest last) */
  entries: AuditEntry[]

  // Actions
  /**
   * Add a single audit entry
   * Auto-generates ID and prunes if exceeding MAX_AUDIT_ENTRIES
   */
  addEntry: (entry: Omit<AuditEntry, 'id'>) => void

  /**
   * Add a summary entry for bulk operations
   * (e.g., "Deleted risk '1.1' and 5 children")
   */
  addBulkEntry: (summary: string, entityType: EntityType, user: string) => void

  // Query methods
  /**
   * Get all entries for a specific entity
   * @returns Entries sorted by timestamp descending (newest first)
   */
  getEntriesForEntity: (entityId: string) => AuditEntry[]

  /**
   * Get entries within a date range
   * @param start Start date (inclusive)
   * @param end End date (inclusive)
   * @returns Entries sorted by timestamp descending
   */
  getEntriesByDateRange: (start: Date, end: Date) => AuditEntry[]

  /**
   * Get entries by entity type
   * @returns Entries sorted by timestamp descending
   */
  getEntriesByType: (entityType: EntityType) => AuditEntry[]

  /**
   * Get the most recent N entries
   * @param limit Number of entries to return
   * @returns Most recent entries sorted by timestamp descending
   */
  getRecentEntries: (limit: number) => AuditEntry[]

  // Bulk setter for mock data loading
  setEntries: (entries: AuditEntry[]) => void
}

export const useAuditStore = create<AuditState>()(
  persist(
    immer((set, get) => ({
      entries: [],

      addEntry: (entry) =>
        set((state) => {
          const newEntry: AuditEntry = {
            ...entry,
            id: nanoid(),
          }
          state.entries.push(newEntry)

          // Auto-prune if exceeding limit (keep most recent)
          if (state.entries.length > MAX_AUDIT_ENTRIES) {
            state.entries = state.entries.slice(PRUNE_AMOUNT)
          }
        }),

      addBulkEntry: (summary, entityType, user) =>
        set((state) => {
          const newEntry: AuditEntry = {
            id: nanoid(),
            timestamp: new Date().toISOString(),
            entityType,
            entityId: '', // No specific entity for bulk operations
            changeType: 'delete', // Bulk operations are typically deletes
            fieldChanges: [],
            user,
            summary,
          }
          state.entries.push(newEntry)

          // Auto-prune if exceeding limit
          if (state.entries.length > MAX_AUDIT_ENTRIES) {
            state.entries = state.entries.slice(PRUNE_AMOUNT)
          }
        }),

      getEntriesForEntity: (entityId) => {
        return get()
          .entries.filter((entry) => entry.entityId === entityId)
          .sort(
            (a, b) =>
              new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
          )
      },

      getEntriesByDateRange: (start, end) => {
        const startTime = start.getTime()
        const endTime = end.getTime()
        return get()
          .entries.filter((entry) => {
            const entryTime = new Date(entry.timestamp).getTime()
            return entryTime >= startTime && entryTime <= endTime
          })
          .sort(
            (a, b) =>
              new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
          )
      },

      getEntriesByType: (entityType) => {
        return get()
          .entries.filter((entry) => entry.entityType === entityType)
          .sort(
            (a, b) =>
              new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
          )
      },

      getRecentEntries: (limit) => {
        return get()
          .entries.slice()
          .sort(
            (a, b) =>
              new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
          )
          .slice(0, limit)
      },

      // Bulk setter for mock data loading
      setEntries: (entries) =>
        set((state) => {
          state.entries = entries
        }),
    })),
    {
      name: 'riskguard-audit',
      storage: createJSONStorage(() => localStorage),
    }
  )
)
