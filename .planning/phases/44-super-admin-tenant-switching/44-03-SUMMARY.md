---
phase: 44-super-admin-tenant-switching
plan: 03
subsystem: data-hooks
tags: [react-query, impersonation, tenant-isolation, cache, read-only, supabase]

# Dependency graph
requires:
  - phase: 44-01
    provides: useEffectiveTenant hook with effectiveTenantId, isImpersonating, isReadOnly
provides:
  - All 15 data hooks modified with impersonation support
  - Cache isolation per tenant via effectiveTenantId in queryKey
  - Explicit tenant filter when impersonating
  - Read-only mutation blocking when impersonating
affects: [44-04, tenant-switching-ui, super-admin-testing]

# Tech tracking
tech-stack:
  added: []
  patterns: [impersonation-filter-pattern, cache-isolation-pattern, read-only-mutation-guard]

key-files:
  modified:
    - src/hooks/useRCTRows.ts
    - src/hooks/useTaxonomy.ts
    - src/hooks/useControls.ts
    - src/hooks/useControlLinks.ts
    - src/hooks/useControlTests.ts
    - src/hooks/useTickets.ts
    - src/hooks/useComments.ts
    - src/hooks/useRemediationPlans.ts
    - src/hooks/usePendingChanges.ts
    - src/hooks/useCustomColumns.ts
    - src/hooks/useScoreLabels.ts
    - src/hooks/useTaxonomyWeights.ts
    - src/hooks/useKnowledgeBase.ts
    - src/hooks/useProfiles.ts
    - src/hooks/useAuditLogDb.ts

key-decisions:
  - "effectiveTenantId appended to queryKey for cache isolation between tenants"
  - "Explicit tenant_id filter added in queryFn when isImpersonating to override RLS cross-tenant read"
  - "isReadOnly check at start of mutationFn with toast error for user feedback"
  - "Optimistic update query keys updated to include effectiveTenantId for correct rollback"

patterns-established:
  - "Impersonation query pattern: useEffectiveTenant() -> effectiveTenantId in queryKey -> tenant filter when isImpersonating"
  - "Mutation guard pattern: if (isReadOnly) { toast.error(...); throw new Error(...) } at start of mutationFn"
  - "Cache isolation: queryKey always ends with effectiveTenantId as last element"

# Metrics
duration: 24min
completed: 2026-01-28
---

# Phase 44 Plan 03: Data Hooks Impersonation Support Summary

**All 15 data hooks modified with effectiveTenantId cache isolation, explicit tenant filtering when impersonating, and isReadOnly mutation blocking for super-admin tenant switching**

## Performance

- **Duration:** 24 min
- **Started:** 2026-01-28T19:10:08Z
- **Completed:** 2026-01-28T19:34:18Z
- **Tasks:** 3
- **Files modified:** 15

## Accomplishments
- Cache isolation per tenant - each tenant's data cached separately using effectiveTenantId in queryKey
- Explicit tenant filter when impersonating - super-admin RLS allows all reads, explicit filter restricts to impersonated tenant
- Read-only mutation blocking - all mutations show toast error and throw when isReadOnly is true
- Optimistic updates correctly roll back to tenant-specific cache entries

## Task Commits

Each task was committed atomically:

1. **Task 1: Modify core data hooks** - `4276e0e` (feat)
2. **Task 2: Modify entity hooks** - `a14795e` (feat)
3. **Task 3: Modify configuration hooks** - `7837801` (feat)

## Files Created/Modified
- `src/hooks/useRCTRows.ts` - RCT rows with impersonation support (5 query hooks, 5 mutations)
- `src/hooks/useTaxonomy.ts` - Taxonomy with impersonation support (2 query hooks, 5 mutations)
- `src/hooks/useControls.ts` - Controls with impersonation support (4 query hooks, 3 mutations)
- `src/hooks/useControlLinks.ts` - Control links with impersonation support (3 query hooks, 3 mutations)
- `src/hooks/useControlTests.ts` - Control tests with impersonation support (2 query hooks, 1 mutation)
- `src/hooks/useTickets.ts` - Tickets with impersonation support (3 query hooks, 5 mutations)
- `src/hooks/useComments.ts` - Comments with impersonation support (1 query hook, 3 mutations)
- `src/hooks/useRemediationPlans.ts` - Remediation plans with impersonation support (2 query hooks, 5 mutations)
- `src/hooks/usePendingChanges.ts` - Pending changes with impersonation support (3 query hooks, 4 mutations)
- `src/hooks/useCustomColumns.ts` - Custom columns with impersonation support (1 query hook, 4 mutations)
- `src/hooks/useScoreLabels.ts` - Score labels with impersonation support (1 query hook, 2 mutations)
- `src/hooks/useTaxonomyWeights.ts` - Taxonomy weights with impersonation support (1 query hook, 4 mutations)
- `src/hooks/useKnowledgeBase.ts` - Knowledge base with impersonation support (2 query hooks, 3 mutations)
- `src/hooks/useProfiles.ts` - Profiles with impersonation support (4 query hooks, read-only)
- `src/hooks/useAuditLogDb.ts` - Audit log with impersonation support (2 query hooks, read-only)

## Decisions Made
- **effectiveTenantId in queryKey:** Ensures React Query caches data separately per tenant, preventing cross-tenant cache pollution when switching between tenants
- **Explicit tenant filter when impersonating:** Since super-admin RLS allows cross-tenant reads, explicit `.eq('tenant_id', effectiveTenantId)` filter restricts data to the impersonated tenant
- **isReadOnly check at mutationFn start:** Early guard pattern ensures modifications are blocked before any database operation, with toast feedback for user awareness
- **Optimistic update query keys updated:** Changed from `['controls']` to `['controls', effectiveTenantId]` to ensure correct cache rollback on error

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- ImpersonationProvider needs to wrap App.tsx (44-02)
- TenantSwitcher and ImpersonationBanner UI components need creation (44-02)
- All data hooks now support impersonation - UI can safely switch tenants
- Data will correctly filter to impersonated tenant and block mutations

---
*Phase: 44-super-admin-tenant-switching*
*Completed: 2026-01-28*
