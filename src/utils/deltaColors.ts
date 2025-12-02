import type { ViewMode } from '@/stores/sunburstStore'

/**
 * Color for segments with no data
 * Matches SunburstChart.tsx gray for consistency
 */
export const NO_DATA_COLOR = '#4a5568'

/**
 * Color stops for delta visualization
 * Green (0 delta) -> Yellow/Orange (mid) -> Red (max delta)
 */
const DELTA_COLORS = {
  green: [34, 197, 94],   // rgb(34, 197, 94) - 0% delta
  orange: [249, 115, 22], // rgb(249, 115, 22) - 50% delta
  red: [239, 68, 68],     // rgb(239, 68, 68) - 100% delta
} as const

/**
 * Interpolate between two RGB colors
 */
function interpolateColor(
  color1: readonly number[],
  color2: readonly number[],
  ratio: number
): string {
  const r = Math.round(color1[0] + ratio * (color2[0] - color1[0]))
  const g = Math.round(color1[1] + ratio * (color2[1] - color1[1]))
  const b = Math.round(color1[2] + ratio * (color2[2] - color1[2]))
  return `rgb(${r}, ${g}, ${b})`
}

/**
 * Color mode determines how positive/negative deltas are colored
 */
export type DeltaColorMode = 'positive-bad' | 'positive-good' | 'absolute'

/**
 * Get color mode based on view mode
 *
 * - 'delta-gross-net': positive-bad (higher delta = more risk reduction needed, worse)
 * - 'delta-vs-appetite': positive-good (positive = exceeds appetite = bad, but we want
 *   negative to show as green since that means within appetite)
 *   Actually: grossScore - appetite, so positive = over appetite = bad (red)
 *   So 'delta-vs-appetite' should be 'positive-bad' too
 * - Others: 'absolute' (use standard heatmap scaling)
 */
export function getDeltaColorMode(viewMode: ViewMode): DeltaColorMode {
  switch (viewMode) {
    case 'delta-gross-net':
      // Higher delta means more controls needed = worse = red
      return 'positive-bad'
    case 'delta-vs-appetite':
      // grossScore - appetite: positive = over appetite = bad = red
      return 'positive-bad'
    default:
      return 'absolute'
  }
}

/**
 * Get interpolated delta color based on delta value and max observed delta
 *
 * @param delta - The delta value to colorize
 * @param maxDelta - Maximum absolute delta value in the dataset (for scaling)
 * @param mode - How to interpret positive/negative values
 * @returns RGB color string
 *
 * For 'positive-bad' mode (delta-gross-net, delta-vs-appetite):
 *   - 0 delta = green (good)
 *   - maxDelta = red (bad)
 *   - Negative deltas are treated as 0 (green) since they indicate good state
 *
 * For 'positive-good' mode (not currently used):
 *   - Inverted: positive = green, maxDelta negative = red
 */
export function getDeltaColor(
  delta: number,
  maxDelta: number,
  mode: DeltaColorMode = 'positive-bad'
): string {
  // Handle edge cases
  if (maxDelta === 0) {
    return interpolateColor(DELTA_COLORS.green, DELTA_COLORS.green, 0)
  }

  let normalizedValue: number

  if (mode === 'positive-bad') {
    // 0 = green, maxDelta = red
    // Negative deltas treated as 0 (green - good state)
    normalizedValue = Math.max(0, delta) / maxDelta
  } else if (mode === 'positive-good') {
    // Invert: positive = green, negative = red
    // This mode shows negative as bad
    normalizedValue = Math.max(0, -delta) / maxDelta
  } else {
    // Absolute mode: use absolute value
    normalizedValue = Math.abs(delta) / maxDelta
  }

  // Clamp to 0-1 range
  normalizedValue = Math.min(1, Math.max(0, normalizedValue))

  // Interpolate through color stops
  // 0-0.5: green -> orange
  // 0.5-1: orange -> red
  if (normalizedValue <= 0.5) {
    const ratio = normalizedValue * 2 // 0-1 for first half
    return interpolateColor(DELTA_COLORS.green, DELTA_COLORS.orange, ratio)
  } else {
    const ratio = (normalizedValue - 0.5) * 2 // 0-1 for second half
    return interpolateColor(DELTA_COLORS.orange, DELTA_COLORS.red, ratio)
  }
}

/**
 * Build a CSS gradient string for delta legend display
 * Shows gradient from green (0) to red (maxDelta)
 *
 * @param maxDelta - Maximum delta value to show in legend
 * @param direction - CSS gradient direction
 * @returns CSS linear-gradient string
 */
export function buildDeltaGradient(
  maxDelta: number,
  direction: 'to right' | 'to top' = 'to right'
): string {
  const green = `rgb(${DELTA_COLORS.green.join(', ')})`
  const orange = `rgb(${DELTA_COLORS.orange.join(', ')})`
  const red = `rgb(${DELTA_COLORS.red.join(', ')})`

  return `linear-gradient(${direction}, ${green} 0%, ${orange} 50%, ${red} 100%)`
}

/**
 * Get human-readable label for max delta value
 * Used in legend display
 */
export function formatDeltaLabel(maxDelta: number): string {
  if (maxDelta === 0 || isNaN(maxDelta) || !isFinite(maxDelta)) return '0'
  return maxDelta.toFixed(1)
}
