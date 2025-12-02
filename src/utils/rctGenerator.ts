import { nanoid } from 'nanoid'
import type { TaxonomyItem } from '@/types/taxonomy'
import type { RCTRow } from '@/types/rct'

/**
 * Get all leaf (childless) items from a taxonomy tree
 */
export function getLeafItems(items: TaxonomyItem[]): TaxonomyItem[] {
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

/**
 * Build hierarchy path from leaf to root (L1-L5)
 * Returns object with l1-l5 properties, empty strings for unused levels
 */
function getHierarchyPath(
  leafItem: TaxonomyItem,
  allItems: TaxonomyItem[]
): { l1Id: string; l1Name: string; l2Id: string; l2Name: string; l3Id: string; l3Name: string; l4Id: string; l4Name: string; l5Id: string; l5Name: string } {
  // Parse hierarchical ID to determine path (e.g., "1.2.3" -> levels 1, 2, 3)
  const parts = leafItem.hierarchicalId.split('.')
  const result = {
    l1Id: '', l1Name: '',
    l2Id: '', l2Name: '',
    l3Id: '', l3Name: '',
    l4Id: '', l4Name: '',
    l5Id: '', l5Name: '',
  }

  // Find ancestors by building partial IDs
  for (let level = 0; level < parts.length; level++) {
    const partialId = parts.slice(0, level + 1).join('.')
    const item = findByHierarchicalId(allItems, partialId)
    if (item) {
      const key = `l${level + 1}` as 'l1' | 'l2' | 'l3' | 'l4' | 'l5'
      result[`${key}Id` as keyof typeof result] = item.hierarchicalId
      result[`${key}Name` as keyof typeof result] = item.name
    }
  }

  return result
}

/**
 * Find taxonomy item by hierarchical ID
 */
function findByHierarchicalId(items: TaxonomyItem[], hierarchicalId: string): TaxonomyItem | undefined {
  for (const item of items) {
    if (item.hierarchicalId === hierarchicalId) return item
    if (item.children) {
      const found = findByHierarchicalId(item.children, hierarchicalId)
      if (found) return found
    }
  }
  return undefined
}

/**
 * Generate RCT rows from Cartesian product of leaf risks x leaf processes
 */
export function generateRCTRows(
  risks: TaxonomyItem[],
  processes: TaxonomyItem[]
): RCTRow[] {
  const leafRisks = getLeafItems(risks)
  const leafProcesses = getLeafItems(processes)
  const rows: RCTRow[] = []

  for (const risk of leafRisks) {
    const riskPath = getHierarchyPath(risk, risks)

    for (const process of leafProcesses) {
      const processPath = getHierarchyPath(process, processes)

      rows.push({
        id: nanoid(),
        // Risk hierarchy
        riskId: risk.id,
        riskL1Id: riskPath.l1Id,
        riskL1Name: riskPath.l1Name,
        riskL2Id: riskPath.l2Id,
        riskL2Name: riskPath.l2Name,
        riskL3Id: riskPath.l3Id,
        riskL3Name: riskPath.l3Name,
        riskL4Id: riskPath.l4Id,
        riskL4Name: riskPath.l4Name,
        riskL5Id: riskPath.l5Id,
        riskL5Name: riskPath.l5Name,
        riskName: risk.name,
        riskDescription: risk.description,
        // Process hierarchy
        processId: process.id,
        processL1Id: processPath.l1Id,
        processL1Name: processPath.l1Name,
        processL2Id: processPath.l2Id,
        processL2Name: processPath.l2Name,
        processL3Id: processPath.l3Id,
        processL3Name: processPath.l3Name,
        processL4Id: processPath.l4Id,
        processL4Name: processPath.l4Name,
        processL5Id: processPath.l5Id,
        processL5Name: processPath.l5Name,
        processName: process.name,
        processDescription: process.description,
        // Scoring defaults
        grossProbability: null,
        grossImpact: null,
        grossScore: null,
        riskAppetite: 9,
        withinAppetite: null,
        // Controls
        controls: [],
        hasControls: false,
        netScore: null,
        // Custom columns
        customValues: {},
      })
    }
  }

  return rows
}

/**
 * Regenerate RCT rows while preserving existing data for matching risk/process combinations.
 * Rows are matched by riskId + processId (taxonomy item UUIDs).
 * Preserves: scores, controls, custom values, comments.
 * Rows for removed taxonomy items are dropped.
 * New taxonomy combinations get fresh rows with default values.
 */
export function regenerateRCTRows(
  risks: TaxonomyItem[],
  processes: TaxonomyItem[],
  existingRows: RCTRow[]
): RCTRow[] {
  // Build lookup map: "riskId|processId" -> existing row
  const existingMap = new Map<string, RCTRow>()
  for (const row of existingRows) {
    const key = `${row.riskId}|${row.processId}`
    existingMap.set(key, row)
  }

  const leafRisks = getLeafItems(risks)
  const leafProcesses = getLeafItems(processes)
  const rows: RCTRow[] = []

  for (const risk of leafRisks) {
    const riskPath = getHierarchyPath(risk, risks)

    for (const process of leafProcesses) {
      const processPath = getHierarchyPath(process, processes)
      const key = `${risk.id}|${process.id}`
      const existing = existingMap.get(key)

      if (existing) {
        // Preserve existing row but update hierarchy info (in case names changed)
        rows.push({
          ...existing,
          // Update risk hierarchy (preserves UUID, updates display info)
          riskL1Id: riskPath.l1Id,
          riskL1Name: riskPath.l1Name,
          riskL2Id: riskPath.l2Id,
          riskL2Name: riskPath.l2Name,
          riskL3Id: riskPath.l3Id,
          riskL3Name: riskPath.l3Name,
          riskL4Id: riskPath.l4Id,
          riskL4Name: riskPath.l4Name,
          riskL5Id: riskPath.l5Id,
          riskL5Name: riskPath.l5Name,
          riskName: risk.name,
          riskDescription: risk.description,
          // Update process hierarchy
          processL1Id: processPath.l1Id,
          processL1Name: processPath.l1Name,
          processL2Id: processPath.l2Id,
          processL2Name: processPath.l2Name,
          processL3Id: processPath.l3Id,
          processL3Name: processPath.l3Name,
          processL4Id: processPath.l4Id,
          processL4Name: processPath.l4Name,
          processL5Id: processPath.l5Id,
          processL5Name: processPath.l5Name,
          processName: process.name,
          processDescription: process.description,
        })
      } else {
        // New combination - create fresh row
        rows.push({
          id: nanoid(),
          riskId: risk.id,
          riskL1Id: riskPath.l1Id,
          riskL1Name: riskPath.l1Name,
          riskL2Id: riskPath.l2Id,
          riskL2Name: riskPath.l2Name,
          riskL3Id: riskPath.l3Id,
          riskL3Name: riskPath.l3Name,
          riskL4Id: riskPath.l4Id,
          riskL4Name: riskPath.l4Name,
          riskL5Id: riskPath.l5Id,
          riskL5Name: riskPath.l5Name,
          riskName: risk.name,
          riskDescription: risk.description,
          processId: process.id,
          processL1Id: processPath.l1Id,
          processL1Name: processPath.l1Name,
          processL2Id: processPath.l2Id,
          processL2Name: processPath.l2Name,
          processL3Id: processPath.l3Id,
          processL3Name: processPath.l3Name,
          processL4Id: processPath.l4Id,
          processL4Name: processPath.l4Name,
          processL5Id: processPath.l5Id,
          processL5Name: processPath.l5Name,
          processName: process.name,
          processDescription: process.description,
          grossProbability: null,
          grossImpact: null,
          grossScore: null,
          riskAppetite: 9,
          withinAppetite: null,
          controls: [],
          hasControls: false,
          netScore: null,
          customValues: {},
        })
      }
    }
  }

  return rows
}
