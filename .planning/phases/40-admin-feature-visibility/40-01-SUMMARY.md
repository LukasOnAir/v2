---
phase: 40-admin-feature-visibility
plan: 01
subsystem: database
tags: [feature-flags, rls, supabase, postgresql, jsonb]

# Dependency graph
requires:
  - phase: 21-multi-tenant-auth
    provides: tenants table, RLS helper functions (tenant_id(), user_role())
  - phase: 21-multi-tenant-auth
    provides: profiles table structure
provides:
  - Feature flags table for global tenant-level toggles
  - Per-user feature override column in profiles
  - RLS policies for director-only write access
  - TypeScript types for feature flag operations
affects:
  - 40-02 (useFeatureFlag hook)
  - 40-03 (admin UI for feature management)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - JSONB for per-user overrides (flexible key-value storage)
    - UNIQUE constraint for tenant_id + feature_key (one entry per feature per tenant)
    - Director-only write policies with public.user_role() check

key-files:
  created:
    - supabase/migrations/00030_feature_flags.sql
  modified:
    - src/lib/supabase/types.ts

key-decisions:
  - "JSONB for feature_overrides allows flexible per-user overrides without schema changes"
  - "Director-only write access enforced via RLS policies"
  - "Separate INSERT/UPDATE/DELETE policies for granular control"
  - "Demo tenant seeded with show_rfi=true as default"

patterns-established:
  - "Feature flag lookup pattern: tenant_id + feature_key unique constraint"
  - "Per-user override precedence: check feature_overrides first, fall back to global setting"

# Metrics
duration: 4min
completed: 2026-01-28
---

# Phase 40 Plan 01: Feature Flags Schema Summary

**Feature flags database schema with tenant-level toggles, per-user JSONB overrides, and director-only RLS policies**

## Performance

- **Duration:** 4 min
- **Started:** 2026-01-28T12:10:00Z
- **Completed:** 2026-01-28T12:14:00Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments
- Feature flags table with tenant isolation and UNIQUE constraint
- Per-user feature_overrides JSONB column in profiles
- RLS policies restricting write access to directors only
- TypeScript types with FeatureOverrides interface and FeatureFlagRow aliases

## Task Commits

Each task was committed atomically:

1. **Task 1: Create feature flags migration** - `246ac09` (feat)
2. **Task 2: Update TypeScript types** - `06c8dae` (feat)

## Files Created/Modified
- `supabase/migrations/00030_feature_flags.sql` - Feature flags table, profiles column, RLS policies, demo seed
- `src/lib/supabase/types.ts` - FeatureOverrides interface, feature_flags table types, updated profiles types

## Decisions Made
- **JSONB for per-user overrides:** Allows flexible key-value storage without schema changes when adding new features
- **Separate RLS policies for INSERT/UPDATE/DELETE:** More granular than a single write policy, matches existing project patterns
- **Demo tenant seeded with show_rfi=true:** Ensures RFI feature is visible by default in demo mode

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- Schema ready for useFeatureFlag hook implementation (40-02)
- Migration ready to apply with `npx supabase db push`
- TypeScript types ready for frontend consumption

---
*Phase: 40-admin-feature-visibility*
*Completed: 2026-01-28*
