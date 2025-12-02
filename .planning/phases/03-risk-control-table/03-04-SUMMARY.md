---
phase: 03-risk-control-table
plan: 04
subsystem: ui
tags: [react, tanstack-table, radix-ui, dnd-kit, bug-fix, enhancement]

# Dependency graph
requires:
  - phase: 03-01
    provides: RCT types, store, and base table structure
  - phase: 03-02
    provides: ScoreSelector, HeatmapCell, ControlPanel components
  - phase: 03-03
    provides: Column visibility, filters, custom columns
provides:
  - Fixed table column alignment with tableLayout: fixed
  - Working column visibility checkboxes (updater function pattern)
  - Working Risk L1 ID filter (registered filterFns)
  - Stable text/number inputs (memoized EditableCell)
  - Score dropdown replacing visual selector
  - Controls column between gross and net scores
  - Control type dropdown with 10 options
  - Cell comments for probability/impact reasoning
  - Info tooltips explaining scores and control types
  - Custom column delete, reorder, formula editing
affects: [04-matrix-and-polish, export, reporting]

# Tech tracking
tech-stack:
  added: [@radix-ui/react-tooltip, @radix-ui/react-popover, @dnd-kit/core, @dnd-kit/sortable, @dnd-kit/utilities]
  patterns: [updater-function, memoized-cells, column-management]

key-files:
  created:
    - src/components/rct/EditableCell.tsx
    - src/components/rct/ScoreDropdown.tsx
    - src/components/rct/InfoTooltip.tsx
    - src/components/rct/ColumnManager.tsx
    - src/components/rct/EditFormulaDialog.tsx
  modified:
    - src/components/rct/RCTTable.tsx
    - src/stores/rctStore.ts
    - src/types/rct.ts
    - src/components/rct/ControlPanel.tsx
    - src/components/rct/RCTToolbar.tsx
    - src/components/rct/AddColumnDialog.tsx
    - src/utils/formulaEngine.ts
    - src/components/rct/index.ts

key-decisions:
  - "Used memo() and store.getState() to prevent input focus loss on custom columns"
  - "Registered filterFns globally with string references for proper TanStack Table integration"
  - "Used Radix Popover for cell comments with textarea input"
  - "Used @dnd-kit/sortable for drag-and-drop column reordering"
  - "Formula validation extended to check custom column variable references"

patterns-established:
  - "Updater function pattern: check typeof before assigning state"
  - "Memoized cell pattern: extract input to separate memo() component"
  - "Info tooltip pattern: Radix Tooltip with scored descriptions"

# Metrics
duration: 15min
completed: 2026-01-19
---

# Phase 3 Plan 4: Gap Closure Summary

**Fixed all 14 UAT gaps: 4 major bugs, 4 major enhancements, and 6 minor enhancements**

## Performance

- **Duration:** 15 min
- **Started:** 2026-01-19T17:20:00Z
- **Completed:** 2026-01-19T17:35:00Z
- **Tasks:** 4
- **Files created:** 5
- **Files modified:** 8

## Accomplishments

### Major Bugs Fixed (4)
1. **Table column misalignment** - Added `tableLayout: 'fixed'` and `minWidth` to th/td elements
2. **Column visibility checkboxes** - Fixed Zustand setter to handle TanStack Table's updater function pattern
3. **Risk L1 ID filter** - Registered `filterFns` globally and used string reference `'multiSelect'`
4. **Text/Number input focus loss** - Created memoized `EditableCell` and removed `rows` from callback dependencies

### Major Enhancements (4)
5. **Score dropdowns** - Replaced visual 5-box selector with dropdown showing "1 - Rare" through "5 - Almost Certain"
6. **Column order** - Controls column now appears between Within Appetite and Net Score
7. **Net score calculation** - Already working (confirmed in UAT Test 6)
8. **Delete custom columns** - Added to ColumnManager dialog (pre-installed columns protected)

### Minor Enhancements (6)
9. **Control type dropdown** - 10 options: Preventative, Detective, Corrective, Directive, Deterrent, Compensating, Acceptance, Tolerance, Manual, Automated
10. **Cell comments** - Probability/impact cells have comment button opening popover
11. **Info tooltips** - (i) icons explain score meanings and control type descriptions
12. **Column reorder** - Drag-and-drop via @dnd-kit/sortable in Manage Columns dialog
13. **Edit formula** - Formula columns can be modified after creation via EditFormulaDialog
14. **Formula variables** - Formulas can reference other custom columns; validation checks references

## Task Commits

Each task was committed atomically:

1. **Task 1: Fix critical table bugs** - `b4eeefa` (fix)
2. **Task 2: Score dropdowns and column reorder** - `7e6bba1` (feat)
3. **Task 3: Control type and cell comments** - `be2d38e` (feat)
4. **Task 4: Column management** - `ae782b7` (feat)

## Files Created
- `src/components/rct/EditableCell.tsx` - Memoized input preventing focus loss
- `src/components/rct/ScoreDropdown.tsx` - Dropdown with 1-5 scores and labels
- `src/components/rct/InfoTooltip.tsx` - Radix Tooltip with score/control type info
- `src/components/rct/ColumnManager.tsx` - Dialog for delete, reorder, edit formula
- `src/components/rct/EditFormulaDialog.tsx` - Dialog for modifying formula columns

## Dependencies Added
- `@radix-ui/react-tooltip` - For info tooltips
- `@radix-ui/react-popover` - For cell comment popovers
- `@dnd-kit/core` - Drag and drop foundation
- `@dnd-kit/sortable` - Sortable list for column reorder
- `@dnd-kit/utilities` - CSS transform utilities

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- All Phase 3 UAT gaps are now closed
- Ready for re-verification with user
- Phase 4 (Matrix and Polish) can proceed after UAT approval

---
*Phase: 03-risk-control-table*
*Plan: 04 (Gap Closure)*
*Completed: 2026-01-19*
