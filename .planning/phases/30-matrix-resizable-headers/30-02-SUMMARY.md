---
phase: 30-matrix-resizable-headers
plan: 02
subsystem: matrix
tags: [react, drag-resize, ui-interaction, matrix]

dependency_graph:
  requires: [30-01]
  provides: [resize-handles, dynamic-column-widths, dynamic-row-heights]
  affects: [30-03, 30-04]

tech_stack:
  added: []
  patterns: [pointer-capture-drag, incremental-delta-resize]

key_files:
  created: [src/components/matrix/ResizeHandle.tsx]
  modified: [src/components/matrix/MatrixGrid.tsx]

decisions:
  - id: "30-02-01"
    choice: "Incremental delta calculation during drag"
    why: "Smooth resizing without accumulating rounding errors"
  - id: "30-02-02"
    choice: "8px per char heuristic for auto-fit"
    why: "Simple estimation without DOM measurement overhead"
  - id: "30-02-03"
    choice: "Pointer capture for drag tracking"
    why: "Reliable drag even when cursor moves outside handle bounds"

metrics:
  duration: 4 min
  completed: 2026-01-27
---

# Phase 30 Plan 02: Resize Handle UI Component Summary

Created ResizeHandle component with pointer capture drag logic and integrated into MatrixGrid for dynamic column/row sizing.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Create ResizeHandle component | e816611 | src/components/matrix/ResizeHandle.tsx |
| 2 | Integrate resize handles into MatrixGrid | 8e5dc93 | src/components/matrix/MatrixGrid.tsx |

## Changes Made

### ResizeHandle Component (Task 1)
Created new component with:
- `direction` prop: 'horizontal' (width) or 'vertical' (height)
- `onResize` callback: receives incremental pixel delta during drag
- `onResizeEnd` callback: called when drag completes
- `onDoubleClick` callback: for auto-fit feature

Implementation details:
- Uses `setPointerCapture` for reliable drag outside element bounds
- Tracks drag via refs (isDragging, startPos, lastDelta) to avoid re-renders
- 6px hitzone with 2px visual indicator line on hover
- z-index 40 to appear above sticky headers
- Cursor changes to col-resize/row-resize based on direction

### MatrixGrid Integration (Task 2)
Updated grid to use dynamic sizes:
- `getColumnWidth(itemId)`: returns custom width or defaultColumnWidth * zoom
- `getRowHeight(itemId)`: returns custom height or defaultRowHeight * zoom
- `autoFitColumnWidth(itemId, label)`: estimates width from label length

Grid template changes:
- Changed from `repeat(n, cellSize)` to explicit width per column
- Each column header has horizontal ResizeHandle
- Each row header has vertical ResizeHandle
- Data cells sized to match header dimensions

## Decisions Made

1. **Incremental delta**: Calculate difference from last position, not from start. Prevents accumulation errors during rapid mouse movement.

2. **8px per char auto-fit**: Simple heuristic (`label.length * 8 + 16` for padding, min 80px). Avoids complex DOM measurement while giving reasonable results.

3. **Pointer capture API**: Using `setPointerCapture`/`releasePointerCapture` ensures drag continues even when cursor moves fast outside the thin handle.

## Verification

- [x] TypeScript compiles without errors
- [x] ResizeHandle exports correctly
- [x] Column headers have resize handles
- [x] Row headers have resize handles
- [x] Dragging invokes onResize with delta
- [x] Double-click triggers auto-fit callback
- [x] Works with both normal and inverted orientation

## Deviations from Plan

None - plan executed exactly as written.

## Next Plan Readiness

Ready for 30-03 (Reset Controls):
- ResizeHandle component available for reuse
- setColumnWidth/setRowHeight being called on drag
- autoFitColumnWidth demonstrates width estimation pattern
- Need reset button in toolbar to call resetAllSizes()
