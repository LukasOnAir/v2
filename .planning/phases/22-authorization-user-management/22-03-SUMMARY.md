---
phase: 22-authorization-user-management
plan: 03
subsystem: auth
tags: [supabase, edge-functions, resend, invitation, deno]

# Dependency graph
requires:
  - phase: 22-01
    provides: pending_invitations table with RLS policies
provides:
  - send-invitation Edge Function with Resend email
  - accept-invitation Edge Function with user creation
  - TypeScript types for invitation workflow
affects: [22-04-user-management-ui]

# Tech tracking
tech-stack:
  added: [resend, deno-std, supabase-edge-functions]
  patterns: [edge-function-cors, service-role-admin, profile-rollback]

key-files:
  created:
    - supabase/functions/send-invitation/index.ts
    - supabase/functions/accept-invitation/index.ts
  modified:
    - src/lib/supabase/types.ts

key-decisions:
  - "Graceful fallback when RESEND_API_KEY not configured (invitation created, email skipped)"
  - "email_confirm: true for invited users (pre-verified via invite link)"
  - "Profile creation rollback: delete auth user if profile insert fails"

patterns-established:
  - "Edge Function CORS pattern with preflight handling"
  - "Service role client for admin operations (user creation)"
  - "App_metadata for tenant_id and role in createUser"

# Metrics
duration: 3min
completed: 2026-01-24
---

# Phase 22 Plan 03: Invitation Edge Functions Summary

**Two Supabase Edge Functions for invitation workflow: send-invitation with Resend email and accept-invitation with auth user creation and profile rollback**

## Performance

- **Duration:** 3 min
- **Started:** 2026-01-24T18:11:17Z
- **Completed:** 2026-01-24T18:14:06Z
- **Tasks:** 3
- **Files modified:** 3

## Accomplishments

- send-invitation Edge Function with Director-only access, role validation, and Resend email
- accept-invitation Edge Function with token validation, user creation, and profile rollback on failure
- TypeScript types for invitation request/response payloads

## Task Commits

Each task was committed atomically:

1. **Task 1: Create send-invitation Edge Function** - `8e1cb09` (feat)
2. **Task 2: Create accept-invitation Edge Function** - `f36782e` (feat)
3. **Task 3: Add invitation types to TypeScript types** - `ceb3311` (feat)

## Files Created/Modified

- `supabase/functions/send-invitation/index.ts` - Edge Function to create invitation and send email via Resend
- `supabase/functions/accept-invitation/index.ts` - Edge Function to validate token, create user, create profile
- `src/lib/supabase/types.ts` - Added PendingInvitation and request/response types

## Decisions Made

- **Graceful email fallback:** If RESEND_API_KEY not configured, invitation is still created but email is skipped (returns emailSent: false)
- **Pre-verified email:** Invited users have email_confirm: true since they clicked the invite link
- **Profile rollback:** If profile creation fails after auth user is created, the auth user is deleted to prevent orphaned records

## Deviations from Plan

None - plan executed exactly as written.

## User Setup Required

**External services require manual configuration.** The plan's user_setup section specifies:

- **RESEND_API_KEY:** Get from Resend Dashboard -> API Keys
- **Domain verification:** Verify domain or use sandbox (onboarding@resend.dev) in Resend Dashboard -> Domains
- **APP_URL:** Set to production URL for invitation links
- **EMAIL_FROM:** Optional, defaults to 'RiskGuard <onboarding@resend.dev>'

## Issues Encountered

None

## Next Phase Readiness

- Edge Functions ready for deployment via `supabase functions deploy`
- UI components can use SendInvitationRequest/Response and AcceptInvitationRequest/Response types
- pending_invitations table already exists from 22-01

---
*Phase: 22-authorization-user-management*
*Completed: 2026-01-24*
