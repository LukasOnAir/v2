import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import { immer } from 'zustand/middleware/immer'
import type { TaxonomyItem, TaxonomyWeights } from '@/types/taxonomy'
import { generateHierarchicalIds } from '@/utils/hierarchicalId'
import { isDemoMode as checkDemoMode } from '@/utils/authStorage'
import { useAuditStore } from '@/stores/auditStore'
import { useUIStore } from '@/stores/uiStore'
import type { EntityType, FieldChange } from '@/types/audit'

/** Default weight configuration with all levels at 1.0 */
const DEFAULT_TAXONOMY_WEIGHTS: TaxonomyWeights = {
  levelDefaults: { l1: 1, l2: 1, l3: 1, l4: 1, l5: 1 },
  nodeOverrides: {},
}

/** Build a lookup map of taxonomy items by ID */
function buildItemMap(items: TaxonomyItem[]): Map<string, TaxonomyItem> {
  const map = new Map<string, TaxonomyItem>()
  function traverse(nodes: TaxonomyItem[]) {
    for (const node of nodes) {
      map.set(node.id, node)
      if (node.children) traverse(node.children)
    }
  }
  traverse(items)
  return map
}

/** Log taxonomy changes to audit store */
function logTaxonomyChanges(
  entityType: EntityType,
  oldItems: TaxonomyItem[],
  newItems: TaxonomyItem[]
): void {
  const oldMap = buildItemMap(oldItems)
  const newMap = buildItemMap(newItems)
  const user = useUIStore.getState().selectedRole
  const timestamp = new Date().toISOString()
  const auditStore = useAuditStore.getState()

  // Find created items
  for (const [id, item] of newMap) {
    if (!oldMap.has(id)) {
      auditStore.addEntry({
        timestamp,
        entityType,
        entityId: id,
        entityName: `${item.hierarchicalId} ${item.name}`,
        changeType: 'create',
        fieldChanges: [
          { field: 'name', oldValue: null, newValue: item.name },
          { field: 'hierarchicalId', oldValue: null, newValue: item.hierarchicalId },
        ],
        user,
      })
    }
  }

  // Find deleted items
  const deletedItems: TaxonomyItem[] = []
  for (const [id, item] of oldMap) {
    if (!newMap.has(id)) {
      deletedItems.push(item)
    }
  }

  // Log bulk delete if multiple items deleted
  if (deletedItems.length > 1) {
    auditStore.addBulkEntry(
      `Deleted ${deletedItems.length} ${entityType}${deletedItems.length > 1 ? 's' : ''} including '${deletedItems[0].hierarchicalId}'`,
      entityType,
      user
    )
  } else if (deletedItems.length === 1) {
    const item = deletedItems[0]
    auditStore.addEntry({
      timestamp,
      entityType,
      entityId: item.id,
      entityName: `${item.hierarchicalId} ${item.name}`,
      changeType: 'delete',
      fieldChanges: [
        { field: 'name', oldValue: item.name, newValue: null },
      ],
      user,
    })
  }

  // Find updated items (same ID, different name)
  for (const [id, newItem] of newMap) {
    const oldItem = oldMap.get(id)
    if (oldItem && oldItem.name !== newItem.name) {
      auditStore.addEntry({
        timestamp,
        entityType,
        entityId: id,
        entityName: `${newItem.hierarchicalId} ${newItem.name}`,
        changeType: 'update',
        fieldChanges: [
          { field: 'name', oldValue: oldItem.name, newValue: newItem.name },
        ],
        user,
      })
    }
  }
}

/** Collect all node IDs from taxonomy tree */
function getAllNodeIds(items: TaxonomyItem[]): string[] {
  const ids: string[] = []
  function traverse(nodes: TaxonomyItem[]) {
    for (const node of nodes) {
      ids.push(node.id)
      if (node.children) traverse(node.children)
    }
  }
  traverse(items)
  return ids
}

interface TaxonomyState {
  /** Risk taxonomy tree */
  risks: TaxonomyItem[]
  /** Process taxonomy tree */
  processes: TaxonomyItem[]
  /** Weight configuration for risk taxonomy */
  riskWeights: TaxonomyWeights
  /** Weight configuration for process taxonomy */
  processWeights: TaxonomyWeights
  /** Replace entire risks tree (auto-regenerates hierarchical IDs) */
  setRisks: (items: TaxonomyItem[]) => void
  /** Replace entire processes tree (auto-regenerates hierarchical IDs) */
  setProcesses: (items: TaxonomyItem[]) => void
  /** Set default weight for a taxonomy level (0.1-5.0) */
  setLevelWeight: (type: 'risk' | 'process', level: 1 | 2 | 3 | 4 | 5, weight: number) => void
  /** Set or remove node weight override (null removes override) */
  setNodeWeight: (type: 'risk' | 'process', nodeId: string, weight: number | null) => void
  /** Get effective weight for a node (override or level default) */
  getEffectiveWeight: (type: 'risk' | 'process', nodeId: string, level: number) => number
}

/**
 * Helper to check if we're in demo mode (for use in Zustand actions).
 * Note: This is a utility function, not a React hook.
 * Re-exported from authStorage utility for backward compatibility.
 */
export { isDemoMode } from '@/utils/authStorage'

export const useTaxonomyStore = create<TaxonomyState>()(
  persist(
    immer((set, get) => ({
      risks: [],
      processes: [],
      riskWeights: { ...DEFAULT_TAXONOMY_WEIGHTS, nodeOverrides: {} },
      processWeights: { ...DEFAULT_TAXONOMY_WEIGHTS, nodeOverrides: {} },

      setRisks: (items) =>
        set((state) => {
          const oldRisks = state.risks
          state.risks = generateHierarchicalIds(items)
          // Clean orphaned weight overrides
          const validIds = new Set(getAllNodeIds(state.risks))
          for (const nodeId of Object.keys(state.riskWeights.nodeOverrides)) {
            if (!validIds.has(nodeId)) {
              delete state.riskWeights.nodeOverrides[nodeId]
            }
          }
          // Log taxonomy changes
          logTaxonomyChanges('risk', oldRisks, state.risks)
        }),

      setProcesses: (items) =>
        set((state) => {
          const oldProcesses = state.processes
          state.processes = generateHierarchicalIds(items)
          // Clean orphaned weight overrides
          const validIds = new Set(getAllNodeIds(state.processes))
          for (const nodeId of Object.keys(state.processWeights.nodeOverrides)) {
            if (!validIds.has(nodeId)) {
              delete state.processWeights.nodeOverrides[nodeId]
            }
          }
          // Log taxonomy changes
          logTaxonomyChanges('process', oldProcesses, state.processes)
        }),

      setLevelWeight: (type, level, weight) =>
        set((state) => {
          const clampedWeight = Math.round(Math.max(0.1, Math.min(5.0, weight)) * 10) / 10
          const weightsKey = type === 'risk' ? 'riskWeights' : 'processWeights'
          const levelKey = `l${level}` as keyof TaxonomyWeights['levelDefaults']
          const oldWeight = state[weightsKey].levelDefaults[levelKey]
          state[weightsKey].levelDefaults[levelKey] = clampedWeight
          // Log weight change
          if (oldWeight !== clampedWeight) {
            useAuditStore.getState().addEntry({
              timestamp: new Date().toISOString(),
              entityType: 'weight',
              entityId: `${type}-level-${level}`,
              entityName: `${type === 'risk' ? 'Risk' : 'Process'} Level ${level} Weight`,
              changeType: 'update',
              fieldChanges: [
                { field: 'weight', oldValue: oldWeight, newValue: clampedWeight },
              ],
              user: useUIStore.getState().selectedRole,
            })
          }
        }),

      setNodeWeight: (type, nodeId, weight) =>
        set((state) => {
          const weightsKey = type === 'risk' ? 'riskWeights' : 'processWeights'
          const oldWeight = state[weightsKey].nodeOverrides[nodeId] ?? null
          if (weight === null) {
            delete state[weightsKey].nodeOverrides[nodeId]
          } else {
            const clampedWeight = Math.round(Math.max(0.1, Math.min(5.0, weight)) * 10) / 10
            state[weightsKey].nodeOverrides[nodeId] = clampedWeight
          }
          // Log weight change
          const newWeight = weight === null ? null : Math.round(Math.max(0.1, Math.min(5.0, weight)) * 10) / 10
          if (oldWeight !== newWeight) {
            useAuditStore.getState().addEntry({
              timestamp: new Date().toISOString(),
              entityType: 'weight',
              entityId: nodeId,
              entityName: `${type === 'risk' ? 'Risk' : 'Process'} Node Override`,
              changeType: weight === null ? 'delete' : (oldWeight === null ? 'create' : 'update'),
              fieldChanges: [
                { field: 'weight', oldValue: oldWeight, newValue: newWeight },
              ],
              user: useUIStore.getState().selectedRole,
            })
          }
        }),

      getEffectiveWeight: (type, nodeId, level) => {
        const state = get()
        const weights = type === 'risk' ? state.riskWeights : state.processWeights
        if (nodeId in weights.nodeOverrides) {
          return weights.nodeOverrides[nodeId]
        }
        const levelKey = `l${level}` as keyof TaxonomyWeights['levelDefaults']
        return weights.levelDefaults[levelKey]
      },
    })),
    {
      name: 'riskguard-taxonomy',
      storage: createJSONStorage(() => localStorage),
      // Only persist data to localStorage in demo mode (not authenticated)
      partialize: (state) => {
        // Check if authenticated using proper Supabase session detection
        if (!checkDemoMode()) {
          // Authenticated - don't persist user data to localStorage
          return {}
        }
        // Demo mode - persist everything
        return {
          risks: state.risks,
          processes: state.processes,
          riskWeights: state.riskWeights,
          processWeights: state.processWeights,
        }
      },
    }
  )
)
