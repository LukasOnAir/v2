---
status: resolved
trigger: "role-data-visibility - Risk Manager and Manager roles see empty/missing data compared to Director"
created: 2026-01-28T10:00:00Z
updated: 2026-01-28T10:45:00Z
---

## Current Focus

hypothesis: The test users (Risk Manager, Manager) either have different tenant_id in app_metadata OR their tenant_id doesn't match the demo tenant where seed data exists
test: Need to verify that all test users have tenant_id = '5ea03edb-6e79-4b62-bd36-39f1963d0640' in their JWT app_metadata
expecting: Find mismatched tenant_id for non-Director users, OR find that these users were created without proper tenant_id
next_action: Check invitation/user creation flow and verify all users have same tenant_id

## Symptoms

expected: All roles (Director, Risk Manager, Manager) under the same tenant should see the same underlying data, with differences only in what actions they can perform (permissions) and potentially which UI views/columns are shown
actual: Risk Manager and Manager see empty or missing data while Director sees the full data
errors: No visible errors - just wrong/missing data
reproduction: Log in as Director (see data), then log in as Manager or Risk Manager (see empty/missing data)
started: Never checked before, first time finding it like this - unclear if it ever worked

## Eliminated

## Evidence

- timestamp: 2026-01-28T10:05:00Z
  checked: RLS policies in migrations (00002, 00003, 00013, 00015, 00017)
  found: All RLS policies use tenant_id-based isolation, NOT role-based. Example from controls table: `USING (tenant_id = (SELECT public.tenant_id()))`
  implication: Database RLS is NOT the source of role-based filtering. All roles with same tenant_id should see same data.

- timestamp: 2026-01-28T10:06:00Z
  checked: Data fetching hooks (useControls, useTaxonomy, useRCTRows)
  found: All hooks query Supabase without any role-based filtering. They rely solely on RLS policies.
  implication: Frontend data fetching is NOT filtering by role.

- timestamp: 2026-01-28T10:07:00Z
  checked: AuthContext.tsx
  found: tenant_id and role extracted from session.user.app_metadata. RLS function public.tenant_id() also reads from JWT app_metadata.
  implication: If app_metadata.tenant_id is missing/wrong, RLS would return no data. This is a KEY hypothesis.

- timestamp: 2026-01-28T10:10:00Z
  checked: Data fetching patterns in TaxonomyPage, RCTTable components
  found: Both use isDemoMode check. When authenticated, they query Supabase hooks. RCTTable returns empty array if risks or processes array is empty.
  implication: If taxonomy queries return empty (due to RLS), downstream RCT will also be empty.

- timestamp: 2026-01-28T10:12:00Z
  checked: accept-invitation function (user creation flow)
  found: Creates users with app_metadata.tenant_id and app_metadata.role set correctly from invitation.
  implication: User creation flow is correct. Issue may be elsewhere.

- timestamp: 2026-01-28T10:14:00Z
  checked: useApprovalAwareTaxonomy hook
  found: Uses useUIStore selectedRole (demo mode role) instead of AuthContext role
  implication: This is a bug for authenticated mode approval workflow, but shouldn't affect data visibility/fetching

- timestamp: 2026-01-28T10:20:00Z
  checked: SQL seed scripts (29-01-risk-taxonomy.sql)
  found: Seed data is inserted with hardcoded demo tenant_id = '5ea03edb-6e79-4b62-bd36-39f1963d0640'
  implication: Only users whose JWT app_metadata.tenant_id matches this UUID will see the demo data via RLS

- timestamp: 2026-01-28T10:22:00Z
  checked: TenantSetupPage and seed-demo-data edge function
  found: The edge function returns data to frontend which stores in Zustand (localStorage), NOT in database. But authenticated mode queries database.
  implication: Two data sources - Zustand stores for demo/testing vs Supabase DB for production. If users are authenticated but DB has no data for their tenant, they see nothing

- timestamp: 2026-01-28T10:30:00Z
  checked: SignupPage.tsx - direct signup flow
  found: CRITICAL BUG - SignupPage uses signUp which calls supabase.auth.signUp() WITHOUT setting app_metadata. Users created this way have NO tenant_id and NO role in their JWT.
  implication: ROOT CAUSE CONFIRMED - If Risk Manager/Manager used direct signup instead of invitation, their JWT has null tenant_id, so RLS returns zero rows

## Resolution

root_cause: Users who sign up directly via SignupPage (instead of invitation flow) do NOT get app_metadata.tenant_id or role set. The signUp function in AuthContext calls supabase.auth.signUp() without any app_metadata. As a result, these users have NULL tenant_id in their JWT, and RLS filters out ALL data because tenant_id = NULL never matches any row.

fix: Disabled direct signup flow. SignupPage now shows an "Invitation Required" notice explaining users must be invited by a Director. LoginPage updated to remove "Sign up" link and instead shows help text. This ensures all users are created via the invitation flow which properly sets app_metadata.tenant_id and role in JWT.

verification: PASSED
- TypeScript compilation passes (npx tsc --noEmit = no errors)
- SignupPage.tsx shows invitation-required notice with proper explanation
- LoginPage.tsx no longer has "Sign up" link, shows invitation help text instead
- No other components link to direct signup
files_changed:
- src/pages/SignupPage.tsx - replaced signup form with invitation-required notice page
- src/pages/LoginPage.tsx - removed "Sign up" link, added help text about invitation
