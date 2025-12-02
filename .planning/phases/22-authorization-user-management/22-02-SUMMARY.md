---
phase: 22-authorization-user-management
plan: 02
subsystem: auth
tags: [permissions, roles, rbac, hooks, typescript]

# Dependency graph
requires:
  - phase: 21-database-auth-foundation
    provides: AuthContext with role from JWT app_metadata
provides:
  - Centralized role constants (ROLES, Role type)
  - Permission helper functions (isDirectorRole, isManagerRole, isRiskManagerRole)
  - ROLE_LABELS and ROLE_DESCRIPTIONS for UI
  - INVITABLE_ROLES for user invitation workflow
  - usePermissions hook connected to AuthContext
  - Demo mode fallback to uiStore selectedRole
affects: [22-03 (sidebar/routing), 22-04 (user management UI), 23-profile-management]

# Tech tracking
tech-stack:
  added: []
  patterns: [role-hierarchy-inheritance, demo-mode-detection, centralized-permissions]

key-files:
  created: [src/lib/permissions.ts]
  modified: [src/hooks/usePermissions.ts]

key-decisions:
  - "Director role at top of hierarchy (above Manager) for user management"
  - "isDemoMode detected when authRole is null (no JWT role = demo)"
  - "INVITABLE_ROLES excludes Director (bootstrap-only assignment)"

patterns-established:
  - "Role hierarchy: Director > Manager > Risk Manager > Control Owner > Control Tester"
  - "Permission inheritance: isManagerRole includes Director, isRiskManagerRole includes Manager"
  - "Centralized role definitions in src/lib/permissions.ts"

# Metrics
duration: 3min
completed: 2026-01-24
---

# Phase 22 Plan 02: Permission System Summary

**Centralized 5-role permission system with Director at top, connected to AuthContext with demo mode fallback**

## Performance

- **Duration:** 3 min
- **Started:** 2026-01-24T18:06:17Z
- **Completed:** 2026-01-24T18:09:09Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments
- Created centralized permission constants file with 5-role hierarchy
- Defined ROLES, Role type, INVITABLE_ROLES, ROLE_LABELS, ROLE_DESCRIPTIONS
- Implemented role inheritance helpers (isDirectorRole, isManagerRole, isRiskManagerRole)
- Connected usePermissions to AuthContext for production role
- Added demo mode detection (falls back to uiStore when no auth role)
- Added Director-specific permissions (canInviteUsers, canDeactivateUsers, canViewUserManagement)

## Task Commits

Each task was committed atomically:

1. **Task 1: Create permission constants file** - `1c16908` (feat)
2. **Task 2: Update usePermissions hook to use AuthContext** - `f73c23c` (feat)

## Files Created/Modified
- `src/lib/permissions.ts` - Centralized role constants, labels, descriptions, and hierarchy helpers
- `src/hooks/usePermissions.ts` - Role-based permissions hook now connected to AuthContext

## Decisions Made
- Director role placed at top of hierarchy (above Manager) for organization-level user management
- Demo mode detected when authRole is null - allows existing demo functionality to work
- INVITABLE_ROLES excludes Director since Director is bootstrap-only (first user of tenant)

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- Permission constants ready for sidebar/routing gating in 22-03
- Director permissions ready for user management UI in 22-04
- usePermissions hook backwards compatible - existing UI works unchanged

---
*Phase: 22-authorization-user-management*
*Completed: 2026-01-24*
