---
phase: 35-controls-hub-enhancements
plan: 01
subsystem: ui
tags: [controls, table, icons, lucide-react, tanstack-table]

# Dependency graph
requires:
  - phase: 26-shared-tenant-database
    provides: Controls table component with database integration
provides:
  - Settings2 icon with link count badge on control names
  - Simplified controls table (removed redundant columns)
  - Cleaner table layout matching RCT pattern
affects: [controls-hub]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - Icon + count badge pattern for entity indicators (matching RCT)

key-files:
  created: []
  modified:
    - src/components/controls/ControlsTable.tsx

key-decisions:
  - "Settings2 icon + count on left of control name (always visible, matching RCT pattern)"
  - "Both icon-button and name text clickable to open detail panel"
  - "Removed Linked Risks and Risk Names columns (info available in detail panel)"
  - "Removed unused RCT hooks and linkedRisks computation for cleaner code"

patterns-established:
  - "Icon + count badge pattern: Settings2 icon with link count badge for controls (matching RCT's control indicator pattern)"

# Metrics
duration: 3min
completed: 2026-01-28
---

# Phase 35 Plan 01: Controls Hub Icon and Column Cleanup Summary

**Settings2 icon with link count badge added to control names, redundant columns removed for cleaner table**

## Performance

- **Duration:** 3 min
- **Started:** 2026-01-28T08:54:34Z
- **Completed:** 2026-01-28T08:58:00Z
- **Tasks:** 5
- **Files modified:** 1

## Accomplishments

- Settings2 icon with linked-risk count badge on left of control name (always visible)
- Both icon-button and name text open the control detail panel
- Removed "Linked Risks" column (count now shown in icon badge)
- Removed "Risk Names" column (accessible via detail panel)
- Cleaned up unused linkedRisks code and RCT imports

## Task Commits

Each task was committed atomically:

1. **Task 1: Update imports in ControlsTable.tsx** - `f351ea0` (chore)
2. **Task 2: Update Control Name column with icon+count on left** - `4d71527` (feat)
3. **Task 3: Remove Linked Risks count column** - `4526d5a` (refactor)
4. **Task 4: Remove Risk Names column** - `2799518` (refactor)
5. **Task 5: Clean up unused linkedRisks from EnrichedControl** - `12875d2` (refactor)

## Files Modified

- `src/components/controls/ControlsTable.tsx` - Controls table with Settings2 icon badge, removed redundant columns, cleaned up unused code

## Decisions Made

- **Icon position:** Settings2 icon + count badge placed on LEFT of control name (matching RCT pattern)
- **Always visible:** Icon badge visible at all times, not hover-only like previous PanelRight icon
- **Dual clickable:** Both icon-button and name text open the same detail panel for better UX
- **Column cleanup:** Removed Linked Risks and Risk Names columns since information is available in detail panel and count is shown in icon badge

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Controls Hub UI updated and consistent with RCT pattern
- Ready for visual verification in UI
- Table is now cleaner with 5 columns: Control Name (with icon), Type, Net Score, Tickets, Actions

---
*Phase: 35-controls-hub-enhancements*
*Completed: 2026-01-28*
