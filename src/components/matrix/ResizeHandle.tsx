import { useRef, useCallback } from 'react'

export interface ResizeHandleProps {
  /** Direction of resize: horizontal (width via right edge), vertical (height via bottom edge) */
  direction: 'horizontal' | 'vertical'
  /** Called during drag with pixel delta from start position */
  onResize: (delta: number) => void
  /** Called when drag ends */
  onResizeEnd?: () => void
  /** Called on double-click (for auto-fit) */
  onDoubleClick?: () => void
}

/**
 * Resize handle component for draggable column/row edges.
 * Position this inside a relative parent container.
 *
 * - horizontal: appears on right edge, drag changes width
 * - vertical: appears on bottom edge, drag changes height
 */
export function ResizeHandle({
  direction,
  onResize,
  onResizeEnd,
  onDoubleClick,
}: ResizeHandleProps) {
  const isDraggingRef = useRef(false)
  const startPosRef = useRef(0)
  const lastDeltaRef = useRef(0)

  const handlePointerDown = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      e.preventDefault()
      e.stopPropagation()

      isDraggingRef.current = true
      startPosRef.current = direction === 'horizontal' ? e.clientX : e.clientY
      lastDeltaRef.current = 0

      // Capture pointer for tracking outside element bounds
      e.currentTarget.setPointerCapture(e.pointerId)
    },
    [direction]
  )

  const handlePointerMove = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (!isDraggingRef.current) return

      e.preventDefault()
      e.stopPropagation()

      const currentPos = direction === 'horizontal' ? e.clientX : e.clientY
      const totalDelta = currentPos - startPosRef.current
      const incrementalDelta = totalDelta - lastDeltaRef.current
      lastDeltaRef.current = totalDelta

      if (incrementalDelta !== 0) {
        onResize(incrementalDelta)
      }
    },
    [direction, onResize]
  )

  const handlePointerUp = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (!isDraggingRef.current) return

      e.preventDefault()
      e.stopPropagation()

      isDraggingRef.current = false
      e.currentTarget.releasePointerCapture(e.pointerId)

      onResizeEnd?.()
    },
    [onResizeEnd]
  )

  const handleDoubleClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      e.preventDefault()
      e.stopPropagation()
      onDoubleClick?.()
    },
    [onDoubleClick]
  )

  // Prevent click events from bubbling to parent elements (e.g., sort handlers on th)
  // This is needed because after a drag (pointerUp), the browser fires a click event
  const handleClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    e.stopPropagation()
  }, [])

  // Style based on direction
  const positionClasses =
    direction === 'horizontal'
      ? 'right-0 top-0 bottom-0 w-1.5 cursor-col-resize'
      : 'left-0 bottom-0 right-0 h-1.5 cursor-row-resize'

  return (
    <div
      className={`absolute opacity-0 hover:opacity-100 transition-opacity z-40 ${positionClasses}`}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      onClick={handleClick}
      onDoubleClick={handleDoubleClick}
      style={{
        // Show a 2px line indicator on hover
        backgroundColor: 'transparent',
      }}
    >
      {/* Visual indicator line */}
      <div
        className={`absolute ${
          direction === 'horizontal'
            ? 'right-0.5 top-0 bottom-0 w-0.5 bg-primary/50'
            : 'bottom-0.5 left-0 right-0 h-0.5 bg-primary/50'
        }`}
      />
    </div>
  )
}
