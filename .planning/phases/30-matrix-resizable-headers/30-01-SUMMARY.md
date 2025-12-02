---
phase: 30-matrix-resizable-headers
plan: 01
subsystem: stores
tags: [zustand, state-management, matrix, ui]

dependency_graph:
  requires: []
  provides: [columnWidths-state, rowHeights-state, size-actions]
  affects: [30-02, 30-03, 30-04]

tech_stack:
  added: []
  patterns: [zustand-immer, localStorage-persistence]

key_files:
  created: []
  modified: [src/stores/matrixStore.ts]

decisions:
  - id: "30-01-01"
    choice: "60px default size for both columns and rows"
    why: "Matches existing matrix cell dimensions"
  - id: "30-01-02"
    choice: "Column clamp range 40-400px, row clamp range 30-200px"
    why: "Minimum ensures usability, maximum prevents layout overflow"

metrics:
  duration: 2 min
  completed: 2026-01-27
---

# Phase 30 Plan 01: Resizable Header State Summary

Extended matrixStore with columnWidths/rowHeights Record maps and setter actions for per-item size persistence.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Add column/row size state and actions | 4eac1c3 | src/stores/matrixStore.ts |

## Changes Made

### State Additions
Added four new state fields to MatrixState:
- `columnWidths: Record<string, number>` - Maps column item IDs to custom widths
- `rowHeights: Record<string, number>` - Maps row item IDs to custom heights
- `defaultColumnWidth: 60` - Default width when no custom value set
- `defaultRowHeight: 60` - Default height when no custom value set

### Action Additions
Added five new actions:
- `setColumnWidth(columnId, width)` - Set width clamped to 40-400px
- `setRowHeight(rowId, height)` - Set height clamped to 30-200px
- `resetColumnWidth(columnId)` - Remove custom width (revert to default)
- `resetRowHeight(rowId)` - Remove custom height (revert to default)
- `resetAllSizes()` - Clear all custom sizes

### Persistence
All new state fields added to partialize function for localStorage persistence under 'riskguard-matrix' key.

## Decisions Made

1. **Default sizes**: 60px for both columns and rows matches existing matrix cell dimensions
2. **Clamp ranges**: Columns 40-400px, rows 30-200px prevents unusable extremes
3. **Record<string, number> structure**: Uses taxonomy item IDs as keys for efficient lookup

## Verification

- [x] TypeScript compiles without errors (`npx tsc --noEmit` passed)
- [x] columnWidths and rowHeights initialize as empty objects
- [x] setColumnWidth/setRowHeight clamp values to valid ranges
- [x] State included in localStorage persistence via partialize

## Deviations from Plan

None - plan executed exactly as written.

## Next Plan Readiness

Ready for 30-02 (Resize Handle UI Component):
- columnWidths and rowHeights state available
- setColumnWidth and setRowHeight actions ready for drag handlers
- Defaults provide fallback when no custom size exists
