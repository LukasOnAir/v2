---
phase: 20-control-tester-interface
plan: 01
subsystem: auth
tags: [rbac, permissions, roles, control-tester]

# Dependency graph
requires:
  - phase: 16-four-eye-approval
    provides: Role-based permission system with Manager, Risk Manager, Control Owner
provides:
  - Control Tester as fourth role with most restrictive permissions
  - assignedTesterId field on Control for tester assignment
  - currentTesterId state for demo impersonation
  - canView* permission flags for page-level access control
  - Sidebar filtering based on role permissions
affects: [20-02, 20-03]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - Permission-based nav filtering via permissions[item.permission] lookup
    - PermissionKey type from ReturnType<typeof usePermissions>

key-files:
  created: []
  modified:
    - src/stores/uiStore.ts
    - src/types/rct.ts
    - src/hooks/usePermissions.ts
    - src/components/layout/Header.tsx
    - src/components/layout/Sidebar.tsx

key-decisions:
  - "Control Tester is most restrictive role (cannot inherit from Control Owner)"
  - "Tester ID selector uses hardcoded tester-1/2/3 for demo mode"
  - "canView* permissions default to !isControlTester (deny all pages for tester)"
  - "ClipboardCheck icon for My Controls nav item"

patterns-established:
  - "NavItem interface with optional permission key for filtered rendering"
  - "Permission property lookup via permissions[item.permission] pattern"

# Metrics
duration: 5min
completed: 2026-01-24
---

# Phase 20 Plan 01: Control Tester Role Infrastructure Summary

**Control Tester fourth role with restricted permissions, assignedTesterId field, and permission-based sidebar filtering**

## Performance

- **Duration:** 5 min
- **Started:** 2026-01-24
- **Completed:** 2026-01-24
- **Tasks:** 5
- **Files modified:** 5

## Accomplishments
- Added Control Tester as fourth role option with most restrictive permissions
- Extended Control interface with assignedTesterId for tester assignment
- Updated usePermissions hook with canView* flags for all pages
- Added tester ID selector in Header (visible only for Control Tester role)
- Implemented permission-based nav filtering in Sidebar (Control Tester sees only "My Controls")

## Task Commits

Each task was committed atomically:

1. **Task 1: Extend AppRole type and add tester state to uiStore** - `d60a625` (feat)
2. **Task 2: Add assignedTesterId field to Control interface** - `2a51b79` (feat)
3. **Task 3: Update usePermissions hook with tester-specific permissions** - `e811613` (feat)
4. **Task 4: Update Header with Control Tester role option and tester selector** - `cb8acea` (feat)
5. **Task 5: Update Sidebar to filter navigation items by permission** - `a081357` (feat)

## Files Created/Modified
- `src/stores/uiStore.ts` - Added control-tester to AppRole, currentTesterId state
- `src/types/rct.ts` - Added assignedTesterId field to Control interface
- `src/hooks/usePermissions.ts` - Added isControlTester flag and canView* permissions
- `src/components/layout/Header.tsx` - Added Control Tester option and tester ID selector
- `src/components/layout/Sidebar.tsx` - Added permission-based nav filtering, My Controls link

## Decisions Made
- Control Tester does NOT inherit from Control Owner - standalone most restrictive role
- Tester ID selector shows hardcoded options (tester-1, tester-2, tester-3) for demo
- canSubmitChangeRequests changed to isControlOwner only (was !isRiskManager which included tester)
- Mock data button hidden for Control Tester (minimal interface principle)
- ClipboardCheck icon chosen for "My Controls" nav item (indicates checklist/testing)

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- Role infrastructure complete for Control Tester
- Ready for Plan 02: My Controls page with assigned controls view
- assignedTesterId field ready for control assignment logic

---
*Phase: 20-control-tester-interface*
*Completed: 2026-01-24*
