---
phase: 04-matrix-and-polish
plan: 05
subsystem: auth
tags: [permissions, role-based-access, control-owner, risk-manager]

# Dependency graph
requires:
  - phase: 04-02
    provides: Basic permission hook and change request functionality
provides:
  - Complete Control Owner view-only enforcement
  - Per-control change request functionality
  - Comprehensive permission flags for all editing surfaces
affects: [uat-testing]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - Permission hook with granular flags
    - Per-control change request tracking with controlId

key-files:
  created: []
  modified:
    - src/hooks/usePermissions.ts
    - src/components/matrix/MatrixExpandedView.tsx
    - src/pages/TaxonomyPage.tsx
    - src/components/taxonomy/TaxonomyToolbar.tsx
    - src/components/taxonomy/TaxonomyNode.tsx
    - src/components/rct/RCTTable.tsx
    - src/components/rct/EditableCell.tsx
    - src/components/rct/ControlPanel.tsx

key-decisions:
  - "Control Owner has NO edit permissions - view-only plus change requests"
  - "Change request button per control card, not at panel level"
  - "controlId stored with change request for context"

patterns-established:
  - "Per-control change request with activeChangeRequestControlId state"
  - "Comprehensive permission flags in usePermissions hook"

# Metrics
duration: 8min
completed: 2026-01-19
---

# Phase 04 Plan 05: Control Owner Permissions Fix Summary

**Complete Control Owner view-only enforcement across RCT, Matrix, and Taxonomy with per-control change request UI**

## Performance

- **Duration:** 8 min
- **Started:** 2026-01-19T21:10:00Z
- **Completed:** 2026-01-19T21:18:00Z
- **Tasks:** 2
- **Files modified:** 8

## Accomplishments

- Fixed Control Owner role to be truly view-only (no editing of any kind)
- Added comprehensive permission flags: canEditNetScores, canEditTaxonomies, canEditCustomColumnValues
- Moved change request functionality from panel-level to per-control level
- Applied permission checks across all editing surfaces (Matrix, Taxonomy, RCT)

## Task Commits

Each task was committed atomically:

1. **Task 1: Update usePermissions hook** - `9f12227` (feat)
2. **Task 2: Apply permission checks across all surfaces** - `aaa042d` (feat)

## Files Created/Modified

- `src/hooks/usePermissions.ts` - Complete permission flags for Control Owner restrictions
- `src/components/matrix/MatrixExpandedView.tsx` - Disabled score dropdowns for Control Owner
- `src/pages/TaxonomyPage.tsx` - Hide add buttons and update empty state for Control Owner
- `src/components/taxonomy/TaxonomyToolbar.tsx` - Hide add root item button for Control Owner
- `src/components/taxonomy/TaxonomyNode.tsx` - Hide action buttons, prevent inline editing
- `src/components/rct/RCTTable.tsx` - Disable custom column cells for Control Owner
- `src/components/rct/EditableCell.tsx` - Added disabled prop support
- `src/components/rct/ControlPanel.tsx` - Per-control change request, disabled net scores

## Decisions Made

1. **Control Owner is view-only** - Previous implementation allowed Control Owner to edit net scores. UAT revealed this was incorrect. Fixed to completely restrict all editing.
2. **Per-control change request** - Change request button moved inside each control card. Includes controlId in request for context. Risk Manager sees which control the request relates to.
3. **Renamed permission flags** - canRequestChanges -> canSubmitChangeRequests for clarity, added canEditNetScores separate from canEditGrossScores.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- UAT Tests 10 and 11 should now pass
- Control Owner role fully restricted to view-only + change requests
- All editing surfaces properly check permissions

---
*Phase: 04-matrix-and-polish*
*Completed: 2026-01-19*
