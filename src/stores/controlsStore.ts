import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import { immer } from 'zustand/middleware/immer'
import { nanoid } from 'nanoid'
import type { Control, ControlLink } from '@/types/rct'
import { isDemoMode } from '@/utils/authStorage'
import { useAuditStore } from '@/stores/auditStore'
import { useUIStore } from '@/stores/uiStore'
import { useTicketsStore } from '@/stores/ticketsStore'

interface ControlsState {
  controls: Control[]
  controlLinks: ControlLink[]
  migrationVersion: number  // Track migration state (0 = not migrated, 1 = migrated)

  // Control CRUD
  addControl: (control: Omit<Control, 'id'>) => string
  updateControl: (controlId: string, updates: Partial<Control>) => void
  removeControl: (controlId: string) => void
  getControlById: (controlId: string) => Control | undefined

  // Link CRUD
  linkControl: (controlId: string, rowId: string) => string
  unlinkControl: (linkId: string) => void
  unlinkControlFromRow: (controlId: string, rowId: string) => void
  updateLink: (linkId: string, updates: Partial<ControlLink>) => void

  // Queries
  getControlsForRow: (rowId: string) => Control[]
  getLinksForRow: (rowId: string) => ControlLink[]
  getLinksForControl: (controlId: string) => ControlLink[]
  getRowIdsForControl: (controlId: string) => string[]

  // Migration
  setMigrationVersion: (version: number) => void
  importControls: (controls: Control[], links: ControlLink[]) => void
}

/** Fields to track for audit logging */
const TRACKED_CONTROL_FIELDS = [
  'name',
  'description',
  'controlType',
  'netProbability',
  'netImpact',
  'testFrequency',
  'testProcedure',
  'assignedTesterId',
] as const

export const useControlsStore = create<ControlsState>()(
  persist(
    immer((set, get) => ({
      controls: [],
      controlLinks: [],
      migrationVersion: 0,

      addControl: (control) => {
        const id = nanoid()
        const role = useUIStore.getState().selectedRole

        set((state) => {
          const newControl: Control = {
            ...control,
            id,
            // Ensure assignedTesterId defaults to null if not provided
            assignedTesterId: control.assignedTesterId ?? null,
            // Ensure netScore is calculated if probability and impact are set
            netScore:
              control.netProbability && control.netImpact
                ? control.netProbability * control.netImpact
                : null,
          }
          state.controls.push(newControl)
        })

        // Log to audit
        useAuditStore.getState().addEntry({
          timestamp: new Date().toISOString(),
          entityType: 'control',
          entityId: id,
          entityName: control.name,
          changeType: 'create',
          fieldChanges: [],
          user: role,
        })

        return id
      },

      updateControl: (controlId, updates) => {
        const state = get()
        const control = state.controls.find((c) => c.id === controlId)
        if (!control) return

        const role = useUIStore.getState().selectedRole
        const fieldChanges: { field: string; oldValue: unknown; newValue: unknown }[] = []

        // Track changes for audit
        for (const field of TRACKED_CONTROL_FIELDS) {
          if (field in updates && updates[field as keyof Control] !== control[field]) {
            fieldChanges.push({
              field,
              oldValue: control[field],
              newValue: updates[field as keyof Control],
            })
          }
        }

        set((state) => {
          const idx = state.controls.findIndex((c) => c.id === controlId)
          if (idx === -1) return

          Object.assign(state.controls[idx], updates)

          // Recalculate netScore if probability or impact changed
          const c = state.controls[idx]
          if ('netProbability' in updates || 'netImpact' in updates) {
            c.netScore =
              c.netProbability && c.netImpact ? c.netProbability * c.netImpact : null
          }
        })

        // Log to audit only if tracked fields changed
        if (fieldChanges.length > 0) {
          useAuditStore.getState().addEntry({
            timestamp: new Date().toISOString(),
            entityType: 'control',
            entityId: controlId,
            entityName: control.name,
            changeType: 'update',
            fieldChanges,
            user: role,
          })
        }
      },

      removeControl: (controlId) => {
        const state = get()
        const control = state.controls.find((c) => c.id === controlId)
        if (!control) return

        const role = useUIStore.getState().selectedRole

        set((state) => {
          // Remove the control
          state.controls = state.controls.filter((c) => c.id !== controlId)
          // Remove all links for this control
          state.controlLinks = state.controlLinks.filter((l) => l.controlId !== controlId)
        })

        // Remove ticket control links for this control (prevents orphaned links)
        const ticketsStore = useTicketsStore.getState()
        const ticketLinks = ticketsStore.ticketControlLinks.filter(l => l.controlId === controlId)
        for (const link of ticketLinks) {
          ticketsStore.unlinkTicketFromControl(link.ticketId, controlId)
        }

        // Log to audit
        useAuditStore.getState().addEntry({
          timestamp: new Date().toISOString(),
          entityType: 'control',
          entityId: controlId,
          entityName: control.name,
          changeType: 'delete',
          fieldChanges: [],
          user: role,
        })
      },

      getControlById: (controlId) => {
        return get().controls.find((c) => c.id === controlId)
      },

      linkControl: (controlId, rowId) => {
        const id = nanoid()
        const role = useUIStore.getState().selectedRole
        const control = get().controls.find((c) => c.id === controlId)

        set((state) => {
          const newLink: ControlLink = {
            id,
            controlId,
            rowId,
            createdAt: new Date().toISOString(),
          }
          state.controlLinks.push(newLink)
        })

        // Log to audit
        useAuditStore.getState().addEntry({
          timestamp: new Date().toISOString(),
          entityType: 'controlLink',
          entityId: id,
          entityName: control?.name ? `Link: ${control.name}` : undefined,
          changeType: 'create',
          fieldChanges: [
            { field: 'controlId', oldValue: null, newValue: controlId },
            { field: 'rowId', oldValue: null, newValue: rowId },
          ],
          user: role,
        })

        return id
      },

      unlinkControl: (linkId) => {
        const state = get()
        const link = state.controlLinks.find((l) => l.id === linkId)
        if (!link) return

        const role = useUIStore.getState().selectedRole
        const control = state.controls.find((c) => c.id === link.controlId)

        set((state) => {
          state.controlLinks = state.controlLinks.filter((l) => l.id !== linkId)
        })

        // Log to audit
        useAuditStore.getState().addEntry({
          timestamp: new Date().toISOString(),
          entityType: 'controlLink',
          entityId: linkId,
          entityName: control?.name ? `Unlink: ${control.name}` : undefined,
          changeType: 'delete',
          fieldChanges: [],
          user: role,
        })
      },

      unlinkControlFromRow: (controlId, rowId) => {
        const link = get().controlLinks.find(
          (l) => l.controlId === controlId && l.rowId === rowId
        )
        if (link) {
          get().unlinkControl(link.id)
        }
      },

      updateLink: (linkId, updates) => {
        const state = get()
        const link = state.controlLinks.find((l) => l.id === linkId)
        if (!link) return

        const role = useUIStore.getState().selectedRole
        const fieldChanges: { field: string; oldValue: unknown; newValue: unknown }[] = []

        // Track score changes
        for (const field of ['netProbability', 'netImpact', 'netScore'] as const) {
          if (field in updates && updates[field] !== link[field]) {
            fieldChanges.push({
              field,
              oldValue: link[field],
              newValue: updates[field],
            })
          }
        }

        set((state) => {
          const idx = state.controlLinks.findIndex((l) => l.id === linkId)
          if (idx === -1) return

          Object.assign(state.controlLinks[idx], updates)

          // Recalculate netScore if probability or impact changed
          const l = state.controlLinks[idx]
          if ('netProbability' in updates || 'netImpact' in updates) {
            l.netScore =
              l.netProbability && l.netImpact ? l.netProbability * l.netImpact : null
          }
        })

        // Log to audit only if fields changed
        if (fieldChanges.length > 0) {
          useAuditStore.getState().addEntry({
            timestamp: new Date().toISOString(),
            entityType: 'controlLink',
            entityId: linkId,
            changeType: 'update',
            fieldChanges,
            user: role,
          })
        }
      },

      getControlsForRow: (rowId) => {
        const state = get()
        const controlIds = state.controlLinks
          .filter((l) => l.rowId === rowId)
          .map((l) => l.controlId)
        return state.controls.filter((c) => controlIds.includes(c.id))
      },

      getLinksForRow: (rowId) => {
        return get().controlLinks.filter((l) => l.rowId === rowId)
      },

      getLinksForControl: (controlId) => {
        return get().controlLinks.filter((l) => l.controlId === controlId)
      },

      getRowIdsForControl: (controlId) => {
        return get()
          .controlLinks.filter((l) => l.controlId === controlId)
          .map((l) => l.rowId)
      },

      setMigrationVersion: (version) => {
        set((state) => {
          state.migrationVersion = version
        })
      },

      importControls: (controls, links) => {
        set((state) => {
          state.controls = controls
          state.controlLinks = links
        })
      },
    })),
    {
      name: 'riskguard-controls',
      storage: createJSONStorage(() => localStorage),
      // Only persist data to localStorage in demo mode (not authenticated)
      partialize: (state) => {
        // Check if authenticated using proper Supabase session detection
        if (!isDemoMode()) {
          // Authenticated - don't persist user data to localStorage
          return {}
        }
        // Demo mode - persist everything
        return {
          controls: state.controls,
          controlLinks: state.controlLinks,
          migrationVersion: state.migrationVersion,
        }
      },
    }
  )
)
