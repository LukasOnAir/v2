---
phase: 21-database-auth-foundation
plan: 02
subsystem: database
tags: [postgresql, supabase, rls, multi-tenant, audit-trail]

# Dependency graph
requires:
  - phase: 21-01
    provides: Supabase client setup with environment configuration
provides:
  - Tenants table (root of multi-tenancy)
  - Profiles table with tenant_id and role assignment
  - auth.tenant_id() RLS helper function
  - auth.user_role() RLS helper function
  - Audit log table with generic trigger function
  - Auth events table for security logging
affects: [21-03, 21-04, 22-core-taxonomy, 23-crud-foundations]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "RLS tenant isolation using auth.tenant_id()"
    - "Migration template with table + RLS in same file"
    - "Generic audit trigger for entity changes"

key-files:
  created:
    - supabase/config.toml
    - supabase/migrations/00001_tenants.sql
    - supabase/migrations/00002_profiles.sql
    - supabase/migrations/00003_rls_helper_functions.sql
    - supabase/migrations/00004_audit_log.sql
    - supabase/migrations/00005_auth_events.sql
  modified: []

key-decisions:
  - "Tenants table has no RLS - access controlled via profiles"
  - "app_metadata used for tenant_id in JWT (not user_metadata - security critical)"
  - "5 roles defined: director, manager, risk-manager, control-owner, control-tester"
  - "auth_events allows null tenant_id for failed login attempts"

patterns-established:
  - "Pattern: Every multi-tenant table has RLS enabled in same migration"
  - "Pattern: All RLS policies use (SELECT auth.tenant_id()) for caching"
  - "Pattern: Indexes on tenant_id for RLS performance"

# Metrics
duration: 3min
completed: 2026-01-24
---

# Phase 21 Plan 02: Database Schema Migrations Summary

**Multi-tenant PostgreSQL schema with RLS tenant isolation, audit logging, and auth event tracking**

## Performance

- **Duration:** 3 min
- **Started:** 2026-01-24T16:07:51Z
- **Completed:** 2026-01-24T16:10:56Z
- **Tasks:** 3
- **Files modified:** 6

## Accomplishments

- Created tenants table as root of multi-tenant hierarchy
- Established profiles table linking auth.users to tenants with role assignment
- Implemented auth.tenant_id() and auth.user_role() helper functions for RLS
- Created audit_log table with generic trigger function for entity change tracking
- Created auth_events table for SEC-02 authentication event logging
- All multi-tenant tables have RLS enabled with tenant isolation policies

## Task Commits

Each task was committed atomically:

1. **Task 1: Initialize Supabase migrations directory** - `e6cbc51` (chore)
2. **Task 2: Create core schema migrations** - `d9dbdc5` (feat)
3. **Task 3: Create audit and auth event tables** - `ccf1ae1` (feat)

## Files Created/Modified

- `supabase/config.toml` - Local dev configuration (API, DB, Studio ports)
- `supabase/migrations/00001_tenants.sql` - Tenants table (root of multi-tenancy)
- `supabase/migrations/00002_profiles.sql` - User profiles with tenant_id, role, RLS
- `supabase/migrations/00003_rls_helper_functions.sql` - auth.tenant_id(), auth.user_role()
- `supabase/migrations/00004_audit_log.sql` - Audit trail table with trigger function
- `supabase/migrations/00005_auth_events.sql` - Authentication event logging

## Decisions Made

1. **Tenants table has no RLS** - Access controlled indirectly via profiles table. Service role manages tenant creation.
2. **5 roles defined** - director, manager, risk-manager, control-owner, control-tester (matching v1.0 role structure)
3. **auth_events allows null tenant_id** - Failed login attempts may not have a known tenant
4. **INSERT policy on audit_log uses auth.tenant_id()** - Prevents cross-tenant audit log injection

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required. Migrations are ready to apply via `supabase db push` (remote) or `supabase migration up` (local).

## Next Phase Readiness

- Database schema foundation complete
- RLS helper functions ready for use by all future tables
- audit_changes() trigger function ready to attach to entity tables
- Ready for Phase 21-03 (Auth Context Provider) to implement frontend auth

---
*Phase: 21-database-auth-foundation*
*Completed: 2026-01-24*
