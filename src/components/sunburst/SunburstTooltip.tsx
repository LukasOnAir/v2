import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import type { ViewMode } from '@/stores/sunburstStore'

interface SunburstTooltipProps {
  /** Whether tooltip is visible */
  visible: boolean
  /** Mouse X position */
  x: number
  /** Mouse Y position */
  y: number
  /** Segment name */
  name: string
  /** Hierarchical ID (e.g., "1.2.3") */
  hierarchicalId: string
  /** Aggregated score (null = no data) */
  score: number | null
  /** Current view mode for context-aware display */
  viewMode?: ViewMode
  /** Explanation when score is null */
  missingDataReason?: string | null
  /** Gross score value (for delta context) */
  grossValue?: number | null
  /** Net score value (for delta context) */
  netValue?: number | null
}

export function SunburstTooltip({
  visible,
  x,
  y,
  name,
  hierarchicalId,
  score,
  viewMode = 'net',
  missingDataReason,
  grossValue,
  netValue,
}: SunburstTooltipProps) {
  const [position, setPosition] = useState({ left: 0, top: 0 })

  // Calculate position keeping tooltip within viewport
  useEffect(() => {
    if (!visible) return

    const offset = 10
    const tooltipWidth = 160
    const tooltipHeight = 80

    let left = x + offset
    let top = y + offset

    // Check right boundary
    if (left + tooltipWidth > window.innerWidth) {
      left = x - tooltipWidth - offset
    }

    // Check bottom boundary
    if (top + tooltipHeight > window.innerHeight) {
      top = y - tooltipHeight - offset
    }

    // Ensure we don't go negative
    left = Math.max(8, left)
    top = Math.max(8, top)

    setPosition({ left, top })
  }, [visible, x, y])

  if (!visible) return null

  // Get score label based on view mode
  const getScoreLabel = () => {
    switch (viewMode) {
      case 'net':
        return 'Net Score'
      case 'gross':
        return 'Gross Score'
      case 'delta-gross-net':
        return 'Delta (Gross-Net)'
      case 'delta-vs-appetite':
        return 'Delta (vs Appetite)'
      default:
        return 'Score'
    }
  }

  const scoreLabel = getScoreLabel()
  const showDeltaContext = viewMode === 'delta-gross-net' && grossValue !== null && netValue !== null

  const tooltipContent = (
    <div
      className="fixed z-50 pointer-events-none transition-opacity duration-150"
      style={{
        left: position.left,
        top: position.top,
        opacity: visible ? 1 : 0,
      }}
    >
      <div className="bg-surface-elevated border border-border rounded-lg shadow-lg px-3 py-2 min-w-[120px]">
        {/* Hierarchical ID */}
        <div className="text-xs text-secondary font-mono">
          {hierarchicalId || 'Root'}
        </div>

        {/* Name */}
        <div className="text-sm text-primary font-medium truncate max-w-[200px]">
          {name}
        </div>

        {/* Score */}
        <div className="text-sm text-primary mt-1">
          {scoreLabel}: {score !== null ? score.toFixed(1) : 'No data'}
        </div>

        {/* Delta context: show component scores */}
        {showDeltaContext && score !== null && (
          <div className="text-xs text-secondary mt-0.5">
            (Gross: {grossValue.toFixed(1)}, Net: {netValue.toFixed(1)})
          </div>
        )}

        {/* Missing data explanation */}
        {score === null && missingDataReason && (
          <div className="text-xs text-amber-500 mt-1">
            {missingDataReason}
          </div>
        )}
      </div>
    </div>
  )

  // Use portal to render at document body level to avoid clipping
  return createPortal(tooltipContent, document.body)
}
