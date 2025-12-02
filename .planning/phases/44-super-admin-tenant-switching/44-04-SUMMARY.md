---
phase: 44-super-admin-tenant-switching
plan: 04
subsystem: ui-integration
tags: [react, impersonation, tenant-switching, context-provider, navigation, banner]

# Dependency graph
requires:
  - phase: 44-01
    provides: ImpersonationContext and ImpersonationProvider
  - phase: 44-02
    provides: AdminTenantsPage and ImpersonationBanner components
  - phase: 44-03
    provides: All data hooks with impersonation support
provides:
  - ImpersonationProvider wrapping App tree
  - Admin tenants route (/admin/tenants)
  - ImpersonationBanner in both AdminLayout and main Layout
  - Admin navigation between Feature Flags and Tenants pages
  - Complete end-to-end tenant impersonation feature
affects: [super-admin-workflows, tenant-debugging, support-operations]

# Tech tracking
tech-stack:
  added: []
  patterns: [provider-tree-pattern, banner-in-layout-pattern, admin-navigation-pattern]

key-files:
  modified:
    - src/App.tsx
    - src/components/admin/AdminLayout.tsx
    - src/components/layout/Layout.tsx
    - src/hooks/usePermissions.ts
    - src/hooks/useFeatureFlags.ts
    - src/hooks/useTenants.ts
    - src/pages/TesterDashboardPage.tsx
    - src/components/admin/ProfileSwitcher.tsx

key-decisions:
  - "ImpersonationProvider wraps inside AuthProvider, outside RealtimeProvider"
  - "ImpersonationBanner rendered at top of both AdminLayout and main Layout for visibility"
  - "Admin navigation uses NavLink helper with active state styling"
  - "effectiveRole used for permissions when impersonating a specific profile"
  - "effectiveProfileId used for tester controls, feature overrides, and dashboard filtering"

patterns-established:
  - "Impersonation-aware permissions: use effectiveRole from ImpersonationContext for role-based checks"
  - "Impersonation-aware feature flags: use effectiveProfileId for per-user overrides"
  - "Impersonation-aware data queries: use effectiveProfileId for profile-specific filtering"

# Metrics
duration: ~45min
completed: 2026-01-28
---

# Phase 44 Plan 04: App Integration and User Verification Summary

**ImpersonationProvider integrated into App tree, banners in both layouts, admin navigation, and complete impersonation flow verified with fixes for profile-specific permissions and feature overrides**

## Performance

- **Duration:** ~45 min (including verification and fixes)
- **Started:** 2026-01-28T19:35:00Z
- **Completed:** 2026-01-28T20:20:00Z
- **Tasks:** 4 (3 auto + 1 checkpoint)
- **Files modified:** 8

## Accomplishments
- ImpersonationProvider wraps the entire app tree inside AuthProvider
- /admin/tenants route accessible to super-admins
- ImpersonationBanner appears in both admin and main layouts when impersonating
- Admin navigation includes links to Feature Flags and Tenants pages
- Complete impersonation flow verified by human tester
- Data isolation works (sees impersonated tenant's data only)
- Read-only mode enforced (mutations blocked)
- Session persistence works (refresh doesn't lose impersonation state)
- Profile-specific permissions and feature overrides work when impersonating

## Task Commits

Each task was committed atomically:

1. **Task 1: Wrap App with ImpersonationProvider** - `4b2c4e5` (feat)
2. **Task 2: Update AdminLayout with banner and navigation** - `97b26a1` (feat)
3. **Task 3: Add banner to main Layout** - `4d1a2eb` (feat)
4. **Task 4: Checkpoint human verification** - APPROVED

### Additional Fixes During Verification

5. **Fix: Remove email from profiles query** - `c876324` (fix)
6. **Fix: Use effectiveRole for permissions** - `e335739` (fix)
7. **Fix: Use effectiveProfileId for tester controls** - `13fd59c` (fix)
8. **Fix: Use effectiveProfileId in TesterDashboardPage** - `33e2aec` (fix)
9. **Fix: Use effectiveProfileId for feature overrides** - `ed2d514` (fix)

## Files Created/Modified
- `src/App.tsx` - Added ImpersonationProvider wrapper and /admin/tenants route
- `src/components/admin/AdminLayout.tsx` - Added ImpersonationBanner and navigation links
- `src/components/layout/Layout.tsx` - Added ImpersonationBanner at top
- `src/hooks/usePermissions.ts` - Use effectiveRole when impersonating specific profile
- `src/hooks/useFeatureFlags.ts` - Use effectiveProfileId for per-user overrides
- `src/hooks/useTenants.ts` - Remove email field from profiles query (not in table)
- `src/pages/TesterDashboardPage.tsx` - Use effectiveProfileId for filtering
- `src/components/admin/ProfileSwitcher.tsx` - Minor cleanup

## Decisions Made
- **ImpersonationProvider placement:** Inside AuthProvider but wrapping RealtimeProvider and all app content - requires auth context but provides impersonation context to all components
- **effectiveRole for permissions:** When impersonating a specific profile, use the impersonated profile's role for permission checks (not super-admin role)
- **effectiveProfileId for filtering:** Components that filter by profile_id (tester dashboard, feature overrides) use effectiveProfileId when impersonating
- **Banner in both layouts:** ImpersonationBanner appears at the very top of both AdminLayout and main Layout so it's always visible when navigating

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Removed email from profiles query**
- **Found during:** Verification testing
- **Issue:** ProfileSwitcher query included 'email' column which doesn't exist in profiles table
- **Fix:** Removed email from select statement
- **Files modified:** src/hooks/useTenants.ts
- **Committed in:** c876324

**2. [Rule 1 - Bug] Used effectiveRole for permissions when impersonating**
- **Found during:** Verification testing
- **Issue:** Super-admin still saw super-admin permissions when impersonating a profile instead of the impersonated user's permissions
- **Fix:** usePermissions now uses effectiveRole from ImpersonationContext
- **Files modified:** src/hooks/usePermissions.ts
- **Committed in:** e335739

**3. [Rule 1 - Bug] Used effectiveProfileId for tester controls**
- **Found during:** Verification testing
- **Issue:** Control tester page showed controls assigned to super-admin profile instead of impersonated profile
- **Fix:** useControls filter uses effectiveProfileId
- **Files modified:** src/hooks/useControls.ts
- **Committed in:** 13fd59c

**4. [Rule 1 - Bug] Used effectiveProfileId in TesterDashboardPage**
- **Found during:** Verification testing
- **Issue:** TesterDashboardPage used auth profile ID instead of effectiveProfileId
- **Fix:** Added useEffectiveTenant hook and used effectiveProfileId for filtering
- **Files modified:** src/pages/TesterDashboardPage.tsx
- **Committed in:** 33e2aec

**5. [Rule 1 - Bug] Used effectiveProfileId for feature overrides**
- **Found during:** Verification testing
- **Issue:** Feature flag overrides checked super-admin profile instead of impersonated profile
- **Fix:** useFeatureFlags uses effectiveProfileId from ImpersonationContext
- **Files modified:** src/hooks/useFeatureFlags.ts
- **Committed in:** ed2d514

---

**Total deviations:** 5 auto-fixed (all Rule 1 - Bug)
**Impact on plan:** All fixes necessary for correct impersonation behavior. Without these fixes, super-admin would see their own permissions and data instead of the impersonated user's view.

## Issues Encountered

None beyond the bugs fixed during verification.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- Phase 44 (Super-Admin Tenant Switching) is complete
- Super-admins can now switch to any active tenant and optionally impersonate a specific profile
- Data shows impersonated tenant's view with read-only protection
- Phase 45 (Control Test Steps) can continue without dependency on this feature

---
*Phase: 44-super-admin-tenant-switching*
*Completed: 2026-01-28*
