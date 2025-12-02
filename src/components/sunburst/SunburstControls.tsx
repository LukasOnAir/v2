import { useState, type RefObject } from 'react'
import { Download, Info } from 'lucide-react'
import { clsx } from 'clsx'
import { useSunburstStore } from '@/stores/sunburstStore'
import { exportSunburstSvg } from '@/utils/sunburstExport'

interface SunburstControlsProps {
  /** Reference to chart SVG for export */
  svgRef: RefObject<SVGSVGElement | null>
}

/**
 * Toolbar with sunburst visualization controls.
 * Controls taxonomy type, score type, aggregation mode, level visibility, and export.
 */
export function SunburstControls({ svgRef }: SunburstControlsProps) {
  const {
    taxonomyType,
    viewMode,
    aggregationMode,
    visibleLevels,
    hideNoData,
    showNames,
    setTaxonomyType,
    setViewMode,
    setAggregationMode,
    toggleLevel,
    setHideNoData,
    setShowNames,
  } = useSunburstStore()

  const [isExporting, setIsExporting] = useState(false)

  const handleExport = () => {
    if (!svgRef.current) return

    setIsExporting(true)

    const timestamp = new Date().toISOString().slice(0, 19).replace(/[:-]/g, '')
    const filename = `risk-sunburst-${timestamp}.svg`

    const options = {
      title: `${taxonomyType === 'risk' ? 'Risk' : 'Process'} Sunburst`,
      showLegend: true,
      showFilters: true,
      filters: {
        taxonomyType,
        viewMode,
        aggregationMode,
        visibleLevels,
      },
    }

    try {
      exportSunburstSvg(svgRef.current, filename, options)
    } catch (error) {
      console.error('Export failed:', error)
    } finally {
      setIsExporting(false)
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-4 p-3 bg-surface-elevated border border-surface-border rounded-lg">
      {/* View Toggle: Risk/Process */}
      <div className="flex flex-col gap-1">
        <span className="text-xs text-text-muted uppercase tracking-wide">View</span>
        <div className="flex">
          <button
            onClick={() => setTaxonomyType('risk')}
            className={clsx(
              'px-3 py-1.5 text-sm border border-surface-border rounded-l transition-colors',
              taxonomyType === 'risk'
                ? 'bg-accent-500/20 text-accent-500 border-accent-500'
                : 'bg-surface-overlay text-text-secondary hover:bg-surface-border'
            )}
          >
            Risk
          </button>
          <button
            onClick={() => setTaxonomyType('process')}
            className={clsx(
              'px-3 py-1.5 text-sm border border-l-0 border-surface-border rounded-r transition-colors',
              taxonomyType === 'process'
                ? 'bg-accent-500/20 text-accent-500 border-accent-500'
                : 'bg-surface-overlay text-text-secondary hover:bg-surface-border'
            )}
          >
            Process
          </button>
        </div>
      </div>

      {/* View Mode Toggle: Net/Gross/Delta options */}
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-1">
          <span className="text-xs text-text-muted uppercase tracking-wide">Score</span>
          <span
            className="text-text-muted cursor-help"
            title="Delta (G-N): Shows control effectiveness (Gross minus Net score). Delta (vs App): Shows distance from risk appetite threshold."
          >
            <Info size={12} />
          </span>
        </div>
        <div className="flex">
          <button
            onClick={() => setViewMode('net')}
            className={clsx(
              'px-3 py-1.5 text-sm border border-surface-border rounded-l transition-colors',
              viewMode === 'net'
                ? 'bg-accent-500/20 text-accent-500 border-accent-500'
                : 'bg-surface-overlay text-text-secondary hover:bg-surface-border'
            )}
          >
            Net
          </button>
          <button
            onClick={() => setViewMode('gross')}
            className={clsx(
              'px-3 py-1.5 text-sm border border-l-0 border-surface-border transition-colors',
              viewMode === 'gross'
                ? 'bg-accent-500/20 text-accent-500 border-accent-500'
                : 'bg-surface-overlay text-text-secondary hover:bg-surface-border'
            )}
          >
            Gross
          </button>
          <button
            onClick={() => setViewMode('delta-gross-net')}
            className={clsx(
              'px-3 py-1.5 text-sm border border-l-0 border-surface-border transition-colors',
              viewMode === 'delta-gross-net'
                ? 'bg-accent-500/20 text-accent-500 border-accent-500'
                : 'bg-surface-overlay text-text-secondary hover:bg-surface-border'
            )}
          >
            Delta (G-N)
          </button>
          <button
            onClick={() => setViewMode('delta-vs-appetite')}
            className={clsx(
              'px-3 py-1.5 text-sm border border-l-0 border-surface-border rounded-r transition-colors',
              viewMode === 'delta-vs-appetite'
                ? 'bg-accent-500/20 text-accent-500 border-accent-500'
                : 'bg-surface-overlay text-text-secondary hover:bg-surface-border'
            )}
          >
            Delta (vs App)
          </button>
        </div>
      </div>

      {/* Aggregation Mode Toggle: Weighted/Max */}
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-1">
          <span className="text-xs text-text-muted uppercase tracking-wide">Aggregation</span>
          <span
            className="text-text-muted cursor-help"
            title="Weighted Avg: Average score weighted by level importance. Maximum: Worst-case score from any child."
          >
            <Info size={12} />
          </span>
        </div>
        <div className="flex">
          <button
            onClick={() => setAggregationMode('weighted')}
            className={clsx(
              'px-3 py-1.5 text-sm border border-surface-border rounded-l transition-colors',
              aggregationMode === 'weighted'
                ? 'bg-accent-500/20 text-accent-500 border-accent-500'
                : 'bg-surface-overlay text-text-secondary hover:bg-surface-border'
            )}
          >
            Weighted Avg
          </button>
          <button
            onClick={() => setAggregationMode('max')}
            className={clsx(
              'px-3 py-1.5 text-sm border border-l-0 border-surface-border rounded-r transition-colors',
              aggregationMode === 'max'
                ? 'bg-accent-500/20 text-accent-500 border-accent-500'
                : 'bg-surface-overlay text-text-secondary hover:bg-surface-border'
            )}
          >
            Maximum
          </button>
        </div>
      </div>

      {/* Level Visibility Checkboxes */}
      <div className="flex flex-col gap-1">
        <span className="text-xs text-text-muted uppercase tracking-wide">Levels</span>
        <div className="flex items-center gap-2">
          {(['l1', 'l2', 'l3', 'l4', 'l5'] as const).map((level) => (
            <label
              key={level}
              className="flex items-center gap-1 cursor-pointer text-sm text-text-secondary hover:text-text-primary"
            >
              <input
                type="checkbox"
                checked={visibleLevels[level]}
                onChange={() => toggleLevel(level)}
                className="w-4 h-4 rounded border-surface-border bg-surface-overlay text-accent-500 focus:ring-accent-500 focus:ring-offset-0"
              />
              <span>{level.toUpperCase()}</span>
            </label>
          ))}
        </div>
      </div>

      {/* Display Options */}
      <div className="flex flex-col gap-1">
        <span className="text-xs text-text-muted uppercase tracking-wide">Display</span>
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 cursor-pointer text-sm text-text-secondary hover:text-text-primary py-1.5">
            <input
              type="checkbox"
              checked={hideNoData}
              onChange={(e) => setHideNoData(e.target.checked)}
              className="w-4 h-4 rounded border-surface-border bg-surface-overlay text-accent-500 focus:ring-accent-500 focus:ring-offset-0"
            />
            <span>Hide empty</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer text-sm text-text-secondary hover:text-text-primary py-1.5">
            <input
              type="checkbox"
              checked={showNames}
              onChange={(e) => setShowNames(e.target.checked)}
              className="w-4 h-4 rounded border-surface-border bg-surface-overlay text-accent-500 focus:ring-accent-500 focus:ring-offset-0"
            />
            <span>Show names</span>
          </label>
        </div>
      </div>

      {/* Export SVG */}
      <div className="flex flex-col gap-1 ml-auto">
        <span className="text-xs text-text-muted uppercase tracking-wide">Export</span>
        <button
          onClick={handleExport}
          disabled={isExporting}
          className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-surface-overlay border border-surface-border rounded hover:bg-surface-border transition-colors disabled:opacity-50"
        >
          <Download size={14} />
          {isExporting ? 'Exporting...' : 'Export SVG'}
        </button>
      </div>
    </div>
  )
}
