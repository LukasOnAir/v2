import { clsx } from 'clsx'
import { motion } from 'motion/react'
import type { ViewMode } from '@/stores/sunburstStore'
import { useSunburstStore } from '@/stores/sunburstStore'
import { buildDeltaGradient, formatDeltaLabel } from '@/utils/deltaColors'

interface SunburstLegendProps {
  /** If true, render horizontally (for export); if false, render vertically (for UI) */
  inline?: boolean
  /** Current view mode */
  viewMode?: ViewMode
  /** Maximum observed delta for scale (used in delta view modes) */
  maxDelta?: number
  /** If true, use compact styling for overlay positioning */
  compact?: boolean
}

/**
 * Heatmap color stops for the legend gradient.
 * Matches HEATMAP_STOPS from heatmapColors.ts
 */
const HEATMAP_STOPS = [
  { score: 1, color: 'rgb(34, 197, 94)' },   // Green-500
  { score: 6, color: 'rgb(234, 179, 8)' },   // Yellow-500
  { score: 12, color: 'rgb(249, 115, 22)' }, // Orange-500
  { score: 25, color: 'rgb(239, 68, 68)' },  // Red-500
]

/**
 * Build CSS gradient string from color stops
 */
function buildGradient(direction: 'to right' | 'to top'): string {
  const stops = HEATMAP_STOPS.map((stop) => {
    // Convert score 1-25 to percentage 0-100
    const percent = ((stop.score - 1) / 24) * 100
    return `${stop.color} ${percent}%`
  })
  return `linear-gradient(${direction}, ${stops.join(', ')})`
}

/**
 * Color scale legend showing the score-to-color mapping for the sunburst chart.
 * Can be rendered horizontally (inline) or vertically (for sidebar UI).
 * For delta views, shows dynamic scale based on max observed delta.
 */
export function SunburstLegend({ inline = false, viewMode = 'net', maxDelta = 0, compact = false }: SunburstLegendProps) {
  // Consume animation state for sequenced reveal
  const animationComplete = useSunburstStore((state) => state.animationComplete)

  // Determine if we're in a delta view mode
  const isDeltaView = viewMode === 'delta-gross-net' || viewMode === 'delta-vs-appetite'

  // For delta views with no delta data
  if (isDeltaView && (maxDelta === 0 || maxDelta === undefined)) {
    return (
      <div className="flex items-center justify-center p-2 bg-surface-elevated border border-surface-border rounded">
        <span className="text-xs text-text-muted">No delta data</span>
      </div>
    )
  }

  // Get labels based on view mode
  const getLabels = () => {
    if (viewMode === 'delta-gross-net') {
      return {
        low: 'Low (0)',
        high: `High (${formatDeltaLabel(maxDelta)})`,
        title: 'Control Effectiveness',
      }
    }
    if (viewMode === 'delta-vs-appetite') {
      return {
        low: 'Within (0)',
        high: `Over (${formatDeltaLabel(maxDelta)})`,
        title: 'Distance from Appetite',
      }
    }
    // Default: net/gross
    return {
      low: 'Low (1)',
      high: 'High (25)',
      title: 'Risk Score',
    }
  }

  const labels = getLabels()
  const gradient = isDeltaView
    ? buildDeltaGradient(maxDelta, inline ? 'to right' : 'to top')
    : buildGradient(inline ? 'to right' : 'to top')

  if (inline) {
    // Horizontal layout for export
    return (
      <div className="flex items-center gap-2 p-2 bg-surface-elevated border border-surface-border rounded">
        <span className="text-xs text-text-secondary whitespace-nowrap">{labels.low}</span>
        <div
          className="w-24 h-3 rounded"
          style={{ background: gradient }}
          aria-label={`${labels.title} gradient from ${labels.low} (green) to ${labels.high} (red)`}
        />
        <span className="text-xs text-text-secondary whitespace-nowrap">{labels.high}</span>
      </div>
    )
  }

  // Vertical layout for UI sidebar (with optional compact mode for overlay)
  return (
    <div
      className={clsx(
        'flex flex-col items-center gap-1 border border-surface-border rounded',
        compact
          ? 'p-1.5 bg-surface-elevated/90 backdrop-blur-sm'
          : 'p-2 bg-surface-elevated'
      )}
    >
      <motion.span
        className="text-xs text-text-secondary"
        initial={{ opacity: 0 }}
        animate={{ opacity: animationComplete ? 1 : 0 }}
        transition={{ duration: 0.3, delay: 0.1 }}
      >
        {labels.high}
      </motion.span>
      <motion.div
        className={clsx('w-5 rounded', compact ? 'h-20' : 'h-24')}
        style={{ background: gradient }}
        aria-label={`${labels.title} gradient from ${labels.low} (green) at bottom to ${labels.high} (red) at top`}
        initial={{ clipPath: 'inset(100% 0 0 0)' }}
        animate={{
          clipPath: animationComplete ? 'inset(0% 0 0 0)' : 'inset(100% 0 0 0)'
        }}
        transition={{
          duration: 0.5,
          delay: 0.2,
          ease: 'easeOut'
        }}
      />
      <motion.span
        className="text-xs text-text-secondary"
        initial={{ opacity: 0 }}
        animate={{ opacity: animationComplete ? 1 : 0 }}
        transition={{ duration: 0.3, delay: 0.6 }}
      >
        {labels.low}
      </motion.span>
    </div>
  )
}

/**
 * Export the heatmap stops for use in SVG export (creating inline legend)
 */
export { HEATMAP_STOPS }
