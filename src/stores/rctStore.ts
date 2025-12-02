import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import { immer } from 'zustand/middleware/immer'
import type { RCTRow, Control, ControlLink, CustomColumn, ControlType, ChangeRequest, ControlTest, TestFrequency, RemediationPlan, RemediationStatus, ActionItem } from '@/types/rct'
import { calculateNextTestDate } from '@/utils/testScheduling'
import { isDemoMode } from '@/utils/authStorage'
import { format, isBefore, startOfDay, parseISO, addDays, isValid } from 'date-fns'
import { nanoid } from 'nanoid'
import { useAuditStore } from '@/stores/auditStore'
import { useUIStore } from '@/stores/uiStore'
import { useControlsStore } from '@/stores/controlsStore'
import type { FieldChange } from '@/types/audit'

// Score label for probability/impact
export interface ScoreLabel {
  score: number
  label: string
  description: string
}

// Default probability labels
const DEFAULT_PROBABILITY_LABELS: ScoreLabel[] = [
  { score: 1, label: 'Rare', description: 'Less than 5% chance of occurrence' },
  { score: 2, label: 'Unlikely', description: '5-25% chance of occurrence' },
  { score: 3, label: 'Possible', description: '25-50% chance of occurrence' },
  { score: 4, label: 'Likely', description: '50-75% chance of occurrence' },
  { score: 5, label: 'Almost Certain', description: 'Greater than 75% chance' },
]

// Default impact labels
const DEFAULT_IMPACT_LABELS: ScoreLabel[] = [
  { score: 1, label: 'Negligible', description: 'Minimal impact on operations' },
  { score: 2, label: 'Minor', description: 'Small operational disruption' },
  { score: 3, label: 'Moderate', description: 'Noticeable impact requiring response' },
  { score: 4, label: 'Major', description: 'Significant business disruption' },
  { score: 5, label: 'Catastrophic', description: 'Severe/existential threat' },
]

// Derive remediation priority from gross risk score
function derivePriority(grossScore: number | null): RemediationPlan['priority'] {
  if (grossScore === null) return 'medium'
  if (grossScore >= 20) return 'critical'   // 20-25
  if (grossScore >= 12) return 'high'       // 12-19
  if (grossScore >= 6) return 'medium'      // 6-11
  return 'low'                               // 1-5
}

/**
 * Calculate net scores for a row based on linked controls.
 * Takes the MINIMUM probability and MINIMUM impact separately from all controls,
 * then calculates netScore = minP * minI.
 *
 * If no controls: returns null values (caller should fall back to gross scores).
 * If controls exist but no scores set: returns null values.
 *
 * @param rowId - The RCT row ID to calculate scores for
 * @param controls - Array of all controls (from store in demo mode, from DB in authenticated mode)
 * @param controlLinks - Array of all control links (from store in demo mode, from DB in authenticated mode)
 */
export function calculateNetScoresFromLinks(
  rowId: string,
  controls: Control[],
  controlLinks: ControlLink[]
): {
  netProbability: number | null
  netImpact: number | null
  netScore: number | null
} {
  // Get all links for this row
  const rowLinks = controlLinks.filter(l => l.rowId === rowId)
  if (rowLinks.length === 0) {
    return { netProbability: null, netImpact: null, netScore: null }
  }

  // Collect probabilities and impacts from all controls
  const probabilities: number[] = []
  const impacts: number[] = []

  for (const link of rowLinks) {
    // Prefer link-specific override, fall back to control's score
    const control = controls.find(c => c.id === link.controlId)

    const prob = link.netProbability ?? control?.netProbability ?? null
    const imp = link.netImpact ?? control?.netImpact ?? null

    if (prob !== null) probabilities.push(prob)
    if (imp !== null) impacts.push(imp)
  }

  // Take minimum of each (best case scenario across all controls)
  const minProb = probabilities.length > 0 ? Math.min(...probabilities) : null
  const minImp = impacts.length > 0 ? Math.min(...impacts) : null

  // Calculate net score only if both min values exist
  const netScore = (minProb !== null && minImp !== null) ? minProb * minImp : null

  return {
    netProbability: minProb,
    netImpact: minImp,
    netScore,
  }
}

// Legacy function for backwards compatibility (uses store data - only works in demo mode)
export function calculateNetScoreFromLinks(rowId: string): number | null {
  const { controls, controlLinks } = useControlsStore.getState()
  return calculateNetScoresFromLinks(rowId, controls, controlLinks).netScore
}

interface RCTState {
  rows: RCTRow[]
  customColumns: CustomColumn[]
  columnVisibility: Record<string, boolean>
  columnOrder: string[]
  probabilityLabels: ScoreLabel[]
  impactLabels: ScoreLabel[]
  changeRequests: ChangeRequest[]
  controlTests: ControlTest[]
  remediationPlans: RemediationPlan[]
  // Column width state
  columnWidths: Record<string, number>
  defaultColumnWidth: number
  // Actions
  setRows: (rows: RCTRow[]) => void
  updateRow: (rowId: string, updates: Partial<RCTRow>) => void
  addControl: (rowId: string, control: Control) => void
  updateControl: (rowId: string, controlId: string, updates: Partial<Control>) => void
  removeControl: (rowId: string, controlId: string) => void
  addCustomColumn: (column: CustomColumn) => void
  removeCustomColumn: (columnId: string) => void
  updateCustomColumn: (columnId: string, updates: Partial<CustomColumn>) => void
  reorderCustomColumns: (fromIndex: number, toIndex: number) => void
  setColumnVisibility: (visibility: Record<string, boolean> | ((prev: Record<string, boolean>) => Record<string, boolean>)) => void
  setColumnOrder: (order: string[]) => void
  updateScoreLabel: (type: 'probability' | 'impact', score: number, updates: Partial<ScoreLabel>) => void
  addChangeRequest: (rowId: string, message: string, controlId?: string) => void
  resolveChangeRequest: (requestId: string) => void
  // Test-related actions
  recordControlTest: (test: Omit<ControlTest, 'id'>) => void
  updateControlSchedule: (
    rowId: string,
    controlId: string,
    frequency: TestFrequency | null,
    procedure?: string
  ) => void
  getTestHistory: (controlId: string) => ControlTest[]
  // Remediation actions
  createRemediationPlan: (plan: Omit<RemediationPlan, 'id' | 'createdDate' | 'priority'>, grossScore: number | null) => string
  updateRemediationPlan: (planId: string, updates: Partial<RemediationPlan>) => void
  updateRemediationStatus: (planId: string, status: RemediationStatus) => void
  addActionItem: (planId: string, description: string) => void
  toggleActionItem: (planId: string, actionItemId: string) => void
  removeActionItem: (planId: string, actionItemId: string) => void
  deleteRemediationPlan: (planId: string) => void
  getRemediationForTest: (controlTestId: string) => RemediationPlan | undefined
  getRemediationForControl: (controlId: string) => RemediationPlan[]
  getOverdueRemediations: () => RemediationPlan[]
  getUpcomingRemediations: (days: number) => RemediationPlan[]
  // Bulk setters for mock data loading
  setControlTests: (tests: ControlTest[]) => void
  setRemediationPlans: (plans: RemediationPlan[]) => void
  // Column width actions
  setColumnWidth: (columnId: string, width: number) => void
  resetColumnWidth: (columnId: string) => void
  resetAllColumnWidths: () => void
}

export const useRCTStore = create<RCTState>()(
  persist(
    immer((set) => ({
      rows: [],
      customColumns: [],
      columnVisibility: {
        // Hide internal ID columns by default (used for URL-based filtering from Matrix)
        riskId: false,
        processId: false,
      },
      columnOrder: [],
      probabilityLabels: DEFAULT_PROBABILITY_LABELS,
      impactLabels: DEFAULT_IMPACT_LABELS,
      changeRequests: [],
      controlTests: [],
      remediationPlans: [],
      columnWidths: {},
      defaultColumnWidth: 120,

      setRows: (rows) => set((state) => {
        state.rows = rows
      }),

      updateRow: (rowId, updates) => set((state) => {
        const row = state.rows.find(r => r.id === rowId)
        if (row) {
          // Capture before values for tracked fields
          const trackedFields = ['grossProbability', 'grossImpact', 'riskAppetite', 'grossProbabilityComment', 'grossImpactComment'] as const
          const fieldChanges: FieldChange[] = []
          for (const field of trackedFields) {
            if (field in updates && (updates as Record<string, unknown>)[field] !== (row as Record<string, unknown>)[field]) {
              fieldChanges.push({
                field,
                oldValue: (row as Record<string, unknown>)[field],
                newValue: (updates as Record<string, unknown>)[field],
              })
            }
          }

          Object.assign(row, updates)
          // Recalculate derived fields
          if (row.grossProbability !== null && row.grossImpact !== null) {
            row.grossScore = row.grossProbability * row.grossImpact
            row.withinAppetite = row.riskAppetite - row.grossScore
          } else {
            row.grossScore = null
            row.withinAppetite = null
          }

          // Log if significant changes
          if (fieldChanges.length > 0) {
            useAuditStore.getState().addEntry({
              timestamp: new Date().toISOString(),
              entityType: 'rctRow',
              entityId: rowId,
              entityName: `${row.riskName} x ${row.processName}`,
              changeType: 'update',
              fieldChanges,
              user: useUIStore.getState().selectedRole,
            })
          }
        }
      }),

      addControl: (rowId, control) => set((state) => {
        const row = state.rows.find(r => r.id === rowId)
        if (row) {
          row.controls.push(control)
          row.hasControls = true
          // Recalculate net score (lowest net score from controls)
          const validScores = row.controls
            .map(c => c.netScore)
            .filter((s): s is number => s !== null)
          row.netScore = validScores.length ? Math.min(...validScores) : null

          // Log control creation
          useAuditStore.getState().addEntry({
            timestamp: new Date().toISOString(),
            entityType: 'control',
            entityId: control.id,
            entityName: control.name,
            changeType: 'create',
            fieldChanges: [
              { field: 'name', oldValue: null, newValue: control.name },
              { field: 'description', oldValue: null, newValue: control.description },
              { field: 'type', oldValue: null, newValue: control.type },
              { field: 'rowId', oldValue: null, newValue: rowId },
            ],
            user: useUIStore.getState().selectedRole,
          })
        }
      }),

      updateControl: (rowId, controlId, updates) => set((state) => {
        const row = state.rows.find(r => r.id === rowId)
        if (row) {
          const control = row.controls.find(c => c.id === controlId)
          if (control) {
            // Capture before values for tracked fields (exclude computed netScore)
            const trackedFields = ['name', 'description', 'type', 'netProbability', 'netImpact', 'testFrequency', 'testProcedure'] as const
            const fieldChanges: FieldChange[] = []
            for (const field of trackedFields) {
              if (field in updates && (updates as Record<string, unknown>)[field] !== (control as Record<string, unknown>)[field]) {
                fieldChanges.push({
                  field,
                  oldValue: (control as Record<string, unknown>)[field],
                  newValue: (updates as Record<string, unknown>)[field],
                })
              }
            }

            Object.assign(control, updates)
            // Recalculate control's net score
            if (control.netProbability !== null && control.netImpact !== null) {
              control.netScore = control.netProbability * control.netImpact
            } else {
              control.netScore = null
            }
            // Recalculate row's net score
            const validScores = row.controls
              .map(c => c.netScore)
              .filter((s): s is number => s !== null)
            row.netScore = validScores.length ? Math.min(...validScores) : null

            // Log if significant changes
            if (fieldChanges.length > 0) {
              useAuditStore.getState().addEntry({
                timestamp: new Date().toISOString(),
                entityType: 'control',
                entityId: controlId,
                entityName: control.name,
                changeType: 'update',
                fieldChanges,
                user: useUIStore.getState().selectedRole,
              })
            }
          }
        }
      }),

      removeControl: (rowId, controlId) => set((state) => {
        const row = state.rows.find(r => r.id === rowId)
        let deletedControl: Control | undefined
        if (row) {
          deletedControl = row.controls.find(c => c.id === controlId)
          row.controls = row.controls.filter(c => c.id !== controlId)
          row.hasControls = row.controls.length > 0
          // Recalculate net score
          const validScores = row.controls
            .map(c => c.netScore)
            .filter((s): s is number => s !== null)
          row.netScore = validScores.length ? Math.min(...validScores) : null
        }
        // Cascade delete test records for this control
        const testIdsForControl = state.controlTests.filter(t => t.controlId === controlId).map(t => t.id)
        state.controlTests = state.controlTests.filter(t => t.controlId !== controlId)
        // Cascade delete remediation plans for this control's tests
        state.remediationPlans = state.remediationPlans.filter(p => !testIdsForControl.includes(p.controlTestId))

        // Log control deletion
        if (deletedControl) {
          useAuditStore.getState().addEntry({
            timestamp: new Date().toISOString(),
            entityType: 'control',
            entityId: controlId,
            entityName: deletedControl.name,
            changeType: 'delete',
            fieldChanges: [
              { field: 'name', oldValue: deletedControl.name, newValue: null },
            ],
            user: useUIStore.getState().selectedRole,
          })
        }
      }),

      addCustomColumn: (column) => set((state) => {
        state.customColumns.push(column)
        state.columnVisibility[column.id] = true
        state.columnOrder.push(column.id)

        // Log custom column creation
        useAuditStore.getState().addEntry({
          timestamp: new Date().toISOString(),
          entityType: 'customColumn',
          entityId: column.id,
          entityName: column.name,
          changeType: 'create',
          fieldChanges: [
            { field: 'name', oldValue: null, newValue: column.name },
            { field: 'type', oldValue: null, newValue: column.type },
          ],
          user: useUIStore.getState().selectedRole,
        })
      }),

      removeCustomColumn: (columnId) => set((state) => {
        const deletedColumn = state.customColumns.find(c => c.id === columnId)
        state.customColumns = state.customColumns.filter(c => c.id !== columnId)
        delete state.columnVisibility[columnId]
        state.columnOrder = state.columnOrder.filter(id => id !== columnId)
        // Remove custom values from all rows
        state.rows.forEach(row => {
          delete row.customValues[columnId]
        })

        // Log custom column deletion
        if (deletedColumn) {
          useAuditStore.getState().addEntry({
            timestamp: new Date().toISOString(),
            entityType: 'customColumn',
            entityId: columnId,
            entityName: deletedColumn.name,
            changeType: 'delete',
            fieldChanges: [
              { field: 'name', oldValue: deletedColumn.name, newValue: null },
            ],
            user: useUIStore.getState().selectedRole,
          })
        }
      }),

      updateCustomColumn: (columnId, updates) => set((state) => {
        const column = state.customColumns.find(c => c.id === columnId)
        if (column) {
          // Capture before values for tracked fields
          const trackedFields = ['name', 'type', 'formula', 'selectOptions'] as const
          const fieldChanges: FieldChange[] = []
          for (const field of trackedFields) {
            if (field in updates && (updates as Record<string, unknown>)[field] !== (column as Record<string, unknown>)[field]) {
              fieldChanges.push({
                field,
                oldValue: (column as Record<string, unknown>)[field],
                newValue: (updates as Record<string, unknown>)[field],
              })
            }
          }

          Object.assign(column, updates)

          // Log if significant changes
          if (fieldChanges.length > 0) {
            useAuditStore.getState().addEntry({
              timestamp: new Date().toISOString(),
              entityType: 'customColumn',
              entityId: columnId,
              entityName: column.name,
              changeType: 'update',
              fieldChanges,
              user: useUIStore.getState().selectedRole,
            })
          }
        }
      }),

      reorderCustomColumns: (fromIndex, toIndex) => set((state) => {
        // Move the column in the customColumns array
        const [removed] = state.customColumns.splice(fromIndex, 1)
        state.customColumns.splice(toIndex, 0, removed)
        // Also update columnOrder to reflect new position
        const columnId = removed.id
        const orderIndex = state.columnOrder.indexOf(columnId)
        if (orderIndex !== -1) {
          state.columnOrder.splice(orderIndex, 1)
          // Calculate new position in columnOrder based on surrounding custom columns
          const prevColumn = toIndex > 0 ? state.customColumns[toIndex - 1] : null
          const nextColumn = toIndex < state.customColumns.length - 1 ? state.customColumns[toIndex + 1] : null
          let newOrderIndex = state.columnOrder.length
          if (prevColumn) {
            const prevOrderIndex = state.columnOrder.indexOf(prevColumn.id)
            if (prevOrderIndex !== -1) {
              newOrderIndex = prevOrderIndex + 1
            }
          } else if (nextColumn) {
            const nextOrderIndex = state.columnOrder.indexOf(nextColumn.id)
            if (nextOrderIndex !== -1) {
              newOrderIndex = nextOrderIndex
            }
          }
          state.columnOrder.splice(newOrderIndex, 0, columnId)
        }
      }),

      setColumnVisibility: (visibility) => set((state) => {
        if (typeof visibility === 'function') {
          state.columnVisibility = visibility(state.columnVisibility)
        } else {
          state.columnVisibility = visibility
        }
      }),

      setColumnOrder: (order) => set((state) => {
        state.columnOrder = order
      }),

      updateScoreLabel: (type, score, updates) => set((state) => {
        const labels = type === 'probability' ? state.probabilityLabels : state.impactLabels
        const label = labels.find(l => l.score === score)
        if (label) {
          Object.assign(label, updates)
        }
      }),

      addChangeRequest: (rowId, message, controlId) => set((state) => {
        const request: ChangeRequest = {
          id: `cr-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
          rowId,
          controlId,
          message,
          timestamp: new Date(),
          status: 'pending',
        }
        state.changeRequests.push(request)
      }),

      resolveChangeRequest: (requestId) => set((state) => {
        const request = state.changeRequests.find(r => r.id === requestId)
        if (request) {
          request.status = 'resolved'
        }
      }),

      recordControlTest: (test) => set((state) => {
        const newTest: ControlTest = {
          ...test,
          id: `test-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
        }
        state.controlTests.push(newTest)

        // Update control's lastTestDate and calculate nextTestDate
        const row = state.rows.find(r => r.id === test.rowId)
        let controlName = 'Unknown Control'
        if (row) {
          const control = row.controls.find(c => c.id === test.controlId)
          if (control) {
            controlName = control.name
            control.lastTestDate = test.testDate
            if (control.testFrequency && control.testFrequency !== 'as-needed') {
              control.nextTestDate = calculateNextTestDate(test.testDate, control.testFrequency)
            }
          }
        }

        // Log test recording
        useAuditStore.getState().addEntry({
          timestamp: new Date().toISOString(),
          entityType: 'controlTest',
          entityId: newTest.id,
          entityName: controlName,
          changeType: 'create',
          fieldChanges: [
            { field: 'testDate', oldValue: null, newValue: test.testDate },
            { field: 'result', oldValue: null, newValue: test.result },
            { field: 'notes', oldValue: null, newValue: test.notes },
            { field: 'testedBy', oldValue: null, newValue: test.testedBy },
          ],
          user: useUIStore.getState().selectedRole,
        })
      }),

      updateControlSchedule: (rowId, controlId, frequency, procedure) => set((state) => {
        const row = state.rows.find(r => r.id === rowId)
        if (row) {
          const control = row.controls.find(c => c.id === controlId)
          if (control) {
            control.testFrequency = frequency
            if (procedure !== undefined) {
              control.testProcedure = procedure
            }
            // If setting schedule and no lastTestDate, set nextTestDate from today
            if (frequency && frequency !== 'as-needed' && !control.lastTestDate) {
              control.nextTestDate = format(new Date(), 'yyyy-MM-dd')
            }
            // Clear nextTestDate if frequency cleared
            if (!frequency) {
              control.nextTestDate = null
            }
          }
        }
      }),

      getTestHistory: (controlId) => {
        return useRCTStore.getState().controlTests
          .filter(t => t.controlId === controlId)
          .sort((a, b) => new Date(b.testDate).getTime() - new Date(a.testDate).getTime())
      },

      // Remediation actions
      createRemediationPlan: (plan, grossScore) => {
        const id = nanoid()
        const newPlan: RemediationPlan = {
          ...plan,
          id,
          createdDate: format(new Date(), 'yyyy-MM-dd'),
          priority: derivePriority(grossScore),
        }
        useRCTStore.setState((state) => {
          state.remediationPlans.push(newPlan)
        })

        // Log remediation plan creation
        useAuditStore.getState().addEntry({
          timestamp: new Date().toISOString(),
          entityType: 'remediationPlan',
          entityId: id,
          entityName: newPlan.title,
          changeType: 'create',
          fieldChanges: [
            { field: 'title', oldValue: null, newValue: newPlan.title },
            { field: 'description', oldValue: null, newValue: newPlan.description },
            { field: 'deadline', oldValue: null, newValue: newPlan.deadline },
            { field: 'assignee', oldValue: null, newValue: newPlan.assignee },
            { field: 'status', oldValue: null, newValue: newPlan.status },
            { field: 'priority', oldValue: null, newValue: newPlan.priority },
          ],
          user: useUIStore.getState().selectedRole,
        })

        return id
      },

      updateRemediationPlan: (planId, updates) => set((state) => {
        const plan = state.remediationPlans.find(p => p.id === planId)
        if (plan) {
          // Capture before values for tracked fields
          const trackedFields = ['title', 'description', 'deadline', 'assignee'] as const
          const fieldChanges: FieldChange[] = []
          for (const field of trackedFields) {
            if (field in updates && (updates as Record<string, unknown>)[field] !== (plan as Record<string, unknown>)[field]) {
              fieldChanges.push({
                field,
                oldValue: (plan as Record<string, unknown>)[field],
                newValue: (updates as Record<string, unknown>)[field],
              })
            }
          }

          const planName = plan.title
          Object.assign(plan, updates)

          // Log if significant changes
          if (fieldChanges.length > 0) {
            useAuditStore.getState().addEntry({
              timestamp: new Date().toISOString(),
              entityType: 'remediationPlan',
              entityId: planId,
              entityName: planName,
              changeType: 'update',
              fieldChanges,
              user: useUIStore.getState().selectedRole,
            })
          }
        }
      }),

      updateRemediationStatus: (planId, status) => set((state) => {
        const plan = state.remediationPlans.find(p => p.id === planId)
        if (plan) {
          const oldStatus = plan.status
          plan.status = status
          const today = format(new Date(), 'yyyy-MM-dd')
          if (status === 'resolved') {
            plan.resolvedDate = today
          } else if (status === 'closed') {
            plan.closedDate = today
          }

          // Log status change
          useAuditStore.getState().addEntry({
            timestamp: new Date().toISOString(),
            entityType: 'remediationPlan',
            entityId: planId,
            entityName: plan.title,
            changeType: 'update',
            fieldChanges: [
              { field: 'status', oldValue: oldStatus, newValue: status },
            ],
            user: useUIStore.getState().selectedRole,
          })
        }
      }),

      addActionItem: (planId, description) => set((state) => {
        const plan = state.remediationPlans.find(p => p.id === planId)
        if (plan) {
          const newItem: ActionItem = {
            id: nanoid(),
            description,
            completed: false,
          }
          plan.actionItems.push(newItem)
        }
      }),

      toggleActionItem: (planId, actionItemId) => set((state) => {
        const plan = state.remediationPlans.find(p => p.id === planId)
        if (plan) {
          const item = plan.actionItems.find(i => i.id === actionItemId)
          if (item) {
            item.completed = !item.completed
            if (item.completed) {
              item.completedDate = format(new Date(), 'yyyy-MM-dd')
            } else {
              delete item.completedDate
            }
          }
        }
      }),

      removeActionItem: (planId, actionItemId) => set((state) => {
        const plan = state.remediationPlans.find(p => p.id === planId)
        if (plan) {
          plan.actionItems = plan.actionItems.filter(i => i.id !== actionItemId)
        }
      }),

      deleteRemediationPlan: (planId) => set((state) => {
        const deletedPlan = state.remediationPlans.find(p => p.id === planId)
        state.remediationPlans = state.remediationPlans.filter(p => p.id !== planId)

        // Log remediation plan deletion
        if (deletedPlan) {
          useAuditStore.getState().addEntry({
            timestamp: new Date().toISOString(),
            entityType: 'remediationPlan',
            entityId: planId,
            entityName: deletedPlan.title,
            changeType: 'delete',
            fieldChanges: [
              { field: 'title', oldValue: deletedPlan.title, newValue: null },
            ],
            user: useUIStore.getState().selectedRole,
          })
        }
      }),

      getRemediationForTest: (controlTestId) => {
        return useRCTStore.getState().remediationPlans.find(p => p.controlTestId === controlTestId)
      },

      getRemediationForControl: (controlId) => {
        return useRCTStore.getState().remediationPlans.filter(p => p.controlId === controlId)
      },

      getOverdueRemediations: () => {
        const today = startOfDay(new Date())
        return useRCTStore.getState().remediationPlans.filter(p => {
          if (p.status !== 'open' && p.status !== 'in-progress') return false
          const parsed = parseISO(p.deadline)
          if (!isValid(parsed)) return false
          return isBefore(startOfDay(parsed), today)
        })
      },

      getUpcomingRemediations: (days) => {
        const today = startOfDay(new Date())
        const futureDate = addDays(today, days)
        return useRCTStore.getState().remediationPlans.filter(p => {
          if (p.status !== 'open' && p.status !== 'in-progress') return false
          const parsed = parseISO(p.deadline)
          if (!isValid(parsed)) return false
          const deadline = startOfDay(parsed)
          return !isBefore(deadline, today) && !isBefore(futureDate, deadline)
        })
      },

      // Bulk setters for mock data loading
      setControlTests: (tests) => set((state) => {
        state.controlTests = tests
      }),

      setRemediationPlans: (plans) => set((state) => {
        state.remediationPlans = plans
      }),

      // Column width actions
      setColumnWidth: (columnId, width) => set((state) => {
        const clampedWidth = Math.max(40, Math.min(400, width))
        state.columnWidths[columnId] = clampedWidth
      }),

      resetColumnWidth: (columnId) => set((state) => {
        delete state.columnWidths[columnId]
      }),

      resetAllColumnWidths: () => set((state) => {
        state.columnWidths = {}
      }),
    })),
    {
      name: 'riskguard-rct',
      storage: createJSONStorage(() => localStorage),
      merge: (persistedState, currentState) => ({
        ...currentState,
        ...(persistedState as Partial<RCTState>),
        columnVisibility: {
          ...((persistedState as Partial<RCTState>)?.columnVisibility || {}),
          // Always enforce hidden ID columns regardless of persisted state
          riskId: false,
          processId: false,
        },
      }),
      // Only persist data to localStorage in demo mode (not authenticated)
      // UI preferences (columnVisibility, columnOrder, columnWidths) persist regardless of auth state
      partialize: (state) => {
        // Check if authenticated using proper Supabase session detection
        if (!isDemoMode()) {
          // Authenticated - keep only UI preferences, not data
          return {
            columnVisibility: state.columnVisibility,
            columnOrder: state.columnOrder,
            columnWidths: state.columnWidths,
            defaultColumnWidth: state.defaultColumnWidth,
          }
        }
        // Demo mode - persist everything
        return {
          rows: state.rows,
          customColumns: state.customColumns,
          columnVisibility: state.columnVisibility,
          columnOrder: state.columnOrder,
          columnWidths: state.columnWidths,
          defaultColumnWidth: state.defaultColumnWidth,
          probabilityLabels: state.probabilityLabels,
          impactLabels: state.impactLabels,
          changeRequests: state.changeRequests,
          controlTests: state.controlTests,
          remediationPlans: state.remediationPlans,
        }
      },
    }
  )
)
