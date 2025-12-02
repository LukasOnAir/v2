import { useMemo } from 'react'
import { hierarchy, type HierarchyNode } from 'd3-hierarchy'
import { useSunburstStore, type ViewMode } from '@/stores/sunburstStore'
import { useTaxonomyStore } from '@/stores/taxonomyStore'
import { useRCTStore } from '@/stores/rctStore'
import { useControlsStore } from '@/stores/controlsStore'
import type { TaxonomyItem, TaxonomyWeights } from '@/types/taxonomy'
import type { RCTRow, Control, ControlLink } from '@/types/rct'
import { useIsDemoMode } from '@/hooks/useTenantData'
import { useTaxonomy } from '@/hooks/useTaxonomy'
import { useRCTRows, type RCTRowData } from '@/hooks/useRCTRows'
import { useControls } from '@/hooks/useControls'
import { useControlLinks } from '@/hooks/useControlLinks'

/**
 * All scores for a leaf node
 */
interface LeafScores {
  gross: number | null
  net: number | null
  appetite: number | null
  missingDataReason: string | null
}

/**
 * Node structure for sunburst visualization
 */
export interface SunburstNode {
  /** UUID (matches taxonomy item id, or 'root' for root) */
  id: string
  /** Display name */
  name: string
  /** Hierarchical ID format "1.2.3" */
  hierarchicalId: string
  /** Displayed value based on viewMode (null = no data) */
  value: number | null
  /** Gross score (always calculated) */
  grossValue: number | null
  /** Net score (always calculated) */
  netValue: number | null
  /** Risk appetite threshold */
  appetiteValue: number | null
  /** Explanation when value is null */
  missingDataReason: string | null
  /** Depth in hierarchy (0 = root, 1 = L1, etc.) */
  level: number
  /** Child nodes */
  children?: SunburstNode[]
}

/**
 * Result of useSunburstData hook
 */
export interface SunburstDataResult {
  hierarchyData: HierarchyNode<SunburstNode>
  maxDelta: number
}

/**
 * Check if a row matches a specific taxonomy node
 * A row matches if any of its L1-L5 fields equals the node's ID
 */
function rowMatchesNode(
  row: RCTRow,
  type: 'risk' | 'process',
  nodeId: string
): boolean {
  if (type === 'risk') {
    return (
      row.riskL1Id === nodeId ||
      row.riskL2Id === nodeId ||
      row.riskL3Id === nodeId ||
      row.riskL4Id === nodeId ||
      row.riskL5Id === nodeId ||
      row.riskId === nodeId
    )
  } else {
    return (
      row.processL1Id === nodeId ||
      row.processL2Id === nodeId ||
      row.processL3Id === nodeId ||
      row.processL4Id === nodeId ||
      row.processL5Id === nodeId ||
      row.processId === nodeId
    )
  }
}

/**
 * Get weight for a specific level (1-5) from TaxonomyWeights
 */
function getWeightForLevel(weights: TaxonomyWeights, level: number): number {
  const levelKey = `l${level}` as keyof TaxonomyWeights['levelDefaults']
  return weights.levelDefaults[levelKey] ?? 1
}

/**
 * Get effective weight for a specific node at a level
 * Uses node override if exists, otherwise level default
 */
function getEffectiveWeightForNode(
  weights: TaxonomyWeights,
  nodeId: string,
  level: number
): number {
  if (nodeId in weights.nodeOverrides) {
    return weights.nodeOverrides[nodeId]
  }
  return getWeightForLevel(weights, level)
}

/**
 * Calculate net score for a row from all controls (embedded + linked)
 * Uses min probability × min impact approach
 * Falls back to gross score if no controls
 */
function calculateRowNetScore(
  row: RCTRow,
  controlLinks: ControlLink[],
  controls: Control[]
): number | null {
  // Collect probabilities and impacts from embedded controls
  const embeddedProbs: number[] = []
  const embeddedImps: number[] = []
  for (const control of row.controls) {
    if (control.netProbability !== null) embeddedProbs.push(control.netProbability)
    if (control.netImpact !== null) embeddedImps.push(control.netImpact)
  }

  // Collect from linked controls
  const rowLinks = controlLinks.filter(l => l.rowId === row.id)
  for (const link of rowLinks) {
    const control = controls.find(c => c.id === link.controlId)
    const prob = link.netProbability ?? control?.netProbability ?? null
    const imp = link.netImpact ?? control?.netImpact ?? null
    if (prob !== null) embeddedProbs.push(prob)
    if (imp !== null) embeddedImps.push(imp)
  }

  // Check if there are any controls at all
  const hasAnyControls = row.controls.length > 0 || rowLinks.length > 0

  if (!hasAnyControls) {
    // No controls - use gross score as net score
    return row.grossScore
  }

  if (embeddedProbs.length > 0 && embeddedImps.length > 0) {
    // Has controls with scores - take min of each and multiply
    return Math.min(...embeddedProbs) * Math.min(...embeddedImps)
  }

  // Has controls but no scores set
  return null
}

/**
 * Get the deepest level of a row
 */
function getDeepestLevel(row: RCTRow, type: 'risk' | 'process'): number {
  if (type === 'risk') {
    if (row.riskL5Id) return 5
    if (row.riskL4Id) return 4
    if (row.riskL3Id) return 3
    if (row.riskL2Id) return 2
    if (row.riskL1Id) return 1
  } else {
    if (row.processL5Id) return 5
    if (row.processL4Id) return 4
    if (row.processL3Id) return 3
    if (row.processL2Id) return 2
    if (row.processL1Id) return 1
  }
  return 0
}

/**
 * Aggregate scores with weights
 */
function aggregateScores(
  scoresWithWeights: { score: number; weight: number }[],
  aggregationMode: 'weighted' | 'max'
): number | null {
  // Filter out any invalid scores
  const validScores = scoresWithWeights.filter(
    s => s.score !== null && !isNaN(s.score) && s.weight > 0
  )

  if (validScores.length === 0) {
    return null
  }

  if (aggregationMode === 'max') {
    return Math.max(...validScores.map(s => s.score))
  }

  // Weighted average
  const totalWeight = validScores.reduce((sum, s) => sum + s.weight, 0)
  if (totalWeight === 0) {
    return null
  }

  const weightedSum = validScores.reduce(
    (sum, s) => sum + s.score * s.weight,
    0
  )

  return Math.round((weightedSum / totalWeight) * 10) / 10
}

/**
 * Calculate all scores for a leaf node based on matching RCT rows
 */
function calculateLeafScores(
  rows: RCTRow[],
  type: 'risk' | 'process',
  nodeId: string,
  aggregationMode: 'weighted' | 'max',
  weights: TaxonomyWeights,
  controlLinks: ControlLink[],
  controls: Control[]
): LeafScores {
  // Find matching rows
  const matchingRows = rows.filter(row => rowMatchesNode(row, type, nodeId))

  if (matchingRows.length === 0) {
    return {
      gross: null,
      net: null,
      appetite: null,
      missingDataReason: 'No RCT data for this node',
    }
  }

  // Collect scores with weights
  const grossScores: { score: number; weight: number }[] = []
  const netScores: { score: number; weight: number }[] = []
  const appetiteScores: { score: number; weight: number }[] = []

  for (const row of matchingRows) {
    const level = getDeepestLevel(row, type)
    const weight = getEffectiveWeightForNode(weights, nodeId, level)

    if (row.grossScore !== null) {
      grossScores.push({ score: row.grossScore, weight })
    }
    // Calculate net score dynamically from all controls
    const netScore = calculateRowNetScore(row, controlLinks, controls)
    if (netScore !== null) {
      netScores.push({ score: netScore, weight })
    }
    // riskAppetite has a default of 9, so always present
    appetiteScores.push({ score: row.riskAppetite, weight })
  }

  const gross = aggregateScores(grossScores, aggregationMode)
  const net = aggregateScores(netScores, aggregationMode)
  // For appetite, use min aggregation (most conservative threshold)
  const appetite = appetiteScores.length > 0
    ? Math.min(...appetiteScores.map(s => s.score))
    : null

  return {
    gross,
    net,
    appetite,
    missingDataReason: null, // Will be computed based on viewMode
  }
}

/**
 * Calculate the display value based on view mode and available scores
 */
function calculateDisplayValue(
  scores: LeafScores,
  viewMode: ViewMode
): number | null {
  switch (viewMode) {
    case 'net':
      return scores.net
    case 'gross':
      return scores.gross
    case 'delta-gross-net':
      if (scores.gross !== null && scores.net !== null) {
        return Math.round((scores.gross - scores.net) * 10) / 10
      }
      return null
    case 'delta-vs-appetite':
      if (scores.gross !== null && scores.appetite !== null) {
        return Math.round((scores.gross - scores.appetite) * 10) / 10
      }
      return null
    default:
      return null
  }
}

/**
 * Get human-readable reason when display value is null
 */
function getMissingDataReason(
  scores: LeafScores,
  viewMode: ViewMode
): string | null {
  // If there was already a reason (no RCT data), return it
  if (scores.missingDataReason) {
    return scores.missingDataReason
  }

  switch (viewMode) {
    case 'net':
      if (scores.net === null) {
        return 'No net score (no controls assessed)'
      }
      return null
    case 'gross':
      if (scores.gross === null) {
        return 'No gross score assessed'
      }
      return null
    case 'delta-gross-net':
      if (scores.gross === null && scores.net === null) {
        return 'No gross or net scores assessed'
      }
      if (scores.gross === null) {
        return 'No gross score assessed'
      }
      if (scores.net === null) {
        return 'No net score (no controls assessed)'
      }
      return null
    case 'delta-vs-appetite':
      if (scores.gross === null && scores.appetite === null) {
        return 'No gross score or appetite set'
      }
      if (scores.gross === null) {
        return 'No gross score assessed'
      }
      if (scores.appetite === null) {
        return 'No risk appetite set'
      }
      return null
    default:
      return null
  }
}

/**
 * Transform taxonomy item into SunburstNode with all score values
 */
function transformTaxonomyItem(
  item: TaxonomyItem,
  rows: RCTRow[],
  type: 'risk' | 'process',
  viewMode: ViewMode,
  aggregationMode: 'weighted' | 'max',
  weights: TaxonomyWeights,
  level: number,
  controlLinks: ControlLink[],
  controls: Control[]
): SunburstNode {
  const hasChildren = item.children && item.children.length > 0

  const node: SunburstNode = {
    id: item.id,
    name: item.name,
    hierarchicalId: item.hierarchicalId,
    value: null,
    grossValue: null,
    netValue: null,
    appetiteValue: null,
    missingDataReason: null,
    level,
  }

  if (hasChildren) {
    // Transform children recursively
    node.children = item.children!.map(child =>
      transformTaxonomyItem(
        child,
        rows,
        type,
        viewMode,
        aggregationMode,
        weights,
        level + 1,
        controlLinks,
        controls
      )
    )
  } else {
    // Leaf node: calculate all scores from RCT rows
    const scores = calculateLeafScores(rows, type, item.id, aggregationMode, weights, controlLinks, controls)
    node.grossValue = scores.gross
    node.netValue = scores.net
    node.appetiteValue = scores.appetite
    node.value = calculateDisplayValue(scores, viewMode)
    node.missingDataReason = getMissingDataReason(scores, viewMode)
  }

  return node
}

/**
 * Check if a node or any of its descendants has data (value is not null)
 */
function hasDescendantWithData(node: SunburstNode): boolean {
  // If this node has data, return true
  if (node.value !== null) return true

  // Check children recursively
  if (node.children && node.children.length > 0) {
    return node.children.some(child => hasDescendantWithData(child))
  }

  return false
}

/**
 * Filter L1 nodes that have no descendants with data when hideNoData is enabled.
 * This removes empty L1 nodes BEFORE partition layout to close gaps.
 */
function filterEmptyL1Nodes(root: SunburstNode, hideNoData: boolean): SunburstNode {
  // If hideNoData is disabled, return root unchanged
  if (!hideNoData) return root

  // If no children, return as is
  if (!root.children || root.children.length === 0) return root

  // Filter L1 children (direct children of root) to only those with data
  const filteredChildren = root.children.filter(l1Node => hasDescendantWithData(l1Node))

  // Return new root with filtered children
  return {
    ...root,
    children: filteredChildren.length > 0 ? filteredChildren : undefined,
  }
}

/**
 * Build the root SunburstNode tree from taxonomy
 */
function buildSunburstTree(
  taxonomy: TaxonomyItem[],
  rows: RCTRow[],
  type: 'risk' | 'process',
  viewMode: ViewMode,
  aggregationMode: 'weighted' | 'max',
  weights: TaxonomyWeights,
  controlLinks: ControlLink[],
  controls: Control[]
): SunburstNode {
  const rootName = type === 'risk' ? 'Enterprise Risk' : 'Enterprise Process'

  const root: SunburstNode = {
    id: 'root',
    name: rootName,
    hierarchicalId: '',
    value: null,
    grossValue: null,
    netValue: null,
    appetiteValue: null,
    missingDataReason: null,
    level: 0,
    children: taxonomy.map(item =>
      transformTaxonomyItem(
        item,
        rows,
        type,
        viewMode,
        aggregationMode,
        weights,
        1,
        controlLinks,
        controls
      )
    ),
  }

  return root
}

/**
 * Aggregate a specific value from children
 */
function aggregateChildValues(
  children: HierarchyNode<SunburstNode>[],
  getValue: (node: SunburstNode) => number | null,
  aggregationMode: 'weighted' | 'max',
  weights: TaxonomyWeights
): number | null {
  const childrenWithValues = children
    .filter(c => getValue(c.data) !== null)
    .map(c => ({
      score: getValue(c.data) as number,
      weight: getEffectiveWeightForNode(weights, c.data.id, c.data.level)
    }))

  return aggregateScores(childrenWithValues, aggregationMode)
}

/**
 * Denormalize database row for sunburst scoring.
 * Sunburst needs hierarchy IDs (riskL1Id, etc.) for matching rows to nodes.
 */
function denormalizeForSunburst(
  dbRow: RCTRowData,
  risks: TaxonomyItem[],
  processes: TaxonomyItem[]
): RCTRow {
  const findById = (items: TaxonomyItem[], id: string): TaxonomyItem | null => {
    for (const item of items) {
      if (item.id === id) return item
      if (item.children) {
        const found = findById(item.children, id)
        if (found) return found
      }
    }
    return null
  }

  const riskItem = findById(risks, dbRow.riskId)
  const processItem = findById(processes, dbRow.processId)
  const riskParts = riskItem?.hierarchicalId.split('.') || []
  const processParts = processItem?.hierarchicalId.split('.') || []

  return {
    id: dbRow.id,
    riskId: dbRow.riskId,
    processId: dbRow.processId,
    riskL1Id: riskParts[0] || '',
    riskL2Id: riskParts.slice(0, 2).join('.') || '',
    riskL3Id: riskParts.slice(0, 3).join('.') || '',
    riskL4Id: riskParts.slice(0, 4).join('.') || '',
    riskL5Id: riskParts.slice(0, 5).join('.') || '',
    processL1Id: processParts[0] || '',
    processL2Id: processParts.slice(0, 2).join('.') || '',
    processL3Id: processParts.slice(0, 3).join('.') || '',
    processL4Id: processParts.slice(0, 4).join('.') || '',
    processL5Id: processParts.slice(0, 5).join('.') || '',
    grossScore: dbRow.grossScore,
    grossProbability: dbRow.grossProbability,
    grossImpact: dbRow.grossImpact,
    riskAppetite: dbRow.riskAppetite,
    controls: [],
    // Other fields with defaults
    riskL1Name: '', riskL2Name: '', riskL3Name: '', riskL4Name: '', riskL5Name: '',
    processL1Name: '', processL2Name: '', processL3Name: '', processL4Name: '', processL5Name: '',
    riskName: riskItem?.name || '',
    processName: processItem?.name || '',
    riskDescription: riskItem?.description || '',
    processDescription: processItem?.description || '',
    hasControls: false,
    netScore: null,
    withinAppetite: dbRow.withinAppetite,
    customValues: dbRow.customValues,
  } as RCTRow
}

/**
 * Hook that transforms taxonomy + RCT data into D3 hierarchy
 * with aggregated scores at all levels
 */
export function useSunburstData(): SunburstDataResult | null {
  // Demo mode check
  const isDemoMode = useIsDemoMode()

  // Sunburst config from store (always from store - UI settings)
  const { taxonomyType, viewMode, aggregationMode, hideNoData } = useSunburstStore()

  // Store data (for demo mode)
  const { risks: storeRisks, processes: storeProcesses, riskWeights, processWeights } = useTaxonomyStore()
  const storeRows = useRCTStore((state) => state.rows)
  const storeControlLinks = useControlsStore((state) => state.controlLinks)
  const storeControls = useControlsStore((state) => state.controls)

  // Database hooks (for authenticated mode)
  const { data: dbRisks } = useTaxonomy('risk')
  const { data: dbProcesses } = useTaxonomy('process')
  const { data: dbRctRows } = useRCTRows()
  const { data: dbControls } = useControls()
  const { data: dbControlLinks } = useControlLinks()

  // Use appropriate data sources
  const risks = isDemoMode ? storeRisks : (dbRisks || [])
  const processes = isDemoMode ? storeProcesses : (dbProcesses || [])
  const controlLinks = isDemoMode ? storeControlLinks : (dbControlLinks || [])
  const allControls = isDemoMode ? storeControls : (dbControls || [])

  // Build denormalized rows when using database
  const rows = useMemo(() => {
    if (isDemoMode) {
      return storeRows
    }
    // Denormalize database rows with taxonomy data
    if (!dbRctRows || risks.length === 0 || processes.length === 0) {
      return []
    }
    return dbRctRows.map(r => denormalizeForSunburst(r, risks, processes))
  }, [isDemoMode, storeRows, dbRctRows, risks, processes])

  const result = useMemo(() => {
    // Select taxonomy and weights based on type
    const taxonomy = taxonomyType === 'risk' ? risks : processes
    const weights = taxonomyType === 'risk' ? riskWeights : processWeights

    // Handle empty taxonomy
    if (taxonomy.length === 0) {
      return null
    }

    // Build the tree structure
    const rootNode = buildSunburstTree(
      taxonomy,
      rows,
      taxonomyType,
      viewMode,
      aggregationMode,
      weights,
      controlLinks,
      allControls
    )

    // Filter empty L1 nodes when hideNoData is enabled
    // This must happen BEFORE partition layout to close gaps
    const filteredRoot = filterEmptyL1Nodes(rootNode, hideNoData)

    // Create d3 hierarchy and compute node values for partition layout
    // .count() sets node.value to the number of leaf descendants,
    // which partition uses to determine arc sizes (equal-sized arcs)
    const root = hierarchy(filteredRoot).count()

    // Aggregate scores from leaves to root using eachAfter (post-order traversal)
    root.eachAfter((node) => {
      if (node.children && node.children.length > 0) {
        // Parent node: aggregate gross, net, and appetite separately
        node.data.grossValue = aggregateChildValues(
          node.children,
          n => n.grossValue,
          aggregationMode,
          weights
        )

        node.data.netValue = aggregateChildValues(
          node.children,
          n => n.netValue,
          aggregationMode,
          weights
        )

        // For appetite, use minimum (most conservative threshold)
        const childAppetites = node.children
          .filter(c => c.data.appetiteValue !== null)
          .map(c => c.data.appetiteValue as number)
        node.data.appetiteValue = childAppetites.length > 0
          ? Math.min(...childAppetites)
          : null

        // Calculate display value based on aggregated scores
        const scores: LeafScores = {
          gross: node.data.grossValue,
          net: node.data.netValue,
          appetite: node.data.appetiteValue,
          missingDataReason: null,
        }
        node.data.value = calculateDisplayValue(scores, viewMode)
        node.data.missingDataReason = getMissingDataReason(scores, viewMode)

        // If any child has data, parent's missingDataReason should be null
        // (we show the aggregate, not "no data")
        const anyChildHasValue = node.children.some(c => c.data.value !== null)
        if (anyChildHasValue && node.data.value !== null) {
          node.data.missingDataReason = null
        }
      }
      // Leaf nodes already have their values calculated
    })

    // Calculate maxDelta for dynamic color scaling
    let maxDelta = 0
    root.each((node) => {
      const value = node.data.value
      // Only consider valid numeric values
      if (value !== null && !isNaN(value) && isFinite(value)) {
        // For delta modes, track max absolute delta
        if (viewMode === 'delta-gross-net' || viewMode === 'delta-vs-appetite') {
          maxDelta = Math.max(maxDelta, Math.abs(value))
        }
      }
    })

    // For non-delta modes, maxDelta isn't used for coloring (use standard heatmap)
    // but set a sensible default
    if (viewMode === 'net' || viewMode === 'gross') {
      maxDelta = 25 // Standard score range
    }

    // Ensure maxDelta is never NaN or Infinity
    if (isNaN(maxDelta) || !isFinite(maxDelta)) {
      maxDelta = 0
    }

    return {
      hierarchyData: root,
      maxDelta,
    }
  }, [taxonomyType, viewMode, aggregationMode, hideNoData, risks, processes, rows, riskWeights, processWeights, controlLinks, allControls])

  return result
}
