import ExcelJS from 'exceljs'
import { saveAs } from 'file-saver'
import type { RCTRow } from '@/types/rct'
import type { TaxonomyItem } from '@/types/taxonomy'

export interface ExportOptions {
  exportAll: boolean // true = all data, false = filtered view only
}

// Heatmap color stops matching heatmapColors.ts
const HEATMAP_STOPS = [
  { score: 1, color: { argb: 'FF22C55E' } },  // Green-500
  { score: 6, color: { argb: 'FFEAB308' } },  // Yellow-500
  { score: 12, color: { argb: 'FFF97316' } }, // Orange-500
  { score: 25, color: { argb: 'FFEF4444' } }, // Red-500
]

/**
 * Get interpolated heatmap ARGB color for Excel cells
 */
function getHeatmapARGB(score: number | null): string {
  if (score === null) return 'FFFFFFFF' // White

  const clampedScore = Math.max(1, Math.min(25, score))

  let lower = HEATMAP_STOPS[0]
  let upper = HEATMAP_STOPS[HEATMAP_STOPS.length - 1]

  for (let i = 0; i < HEATMAP_STOPS.length - 1; i++) {
    if (clampedScore >= HEATMAP_STOPS[i].score && clampedScore <= HEATMAP_STOPS[i + 1].score) {
      lower = HEATMAP_STOPS[i]
      upper = HEATMAP_STOPS[i + 1]
      break
    }
  }

  const ratio = (clampedScore - lower.score) / (upper.score - lower.score)

  // Parse ARGB colors
  const lowerRGB = {
    r: parseInt(lower.color.argb.slice(2, 4), 16),
    g: parseInt(lower.color.argb.slice(4, 6), 16),
    b: parseInt(lower.color.argb.slice(6, 8), 16),
  }
  const upperRGB = {
    r: parseInt(upper.color.argb.slice(2, 4), 16),
    g: parseInt(upper.color.argb.slice(4, 6), 16),
    b: parseInt(upper.color.argb.slice(6, 8), 16),
  }

  const r = Math.round(lowerRGB.r + ratio * (upperRGB.r - lowerRGB.r))
  const g = Math.round(lowerRGB.g + ratio * (upperRGB.g - lowerRGB.g))
  const b = Math.round(lowerRGB.b + ratio * (upperRGB.b - lowerRGB.b))

  const toHex = (n: number) => n.toString(16).padStart(2, '0').toUpperCase()
  return `FF${toHex(r)}${toHex(g)}${toHex(b)}`
}

/**
 * Flatten taxonomy tree to array with level info
 */
function flattenTaxonomy(items: TaxonomyItem[], level = 1, parentId = ''): Array<{
  id: string
  name: string
  description: string
  level: number
  parentId: string
}> {
  const result: Array<{
    id: string
    name: string
    description: string
    level: number
    parentId: string
  }> = []

  for (const item of items) {
    result.push({
      id: item.hierarchicalId,
      name: item.name,
      description: item.description || '',
      level,
      parentId,
    })

    if (item.children && item.children.length > 0) {
      result.push(...flattenTaxonomy(item.children, level + 1, item.hierarchicalId))
    }
  }

  return result
}

/**
 * Auto-fit column widths based on content (min 10, max 40)
 */
function autoFitColumn(worksheet: ExcelJS.Worksheet, columnIndex: number, headerText: string) {
  const column = worksheet.getColumn(columnIndex)
  let maxLength = headerText.length

  column.eachCell({ includeEmpty: false }, (cell) => {
    const cellValue = cell.value?.toString() || ''
    maxLength = Math.max(maxLength, cellValue.length)
  })

  column.width = Math.max(10, Math.min(40, maxLength + 2))
}

/**
 * Style header row with dark background and light text
 */
function styleHeaderRow(worksheet: ExcelJS.Worksheet, columnCount: number) {
  const headerRow = worksheet.getRow(1)
  headerRow.eachCell({ includeEmpty: false }, (cell) => {
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF1E293B' }, // Dark slate
    }
    cell.font = {
      bold: true,
      color: { argb: 'FFFAFAFA' }, // Light text
    }
    cell.alignment = {
      vertical: 'middle',
      horizontal: 'left',
    }
    cell.border = {
      bottom: { style: 'thin', color: { argb: 'FF374151' } },
    }
  })
  headerRow.height = 24
}

/**
 * Export RCT data to Excel with multiple sheets
 */
export async function exportToExcel(
  rctRows: RCTRow[],
  filteredRows: RCTRow[],
  risks: TaxonomyItem[],
  processes: TaxonomyItem[],
  options: ExportOptions
): Promise<void> {
  try {
    const workbook = new ExcelJS.Workbook()
    workbook.creator = 'RiskGuard ERM'
    workbook.created = new Date()

    const dataToExport = options.exportAll ? rctRows : filteredRows

    // Sheet 1: Risk Control Table
    const rctSheet = workbook.addWorksheet('Risk Control Table')

    const rctHeaders = [
      'Risk L1 ID', 'Risk L1 Name',
      'Risk L2 ID', 'Risk L2 Name',
      'Risk L3 ID', 'Risk L3 Name',
      'Risk L4 ID', 'Risk L4 Name',
      'Risk L5 ID', 'Risk L5 Name',
      'Process L1 ID', 'Process L1 Name',
      'Process L2 ID', 'Process L2 Name',
      'Process L3 ID', 'Process L3 Name',
      'Process L4 ID', 'Process L4 Name',
      'Process L5 ID', 'Process L5 Name',
      'Gross Probability', 'Gross Impact', 'Gross Score',
      'Appetite', 'Within Appetite',
      'Controls', 'Net Score',
    ]

    rctSheet.addRow(rctHeaders)
    styleHeaderRow(rctSheet, rctHeaders.length)

    for (const row of dataToExport) {
      const dataRow = rctSheet.addRow([
        row.riskL1Id, row.riskL1Name,
        row.riskL2Id, row.riskL2Name,
        row.riskL3Id, row.riskL3Name,
        row.riskL4Id, row.riskL4Name,
        row.riskL5Id, row.riskL5Name,
        row.processL1Id, row.processL1Name,
        row.processL2Id, row.processL2Name,
        row.processL3Id, row.processL3Name,
        row.processL4Id, row.processL4Name,
        row.processL5Id, row.processL5Name,
        row.grossProbability, row.grossImpact, row.grossScore,
        row.riskAppetite, row.withinAppetite,
        row.controls.length, row.netScore,
      ])

      // Apply heatmap colors to score cells
      const grossScoreCell = dataRow.getCell(23) // Gross Score
      if (row.grossScore !== null) {
        grossScoreCell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: getHeatmapARGB(row.grossScore) },
        }
      }

      const netScoreCell = dataRow.getCell(27) // Net Score
      if (row.netScore !== null) {
        netScoreCell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: getHeatmapARGB(row.netScore) },
        }
      }

      // Within Appetite coloring
      const withinAppetiteCell = dataRow.getCell(25)
      if (row.withinAppetite !== null) {
        withinAppetiteCell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: row.withinAppetite >= 0 ? 'FF22C55E' : 'FFEF4444' },
        }
      }
    }

    // Auto-fit columns
    rctHeaders.forEach((header, index) => {
      autoFitColumn(rctSheet, index + 1, header)
    })

    // Sheet 2: Risk-Process Matrix
    const matrixSheet = workbook.addWorksheet('Risk-Process Matrix')

    // Get all L1 categories from taxonomy (not limited to rows with RCT data)
    const riskL1s = risks.map(r => r.name)
    const processL1s = processes.map(p => p.name)

    // Header row: empty cell + risk L1 names
    matrixSheet.addRow(['', ...riskL1s])
    styleHeaderRow(matrixSheet, riskL1s.length + 1)

    // Data rows: process L1 name + average scores
    for (const processL1 of processL1s) {
      const rowData: (string | number | null)[] = [processL1]

      for (const riskL1 of riskL1s) {
        const matchingRows = rctRows.filter(
          r => r.riskL1Name === riskL1 && r.processL1Name === processL1
        )

        const scores = matchingRows
          .map(r => r.grossScore)
          .filter((s): s is number => s !== null)

        const avgScore = scores.length > 0
          ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)
          : null

        rowData.push(avgScore)
      }

      const dataRow = matrixSheet.addRow(rowData)

      // Apply heatmap colors to score cells
      for (let i = 2; i <= riskL1s.length + 1; i++) {
        const cell = dataRow.getCell(i)
        const score = cell.value as number | null
        if (score !== null) {
          cell.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: getHeatmapARGB(score) },
          }
          cell.alignment = { horizontal: 'center', vertical: 'middle' }
        }
      }
    }

    // Auto-fit matrix columns
    autoFitColumn(matrixSheet, 1, 'Process')
    riskL1s.forEach((header, index) => {
      autoFitColumn(matrixSheet, index + 2, header)
    })

    // Sheet 3: Risk Taxonomy
    const riskSheet = workbook.addWorksheet('Risk Taxonomy')
    const taxonomyHeaders = ['ID', 'Name', 'Description', 'Level', 'Parent ID']

    riskSheet.addRow(taxonomyHeaders)
    styleHeaderRow(riskSheet, taxonomyHeaders.length)

    const flatRisks = flattenTaxonomy(risks)
    for (const item of flatRisks) {
      riskSheet.addRow([item.id, item.name, item.description, item.level, item.parentId])
    }

    taxonomyHeaders.forEach((header, index) => {
      autoFitColumn(riskSheet, index + 1, header)
    })

    // Sheet 4: Process Taxonomy
    const processSheet = workbook.addWorksheet('Process Taxonomy')

    processSheet.addRow(taxonomyHeaders)
    styleHeaderRow(processSheet, taxonomyHeaders.length)

    const flatProcesses = flattenTaxonomy(processes)
    for (const item of flatProcesses) {
      processSheet.addRow([item.id, item.name, item.description, item.level, item.parentId])
    }

    taxonomyHeaders.forEach((header, index) => {
      autoFitColumn(processSheet, index + 1, header)
    })

    // Generate and save file
    const buffer = await workbook.xlsx.writeBuffer()
    const blob = new Blob([buffer], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    })

    const filename = `RiskGuard_Export_${new Date().toISOString().slice(0, 10)}.xlsx`
    saveAs(blob, filename)
  } catch (error) {
    console.error('Export failed:', error)
    throw new Error('Failed to export Excel file')
  }
}
