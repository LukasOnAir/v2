import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import { immer } from 'zustand/middleware/immer'

/** Display mode for risk and process labels */
export type LabelMode = 'id' | 'name' | 'both'

/**
 * @deprecated Use TaxonomyWeights from '@/types/taxonomy' instead.
 * This type is kept for backwards compatibility during migration.
 * Matrix and Sunburst now read weights from taxonomyStore.
 */
export interface AggregationWeights {
  l1: number
  l2: number
  l3: number
  l4: number
  l5: number
}

interface MatrixState {
  /** Zoom level: 1 = normal, 0.5 = zoomed out, 2 = zoomed in */
  zoomLevel: number
  /** Show score numbers in cells (auto-toggle at zoom threshold >= 0.75) */
  showNumbers: boolean
  /**
   * @deprecated Use taxonomyStore.riskWeights and taxonomyStore.processWeights instead.
   * Kept for backwards compatibility during migration.
   */
  weights: AggregationWeights
  /** Currently expanded cell (riskId + processId) */
  expandedCell: { riskId: string; processId: string } | null
  /** Columns to show in expanded view */
  expandedViewColumns: string[]
  /** When true, risks become rows and processes become columns (default: false = processes as rows) */
  isInverted: boolean
  /** Controls risk label display format: 'id', 'name', or 'both' (default: 'both' = "1.2: Risk Name") */
  riskLabelMode: LabelMode
  /** Controls process label display format: 'id', 'name', or 'both' (default: 'both' = "1.2: Process Name") */
  processLabelMode: LabelMode
  /** Map of column item ID to custom width in pixels */
  columnWidths: Record<string, number>
  /** Map of row item ID to custom height in pixels */
  rowHeights: Record<string, number>
  /** Default width for columns when no custom width is set */
  defaultColumnWidth: number
  /** Default height for rows when no custom height is set */
  defaultRowHeight: number
  /** Height of the column header row (first row with column labels) */
  headerRowHeight: number
  // Actions
  setZoomLevel: (level: number) => void
  setShowNumbers: (show: boolean) => void
  /**
   * @deprecated Use taxonomyStore.setLevelWeight and taxonomyStore.setNodeWeight instead.
   */
  setWeights: (weights: Partial<AggregationWeights>) => void
  setExpandedCell: (cell: { riskId: string; processId: string } | null) => void
  setExpandedViewColumns: (columns: string[]) => void
  setIsInverted: (inverted: boolean) => void
  setRiskLabelMode: (mode: LabelMode) => void
  setProcessLabelMode: (mode: LabelMode) => void
  /** Set width for a specific column (clamped to 40-400px) */
  setColumnWidth: (columnId: string, width: number) => void
  /** Set height for a specific row (clamped to 30-200px) */
  setRowHeight: (rowId: string, height: number) => void
  /** Remove custom width for column (reverts to default) */
  resetColumnWidth: (columnId: string) => void
  /** Remove custom height for row (reverts to default) */
  resetRowHeight: (rowId: string) => void
  /** Clear all custom column widths and row heights */
  resetAllSizes: () => void
  /** Set height for the column header row (clamped to 40-200px) */
  setHeaderRowHeight: (height: number) => void
}

/**
 * @deprecated Use DEFAULT_TAXONOMY_WEIGHTS in taxonomyStore or AggregationWeights in utils/aggregation.
 */
export const DEFAULT_WEIGHTS: AggregationWeights = {
  l1: 1,
  l2: 1,
  l3: 1,
  l4: 1,
  l5: 1,
}

export const useMatrixStore = create<MatrixState>()(
  persist(
    immer((set) => ({
      zoomLevel: 1,
      showNumbers: true,
      weights: { ...DEFAULT_WEIGHTS },
      expandedCell: null,
      expandedViewColumns: ['riskName', 'processName', 'grossScore', 'netScore'],
      isInverted: false,
      riskLabelMode: 'both' as LabelMode,
      processLabelMode: 'both' as LabelMode,
      columnWidths: {} as Record<string, number>,
      rowHeights: {} as Record<string, number>,
      defaultColumnWidth: 60,
      defaultRowHeight: 60,
      headerRowHeight: 60,

      setZoomLevel: (level) =>
        set((state) => {
          state.zoomLevel = Math.max(0.5, Math.min(2, level))
          // Auto-toggle numbers visibility based on zoom threshold
          state.showNumbers = state.zoomLevel >= 0.75
        }),

      setShowNumbers: (show) =>
        set((state) => {
          state.showNumbers = show
        }),

      /** @deprecated Use taxonomyStore.setLevelWeight instead */
      setWeights: (weights) =>
        set((state) => {
          Object.assign(state.weights, weights)
        }),

      setExpandedCell: (cell) =>
        set((state) => {
          state.expandedCell = cell
        }),

      setExpandedViewColumns: (columns) =>
        set((state) => {
          state.expandedViewColumns = columns
        }),

      setIsInverted: (inverted) =>
        set((state) => {
          state.isInverted = inverted
        }),

      setRiskLabelMode: (mode) =>
        set((state) => {
          state.riskLabelMode = mode
        }),

      setProcessLabelMode: (mode) =>
        set((state) => {
          state.processLabelMode = mode
        }),

      setColumnWidth: (columnId, width) =>
        set((state) => {
          const clampedWidth = Math.max(40, Math.min(400, width))
          state.columnWidths[columnId] = clampedWidth
        }),

      setRowHeight: (rowId, height) =>
        set((state) => {
          const clampedHeight = Math.max(30, Math.min(200, height))
          state.rowHeights[rowId] = clampedHeight
        }),

      resetColumnWidth: (columnId) =>
        set((state) => {
          delete state.columnWidths[columnId]
        }),

      resetRowHeight: (rowId) =>
        set((state) => {
          delete state.rowHeights[rowId]
        }),

      resetAllSizes: () =>
        set((state) => {
          state.columnWidths = {}
          state.rowHeights = {}
          state.headerRowHeight = 60
        }),

      setHeaderRowHeight: (height) =>
        set((state) => {
          state.headerRowHeight = Math.max(40, Math.min(200, height))
        }),
    })),
    {
      name: 'riskguard-matrix',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        zoomLevel: state.zoomLevel,
        showNumbers: state.showNumbers,
        weights: state.weights,
        expandedViewColumns: state.expandedViewColumns,
        isInverted: state.isInverted,
        riskLabelMode: state.riskLabelMode,
        processLabelMode: state.processLabelMode,
        columnWidths: state.columnWidths,
        rowHeights: state.rowHeights,
        defaultColumnWidth: state.defaultColumnWidth,
        defaultRowHeight: state.defaultRowHeight,
        headerRowHeight: state.headerRowHeight,
        // Don't persist expandedCell - it's transient UI state
      }),
    }
  )
)
