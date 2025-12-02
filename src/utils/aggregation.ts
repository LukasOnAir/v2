import type { RCTRow } from '@/types/rct'

export interface AggregationWeights {
  l1: number
  l2: number
  l3: number
  l4: number
  l5: number
}

export const DEFAULT_WEIGHTS: AggregationWeights = {
  l1: 1,
  l2: 1,
  l3: 1,
  l4: 1,
  l5: 1,
}

/**
 * Check if a row belongs to a hierarchy node
 * Checks if any of the L1-L5 fields match the given hierarchyId
 */
export function matchesHierarchy(
  row: RCTRow,
  type: 'risk' | 'process',
  hierarchyId: string
): boolean {
  if (type === 'risk') {
    return (
      row.riskL1Id === hierarchyId ||
      row.riskL2Id === hierarchyId ||
      row.riskL3Id === hierarchyId ||
      row.riskL4Id === hierarchyId ||
      row.riskL5Id === hierarchyId ||
      row.riskId === hierarchyId
    )
  } else {
    return (
      row.processL1Id === hierarchyId ||
      row.processL2Id === hierarchyId ||
      row.processL3Id === hierarchyId ||
      row.processL4Id === hierarchyId ||
      row.processL5Id === hierarchyId ||
      row.processId === hierarchyId
    )
  }
}

/**
 * Get the deepest level of a row (1-5 based on which L# fields are populated)
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
 * Calculate weighted average score from matching RCT rows
 * Returns null if no valid scores exist
 *
 * @param rows - All RCT rows to filter from
 * @param riskId - The risk hierarchy ID to match
 * @param processId - The process hierarchy ID to match
 * @param weights - Weights for each level (l1-l5)
 * @param scoreType - 'gross' for grossScore, 'net' for netScore
 */
export function calculateWeightedAverage(
  rows: RCTRow[],
  riskId: string,
  processId: string,
  weights: AggregationWeights,
  scoreType: 'gross' | 'net'
): number | null {
  // Filter rows that match both risk and process hierarchy
  const matchingRows = rows.filter(
    (row) =>
      matchesHierarchy(row, 'risk', riskId) &&
      matchesHierarchy(row, 'process', processId)
  )

  if (matchingRows.length === 0) {
    return null
  }

  // Calculate weighted average based on deepest level
  let totalWeight = 0
  let weightedSum = 0

  for (const row of matchingRows) {
    const score = scoreType === 'gross' ? row.grossScore : row.netScore
    if (score === null) continue

    // Use the deepest level for weighting (either risk or process, whichever is deeper)
    const riskLevel = getDeepestLevel(row, 'risk')
    const processLevel = getDeepestLevel(row, 'process')
    const deepestLevel = Math.max(riskLevel, processLevel)

    // Get weight based on level
    const weight = getWeightForLevel(weights, deepestLevel)

    weightedSum += score * weight
    totalWeight += weight
  }

  if (totalWeight === 0) {
    return null
  }

  return Math.round(weightedSum / totalWeight * 10) / 10 // Round to 1 decimal
}

/**
 * Get the weight for a specific level (1-5)
 */
function getWeightForLevel(weights: AggregationWeights, level: number): number {
  switch (level) {
    case 1: return weights.l1
    case 2: return weights.l2
    case 3: return weights.l3
    case 4: return weights.l4
    case 5: return weights.l5
    default: return 1
  }
}

/**
 * Get all rows that match a specific risk and process combination
 * Useful for displaying in expanded view
 */
export function getMatchingRows(
  rows: RCTRow[],
  riskId: string,
  processId: string
): RCTRow[] {
  return rows.filter(
    (row) =>
      matchesHierarchy(row, 'risk', riskId) &&
      matchesHierarchy(row, 'process', processId)
  )
}
