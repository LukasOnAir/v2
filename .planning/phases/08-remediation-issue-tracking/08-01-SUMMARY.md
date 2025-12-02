---
phase: 08-remediation-issue-tracking
plan: 01
subsystem: database
tags: [zustand, remediation, issue-tracking, typescript, date-fns]

# Dependency graph
requires:
  - phase: 05-control-testing
    provides: ControlTest type and controlTests state in rctStore
provides:
  - RemediationPlan, ActionItem, RemediationStatus types
  - Remediation CRUD actions in rctStore
  - Priority derivation from grossScore
  - Overdue/upcoming remediation queries
affects: [08-02, 08-03, remediation-ui, dashboard]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - Priority derivation from risk score (critical/high/medium/low thresholds)
    - Cascade delete for remediation plans when control removed
    - Status workflow with date tracking (createdDate, resolvedDate, closedDate)

key-files:
  created: []
  modified:
    - src/types/rct.ts
    - src/stores/rctStore.ts

key-decisions:
  - "Priority is derived from grossScore: >=20 critical, >=12 high, >=6 medium, else low"
  - "Cascade delete remediation plans when control is removed (via controlTestId linkage)"
  - "Store remediationPlans in rctStore (same store as control tests) for data locality"

patterns-established:
  - "derivePriority helper for risk-based priority calculation"
  - "Status workflow: open -> in-progress -> resolved -> closed with date tracking"
  - "Action items as nested array with toggle/completion tracking"

# Metrics
duration: 4min
completed: 2026-01-21
---

# Phase 8 Plan 1: Remediation Data Layer Summary

**RemediationPlan type with CRUD store actions, priority derivation from grossScore, and cascade delete on control removal**

## Performance

- **Duration:** 4 min
- **Started:** 2026-01-21T12:00:00Z
- **Completed:** 2026-01-21T12:04:00Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments
- RemediationPlan, ActionItem, RemediationStatus types added to rct.ts
- Full CRUD actions for remediation plans in rctStore
- Action item management (add, toggle, remove) with completion tracking
- Overdue and upcoming remediation queries using date-fns
- Cascade delete of remediation plans when control is removed

## Task Commits

Each task was committed atomically:

1. **Task 1: Add remediation types to rct.ts** - `df60a29` (feat)
2. **Task 2: Extend rctStore with remediation state and actions** - `caf76b5` (feat)

## Files Created/Modified
- `src/types/rct.ts` - Added RemediationStatus, ActionItem, RemediationPlan types
- `src/stores/rctStore.ts` - Added derivePriority helper, remediationPlans state, all CRUD and query actions

## Decisions Made
- Priority thresholds: >=20 critical, >=12 high, >=6 medium, <6 low (maps to 5x5 risk matrix)
- Store uses nanoid for ID generation (consistent with existing control IDs)
- Cascade delete implemented by collecting testIds before deletion, then filtering remediationPlans
- Status changes automatically track dates (resolvedDate, closedDate)

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- Remediation data layer complete, ready for UI components
- Types exported and available for import in components
- Store actions available for RemediationSection component in 08-02
- Dashboard queries (getOverdueRemediations, getUpcomingRemediations) ready for 08-03

---
*Phase: 08-remediation-issue-tracking*
*Completed: 2026-01-21*
