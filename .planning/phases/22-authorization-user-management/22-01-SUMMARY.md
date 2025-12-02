---
phase: 22-authorization-user-management
plan: 01
subsystem: database
tags: [supabase, rls, invitations, user-management, postgresql]

# Dependency graph
requires:
  - phase: 21-database-auth-foundation
    provides: profiles table with is_active column, tenant_id() and user_role() RLS helpers
provides:
  - pending_invitations table with 7-day expiry
  - is_user_active() RLS helper function
  - Director policy for user status management
affects: [22-02-invitation-ui, 22-03-user-management-ui, 23-email-scheduling]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - Custom invitation table bypassing Supabase Auth 24-hour OTP limit
    - Director-only RLS policies for user management
    - Self-modification prevention (id != auth.uid())

key-files:
  created:
    - supabase/migrations/00008_pending_invitations.sql
    - supabase/migrations/00009_is_user_active.sql
    - supabase/migrations/00010_director_profile_policies.sql
  modified: []

key-decisions:
  - "Directors cannot invite other Directors (role constraint excludes 'director')"
  - "Self-deactivation blocked via id != auth.uid() check"
  - "is_user_active() uses SECURITY DEFINER for restricted context access"

patterns-established:
  - "Director-only policies: user_role() = 'director' check in RLS"
  - "Self-modification prevention: id != auth.uid() in policies"

# Metrics
duration: 2min
completed: 2026-01-24
---

# Phase 22 Plan 01: Invitation & User Management Schema Summary

**Custom invitation table with 7-day expiry, is_user_active() helper, and Director-only profile management policies**

## Performance

- **Duration:** 2 min
- **Started:** 2026-01-24T18:06:35Z
- **Completed:** 2026-01-24T18:08:46Z
- **Tasks:** 3
- **Files created:** 3

## Accomplishments
- Created pending_invitations table with 7-day token expiry (bypasses Supabase Auth 24h limit)
- Added is_user_active() helper function for RLS deactivation enforcement
- Enabled Directors to deactivate/reactivate users while preventing self-modification

## Task Commits

Each task was committed atomically:

1. **Task 1: Create pending_invitations table migration** - `4284119` (feat)
2. **Task 2: Create is_user_active() helper function migration** - `b8979c5` (feat)
3. **Task 3: Create Director profile management policies migration** - `03bfd91` (feat)

## Files Created/Modified
- `supabase/migrations/00008_pending_invitations.sql` - Invitation table with 7-day expiry, Director-only RLS
- `supabase/migrations/00009_is_user_active.sql` - Boolean helper function for deactivation checks
- `supabase/migrations/00010_director_profile_policies.sql` - Director policy for managing other users

## Decisions Made
- **Directors cannot invite Directors:** The role CHECK constraint only allows manager, risk-manager, control-owner, control-tester. Directors are bootstrapped via tenant creation or manual setup.
- **Self-deactivation blocked:** The `id != auth.uid()` check prevents Directors from modifying their own is_active status, addressing Pitfall 5 from research.
- **SECURITY DEFINER for is_user_active():** Required so RLS policies can call this function even when user access is already restricted.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- Database schema ready for invitation UI (plan 22-02)
- is_user_active() ready to be integrated into future RLS policies for complete deactivation enforcement
- Director profile management policy enables user management UI (plan 22-03)

---
*Phase: 22-authorization-user-management*
*Completed: 2026-01-24*
