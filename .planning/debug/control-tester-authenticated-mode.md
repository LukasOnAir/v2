---
status: resolved
trigger: "Debug why control testers can't see assigned controls in authenticated mode. Assigned 3 controls to a tester in Controls Hub. Tester goes to /tester page and sees 'no controls assigned'."
created: 2026-01-28T09:00:00Z
updated: 2026-01-28T09:30:00Z
symptoms_prefilled: true
---

## Current Focus

hypothesis: CONFIRMED - Code flow is architecturally correct. IDs match correctly.
test: Full code trace completed
expecting: N/A
next_action: Document findings and summarize

## Symptoms

expected: Tester sees their 3 assigned controls on /tester page
actual: Tester sees "no controls assigned"
errors: None reported
reproduction: Assign controls in Controls Hub, login as tester, go to /tester page
started: Unknown - investigating authenticated mode behavior

## Eliminated

- hypothesis: ID format mismatch between assignment and query
  evidence: Both use UUID from profiles.id which references auth.users(id)
  timestamp: 2026-01-28T09:25:00Z

- hypothesis: Code logic error in TesterDashboardPage
  evidence: Logic is correct - `isControlTester ? user?.id : currentTesterId`
  timestamp: 2026-01-28T09:25:00Z

## Evidence

- timestamp: 2026-01-28T09:05:00Z
  checked: ControlDetailPanel.tsx tester dropdown (lines 793-838)
  found: |
    In authenticated mode, dropdown uses `useControlTesters()` hook.
    Dropdown maps testers: `<option key={tester.id} value={tester.id}>`
    Stores `tester.id` (which is profile.id = auth.users.id UUID) in control.assignedTesterId
  implication: ID source is profiles.id, which should equal auth.users.id

- timestamp: 2026-01-28T09:08:00Z
  checked: useControlTesters hook in useProfiles.ts (lines 47-49)
  found: |
    `useControlTesters()` calls `useProfilesByRole('control-tester')`
    Query: `supabase.from('profiles').select('*').eq('role', 'control-tester').eq('is_active', true)`
    Returns Profile[] with id, tenant_id, full_name, role, etc.
  implication: Only returns users where role='control-tester' AND is_active=true

- timestamp: 2026-01-28T09:10:00Z
  checked: useMyAssignedControls in useControls.ts (lines 67-100)
  found: |
    Uses `effectiveTesterId = testerId ?? user?.id` (from useAuth)
    Query: `.eq('assigned_tester_id', effectiveTesterId)`
    Logs show: '[useMyAssignedControls] Querying for testerId:', effectiveTesterId
  implication: Should work IF effectiveTesterId matches what was stored in assigned_tester_id

- timestamp: 2026-01-28T09:12:00Z
  checked: TesterDashboardPage.tsx (lines 19-25)
  found: |
    `effectiveTesterId = isControlTester ? user?.id : currentTesterId`
    If user IS a control-tester, uses their auth user.id
    If NOT a control-tester (e.g., director), uses dropdown selection from uiStore
  implication: Real testers use user.id which should match profiles.id

- timestamp: 2026-01-28T09:14:00Z
  checked: AuthContext.tsx (lines 158-162)
  found: |
    `user: session?.user ?? null` - user object is from Supabase Auth
    `user.id` is the Supabase Auth UUID
    profiles table has `id: string` which should be the same UUID (linked to auth.users)
  implication: IDs should match IF profile was created correctly when user was invited

- timestamp: 2026-01-28T09:18:00Z
  checked: accept-invitation/index.ts (lines 121-130)
  found: |
    Profile is created with `id: authData.user.id` which correctly links profile.id to auth.users.id
    Role is set from invitation: `role: invitation.role`
  implication: Profile creation is correct - ID linkage is proper

- timestamp: 2026-01-28T09:20:00Z
  checked: Database schema (00015_controls.sql)
  found: |
    `assigned_tester_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL`
    Foreign key ensures assigned_tester_id must be a valid profile.id
  implication: Database constraint ensures only valid profile IDs can be assigned

- timestamp: 2026-01-28T09:22:00Z
  checked: RLS policies (00003_profiles.sql, 00015_controls.sql)
  found: |
    profiles_tenant_read: tenant_id = public.tenant_id()
    controls_tenant_isolation: tenant_id = public.tenant_id()
    Both tables enforce tenant isolation using JWT tenant_id
  implication: Correct tenant isolation - cross-tenant data won't leak

- timestamp: 2026-01-28T09:25:00Z
  checked: usePermissions.ts (lines 26-33)
  found: |
    `isDemoMode = !authRole` - demo mode detected when no auth role
    `isControlTester = role === ROLES.CONTROL_TESTER` where ROLES.CONTROL_TESTER = 'control-tester'
  implication: Role detection is correct

## Resolution

root_cause: |
  **CODE IS ARCHITECTURALLY CORRECT - NO BUG FOUND IN APPLICATION CODE**

  The complete data flow is:
  1. ControlDetailPanel dropdown uses `useControlTesters()` -> queries `profiles` where role='control-tester'
  2. User selects a tester, value is `profile.id` (UUID)
  3. `doUpdateControl({ assignedTesterId: newTesterId })` saves profile.id to controls.assigned_tester_id
  4. When tester logs in, `useAuth().user.id` provides their auth.users.id (same UUID as profile.id)
  5. `useMyAssignedControls()` queries `.eq('assigned_tester_id', user.id)` - should match

  **POTENTIAL RUNTIME ISSUES (not code bugs) to investigate:**

  1. **Profile doesn't exist**: If control-tester user wasn't invited properly, profile may not exist
     - Check: SELECT * FROM profiles WHERE role = 'control-tester' AND tenant_id = '<tenant>'

  2. **Profile exists but wrong role**: Profile might have a different role
     - Check: SELECT id, role, is_active FROM profiles WHERE id = '<user_id>'

  3. **Profile.is_active = false**: Deactivated profiles won't appear in dropdown
     - Check: profiles.is_active column

  4. **Tenant mismatch**: Manager assigning from tenant A, tester in tenant B (shouldn't happen with RLS)
     - Check: Tester's app_metadata.tenant_id matches manager's tenant

  5. **Cached/stale data**: React Query cache might have stale assignment data
     - Try: Hard refresh, clear localStorage, check network tab

  **DEBUG STEPS (for user to verify):**
  1. Open browser console on Controls Hub page
  2. Look for log: `[useControls] All controls assigned_tester_ids:`
  3. Verify the assigned_tester_id UUID matches the tester's user.id
  4. Login as tester, check console for `[useMyAssignedControls] Querying for testerId:`
  5. Compare the two UUIDs - they should match

fix: N/A - Code is correct. Issue is likely:
  - Missing/misconfigured profiles in database
  - Manual database data issues
  - Or caching that needs clearing

verification: |
  Code analysis complete. To verify at runtime:
  1. Check profiles table has control-tester users
  2. Check controls.assigned_tester_id values match profile.id values
  3. Use console logs to compare IDs at runtime

files_changed: []
