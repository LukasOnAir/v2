import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import { immer } from 'zustand/middleware/immer'

/** View modes for sunburst visualization */
export type ViewMode = 'net' | 'gross' | 'delta-gross-net' | 'delta-vs-appetite'

export interface LevelVisibility {
  l1: boolean
  l2: boolean
  l3: boolean
  l4: boolean
  l5: boolean
}

interface SunburstState {
  // View settings (persisted)
  /** Which taxonomy to visualize */
  taxonomyType: 'risk' | 'process'
  /** Which view mode: net, gross, delta-gross-net, or delta-vs-appetite */
  viewMode: ViewMode
  /** Aggregation mode: weighted average or maximum */
  aggregationMode: 'weighted' | 'max'
  /** Per-level visibility toggles */
  visibleLevels: LevelVisibility
  /** Whether to hide segments with no score data */
  hideNoData: boolean
  /** Whether to show names in addition to IDs on segments */
  showNames: boolean

  // Zoom state (NOT persisted - transient)
  /** Array of node IDs from root to current center (empty = root view) */
  zoomPath: string[]
  /** ID of the segment that is the current center (null = root) */
  currentCenterId: string | null

  // Animation state (NOT persisted - transient)
  /** Whether the initial opening animation has completed */
  animationComplete: boolean

  // Actions
  setTaxonomyType: (type: 'risk' | 'process') => void
  setViewMode: (mode: ViewMode) => void
  setAggregationMode: (mode: 'weighted' | 'max') => void
  toggleLevel: (level: 'l1' | 'l2' | 'l3' | 'l4' | 'l5') => void
  setHideNoData: (hide: boolean) => void
  setShowNames: (show: boolean) => void
  /** Set new center and path for zoom navigation */
  zoomTo: (nodeId: string, path: string[]) => void
  /** Go up one level (pop from path) */
  zoomOut: () => void
  /** Return to root view */
  resetZoom: () => void
  /** Set animation complete state */
  setAnimationComplete: (complete: boolean) => void
}

export const useSunburstStore = create<SunburstState>()(
  persist(
    immer((set) => ({
      // View settings defaults
      taxonomyType: 'risk',
      viewMode: 'net',
      aggregationMode: 'weighted',
      visibleLevels: {
        l1: true,
        l2: true,
        l3: true,
        l4: true,
        l5: true,
      },
      hideNoData: false,
      showNames: false,

      // Zoom state defaults (transient)
      zoomPath: [],
      currentCenterId: null,

      // Animation state defaults (transient)
      animationComplete: false,

      setTaxonomyType: (type) =>
        set((state) => {
          state.taxonomyType = type
          // Reset zoom when switching taxonomy
          state.zoomPath = []
          state.currentCenterId = null
        }),

      setViewMode: (mode) =>
        set((state) => {
          state.viewMode = mode
        }),

      setAggregationMode: (mode) =>
        set((state) => {
          state.aggregationMode = mode
        }),

      toggleLevel: (level) =>
        set((state) => {
          state.visibleLevels[level] = !state.visibleLevels[level]
        }),

      setHideNoData: (hide) =>
        set((state) => {
          state.hideNoData = hide
        }),

      setShowNames: (show) =>
        set((state) => {
          state.showNames = show
        }),

      zoomTo: (nodeId, path) =>
        set((state) => {
          state.currentCenterId = nodeId
          state.zoomPath = path
        }),

      zoomOut: () =>
        set((state) => {
          if (state.zoomPath.length > 0) {
            state.zoomPath.pop()
            state.currentCenterId =
              state.zoomPath.length > 0
                ? state.zoomPath[state.zoomPath.length - 1]
                : null
          }
        }),

      resetZoom: () =>
        set((state) => {
          state.zoomPath = []
          state.currentCenterId = null
        }),

      setAnimationComplete: (complete) =>
        set((state) => {
          state.animationComplete = complete
        }),
    })),
    {
      name: 'riskguard-sunburst',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        // Persist view settings only
        taxonomyType: state.taxonomyType,
        viewMode: state.viewMode,
        aggregationMode: state.aggregationMode,
        visibleLevels: state.visibleLevels,
        hideNoData: state.hideNoData,
        showNames: state.showNames,
        // Exclude zoom state and animation state (transient)
      }),
    }
  )
)
