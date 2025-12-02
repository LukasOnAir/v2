/**
 * Heatmap color stops for risk scores (1-25)
 * Green (low risk) -> Yellow -> Orange -> Red (high risk)
 */
const HEATMAP_STOPS = [
  { score: 1, color: [34, 197, 94] },    // Green-500
  { score: 6, color: [234, 179, 8] },    // Yellow-500
  { score: 12, color: [249, 115, 22] },  // Orange-500
  { score: 25, color: [239, 68, 68] },   // Red-500
]

/**
 * Get interpolated heatmap color for a risk score
 */
export function getHeatmapColor(score: number | null): string {
  if (score === null) return 'transparent'

  // Clamp score to valid range
  const clampedScore = Math.max(1, Math.min(25, score))

  // Find surrounding stops
  let lower = HEATMAP_STOPS[0]
  let upper = HEATMAP_STOPS[HEATMAP_STOPS.length - 1]

  for (let i = 0; i < HEATMAP_STOPS.length - 1; i++) {
    if (clampedScore >= HEATMAP_STOPS[i].score && clampedScore <= HEATMAP_STOPS[i + 1].score) {
      lower = HEATMAP_STOPS[i]
      upper = HEATMAP_STOPS[i + 1]
      break
    }
  }

  // Interpolate
  const ratio = (clampedScore - lower.score) / (upper.score - lower.score)
  const r = Math.round(lower.color[0] + ratio * (upper.color[0] - lower.color[0]))
  const g = Math.round(lower.color[1] + ratio * (upper.color[1] - lower.color[1]))
  const b = Math.round(lower.color[2] + ratio * (upper.color[2] - lower.color[2]))

  return `rgb(${r}, ${g}, ${b})`
}

/**
 * Get contrasting text color for a background color
 */
export function getContrastingText(backgroundColor: string): string {
  if (backgroundColor === 'transparent') return '#a1a1aa' // text-secondary

  const match = backgroundColor.match(/\d+/g)
  if (!match) return '#fafafa' // text-primary

  const [r, g, b] = match.map(Number)
  // Luminance formula
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255
  return luminance > 0.5 ? '#1e293b' : '#fafafa' // Dark text on light bg, light text on dark bg
}

/**
 * Get color for "within appetite" indicator
 * Positive (within appetite) = green, Negative (exceeded) = red
 */
export function getAppetiteColor(withinAppetite: number | null): string {
  if (withinAppetite === null) return 'transparent'
  if (withinAppetite >= 0) return 'rgb(34, 197, 94)' // Green
  return 'rgb(239, 68, 68)' // Red
}
