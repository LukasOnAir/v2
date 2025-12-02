import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import { immer } from 'zustand/middleware/immer'
import { nanoid } from 'nanoid'
import { subDays, isBefore, parseISO, isValid } from 'date-fns'
import type {
  PendingChange,
  ApprovalSettings,
  PendingChangeEntityType,
} from '@/types/approval'
import type { Control } from '@/types/rct'
import type { TaxonomyItem } from '@/types/taxonomy'
import { useAuditStore } from '@/stores/auditStore'
import { useUIStore } from '@/stores/uiStore'
import { useControlsStore } from '@/stores/controlsStore'
import { useTaxonomyStore } from '@/stores/taxonomyStore'
import { supabase } from '@/lib/supabase/client'

/**
 * Send approval notification via Edge Function.
 * Fire-and-forget pattern - doesn't block the main approval flow.
 *
 * Called from Zustand store (non-React context) so we use direct fetch.
 */
async function sendApprovalNotification(
  type: 'approval-request' | 'approval-result',
  recipientId: string,
  data: Record<string, unknown>
) {
  try {
    // Get current session for auth header
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
      console.warn('[Notification] No session available')
      return
    }

    // Fire-and-forget - don't await the full response
    fetch(
      `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-notification`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ type, recipientId, data }),
      }
    ).catch((error) => {
      console.error('[Notification] Failed to send:', error)
    })
  } catch (error) {
    console.error('[Notification] Error:', error)
  }
}

/**
 * Get all Manager user IDs in the current tenant.
 * Used to notify Managers when a new pending change is submitted.
 */
async function getManagerIds(): Promise<string[]> {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('id')
      .eq('role', 'manager')
      .eq('is_active', true)

    if (error) {
      console.error('[Notification] Failed to fetch managers:', error)
      return []
    }

    return data?.map((p) => p.id) || []
  } catch (error) {
    console.error('[Notification] Error fetching managers:', error)
    return []
  }
}

interface ApprovalState {
  /** All pending changes (approved/rejected kept for history) */
  pendingChanges: PendingChange[]
  /** Approval configuration */
  settings: ApprovalSettings

  // CRUD Actions
  /**
   * Create a new pending change request
   * @returns The ID of the created pending change
   */
  createPendingChange: (
    change: Omit<PendingChange, 'id' | 'status' | 'submittedAt' | 'version'>
  ) => string

  /**
   * Approve a pending change (Manager only)
   */
  approveChange: (pendingId: string) => void

  /**
   * Reject a pending change with optional reason (Manager only)
   */
  rejectChange: (pendingId: string, reason?: string) => void

  // Settings Actions
  /**
   * Update approval configuration
   */
  updateSettings: (updates: Partial<ApprovalSettings>) => void

  /**
   * Toggle per-entity approval override
   */
  toggleEntityApproval: (entityId: string, enabled: boolean) => void

  // Query Methods
  /**
   * Get all pending changes for a specific entity
   */
  getPendingForEntity: (entityId: string) => PendingChange[]

  /**
   * Get count of pending changes awaiting review
   */
  getPendingCount: () => number

  /**
   * Check if approval is required for an entity type/ID
   */
  isApprovalRequired: (
    entityType: PendingChangeEntityType,
    entityId: string
  ) => boolean

  /**
   * Clean up old approved/rejected entries (older than 30 days)
   */
  clearApprovedRejected: () => void

  /**
   * Apply an approved pending change to the actual entities
   * Called automatically after approval
   */
  applyPendingChange: (pendingId: string) => void

  // Bulk setter for mock data loading
  setPendingChanges: (changes: PendingChange[]) => void
}

export const useApprovalStore = create<ApprovalState>()(
  persist(
    immer((set, get) => ({
      pendingChanges: [],
      settings: {
        globalEnabled: false,
        requireForNewControls: false,
        requireForNewRisks: false,
        requireForNewProcesses: false,
        entityOverrides: {},
      },

      createPendingChange: (change) => {
        const role = useUIStore.getState().selectedRole
        const timestamp = new Date().toISOString()

        // Check for existing pending change to merge with (same entity, same submitter, still pending)
        const existingIdx = get().pendingChanges.findIndex(
          (c) =>
            c.entityId === change.entityId &&
            c.submittedBy === change.submittedBy &&
            c.status === 'pending'
        )

        if (existingIdx !== -1) {
          // Merge into existing pending change
          let mergedId = ''
          set((state) => {
            const existing = state.pendingChanges[existingIdx]
            // Merge proposed values (new values override old for same field)
            state.pendingChanges[existingIdx].proposedValues = {
              ...existing.proposedValues,
              ...change.proposedValues,
            }
            // Merge current values (keep original current values for fields already tracked)
            state.pendingChanges[existingIdx].currentValues = {
              ...change.currentValues,
              ...existing.currentValues, // Original current values take precedence
            }
            state.pendingChanges[existingIdx].version = (existing.version || 1) + 1
            state.pendingChanges[existingIdx].submittedAt = timestamp
            mergedId = existing.id
          })

          // Log merge to audit
          useAuditStore.getState().addEntry({
            timestamp,
            entityType: 'pendingChange',
            entityId: get().pendingChanges[existingIdx].id,
            entityName: `Updated: ${change.entityName}`,
            changeType: 'update',
            fieldChanges: Object.keys(change.proposedValues).map((field) => ({
              field,
              oldValue: null,
              newValue: change.proposedValues[field],
            })),
            user: role,
            summary: `Added fields to pending ${change.changeType} for ${change.entityType}: ${change.entityName}`,
          })

          // Notify all Managers about the updated pending change (fire-and-forget)
          getManagerIds().then((managerIds) => {
            managerIds.forEach((managerId) => {
              sendApprovalNotification('approval-request', managerId, {
                entityType: change.entityType,
                entityName: change.entityName,
                changeType: change.changeType,
                submitterName: change.submittedBy,
              })
            })
          })

          return mergedId
        }

        // No existing pending change - create new one
        const id = nanoid()

        set((state) => {
          const newChange: PendingChange = {
            ...change,
            id,
            status: 'pending',
            submittedAt: timestamp,
            version: 1,
          }
          state.pendingChanges.push(newChange)
        })

        // Log to audit
        useAuditStore.getState().addEntry({
          timestamp,
          entityType: 'pendingChange',
          entityId: id,
          entityName: `Pending: ${change.entityName}`,
          changeType: 'create',
          fieldChanges: [
            { field: 'entityType', oldValue: null, newValue: change.entityType },
            { field: 'changeType', oldValue: null, newValue: change.changeType },
            { field: 'submittedBy', oldValue: null, newValue: change.submittedBy },
          ],
          user: role,
          summary: `Proposed ${change.changeType} for ${change.entityType}: ${change.entityName}`,
        })

        // Notify all Managers about the new pending change (fire-and-forget)
        getManagerIds().then((managerIds) => {
          managerIds.forEach((managerId) => {
            sendApprovalNotification('approval-request', managerId, {
              entityType: change.entityType,
              entityName: change.entityName,
              changeType: change.changeType,
              submitterName: change.submittedBy,
            })
          })
        })

        return id
      },

      approveChange: (pendingId) => {
        const state = get()
        const change = state.pendingChanges.find((c) => c.id === pendingId)
        if (!change || change.status !== 'pending') return

        const role = useUIStore.getState().selectedRole
        const timestamp = new Date().toISOString()

        set((state) => {
          const idx = state.pendingChanges.findIndex((c) => c.id === pendingId)
          if (idx === -1) return
          state.pendingChanges[idx].status = 'approved'
          state.pendingChanges[idx].reviewedBy = role
          state.pendingChanges[idx].reviewedAt = timestamp
        })

        // Log to audit
        useAuditStore.getState().addEntry({
          timestamp,
          entityType: 'pendingChange',
          entityId: pendingId,
          entityName: `Approved: ${change.entityName}`,
          changeType: 'update',
          fieldChanges: [
            { field: 'status', oldValue: 'pending', newValue: 'approved' },
            { field: 'reviewedBy', oldValue: null, newValue: role },
          ],
          user: role,
          summary: `Approved ${change.changeType} for ${change.entityType}: ${change.entityName}`,
        })

        // Notify submitter about approval (fire-and-forget)
        sendApprovalNotification('approval-result', change.submittedBy, {
          entityName: change.entityName,
          result: 'approved',
          reviewerName: role,
        })

        // Apply the approved change to the real store
        get().applyPendingChange(pendingId)
      },

      rejectChange: (pendingId, reason) => {
        const state = get()
        const change = state.pendingChanges.find((c) => c.id === pendingId)
        if (!change || change.status !== 'pending') return

        const role = useUIStore.getState().selectedRole
        const timestamp = new Date().toISOString()

        set((state) => {
          const idx = state.pendingChanges.findIndex((c) => c.id === pendingId)
          if (idx === -1) return
          state.pendingChanges[idx].status = 'rejected'
          state.pendingChanges[idx].reviewedBy = role
          state.pendingChanges[idx].reviewedAt = timestamp
          if (reason) {
            state.pendingChanges[idx].rejectionReason = reason
          }
        })

        // Log to audit
        useAuditStore.getState().addEntry({
          timestamp,
          entityType: 'pendingChange',
          entityId: pendingId,
          entityName: `Rejected: ${change.entityName}`,
          changeType: 'update',
          fieldChanges: [
            { field: 'status', oldValue: 'pending', newValue: 'rejected' },
            { field: 'reviewedBy', oldValue: null, newValue: role },
            ...(reason ? [{ field: 'rejectionReason', oldValue: null, newValue: reason }] : []),
          ],
          user: role,
          summary: `Rejected ${change.changeType} for ${change.entityType}: ${change.entityName}${reason ? ` - ${reason}` : ''}`,
        })

        // Notify submitter about rejection (fire-and-forget)
        sendApprovalNotification('approval-result', change.submittedBy, {
          entityName: change.entityName,
          result: 'rejected',
          reviewerName: role,
          rejectionReason: reason,
        })
      },

      updateSettings: (updates) => {
        set((state) => {
          Object.assign(state.settings, updates)
        })
      },

      toggleEntityApproval: (entityId, enabled) => {
        set((state) => {
          if (enabled) {
            state.settings.entityOverrides[entityId] = true
          } else {
            delete state.settings.entityOverrides[entityId]
          }
        })
      },

      getPendingForEntity: (entityId) => {
        return get().pendingChanges.filter(
          (c) => c.entityId === entityId && c.status === 'pending'
        )
      },

      getPendingCount: () => {
        return get().pendingChanges.filter((c) => c.status === 'pending').length
      },

      isApprovalRequired: (entityType, entityId) => {
        const { settings } = get()

        // Check if globally disabled
        if (!settings.globalEnabled) return false

        // Check for per-entity override (explicit enable/disable)
        if (entityId in settings.entityOverrides) {
          return settings.entityOverrides[entityId]
        }

        // Fall back to entity type defaults
        switch (entityType) {
          case 'control':
            return settings.requireForNewControls
          case 'risk':
            return settings.requireForNewRisks
          case 'process':
            return settings.requireForNewProcesses
          default:
            return false
        }
      },

      clearApprovedRejected: () => {
        const cutoffDate = subDays(new Date(), 30)

        set((state) => {
          state.pendingChanges = state.pendingChanges.filter((c) => {
            // Keep all pending changes
            if (c.status === 'pending') return true

            // Keep approved/rejected only if reviewed within last 30 days
            if (c.reviewedAt) {
              const reviewedDate = parseISO(c.reviewedAt)
              if (isValid(reviewedDate)) {
                return !isBefore(reviewedDate, cutoffDate)
              }
            }

            // If no reviewedAt, check submittedAt
            const submittedDate = parseISO(c.submittedAt)
            if (isValid(submittedDate)) {
              return !isBefore(submittedDate, cutoffDate)
            }

            // Keep if we can't determine date
            return true
          })
        })
      },

      applyPendingChange: (pendingId) => {
        const state = get()
        const pending = state.pendingChanges.find((p) => p.id === pendingId)
        if (!pending || pending.status !== 'approved') return

        const { entityType, entityId, changeType, proposedValues } = pending

        // Apply to real store based on entity type
        if (entityType === 'control') {
          const controlsStore = useControlsStore.getState()

          if (changeType === 'create') {
            // For new controls, proposedValues contains the full control + rowId
            const { rowId, ...controlData } = proposedValues as { rowId?: string } & Omit<Control, 'id'>
            const newId = controlsStore.addControl(controlData)
            if (rowId) {
              controlsStore.linkControl(newId, rowId)
            }
          } else if (changeType === 'update') {
            // Check for per-link score overrides (link_netProbability, link_netImpact with _linkId)
            const linkId = proposedValues._linkId as string | undefined
            const hasLinkScores =
              linkId &&
              (proposedValues.link_netProbability !== undefined ||
                proposedValues.link_netImpact !== undefined)

            if (hasLinkScores) {
              // Apply per-link score overrides
              const linkUpdates: Partial<{ netProbability: number | null; netImpact: number | null }> = {}
              if (proposedValues.link_netProbability !== undefined) {
                linkUpdates.netProbability = proposedValues.link_netProbability as number
              }
              if (proposedValues.link_netImpact !== undefined) {
                linkUpdates.netImpact = proposedValues.link_netImpact as number
              }
              controlsStore.updateLink(linkId, linkUpdates)

              // Also apply any non-link fields to the control itself
              const controlUpdates: Record<string, unknown> = {}
              for (const [key, value] of Object.entries(proposedValues)) {
                if (!key.startsWith('link_') && key !== '_linkId') {
                  controlUpdates[key] = value
                }
              }
              if (Object.keys(controlUpdates).length > 0) {
                controlsStore.updateControl(entityId, controlUpdates as Partial<Control>)
              }
            } else {
              // Standard control update (no link overrides)
              controlsStore.updateControl(entityId, proposedValues as Partial<Control>)
            }
          } else if (changeType === 'delete') {
            controlsStore.removeControl(entityId)
          }
        } else if (entityType === 'risk' || entityType === 'process') {
          const taxonomyStore = useTaxonomyStore.getState()
          const tree = entityType === 'risk' ? taxonomyStore.risks : taxonomyStore.processes
          const setTree = entityType === 'risk' ? taxonomyStore.setRisks : taxonomyStore.setProcesses

          if (changeType === 'update') {
            // Update operation - handles name and/or description changes
            const updateTree = (items: TaxonomyItem[]): TaxonomyItem[] => {
              return items.map((item) => {
                if (item.id === entityId) {
                  const updates: Partial<TaxonomyItem> = {}
                  if ('name' in proposedValues) {
                    updates.name = (proposedValues as { name: string }).name
                  }
                  if ('description' in proposedValues) {
                    updates.description = (proposedValues as { description: string }).description
                  }
                  return { ...item, ...updates }
                }
                if (item.children) {
                  return { ...item, children: updateTree(item.children) }
                }
                return item
              })
            }
            setTree(updateTree(tree))
          } else if (changeType === 'delete') {
            // Delete operation
            const removeFromTree = (items: TaxonomyItem[]): TaxonomyItem[] => {
              return items
                .filter((item) => item.id !== entityId)
                .map((item) => ({
                  ...item,
                  children: item.children ? removeFromTree(item.children) : undefined,
                }))
            }
            setTree(removeFromTree(tree))
          } else if (changeType === 'create') {
            // New item - need to add to tree
            const { name, parentId } = proposedValues as { name: string; parentId: string | null }
            const newItem: TaxonomyItem = {
              id: nanoid(),
              name,
              hierarchicalId: '', // Will be regenerated by setTree
              description: '',
              children: [],
            }

            if (!parentId) {
              // Add to root
              setTree([...tree, newItem])
            } else {
              // Add as child of parent
              const addToTree = (items: TaxonomyItem[]): TaxonomyItem[] => {
                return items.map((item) => {
                  if (item.id === parentId) {
                    return { ...item, children: [...(item.children || []), newItem] }
                  }
                  if (item.children) {
                    return { ...item, children: addToTree(item.children) }
                  }
                  return item
                })
              }
              setTree(addToTree(tree))
            }
          }
        }
      },

      // Bulk setter for mock data loading
      setPendingChanges: (changes) => {
        set((state) => {
          state.pendingChanges = changes
        })
      },
    })),
    {
      name: 'riskguard-approval',
      storage: createJSONStorage(() => localStorage),
    }
  )
)
