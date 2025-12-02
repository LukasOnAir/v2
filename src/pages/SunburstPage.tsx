import { useRef, useState, useEffect } from 'react'
import { ZoomIn, ZoomOut } from 'lucide-react'
import {
  SunburstChart,
  SunburstControls,
  SunburstLegend,
  useSunburstData,
} from '@/components/sunburst'
import { useSunburstStore } from '@/stores/sunburstStore'

/**
 * Sunburst visualization page.
 * Displays a hierarchical risk/process sunburst chart with controls and legend.
 */
export function SunburstPage() {
  const svgRef = useRef<SVGSVGElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const [baseDimensions, setBaseDimensions] = useState({ width: 600, height: 600 })
  const [dimensionsReady, setDimensionsReady] = useState(false)
  const [zoom, setZoom] = useState(1.0) // Zoom level: 0.5 to 1.5
  const viewMode = useSunburstStore((state) => state.viewMode)
  const sunburstData = useSunburstData()
  const maxDelta = sunburstData?.maxDelta ?? 0

  // Track container size with ResizeObserver
  useEffect(() => {
    if (!containerRef.current) return

    const resizeObserver = new ResizeObserver((entries) => {
      const entry = entries[0]
      if (entry) {
        const { width, height } = entry.contentRect
        // Use square dimensions (min of width/height) for sunburst
        // Leave padding for legend overlay (subtract ~80px from width)
        const availableWidth = width - 80
        const size = Math.max(400, Math.min(availableWidth, height)) // Minimum 400px
        setBaseDimensions({ width: size, height: size })
        // Mark dimensions as ready after first ResizeObserver callback
        setDimensionsReady(true)
      }
    })

    resizeObserver.observe(containerRef.current)
    return () => resizeObserver.disconnect()
  }, [])

  // Apply zoom to dimensions
  const dimensions = {
    width: Math.round(baseDimensions.width * zoom),
    height: Math.round(baseDimensions.height * zoom),
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <h1 className="text-2xl font-semibold text-text-primary mb-4">
        Risk Sunburst
      </h1>

      {/* Controls toolbar */}
      <SunburstControls svgRef={svgRef} />

      {/* Main content area */}
      <div
        ref={containerRef}
        className="relative bg-surface-elevated rounded-lg p-4 flex-1 flex items-center justify-center mt-4 overflow-auto"
      >
        <SunburstChart ref={svgRef} width={dimensions.width} height={dimensions.height} dimensionsReady={dimensionsReady} />
        {/* Legend positioned inside, top-right */}
        <div className="absolute top-4 right-4">
          <SunburstLegend viewMode={viewMode} maxDelta={maxDelta} compact />
        </div>
        {/* Zoom slider positioned bottom-right */}
        <div className="absolute bottom-4 right-4 flex items-center gap-2 bg-surface-elevated/90 backdrop-blur-sm rounded-lg px-3 py-2">
          <ZoomOut className="w-4 h-4 text-text-secondary" />
          <input
            type="range"
            min="0.5"
            max="1.5"
            step="0.1"
            value={zoom}
            onChange={(e) => setZoom(parseFloat(e.target.value))}
            className="w-24 h-1.5 bg-border rounded-full cursor-pointer accent-accent [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-accent [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:shadow-md"
            title={`Zoom: ${Math.round(zoom * 100)}%`}
          />
          <ZoomIn className="w-4 h-4 text-text-secondary" />
          <span className="text-xs text-text-secondary w-10 text-right">{Math.round(zoom * 100)}%</span>
        </div>
      </div>
    </div>
  )
}
