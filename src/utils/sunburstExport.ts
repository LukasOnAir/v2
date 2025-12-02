import { saveAs } from 'file-saver'
import type { ViewMode } from '@/stores/sunburstStore'

/**
 * Heatmap color stops for inline legend SVG generation.
 * Matches HEATMAP_STOPS from heatmapColors.ts
 */
const HEATMAP_STOPS = [
  { score: 1, color: 'rgb(34, 197, 94)' },   // Green-500
  { score: 6, color: 'rgb(234, 179, 8)' },   // Yellow-500
  { score: 12, color: 'rgb(249, 115, 22)' }, // Orange-500
  { score: 25, color: 'rgb(239, 68, 68)' },  // Red-500
]

export interface ExportOptions {
  /** Title to add above chart */
  title?: string
  /** Include color legend */
  showLegend?: boolean
  /** Show current filter settings */
  showFilters?: boolean
  /** Current filter settings for display */
  filters?: {
    taxonomyType: 'risk' | 'process'
    viewMode: ViewMode
    aggregationMode: 'weighted' | 'max'
    visibleLevels: { l1: boolean; l2: boolean; l3: boolean; l4: boolean; l5: boolean }
  }
  /** Background color (default: '#1e293b' - app background) */
  backgroundColor?: string
}

/**
 * Create an inline SVG legend group for export
 */
function createLegendSvg(width: number, yOffset: number): SVGGElement {
  const ns = 'http://www.w3.org/2000/svg'
  const group = document.createElementNS(ns, 'g')
  group.setAttribute('transform', `translate(0, ${yOffset})`)

  const legendWidth = 150
  const legendHeight = 12
  const labelOffset = 20
  const startX = (width - legendWidth) / 2

  // Create gradient definition ID
  const gradientId = `export-legend-gradient-${Date.now()}`

  // Create defs element for gradient
  const defs = document.createElementNS(ns, 'defs')
  const linearGradient = document.createElementNS(ns, 'linearGradient')
  linearGradient.setAttribute('id', gradientId)
  linearGradient.setAttribute('x1', '0%')
  linearGradient.setAttribute('y1', '0%')
  linearGradient.setAttribute('x2', '100%')
  linearGradient.setAttribute('y2', '0%')

  // Add color stops
  for (const stop of HEATMAP_STOPS) {
    const stopEl = document.createElementNS(ns, 'stop')
    const offset = ((stop.score - 1) / 24) * 100
    stopEl.setAttribute('offset', `${offset}%`)
    stopEl.setAttribute('stop-color', stop.color)
    linearGradient.appendChild(stopEl)
  }
  defs.appendChild(linearGradient)
  group.appendChild(defs)

  // Low label
  const lowLabel = document.createElementNS(ns, 'text')
  lowLabel.setAttribute('x', String(startX - 8))
  lowLabel.setAttribute('y', String(legendHeight / 2 + 4))
  lowLabel.setAttribute('text-anchor', 'end')
  lowLabel.setAttribute('font-size', '11')
  lowLabel.setAttribute('fill', '#a1a1aa')
  lowLabel.textContent = 'Low (1)'
  group.appendChild(lowLabel)

  // Gradient rectangle
  const rect = document.createElementNS(ns, 'rect')
  rect.setAttribute('x', String(startX))
  rect.setAttribute('y', '0')
  rect.setAttribute('width', String(legendWidth))
  rect.setAttribute('height', String(legendHeight))
  rect.setAttribute('rx', '2')
  rect.setAttribute('fill', `url(#${gradientId})`)
  group.appendChild(rect)

  // High label
  const highLabel = document.createElementNS(ns, 'text')
  highLabel.setAttribute('x', String(startX + legendWidth + 8))
  highLabel.setAttribute('y', String(legendHeight / 2 + 4))
  highLabel.setAttribute('text-anchor', 'start')
  highLabel.setAttribute('font-size', '11')
  highLabel.setAttribute('fill', '#a1a1aa')
  highLabel.textContent = 'High (25)'
  group.appendChild(highLabel)

  return group
}

/**
 * Create a title text element for export
 */
function createTitleSvg(title: string, width: number, yOffset: number): SVGTextElement {
  const ns = 'http://www.w3.org/2000/svg'
  const text = document.createElementNS(ns, 'text')
  text.setAttribute('x', String(width / 2))
  text.setAttribute('y', String(yOffset))
  text.setAttribute('text-anchor', 'middle')
  text.setAttribute('font-size', '16')
  text.setAttribute('font-weight', 'bold')
  text.setAttribute('fill', '#fafafa')
  text.textContent = title
  return text
}

/**
 * Create filter info text for export
 */
function createFiltersSvg(
  filters: NonNullable<ExportOptions['filters']>,
  width: number,
  yOffset: number
): SVGTextElement {
  const ns = 'http://www.w3.org/2000/svg'
  const text = document.createElementNS(ns, 'text')
  text.setAttribute('x', String(width / 2))
  text.setAttribute('y', String(yOffset))
  text.setAttribute('text-anchor', 'middle')
  text.setAttribute('font-size', '11')
  text.setAttribute('fill', '#a1a1aa')

  const taxonomy = filters.taxonomyType === 'risk' ? 'Risk' : 'Process'
  const viewModeLabels: Record<ViewMode, string> = {
    net: 'Net Score',
    gross: 'Gross Score',
    'delta-gross-net': 'Gross-Net Delta',
    'delta-vs-appetite': 'vs Appetite Delta',
  }
  const score = viewModeLabels[filters.viewMode]
  const aggregation = filters.aggregationMode === 'weighted' ? 'Weighted Avg' : 'Maximum'
  const levels = Object.entries(filters.visibleLevels)
    .filter(([, visible]) => visible)
    .map(([level]) => level.toUpperCase())
    .join(', ')

  text.textContent = `${taxonomy} Taxonomy | ${score} Score | ${aggregation} | Levels: ${levels}`
  return text
}

/**
 * Clone SVG and add export enhancements (title, legend, filters)
 */
function prepareExportSvg(
  svgElement: SVGSVGElement,
  options?: ExportOptions
): SVGSVGElement {
  // Clone the SVG
  const clone = svgElement.cloneNode(true) as SVGSVGElement

  // Get current dimensions
  const viewBox = clone.getAttribute('viewBox')
  let width = 600
  let height = 600
  if (viewBox) {
    const [, , w, h] = viewBox.split(' ').map(Number)
    width = w
    height = h
  }

  // Calculate additional height needed
  let additionalTop = 0
  let additionalBottom = 0

  if (options?.title) {
    additionalTop += 30
  }
  if (options?.showFilters && options?.filters) {
    additionalTop += 20
  }
  if (options?.showLegend) {
    additionalBottom += 30
  }

  // Update viewBox and add content
  const newHeight = height + additionalTop + additionalBottom
  clone.setAttribute('viewBox', `0 ${-additionalTop} ${width} ${newHeight}`)
  clone.setAttribute('width', String(width))
  clone.setAttribute('height', String(newHeight))

  // Add title if provided
  if (options?.title) {
    const title = createTitleSvg(options.title, width, -additionalTop + 20)
    clone.insertBefore(title, clone.firstChild)
  }

  // Add filters info if provided
  if (options?.showFilters && options?.filters) {
    const yOffset = options?.title ? -additionalTop + 40 : -additionalTop + 15
    const filters = createFiltersSvg(options.filters, width, yOffset)
    clone.insertBefore(filters, clone.firstChild)
  }

  // Add legend if enabled
  if (options?.showLegend) {
    const legend = createLegendSvg(width, height + 10)
    clone.appendChild(legend)
  }

  return clone
}

/**
 * Export sunburst chart as SVG file
 */
export function exportSunburstSvg(
  svgElement: SVGSVGElement,
  filename: string,
  options?: ExportOptions
): void {
  const preparedSvg = prepareExportSvg(svgElement, options)

  // Add background rect if specified
  if (options?.backgroundColor) {
    const ns = 'http://www.w3.org/2000/svg'
    const viewBox = preparedSvg.getAttribute('viewBox')
    if (viewBox) {
      const [x, y, w, h] = viewBox.split(' ').map(Number)
      const bgRect = document.createElementNS(ns, 'rect')
      bgRect.setAttribute('x', String(x))
      bgRect.setAttribute('y', String(y))
      bgRect.setAttribute('width', String(w))
      bgRect.setAttribute('height', String(h))
      bgRect.setAttribute('fill', options.backgroundColor)
      preparedSvg.insertBefore(bgRect, preparedSvg.firstChild)
    }
  }

  // Serialize and download
  const serializer = new XMLSerializer()
  const svgString = serializer.serializeToString(preparedSvg)
  const blob = new Blob([svgString], { type: 'image/svg+xml' })
  saveAs(blob, filename)
}
