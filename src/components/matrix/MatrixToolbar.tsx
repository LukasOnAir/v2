import { useState, useCallback } from 'react'
import { Download, ArrowLeftRight, Maximize2 } from 'lucide-react'
import { useMatrixStore, type LabelMode } from '@/stores/matrixStore'
import { useRCTStore } from '@/stores/rctStore'
import { useTaxonomyStore } from '@/stores/taxonomyStore'
import { exportToExcel } from '@/utils/excelExport'
import type { TaxonomyItem } from '@/types/taxonomy'

/** Get all leaf nodes from a taxonomy tree */
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

/** Format label based on mode */
function formatLabel(id: string, name: string, mode: LabelMode): string {
  switch (mode) {
    case 'id': return id
    case 'name': return name
    case 'both':
    default: return `${id}: ${name}`
  }
}

const labelOptions: { value: LabelMode; label: string }[] = [
  { value: 'id', label: 'ID only' },
  { value: 'name', label: 'Name only' },
  { value: 'both', label: 'ID + Name' },
]

export function MatrixToolbar() {
  const {
    zoomLevel,
    setZoomLevel,
    isInverted,
    setIsInverted,
    riskLabelMode,
    setRiskLabelMode,
    processLabelMode,
    setProcessLabelMode,
    setColumnWidth,
    setRowHeight,
    setHeaderRowHeight,
  } = useMatrixStore()
  const rows = useRCTStore((state) => state.rows)
  const { risks, processes } = useTaxonomyStore()
  const [isExporting, setIsExporting] = useState(false)

  // Auto-fit all columns and rows based on label content
  const handleAutoFit = useCallback(() => {
    const riskLeaves = getLeafNodes(risks)
    const processLeaves = getLeafNodes(processes)

    // Determine which items are columns vs rows based on inversion
    const columnItems = isInverted ? processLeaves : riskLeaves
    const rowItems = isInverted ? riskLeaves : processLeaves
    const columnLabelMode = isInverted ? processLabelMode : riskLabelMode
    const rowLabelMode = isInverted ? riskLabelMode : processLabelMode

    // Auto-fit columns: make them wide enough to show text with minimal wrapping
    columnItems.forEach((item, index) => {
      const estimatedId = `${index + 1}`
      const label = formatLabel(estimatedId, item.name, columnLabelMode)
      // Wide columns: 9px per char, 50px padding, min 120px, max 350px
      const colWidth = Math.max(120, Math.min(350, label.length * 9 + 50))
      setColumnWidth(item.id, colWidth)
    })

    // Auto-fit rows: comfortable height
    rowItems.forEach((item, index) => {
      const estimatedId = `${index + 1}`
      const label = formatLabel(estimatedId, item.name, rowLabelMode)
      const estimatedHeight = label.length > 35 ? 70 : label.length > 25 ? 60 : 50
      setRowHeight(item.id, estimatedHeight)
    })

    // Header row: tall enough to fit 3 lines of wrapped text comfortably
    // 3 lines * 20px line height + 40px padding = 100px
    setHeaderRowHeight(100)
  }, [risks, processes, isInverted, riskLabelMode, processLabelMode, setColumnWidth, setRowHeight, setHeaderRowHeight])

  const handleExport = async () => {
    setIsExporting(true)
    try {
      // Matrix always exports all data
      await exportToExcel(rows, rows, risks, processes, { exportAll: true })
    } catch (error) {
      console.error('Export failed:', error)
    } finally {
      setIsExporting(false)
    }
  }

  return (
    <div className="flex items-center justify-between gap-4 p-3 bg-surface-elevated border border-surface-border rounded-lg mb-4">
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <label htmlFor="zoom-slider" className="text-sm text-text-secondary">
            Zoom:
          </label>
          <input
            id="zoom-slider"
            type="range"
            min="0.5"
            max="2"
            step="0.25"
            value={zoomLevel}
            onChange={(e) => setZoomLevel(parseFloat(e.target.value))}
            className="w-32 h-2 bg-surface-overlay rounded-lg appearance-none cursor-pointer accent-accent-500"
          />
          <span className="text-sm text-text-muted w-12">
            {Math.round(zoomLevel * 100)}%
          </span>
        </div>

        <div className="h-6 w-px bg-surface-border" />

        <button
          onClick={() => setIsInverted(!isInverted)}
          className={`flex items-center gap-1.5 px-3 py-1.5 text-sm border rounded transition-colors ${
            isInverted
              ? 'bg-accent-500/20 border-accent-500 text-accent-400'
              : 'bg-surface-overlay border-surface-border hover:bg-surface-border'
          }`}
          title={isInverted ? 'Risks as rows, Processes as columns' : 'Processes as rows, Risks as columns'}
        >
          <ArrowLeftRight size={14} />
          {isInverted ? 'Inverted' : 'Normal'}
        </button>

        <div className="h-6 w-px bg-surface-border" />

        <button
          onClick={handleAutoFit}
          className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-surface-overlay border border-surface-border rounded hover:bg-surface-border transition-colors"
          title="Auto-fit all column and row sizes to content"
        >
          <Maximize2 size={14} />
          Auto-fit
        </button>

        <div className="h-6 w-px bg-surface-border" />

        <div className="flex items-center gap-2">
          <label className="text-sm text-text-secondary">Labels:</label>
          <select
            value={riskLabelMode}
            onChange={(e) => setRiskLabelMode(e.target.value as LabelMode)}
            className="px-2 py-1 text-sm bg-surface-overlay border border-surface-border rounded focus:outline-none focus:ring-1 focus:ring-accent-500"
            title="Risk label format"
          >
            {labelOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>
                Risk: {opt.label}
              </option>
            ))}
          </select>
          <select
            value={processLabelMode}
            onChange={(e) => setProcessLabelMode(e.target.value as LabelMode)}
            className="px-2 py-1 text-sm bg-surface-overlay border border-surface-border rounded focus:outline-none focus:ring-1 focus:ring-accent-500"
            title="Process label format"
          >
            {labelOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>
                Process: {opt.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <button
        onClick={handleExport}
        disabled={isExporting}
        className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-surface-overlay border border-surface-border rounded hover:bg-surface-border transition-colors disabled:opacity-50"
      >
        <Download size={14} />
        {isExporting ? 'Exporting...' : 'Export'}
      </button>
    </div>
  )
}
