---
phase: 44-super-admin-tenant-switching
plan: 01
subsystem: auth
tags: [rls, super-admin, impersonation, context, react, supabase]

# Dependency graph
requires:
  - phase: 40-04
    provides: is_super_admin() function and super-admin profile flag
provides:
  - RLS policies for super-admin cross-tenant read access on 17 tables
  - ImpersonationContext for tenant/profile impersonation state
  - useEffectiveTenant hook combining auth and impersonation
affects: [44-02, 44-03, data-hooks, tenant-switching-ui]

# Tech tracking
tech-stack:
  added: []
  patterns: [impersonation-context, effective-tenant-hook, sessionStorage-persistence]

key-files:
  created:
    - supabase/migrations/00034_superadmin_tenant_read_policies.sql
    - src/contexts/ImpersonationContext.tsx
    - src/hooks/useEffectiveTenant.ts
  modified: []

key-decisions:
  - "sessionStorage (not localStorage) for impersonation - session-scoped, auto-clears on tab close"
  - "isReadOnly always true when impersonating - prevent accidental modifications"
  - "Profile selection stores role for downstream permission checking"
  - "tenants table now has RLS enabled with own-tenant and super-admin policies"

patterns-established:
  - "ImpersonationContext: Provider wraps app, useImpersonation hook for access"
  - "useEffectiveTenant: Combines auth + impersonation for effective values"
  - "Super-admin RLS: public.is_super_admin() check allows cross-tenant SELECT"

# Metrics
duration: 3min
completed: 2026-01-28
---

# Phase 44 Plan 01: Super-Admin Tenant Impersonation Foundation Summary

**RLS policies for super-admin cross-tenant read on 17 tables, ImpersonationContext with sessionStorage persistence, and useEffectiveTenant hook for auth+impersonation resolution**

## Performance

- **Duration:** 3 min
- **Started:** 2026-01-28T19:00:42Z
- **Completed:** 2026-01-28T19:03:47Z
- **Tasks:** 3
- **Files created:** 3

## Accomplishments
- Super-admin read RLS policies for all 15 tenant-scoped tables plus tenants and profiles
- ImpersonationContext with sessionStorage persistence across page refresh
- useEffectiveTenant hook that returns effective values based on impersonation state

## Task Commits

Each task was committed atomically:

1. **Task 1: Create super-admin read RLS policies migration** - `e4b391e` (feat)
2. **Task 2: Create ImpersonationContext for state management** - `085bd42` (feat)
3. **Task 3: Create useEffectiveTenant hook** - `e08cff9` (feat)

## Files Created/Modified
- `supabase/migrations/00034_superadmin_tenant_read_policies.sql` - RLS policies for super-admin cross-tenant read (18 policies total)
- `src/contexts/ImpersonationContext.tsx` - React context for impersonation state with sessionStorage
- `src/hooks/useEffectiveTenant.ts` - Hook combining auth context and impersonation context

## Decisions Made
- **sessionStorage over localStorage:** Impersonation state is session-scoped, clears when tab closes (safer for sensitive admin feature)
- **isReadOnly = isImpersonating:** Always enforce read-only when impersonating to prevent accidental data modification
- **profileRole stored in state:** When selecting a profile, store their role for downstream permission checks
- **tenants table RLS:** Enabled RLS on tenants table (was previously without RLS) with own-tenant and super-admin policies

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None

## User Setup Required

None - no external service configuration required.

**Note:** Run `npx supabase db push` when Docker/Supabase is available to apply migration 00034.

## Next Phase Readiness
- ImpersonationProvider needs to be wrapped in App.tsx (44-02)
- Data hooks need to be modified to use useEffectiveTenant for query keys and explicit tenant filtering (44-02/44-03)
- ImpersonationBanner and TenantSwitcher UI components need to be created (44-02)

---
*Phase: 44-super-admin-tenant-switching*
*Completed: 2026-01-28*
