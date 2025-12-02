import { useRef, useState, useMemo, useCallback, useEffect, forwardRef, useImperativeHandle } from 'react'
import { useNavigate } from 'react-router'
import { partition, type HierarchyRectangularNode } from 'd3-hierarchy'
import { arc as d3Arc } from 'd3-shape'
import { interpolate } from 'd3-interpolate'
import { motion } from 'motion/react'
import { useSunburstData, type SunburstNode } from './useSunburstData'
import { useSunburstStore, type LevelVisibility } from '@/stores/sunburstStore'
import { getHeatmapColor, getContrastingText } from '@/utils/heatmapColors'
import { getDeltaColor, getDeltaColorMode, NO_DATA_COLOR } from '@/utils/deltaColors'
import { SunburstTooltip } from './SunburstTooltip'
import { SunburstBreadcrumb } from './SunburstBreadcrumb'

interface SunburstChartProps {
  /** Chart width in pixels */
  width?: number
  /** Chart height in pixels */
  height?: number
  /** Whether container dimensions are stable (prevents animation jitter) */
  dimensionsReady?: boolean
}

interface ContextMenuState {
  visible: boolean
  x: number
  y: number
  node: HierarchyRectangularNode<SunburstNode> | null
}

interface TooltipState {
  visible: boolean
  x: number
  y: number
  node: HierarchyRectangularNode<SunburstNode> | null
}

export const SunburstChart = forwardRef<SVGSVGElement, SunburstChartProps>(function SunburstChart(
  { width = 600, height = 600, dimensionsReady = true },
  forwardedRef
) {
  const navigate = useNavigate()
  const svgRef = useRef<SVGSVGElement>(null)

  // Expose internal ref to parent via forwardRef
  useImperativeHandle(forwardedRef, () => svgRef.current!, [])

  // Store state
  const {
    taxonomyType,
    viewMode,
    aggregationMode,
    visibleLevels,
    hideNoData,
    showNames,
    zoomPath,
    currentCenterId,
    zoomTo,
    zoomOut,
    resetZoom,
    animationComplete,
    setAnimationComplete,
  } = useSunburstStore()

  // Get hierarchy data
  const sunburstData = useSunburstData()
  const hierarchyRoot = sunburstData?.hierarchyData ?? null
  const maxDelta = sunburstData?.maxDelta ?? 0

  // Local UI state
  const [tooltip, setTooltip] = useState<TooltipState>({
    visible: false,
    x: 0,
    y: 0,
    node: null,
  })
  const [contextMenu, setContextMenu] = useState<ContextMenuState>({
    visible: false,
    x: 0,
    y: 0,
    node: null,
  })

  // Opening animation state
  const [openingAnimationProgress, setOpeningAnimationProgress] = useState(0)
  const openingAnimationFrameRef = useRef<number | null>(null)
  const hasAnimatedRef = useRef(false)

  // Calculate dimensions
  const radius = Math.min(width, height) / 2
  const innerRadius = radius * 0.22 // Center circle size (larger for better text visibility)

  // Calculate maximum visible depth based on level toggles
  // This determines how many rings to show and how wide each should be
  const maxVisibleDepth = useMemo(() => {
    const levels = ['l1', 'l2', 'l3', 'l4', 'l5'] as const
    let max = 0
    for (let i = 0; i < levels.length; i++) {
      if (visibleLevels[levels[i]]) max = i + 1
    }
    return Math.max(max, 1) // At least 1 level
  }, [visibleLevels])

  // Apply partition layout to hierarchy
  const partitionedRoot = useMemo(() => {
    if (!hierarchyRoot) return null

    const partitionLayout = partition<SunburstNode>().size([2 * Math.PI, radius])
    const root = partitionLayout(hierarchyRoot)

    return root
  }, [hierarchyRoot, radius])

  // Opening animation effect - runs once when partitionedRoot first becomes available AND dimensions are stable
  useEffect(() => {
    // Only animate once per mount, and wait for dimensions to be stable
    if (hasAnimatedRef.current || !partitionedRoot || !dimensionsReady) return
    hasAnimatedRef.current = true

    const duration = 800 // ms
    const start = performance.now()

    const animate = (now: number) => {
      const elapsed = now - start
      const progress = Math.min(elapsed / duration, 1)
      // easeOutCubic for smooth deceleration
      const eased = 1 - Math.pow(1 - progress, 3)
      setOpeningAnimationProgress(eased)

      if (progress < 1) {
        openingAnimationFrameRef.current = requestAnimationFrame(animate)
      } else {
        setAnimationComplete(true)
      }
    }

    requestAnimationFrame(animate)

    return () => {
      if (openingAnimationFrameRef.current) {
        cancelAnimationFrame(openingAnimationFrameRef.current)
      }
    }
  }, [partitionedRoot, dimensionsReady, setAnimationComplete])

  // Find the current center node for zooming
  const currentCenterNode = useMemo(() => {
    if (!partitionedRoot || !currentCenterId) return partitionedRoot

    let targetNode: HierarchyRectangularNode<SunburstNode> | null = null
    partitionedRoot.each((node) => {
      if (node.data.id === currentCenterId) {
        targetNode = node
      }
    })
    return targetNode || partitionedRoot
  }, [partitionedRoot, currentCenterId])

  // Create arc generator
  const arcGenerator = useMemo(() => {
    return d3Arc<HierarchyRectangularNode<SunburstNode>>()
      .startAngle((d) => d.x0)
      .endAngle((d) => d.x1)
      .padAngle((d) => Math.min((d.x1 - d.x0) / 2, 0.005))
      .padRadius(radius / 2)
      .innerRadius((d) => d.y0)
      .outerRadius((d) => Math.max(d.y0, d.y1 - 1))
  }, [radius])

  // Check if a node should be visible
  const isNodeVisible = useCallback(
    (
      node: HierarchyRectangularNode<SunburstNode>,
      levels: LevelVisibility,
      hideEmpty: boolean,
      centerNode: HierarchyRectangularNode<SunburstNode>,
      maxDepth: number
    ): boolean => {
      // Root is never shown as an arc (it's the center)
      if (node.depth === 0) return false

      // Check level visibility
      const levelKey = `l${node.depth}` as keyof LevelVisibility
      if (node.depth <= 5 && !levels[levelKey]) return false

      // Check no-data hiding
      if (hideEmpty && node.data.value === null) return false

      // Check zoom-relative visibility
      const centerDepth = centerNode.depth
      const relativeDepth = node.depth - centerDepth

      // Only show nodes within maxDepth levels of current center
      if (relativeDepth < 1 || relativeDepth > maxDepth) return false

      // Only show descendants of current center
      let ancestor: HierarchyRectangularNode<SunburstNode> | null = node
      while (ancestor && ancestor.depth > centerDepth) {
        ancestor = ancestor.parent
      }
      if (ancestor !== centerNode) return false

      // Check if arc has visible size
      return node.x1 > node.x0
    },
    []
  )

  // Get visible nodes with zoom-adjusted positions
  const visibleNodes = useMemo(() => {
    if (!partitionedRoot || !currentCenterNode) return []

    const nodes: Array<{
      node: HierarchyRectangularNode<SunburstNode>
      arcData: { x0: number; x1: number; y0: number; y1: number }
    }> = []

    // Calculate zoom transformation
    const centerX0 = currentCenterNode.x0
    const centerX1 = currentCenterNode.x1
    const centerY0 = currentCenterNode.y0
    const angleScale = (2 * Math.PI) / (centerX1 - centerX0 || 1)

    // Calculate dynamic ring width based on visible depth
    // Instead of fixed 5-level layout, expand rings to fill available space
    const availableRadius = radius - innerRadius
    const ringWidth = availableRadius / maxVisibleDepth

    partitionedRoot.each((node) => {
      if (!isNodeVisible(node, visibleLevels, hideNoData, currentCenterNode, maxVisibleDepth)) {
        return
      }

      // Calculate zoomed arc positions
      let x0 = (node.x0 - centerX0) * angleScale
      let x1 = (node.x1 - centerX0) * angleScale

      // Calculate relative depth from center node
      const centerDepth = currentCenterNode.depth
      const relativeDepth = node.depth - centerDepth

      // Dynamic y positioning based on visible levels
      // Map relative depth (1, 2, 3...) to ring positions
      let y0 = innerRadius + (relativeDepth - 1) * ringWidth
      let y1 = innerRadius + relativeDepth * ringWidth

      // Clamp to valid ranges
      x0 = Math.max(0, Math.min(2 * Math.PI, x0))
      x1 = Math.max(x0, Math.min(2 * Math.PI, x1))
      y0 = Math.max(innerRadius, y0)
      y1 = Math.max(y0, Math.min(radius, y1))

      // Skip if arc is too small
      if (x1 - x0 < 0.001) return

      nodes.push({
        node,
        arcData: { x0, x1, y0, y1 },
      })
    })

    return nodes
  }, [partitionedRoot, currentCenterNode, visibleLevels, hideNoData, isNodeVisible, radius, innerRadius, maxVisibleDepth])

  // Build breadcrumb path from current center
  const breadcrumbPath = useMemo(() => {
    if (!currentCenterNode || currentCenterNode.depth === 0) return []

    const path: Array<{ id: string; name: string; hierarchicalId: string }> = []
    let node: HierarchyRectangularNode<SunburstNode> | null = currentCenterNode

    while (node && node.depth > 0) {
      path.unshift({
        id: node.data.id,
        name: node.data.name,
        hierarchicalId: node.data.hierarchicalId,
      })
      node = node.parent
    }

    return path
  }, [currentCenterNode])

  // Get color for a node
  const getNodeColor = useCallback((node: HierarchyRectangularNode<SunburstNode>): string => {
    if (node.data.value === null) return NO_DATA_COLOR

    const colorMode = getDeltaColorMode(viewMode)
    if (colorMode === 'absolute') {
      // Standard heatmap for net/gross views
      return getHeatmapColor(node.data.value)
    }

    // Delta views use dynamic color scale
    return getDeltaColor(node.data.value, maxDelta, colorMode)
  }, [viewMode, maxDelta])

  // Get label for a node
  const getNodeLabel = useCallback(
    (node: HierarchyRectangularNode<SunburstNode>, arcData: { x0: number; x1: number }): string | null => {
      const arcAngle = arcData.x1 - arcData.x0

      // Only show label if arc is large enough
      if (arcAngle < 0.1) return null

      // Show ID + name if showNames is enabled and arc is large enough
      if (showNames && arcAngle > 0.2) {
        return `${node.data.hierarchicalId} ${node.data.name}`
      }

      // Default: just hierarchical ID
      return node.data.hierarchicalId
    },
    [showNames]
  )

  // Calculate max label characters based on available arc space
  const calculateMaxLabelChars = useCallback(
    (arcData: { x0: number; x1: number; y0: number; y1: number }): number => {
      // Calculate arc length at midpoint radius
      const midRadius = (arcData.y0 + arcData.y1) / 2
      const arcAngle = arcData.x1 - arcData.x0
      const arcLength = midRadius * arcAngle

      // Approximate character width in pixels (10px font = ~6px per char)
      const charWidth = 6
      // Leave 20% margin for padding
      const availableWidth = arcLength * 0.8

      // Return max characters that fit, minimum 3 (for "...")
      return Math.max(3, Math.floor(availableWidth / charWidth))
    },
    []
  )

  // Calculate label position
  const getLabelTransform = useCallback(
    (arcData: { x0: number; x1: number; y0: number; y1: number }): string => {
      const midAngle = (arcData.x0 + arcData.x1) / 2
      const midRadius = (arcData.y0 + arcData.y1) / 2
      const x = midRadius * Math.sin(midAngle)
      const y = -midRadius * Math.cos(midAngle)

      // Rotate text to be readable
      let rotation = (midAngle * 180) / Math.PI - 90
      if (rotation > 90) rotation -= 180

      return `translate(${x},${y}) rotate(${rotation})`
    },
    []
  )

  // Handle zoom to a node
  const handleZoomTo = useCallback(
    (node: HierarchyRectangularNode<SunburstNode>) => {
      // Build path from root to this node
      const path: string[] = []
      let current: HierarchyRectangularNode<SunburstNode> | null = node

      while (current && current.depth > 0) {
        path.unshift(current.data.id)
        current = current.parent
      }

      zoomTo(node.data.id, path)
    },
    [zoomTo]
  )

  // Handle breadcrumb navigation
  const handleBreadcrumbNavigate = useCallback(
    (nodeId: string) => {
      if (nodeId === 'root') {
        resetZoom()
        return
      }

      // Find the node and build path to it
      if (!partitionedRoot) return

      let targetNode: HierarchyRectangularNode<SunburstNode> | null = null
      partitionedRoot.each((node) => {
        if (node.data.id === nodeId) {
          targetNode = node
        }
      })

      if (targetNode) {
        handleZoomTo(targetNode)
      }
    },
    [partitionedRoot, resetZoom, handleZoomTo]
  )

  // Handle center click (zoom out)
  const handleCenterClick = useCallback(() => {
    if (currentCenterId) {
      zoomOut()
    }
  }, [currentCenterId, zoomOut])

  // Handle right-click context menu
  const handleContextMenu = useCallback(
    (e: React.MouseEvent, node: HierarchyRectangularNode<SunburstNode>) => {
      e.preventDefault()
      // Hide tooltip when context menu opens
      setTooltip({ visible: false, x: 0, y: 0, node: null })
      setContextMenu({
        visible: true,
        x: e.clientX,
        y: e.clientY,
        node,
      })
    },
    []
  )

  // Handle "View in RCT" navigation
  const handleViewInRCT = useCallback(() => {
    if (!contextMenu.node) return

    const hierarchicalId = contextMenu.node.data.hierarchicalId
    const param = taxonomyType === 'risk' ? 'risk' : 'process'

    navigate(`/rct?${param}=${encodeURIComponent(hierarchicalId)}`)
    setContextMenu({ visible: false, x: 0, y: 0, node: null })
  }, [contextMenu.node, taxonomyType, navigate])

  // Close context menu on click outside
  useEffect(() => {
    const handleClickOutside = () => {
      setContextMenu((prev) => ({ ...prev, visible: false }))
    }

    if (contextMenu.visible) {
      document.addEventListener('click', handleClickOutside)
      return () => document.removeEventListener('click', handleClickOutside)
    }
  }, [contextMenu.visible])

  // Handle mouse enter on arc
  const handleMouseEnter = useCallback(
    (e: React.MouseEvent, node: HierarchyRectangularNode<SunburstNode>) => {
      setTooltip({
        visible: true,
        x: e.clientX,
        y: e.clientY,
        node,
      })
    },
    []
  )

  // Handle mouse move on arc
  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    setTooltip((prev) => ({
      ...prev,
      x: e.clientX,
      y: e.clientY,
    }))
  }, [])

  // Handle mouse leave arc
  const handleMouseLeave = useCallback(() => {
    setTooltip({
      visible: false,
      x: 0,
      y: 0,
      node: null,
    })
  }, [])

  // Center label content
  const centerLabel = useMemo(() => {
    if (!currentCenterNode) return { name: 'No Data', score: null }

    // When at root view (not zoomed), show aggregation mode
    if (currentCenterNode.depth === 0 || !currentCenterId) {
      const modeLabel = aggregationMode === 'max' ? 'MAX' : 'AVG'
      return {
        name: modeLabel,
        score: currentCenterNode.data.value,
      }
    }

    // When zoomed into a node, show node name
    return {
      name: currentCenterNode.data.name,
      score: currentCenterNode.data.value,
    }
  }, [currentCenterNode, currentCenterId, aggregationMode])

  // Derive center display values (must be before early return to maintain hooks order)
  const isValidScore = centerLabel.score !== null && !isNaN(centerLabel.score) && isFinite(centerLabel.score)
  const centerScore = isValidScore ? centerLabel.score.toFixed(1) : '-'

  // Use same dynamic coloring logic for center circle
  const centerBgColor = useMemo(() => {
    if (!isValidScore) return NO_DATA_COLOR
    const colorMode = getDeltaColorMode(viewMode)
    if (colorMode === 'absolute') {
      return getHeatmapColor(centerLabel.score)
    }
    return getDeltaColor(centerLabel.score, maxDelta, colorMode)
  }, [centerLabel.score, viewMode, maxDelta, isValidScore])
  const centerTextColor = getContrastingText(centerBgColor)

  // Render nothing if no data
  if (!partitionedRoot) {
    return (
      <div className="flex items-center justify-center" style={{ width, height }}>
        <p className="text-secondary">No taxonomy data available</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-2">
      {/* Breadcrumb navigation */}
      <SunburstBreadcrumb path={breadcrumbPath} onNavigate={handleBreadcrumbNavigate} />

      {/* SVG Chart */}
      <svg
        ref={svgRef}
        width={width}
        height={height}
        className="select-none"
        viewBox={`0 0 ${width} ${height}`}
      >
        <g transform={`translate(${width / 2},${height / 2}) scale(${0.3 + 0.7 * openingAnimationProgress})`}>
          {/* Center circle with scale animation */}
          <motion.circle
            r={innerRadius}
            fill={centerBgColor}
            className={currentCenterId ? 'cursor-pointer hover:opacity-80' : ''}
            onClick={handleCenterClick}
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{
              scale: animationComplete ? 1 : 0.8,
              opacity: animationComplete ? 1 : 0,
            }}
            transition={{ duration: 0.4, ease: 'easeOut' }}
            style={{ transformOrigin: '0 0' }}
          />

          {/* Center text with downward reveal animation */}
          <motion.text
            textAnchor="middle"
            className="pointer-events-none"
            style={{ fill: centerTextColor }}
            initial={{ opacity: 0, y: -15 }}
            animate={{
              opacity: animationComplete ? 1 : 0,
              y: animationComplete ? 0 : -15,
            }}
            transition={{ duration: 0.4, delay: 0.1, ease: 'easeOut' }}
          >
            <tspan x="0" dy="-0.5em" className="text-sm font-medium">
              {centerLabel.name.length > 15
                ? centerLabel.name.substring(0, 15) + '...'
                : centerLabel.name}
            </tspan>
            <tspan x="0" dy="1.5em" className="text-lg font-bold">
              {centerScore}
            </tspan>
          </motion.text>

          {/* Arcs */}
          {visibleNodes.map(({ node, arcData }) => {
            const color = getNodeColor(node)
            const textColor = getContrastingText(color)
            const label = getNodeLabel(node, arcData)

            // Interpolate y0/y1 from innerRadius to final values during opening animation
            const animatedY0 = innerRadius + (arcData.y0 - innerRadius) * openingAnimationProgress
            const animatedY1 = innerRadius + (arcData.y1 - innerRadius) * openingAnimationProgress

            // Rotational fan effect: all wedges start stacked at 0 (12 o'clock),
            // then rotate clockwise to their final positions, revealing sequentially
            const arcWidth = arcData.x1 - arcData.x0
            const animatedX0 = arcData.x0 * openingAnimationProgress  // Rotate from 0 to final position
            const animatedX1 = animatedX0 + arcWidth  // Keep arc width constant

            // Create arc path data with animated radii and angles
            const pathData = arcGenerator({
              ...node,
              x0: animatedX0,
              x1: animatedX1,
              y0: animatedY0,
              y1: animatedY1,
            } as HierarchyRectangularNode<SunburstNode>)

            return (
              <g key={node.data.id}>
                <path
                  d={pathData || ''}
                  fill={color}
                  className="cursor-pointer transition-opacity duration-150 hover:opacity-80"
                  onClick={() => handleZoomTo(node)}
                  onMouseEnter={(e) => handleMouseEnter(e, node)}
                  onMouseMove={handleMouseMove}
                  onMouseLeave={handleMouseLeave}
                  onContextMenu={(e) => handleContextMenu(e, node)}
                />

                {/* Label - only show after animation completes for cleaner visual */}
                {label && animationComplete && (
                  <text
                    transform={getLabelTransform(arcData)}
                    textAnchor="middle"
                    dominantBaseline="middle"
                    className="pointer-events-none text-[10px] font-medium"
                    style={{ fill: textColor }}
                  >
                    {(() => {
                      const maxChars = calculateMaxLabelChars(arcData)
                      return label.length > maxChars
                        ? label.substring(0, maxChars - 3) + '...'
                        : label
                    })()}
                  </text>
                )}
              </g>
            )
          })}
        </g>
      </svg>

      {/* Tooltip */}
      <SunburstTooltip
        visible={tooltip.visible}
        x={tooltip.x}
        y={tooltip.y}
        name={tooltip.node?.data.name || ''}
        hierarchicalId={tooltip.node?.data.hierarchicalId || ''}
        score={tooltip.node?.data.value ?? null}
        viewMode={viewMode}
        missingDataReason={tooltip.node?.data.missingDataReason ?? null}
        grossValue={tooltip.node?.data.grossValue ?? null}
        netValue={tooltip.node?.data.netValue ?? null}
      />

      {/* Context Menu */}
      {contextMenu.visible && contextMenu.node && (
        <div
          className="fixed z-50 bg-surface-elevated border border-border rounded-lg shadow-lg py-1 min-w-[150px]"
          style={{ left: contextMenu.x, top: contextMenu.y }}
        >
          <button
            type="button"
            className="w-full px-4 py-2 text-left text-sm text-primary hover:bg-surface-hover transition-colors"
            onClick={handleViewInRCT}
          >
            View in RCT
          </button>
        </div>
      )}
    </div>
  )
})
