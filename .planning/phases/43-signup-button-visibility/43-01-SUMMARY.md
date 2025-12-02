---
phase: 43-signup-button-visibility
plan: 01
subsystem: auth
tags: [supabase, feature-flags, rls, react-query, login]

# Dependency graph
requires:
  - phase: 40-admin-feature-visibility
    provides: global_feature_flags table, super-admin infrastructure
provides:
  - show_signup global feature flag
  - usePublicFeatureFlags hook for unauthenticated pages
  - Conditional signup link on login page
affects: [signup-flow, login-page, admin-panel]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - Anonymous RLS policy for public feature flag access
    - Public feature flags hook without AuthContext dependency

key-files:
  created:
    - supabase/migrations/00032_anon_global_flags_read.sql
    - src/hooks/usePublicFeatureFlags.ts
  modified:
    - src/hooks/useFeatureFlags.ts
    - src/pages/LoginPage.tsx

key-decisions:
  - "Anon role gets SELECT on global_feature_flags for unauthenticated access"
  - "Default show_signup=true for backwards compatibility"
  - "usePublicFeatureFlags has no AuthContext dependency (avoids circular deps on login page)"
  - "Show signup link while loading (defaults to true) to avoid content flash"

patterns-established:
  - "Public feature flag hook pattern: usePublicFeatureFlags for login/signup pages"

# Metrics
duration: 4min
completed: 2026-01-28
---

# Phase 43 Plan 01: Signup Button Visibility Summary

**Super-admin togglable signup button on login page using public feature flags with anonymous Supabase access**

## Performance

- **Duration:** 4 min
- **Started:** 2026-01-28T18:15:00Z
- **Completed:** 2026-01-28T18:19:00Z
- **Tasks:** 3
- **Files modified:** 4

## Accomplishments
- Database migration enabling anonymous users to read global feature flags
- New show_signup feature flag seeded (enabled by default)
- usePublicFeatureFlags hook for login/signup pages (no AuthContext dependency)
- LoginPage conditionally shows signup link or invitation message based on flag

## Task Commits

Each task was committed atomically:

1. **Task 1: Database migration for anon access and show_signup flag** - `fca78ca` (feat)
2. **Task 2: Create usePublicFeatureFlags hook and update FeatureKey type** - `5618532` (feat)
3. **Task 3: Update LoginPage with conditional signup link** - `31f4b20` (feat)

## Files Created/Modified
- `supabase/migrations/00032_anon_global_flags_read.sql` - Anon SELECT policy and show_signup flag seed
- `src/hooks/usePublicFeatureFlags.ts` - Hook for unauthenticated pages to check global flags
- `src/hooks/useFeatureFlags.ts` - Added show_signup to FeatureKey and DEMO_DEFAULTS
- `src/pages/LoginPage.tsx` - Conditional signup link rendering

## Decisions Made
- Anon role gets SELECT permission on global_feature_flags to enable unauthenticated access from login page
- show_signup defaults to true for backwards compatibility (existing deployments continue showing signup)
- usePublicFeatureFlags does not depend on AuthContext to avoid circular dependency issues on login page
- While flags are loading, showSignup defaults to true to prevent content flash (signup link visible by default)

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None

## User Setup Required

None - no external service configuration required.

After running `npx supabase db push`, the show_signup flag will be available in the super-admin panel at /admin/feature-flags.

## Next Phase Readiness
- Super-admin can toggle signup visibility from existing AdminFeatureFlagsPage
- Login page respects the flag state (no additional work needed)
- Migration ready to apply when Docker/Supabase is available

---
*Phase: 43-signup-button-visibility*
*Completed: 2026-01-28*
