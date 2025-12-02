import React, { useMemo, useCallback } from 'react'
import { useTaxonomyStore } from '@/stores/taxonomyStore'
import { useRCTStore } from '@/stores/rctStore'
import { useMatrixStore, type LabelMode } from '@/stores/matrixStore'
import { useIsDemoMode } from '@/hooks/useTenantData'
import { useTaxonomy } from '@/hooks/useTaxonomy'
import { useRCTRows, type RCTRowData } from '@/hooks/useRCTRows'
import { calculateWeightedAverage } from '@/utils/aggregation'
import { MatrixCell } from './MatrixCell'
import { ResizeHandle } from './ResizeHandle'
import type { TaxonomyItem } from '@/types/taxonomy'
import type { RCTRow } from '@/types/rct'

/**
 * Format a label based on the selected label mode
 * @param positionalId - The hierarchical ID (e.g., "1.2.3")
 * @param name - The item name
 * @param mode - The label display mode
 */
function formatLabel(positionalId: string, name: string, mode: LabelMode): string {
  switch (mode) {
    case 'id':
      return positionalId
    case 'name':
      return name
    case 'both':
    default:
      return `${positionalId}: ${name}`
  }
}

/**
 * Find taxonomy item by ID (recursive search through tree)
 */
function findTaxonomyById(items: TaxonomyItem[], id: string): TaxonomyItem | null {
  for (const item of items) {
    if (item.id === id) return item
    if (item.children) {
      const found = findTaxonomyById(item.children, id)
      if (found) return found
    }
  }
  return null
}

/**
 * Build a map from item ID to its parent item by traversing the tree.
 * Returns a map where key is child ID, value is parent item.
 */
function buildParentMap(items: TaxonomyItem[]): Map<string, TaxonomyItem | null> {
  const parentMap = new Map<string, TaxonomyItem | null>()

  function traverse(item: TaxonomyItem, parent: TaxonomyItem | null) {
    parentMap.set(item.id, parent)
    if (item.children) {
      for (const child of item.children) {
        traverse(child, item)
      }
    }
  }

  // Root items have no parent
  for (const item of items) {
    traverse(item, null)
  }

  return parentMap
}

/**
 * Get the ancestry path for a taxonomy item by walking up the tree.
 * Returns ancestors from root to leaf (index 0 is root, last is the item itself).
 */
function getAncestryPath(
  item: TaxonomyItem,
  parentMap: Map<string, TaxonomyItem | null>
): TaxonomyItem[] {
  const path: TaxonomyItem[] = [item]
  let current = parentMap.get(item.id)

  while (current) {
    path.push(current)
    current = parentMap.get(current.id)
  }

  return path.reverse() // Now ordered from root to leaf
}

/**
 * Compute the positional hierarchical ID for a taxonomy item.
 * Returns a dotted string like "1", "1.2", "1.2.3" based on the item's position in the tree.
 */
function computePositionalId(
  items: TaxonomyItem[],
  ancestryPath: TaxonomyItem[],
  parentMap: Map<string, TaxonomyItem | null>
): string {
  const positions: number[] = []

  for (const item of ancestryPath) {
    const parent = parentMap.get(item.id)
    // Get siblings: either root items or parent's children
    const siblings = parent ? (parent.children || []) : items
    // Find 1-based position among siblings
    const position = siblings.findIndex(s => s.id === item.id) + 1
    positions.push(position)
  }

  return positions.join('.')
}

/**
 * Get the hierarchy path for a taxonomy item (L1 through L5)
 * Uses tree structure traversal instead of parsing hierarchical IDs.
 */
function getHierarchyPath(
  items: TaxonomyItem[],
  itemId: string,
  parentMap?: Map<string, TaxonomyItem | null>
): { l1Id: string; l2Id: string; l3Id: string; l4Id: string; l5Id: string } {
  const result = {
    l1Id: '', l2Id: '', l3Id: '', l4Id: '', l5Id: '',
  }

  const item = findTaxonomyById(items, itemId)
  if (!item) return result

  // Build parent map if not provided
  const pMap = parentMap ?? buildParentMap(items)

  // Get ancestry path from root to leaf
  const ancestryPath = getAncestryPath(item, pMap)

  // Assign each level (L1 is root, L5 is deepest)
  // Compute positional IDs from tree structure (e.g., "1", "1.2", "1.2.3")
  for (let i = 0; i < ancestryPath.length && i < 5; i++) {
    const level = i + 1
    const key = `l${level}` as 'l1' | 'l2' | 'l3' | 'l4' | 'l5'
    // Compute positional ID for this level (ancestry up to this point)
    const levelAncestry = ancestryPath.slice(0, i + 1)
    const positionalId = computePositionalId(items, levelAncestry, pMap)
    result[`${key}Id` as keyof typeof result] = positionalId
  }

  return result
}

/**
 * Convert database RCT row data to minimal RCTRow with denormalized hierarchy IDs
 * Only includes fields needed for calculateWeightedAverage (scoring/aggregation)
 */
function denormalizeForMatrix(
  dbRow: RCTRowData,
  risks: TaxonomyItem[],
  processes: TaxonomyItem[],
  riskParentMap?: Map<string, TaxonomyItem | null>,
  processParentMap?: Map<string, TaxonomyItem | null>
): RCTRow {
  const riskPath = getHierarchyPath(risks, dbRow.riskId, riskParentMap)
  const processPath = getHierarchyPath(processes, dbRow.processId, processParentMap)

  // Build a minimal RCTRow with required fields for scoring
  return {
    id: dbRow.id,
    // Risk hierarchy (use hierarchical IDs for level matching)
    riskId: dbRow.riskId,
    riskL1Id: riskPath.l1Id,
    riskL1Name: '',
    riskL2Id: riskPath.l2Id,
    riskL2Name: '',
    riskL3Id: riskPath.l3Id,
    riskL3Name: '',
    riskL4Id: riskPath.l4Id,
    riskL4Name: '',
    riskL5Id: riskPath.l5Id,
    riskL5Name: '',
    riskName: '',
    riskDescription: '',
    // Process hierarchy
    processId: dbRow.processId,
    processL1Id: processPath.l1Id,
    processL1Name: '',
    processL2Id: processPath.l2Id,
    processL2Name: '',
    processL3Id: processPath.l3Id,
    processL3Name: '',
    processL4Id: processPath.l4Id,
    processL4Name: '',
    processL5Id: processPath.l5Id,
    processL5Name: '',
    processName: '',
    processDescription: '',
    // Scoring fields
    grossProbability: dbRow.grossProbability,
    grossImpact: dbRow.grossImpact,
    grossScore: dbRow.grossScore,
    grossProbabilityComment: dbRow.grossProbabilityComment ?? undefined,
    grossImpactComment: dbRow.grossImpactComment ?? undefined,
    netProbability: null,
    netImpact: null,
    netScore: null,
    riskAppetite: dbRow.riskAppetite,
    withinAppetite: dbRow.withinAppetite ?? undefined,
  }
}

/**
 * Recursively get all leaf nodes from a taxonomy tree
 * Leaf nodes are items with no children or empty children array
 */
function getLeafNodes(items: TaxonomyItem[]): TaxonomyItem[] {
  const leaves: TaxonomyItem[] = []

  function traverse(item: TaxonomyItem) {
    if (!item.children || item.children.length === 0) {
      leaves.push(item)
    } else {
      item.children.forEach(traverse)
    }
  }

  items.forEach(traverse)
  return leaves
}

export function MatrixGrid() {
  // Demo mode check
  const isDemoMode = useIsDemoMode()

  // Store data (for demo mode)
  const { risks: storeRisks, processes: storeProcesses, riskWeights } = useTaxonomyStore()
  const { rows: storeRows } = useRCTStore()
  const {
    zoomLevel,
    isInverted,
    riskLabelMode,
    processLabelMode,
    columnWidths,
    rowHeights,
    defaultColumnWidth,
    defaultRowHeight,
    headerRowHeight,
    setColumnWidth,
    setRowHeight,
    setHeaderRowHeight,
  } = useMatrixStore()

  // Database hooks (for authenticated mode)
  const { data: dbRisks } = useTaxonomy('risk')
  const { data: dbProcesses } = useTaxonomy('process')
  const { data: dbRctRows } = useRCTRows()

  // Use appropriate data sources
  const risks = isDemoMode ? storeRisks : (dbRisks || [])
  const processes = isDemoMode ? storeProcesses : (dbProcesses || [])

  // Build parent maps for efficient hierarchy lookups (memoized separately)
  const riskParentMap = useMemo(() => buildParentMap(risks), [risks])
  const processParentMap = useMemo(() => buildParentMap(processes), [processes])

  // Build denormalized rows when using database
  const rows = useMemo(() => {
    if (isDemoMode) {
      return storeRows
    }
    // Denormalize database rows with taxonomy data for scoring
    if (!dbRctRows || risks.length === 0 || processes.length === 0) {
      return []
    }
    return dbRctRows.map(dbRow => denormalizeForMatrix(dbRow, risks, processes, riskParentMap, processParentMap))
  }, [isDemoMode, storeRows, dbRctRows, risks, processes, riskParentMap, processParentMap])

  // Get leaf nodes for rows (processes) and columns (risks)
  const processLeaves = useMemo(() => getLeafNodes(processes), [processes])
  const riskLeaves = useMemo(() => getLeafNodes(risks), [risks])

  // Compute positional IDs for display (e.g., "1", "1.2", "1.2.3")
  const riskPositionalIds = useMemo(() => {
    const map = new Map<string, string>()
    for (const risk of riskLeaves) {
      const ancestryPath = getAncestryPath(risk, riskParentMap)
      const positionalId = computePositionalId(risks, ancestryPath, riskParentMap)
      map.set(risk.id, positionalId)
    }
    return map
  }, [riskLeaves, risks, riskParentMap])

  const processPositionalIds = useMemo(() => {
    const map = new Map<string, string>()
    for (const process of processLeaves) {
      const ancestryPath = getAncestryPath(process, processParentMap)
      const positionalId = computePositionalId(processes, ancestryPath, processParentMap)
      map.set(process.id, positionalId)
    }
    return map
  }, [processLeaves, processes, processParentMap])

  // Determine row/column assignment based on inversion
  const columnItems = isInverted ? processLeaves : riskLeaves
  const rowItems = isInverted ? riskLeaves : processLeaves
  const columnPositionalIds = isInverted ? processPositionalIds : riskPositionalIds
  const rowPositionalIds = isInverted ? riskPositionalIds : processPositionalIds
  const columnLabelMode = isInverted ? processLabelMode : riskLabelMode
  const rowLabelMode = isInverted ? riskLabelMode : processLabelMode

  // Calculate aggregation map for all cells
  // Uses riskWeights.levelDefaults from taxonomyStore for weight configuration
  const scoreMap = useMemo(() => {
    const map = new Map<string, number | null>()

    for (const process of processLeaves) {
      for (const risk of riskLeaves) {
        const key = `${risk.id}-${process.id}`
        const score = calculateWeightedAverage(
          rows,
          risk.id,
          process.id,
          riskWeights.levelDefaults,
          'gross' // Default to gross score
        )
        map.set(key, score)
      }
    }

    return map
  }, [rows, riskLeaves, processLeaves, riskWeights])

  // Cell size based on zoom (for data cells and fallback)
  const cellSize = 60 * zoomLevel
  const headerWidth = 200

  // Helper to get column width with fallback to default (respecting zoom)
  const getColumnWidth = useCallback(
    (itemId: string): number => {
      const customWidth = columnWidths[itemId]
      return customWidth ?? defaultColumnWidth * zoomLevel
    },
    [columnWidths, defaultColumnWidth, zoomLevel]
  )

  // Helper to get row height with fallback to default (respecting zoom)
  const getRowHeight = useCallback(
    (itemId: string): number => {
      const customHeight = rowHeights[itemId]
      return customHeight ?? defaultRowHeight * zoomLevel
    },
    [rowHeights, defaultRowHeight, zoomLevel]
  )

  // Auto-fit column width based on label length (simple heuristic: ~8px per char, min 80px)
  const autoFitColumnWidth = useCallback(
    (itemId: string, label: string) => {
      const estimatedWidth = Math.max(80, label.length * 8 + 16) // +16 for padding
      setColumnWidth(itemId, estimatedWidth)
    },
    [setColumnWidth]
  )

  // Column widths for grid template
  const columnWidthsStr = useMemo(() => {
    return columnItems.map(item => `${getColumnWidth(item.id)}px`).join(' ')
  }, [columnItems, getColumnWidth])

  // Empty state
  if (riskLeaves.length === 0 || processLeaves.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-12 bg-surface-elevated border border-surface-border rounded-lg">
        <svg
          className="w-16 h-16 text-text-muted mb-4"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z"
          />
        </svg>
        <h3 className="text-lg font-medium text-text-primary mb-2">
          No Matrix Data Available
        </h3>
        <p className="text-text-secondary text-center max-w-md">
          {riskLeaves.length === 0 && processLeaves.length === 0
            ? 'Add risks and processes in the Taxonomy Builders to see the matrix.'
            : riskLeaves.length === 0
              ? 'Add risks in the Risk Taxonomy Builder to see the matrix.'
              : 'Add processes in the Process Taxonomy Builder to see the matrix.'}
        </p>
      </div>
    )
  }

  return (
    <div
      className="overflow-auto border border-surface-border rounded-lg bg-surface"
      style={{ maxHeight: 'calc(100vh - 220px)' }}
    >
      <div
        className="grid"
        style={{
          gridTemplateColumns: `${headerWidth}px ${columnWidthsStr}`,
          width: 'fit-content',
        }}
      >
        {/* Corner cell (sticky top-left) - height matches column header height, resizable */}
        <div
          className="sticky top-0 left-0 z-30 bg-surface-elevated border-b border-r border-surface-border flex items-center justify-center p-3 text-sm font-medium text-text-secondary relative"
          style={{
            height: `${headerRowHeight}px`,
            minWidth: `${headerWidth}px`,
          }}
        >
          {isInverted ? 'Process / Risk' : 'Risk / Process'}
          <ResizeHandle
            direction="vertical"
            onResize={(delta) => setHeaderRowHeight(headerRowHeight + delta)}
          />
        </div>

        {/* Column headers - sticky top with resize handles */}
        {columnItems.map((item) => {
          const positionalId = columnPositionalIds.get(item.id) || ''
          const label = formatLabel(positionalId, item.name, columnLabelMode)
          const colWidth = getColumnWidth(item.id)
          return (
            <div
              key={item.id}
              className="sticky top-0 z-20 bg-surface-elevated border-b border-r border-surface-border flex items-center justify-center p-3 text-xs font-medium text-text-primary relative"
              style={{
                height: `${headerRowHeight}px`,
                minWidth: `${colWidth}px`,
              }}
              title={`${positionalId}: ${item.name}${item.description ? ` - ${item.description}` : ''}`}
            >
              <span className="text-center break-words leading-relaxed">
                {label}
              </span>
              <ResizeHandle
                direction="horizontal"
                onResize={(delta) => setColumnWidth(item.id, colWidth + delta)}
                onDoubleClick={() => autoFitColumnWidth(item.id, label)}
              />
            </div>
          )
        })}

        {/* Data rows with resize handles on row headers */}
        {rowItems.map((rowItem) => {
          const rowPositionalId = rowPositionalIds.get(rowItem.id) || ''
          const rowLabel = formatLabel(rowPositionalId, rowItem.name, rowLabelMode)
          const rowHeight = getRowHeight(rowItem.id)
          return (
          <React.Fragment key={rowItem.id}>
            {/* Row header - sticky left with resize handle */}
            <div
              className="sticky left-0 z-10 bg-surface-elevated border-b border-r border-surface-border flex items-center px-4 py-2 text-sm font-medium text-text-primary relative"
              style={{
                height: `${rowHeight}px`,
                minWidth: `${headerWidth}px`,
              }}
              title={`${rowPositionalId}: ${rowItem.name}${rowItem.description ? ` - ${rowItem.description}` : ''}`}
            >
              <span className="break-words leading-relaxed">
                {rowLabel}
              </span>
              <ResizeHandle
                direction="vertical"
                onResize={(delta) => setRowHeight(rowItem.id, rowHeight + delta)}
              />
            </div>

            {/* Data cells - let grid template control width, only set height */}
            {columnItems.map((colItem) => {
              // Determine risk/process IDs based on inversion
              const riskId = isInverted ? rowItem.id : colItem.id
              const processId = isInverted ? colItem.id : rowItem.id
              const cellKey = `${riskId}-${processId}`
              const score = scoreMap.get(cellKey) ?? null

              return (
                <div
                  key={cellKey}
                  className="border-b border-r border-surface-border"
                  style={{
                    height: `${rowHeight}px`,
                  }}
                >
                  <MatrixCell
                    riskId={riskId}
                    processId={processId}
                    score={score}
                  />
                </div>
              )
            })}
          </React.Fragment>
          )
        })}
      </div>
    </div>
  )
}
