---
phase: 03-risk-control-table
plan: 01
subsystem: ui
tags: [tanstack-table, tanstack-virtual, zustand, react, virtualization, heatmap]

# Dependency graph
requires:
  - phase: 02-taxonomy-builders
    provides: taxonomy store with risks and processes arrays
provides:
  - RCT types (RCTRow, Control, CustomColumn)
  - RCT store with persistence and CRUD actions
  - Row generation from taxonomy Cartesian product
  - Virtualized table component with hierarchy columns
  - Heatmap color interpolation utility
affects: [03-02-PLAN, 04-risk-matrix]

# Tech tracking
tech-stack:
  added: [@tanstack/react-table, @tanstack/react-virtual, hot-formula-parser, @radix-ui/react-dialog]
  patterns: [virtualized table with absolute positioning, heatmap color interpolation, hierarchy path extraction]

key-files:
  created:
    - src/types/rct.ts
    - src/stores/rctStore.ts
    - src/utils/rctGenerator.ts
    - src/utils/heatmapColors.ts
    - src/components/rct/RCTTable.tsx
    - src/components/rct/index.ts
  modified:
    - src/pages/RCTPage.tsx
    - package.json

key-decisions:
  - "Cartesian product of leaf risks x leaf processes generates rows"
  - "Full L1-L5 hierarchy stored in each row for filtering flexibility"
  - "Virtualization uses absolute positioning with translateY"
  - "Heatmap interpolates green-yellow-orange-red across 1-25 score range"
  - "Net score is minimum of all control net scores"

patterns-established:
  - "TanStack Table + Virtual: useReactTable + useVirtualizer pattern for large datasets"
  - "Score cells: colored background via inline style from heatmap utility"
  - "Empty states: conditional rendering for no taxonomies vs no rows"

# Metrics
duration: 3min
completed: 2026-01-19
---

# Phase 03 Plan 01: RCT Core Infrastructure Summary

**TanStack Table + Virtual integration with Cartesian product row generation from taxonomy leaf items and heatmap coloring for risk scores**

## Performance

- **Duration:** 3 min
- **Started:** 2026-01-19T15:08:28Z
- **Completed:** 2026-01-19T15:11:41Z
- **Tasks:** 3
- **Files modified:** 9

## Accomplishments

- RCT types with full L1-L5 hierarchy support for both risk and process
- Zustand store with CRUD for rows, controls, custom columns and auto-recalculation
- Row generation creates Cartesian product of leaf risks x leaf processes
- Virtualized table handles large datasets with smooth scrolling
- Heatmap color interpolation for gross/net score visualization
- Appetite indicator shows green (within) or red (exceeded)

## Task Commits

Each task was committed atomically:

1. **Task 1: Install dependencies and create RCT types** - `41be045` (feat)
2. **Task 2: Create RCT store and row generation utility** - `d55071d` (feat)
3. **Task 3: Create RCT table component with virtualization** - `6137a5d` (feat)

## Files Created/Modified

- `src/types/rct.ts` - RCTRow, Control, CustomColumn type definitions
- `src/stores/rctStore.ts` - Zustand store with persistence and full CRUD
- `src/utils/rctGenerator.ts` - getLeafItems, generateRCTRows functions
- `src/utils/heatmapColors.ts` - getHeatmapColor, getContrastingText, getAppetiteColor
- `src/components/rct/RCTTable.tsx` - 261-line table component with virtualization
- `src/components/rct/index.ts` - Component barrel export
- `src/pages/RCTPage.tsx` - Updated to render RCTTable
- `package.json` - Added 4 dependencies

## Decisions Made

- Full L1-L5 hierarchy stored in each row (not just leaf ID) for flexible filtering without joins
- Virtualization with absolute positioning and translateY for smooth scrolling
- Heatmap uses 4 color stops with linear interpolation (green at 1, yellow at 6, orange at 12, red at 25)
- Net score calculated as minimum of all control net scores (most favorable outcome)
- Risk appetite defaults to 9 (middle of 5x5 matrix)

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- RCT table displays all hierarchy columns and scoring placeholders
- Ready for Plan 02: scoring dropdowns, controls modal, filtering
- Store actions for updateRow, addControl, etc. ready for UI integration
- Heatmap utility ready for score cell coloring

---
*Phase: 03-risk-control-table*
*Completed: 2026-01-19*
