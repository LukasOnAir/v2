---
phase: 21-database-auth-foundation
plan: 06
subsystem: auth, database
tags: [supabase, rls, security, audit-log, auth-events, multi-tenancy]

# Dependency graph
requires:
  - phase: 21-02
    provides: Database schema with tenants, profiles, RLS policies
  - phase: 21-03
    provides: AuthContext and auth state management
provides:
  - Auth event logging to auth_events table
  - app_user database role without BYPASSRLS
  - RLS helper functions (auth.tenant_id, auth.user_role)
  - Security audit trail for compliance (SEC-02)
affects: [22-registration, 23-dashboard, 25-production]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - Auth event logging via logAuthEventStandalone
    - Database role separation for RLS enforcement

key-files:
  created:
    - src/hooks/useAuthEvents.ts
    - supabase/migrations/00006_app_user_role.sql
  modified:
    - src/contexts/AuthContext.tsx
    - supabase/migrations/00003_rls_helper_functions.sql

key-decisions:
  - "IP address logging deferred - requires Edge Function for server-side capture"
  - "Helper functions in public schema for RLS policy access"
  - "user_role() returns TEXT not user_role type for compatibility"

patterns-established:
  - "logAuthEventStandalone for auth event logging outside React"
  - "Database helper functions in public schema with SECURITY DEFINER"

# Metrics
duration: ~45min (across checkpoint)
completed: 2026-01-24
---

# Phase 21 Plan 06: Security Features Summary

**Auth event logging for SEC-02 compliance with useAuthEvents hook and app_user role without BYPASSRLS for DB-04 security**

## Performance

- **Duration:** ~45 min (across user checkpoint)
- **Started:** 2026-01-24T15:55:00Z (estimated)
- **Completed:** 2026-01-24T16:40:07Z
- **Tasks:** 4 (3 auto + 1 checkpoint)
- **Files modified:** 4

## Accomplishments

- Auth events (login, logout, signup, password_reset, email_verified) logged to database
- app_user role created without BYPASSRLS permission (DB-04 compliance)
- RLS helper functions fixed for proper schema access and return types
- All 6 migrations applied to Supabase successfully

## Task Commits

Each task was committed atomically:

1. **Task 1: Create useAuthEvents hook for logging** - `64f4ec2` (feat)
2. **Task 2: Integrate auth event logging into AuthContext** - `66a1d37` (feat)
3. **Task 3: Create app_user role migration** - `6fcc7b5` (feat)
4. **Task 4: Apply migrations (checkpoint)** - User confirmed migrations applied

**Additional fixes during execution:**
- `3c747cd` - fix(21-06): correct migration order - helper functions before profiles
- `94e4573` - fix(21): use public schema for RLS helper functions
- `8fc351d` - fix(21): correct user_role() return type to TEXT

## Files Created/Modified

- `src/hooks/useAuthEvents.ts` - Hook and standalone function for logging auth events to auth_events table
- `src/contexts/AuthContext.tsx` - Integrated auth event logging on signIn, signUp, signOut, resetPassword, updatePassword
- `supabase/migrations/00006_app_user_role.sql` - Creates app_user role with RLS enforced (no BYPASSRLS)
- `supabase/migrations/00003_rls_helper_functions.sql` - Fixed to use public schema and correct return types

## Decisions Made

- **IP address logging deferred:** Cannot capture IP client-side; requires Edge Function. Logged as null for now. Can enhance in Phase 25 (Production Hardening) if compliance requires it.
- **Helper functions in public schema:** RLS policies cannot access auth schema functions, so tenant_id() and user_role() placed in public schema with SECURITY DEFINER.
- **user_role() returns TEXT:** The enum type created in auth schema wasn't accessible from public RLS policies, so user_role() returns TEXT instead.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Migration order incorrect**
- **Found during:** Checkpoint - user reported migration error
- **Issue:** profiles table migration ran before helper functions, but profiles RLS policies reference public.tenant_id()
- **Fix:** Renamed helper functions migration from 00004 to 00003 so it runs before profiles
- **Files modified:** supabase/migrations/00003_rls_helper_functions.sql (was 00004)
- **Committed in:** 3c747cd

**2. [Rule 1 - Bug] RLS helper functions in wrong schema**
- **Found during:** Checkpoint - user reported auth.tenant_id() not found in policies
- **Issue:** Functions were created in auth schema but RLS policies can only access public schema functions
- **Fix:** Moved tenant_id() and user_role() functions to public schema
- **Files modified:** supabase/migrations/00003_rls_helper_functions.sql
- **Committed in:** 94e4573

**3. [Rule 1 - Bug] user_role() return type incompatible**
- **Found during:** Checkpoint - user reported type mismatch error
- **Issue:** user_role() returned auth.user_role enum type, but type not accessible from public schema
- **Fix:** Changed return type to TEXT
- **Files modified:** supabase/migrations/00003_rls_helper_functions.sql
- **Committed in:** 8fc351d

---

**Total deviations:** 3 auto-fixed (2 bugs, 1 blocking)
**Impact on plan:** All fixes necessary for migrations to apply correctly. No scope creep.

## User Setup Required

**Supabase Dashboard configuration was required:** User applied all 6 migrations via SQL Editor:
- 00001_tenants.sql
- 00002_profiles.sql
- 00003_rls_helper_functions.sql
- 00004_audit_log.sql
- 00005_auth_events.sql
- 00006_app_user_role.sql

User verified:
- Tables visible: tenants, profiles, audit_log, auth_events
- RLS enabled on profiles, audit_log, auth_events
- Functions exist: public.tenant_id(), public.user_role()
- Rate limiting enabled (Supabase default)

## Issues Encountered

- **Schema access limitations:** Discovered that RLS policies cannot reference auth schema functions. Required moving helper functions to public schema. This is a Supabase/PostgreSQL limitation.
- **Type compatibility:** Enum types in auth schema not accessible from public RLS policies. Switched to TEXT return type for user_role().

## Next Phase Readiness

- Security foundation complete: auth events logged (SEC-02), restricted role exists (DB-04), rate limiting active (SEC-03)
- Ready for Phase 21-07: Supabase Client & Hooks
- Ready for Phase 22: Tenant Registration

---
*Phase: 21-database-auth-foundation*
*Completed: 2026-01-24*
