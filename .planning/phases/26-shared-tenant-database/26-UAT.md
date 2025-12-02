---
status: complete
phase: 26-shared-tenant-database
source: 26-01-SUMMARY.md, 26-02-SUMMARY.md, 26-03-SUMMARY.md, 26-04-SUMMARY.md, 26-05-SUMMARY.md, 26-06-SUMMARY.md, 26-07-SUMMARY.md, 26-08-SUMMARY.md
started: 2026-01-27T10:00:00Z
updated: 2026-01-27T10:02:00Z
---

## Current Test

[issues resolved - testing complete]

## Tests

### 1. Cross-Browser Data Sync - Taxonomy
expected: Log in with same account in two different browsers. Create or modify a taxonomy node in one browser. The other browser shows the same change (either immediately or after refresh).
result: issue
reported: "this is not the case"
severity: major

### 2. Cross-Browser Data Sync - RCT Table
expected: In one browser, update a risk score in the RCT table. The other browser shows the same score value.
result: issue
reported: "fail"
severity: major

### 3. Cross-Browser Data Sync - Controls
expected: Create or edit a control in one browser. The other browser shows the same control data.
result: issue
reported: "doesnt work, also, i just made a brand new account and logged in, unlinked to the tenant, but i did see the same information as another tenant. this probably means that browser data is being shared by anyone that logs in on the same browser. because on a different browser, data is again the same for everyone on that other browser."
severity: blocker

### 4. Authenticated User Data Persistence
expected: When logged in, add taxonomy items and RCT rows. Log out. Log back in. Data is still there (came from database, not localStorage).
result: skipped
reason: Root cause identified in Test 3 - app using localStorage instead of database

### 5. Demo Mode Still Works
expected: Without logging in (demo mode), the app works with localStorage data. Changes persist across page refreshes but are local to that browser only.
result: skipped
reason: Root cause identified in Test 3 - need to fix database routing first

### 6. Tenant Isolation
expected: If you have two accounts in different tenants, logging in as each should show completely different data sets.
result: skipped
reason: Root cause identified in Test 3 - tenant isolation broken due to localStorage usage

### 7. Loading State Display
expected: When authenticated and fetching data, a loading indicator appears briefly before data renders.
result: skipped
reason: Root cause identified in Test 3 - database queries not being used

## Summary

total: 7
passed: 0
issues: 3
pending: 0
skipped: 4

## Gaps

- truth: "Cross-browser data sync for taxonomy - changes made in one browser visible in another"
  status: resolved
  reason: "User reported: this is not the case"
  severity: major
  test: 1
  root_cause: "isDemoMode() in stores checked for 'sb-auth-token' but Supabase uses 'sb-<project-ref>-auth-token'"
  artifacts:
    - src/utils/authStorage.ts (created)
    - src/stores/taxonomyStore.ts
    - src/stores/controlsStore.ts
    - src/stores/rctStore.ts
  missing: []
  debug_session: ".planning/debug/resolved/auth-data-routing-broken.md"

- truth: "Cross-browser data sync for RCT table - score changes visible in other browser"
  status: resolved
  reason: "User reported: fail"
  severity: major
  test: 2
  root_cause: "Same as test 1 - isDemoMode detection was broken"
  artifacts: []
  missing: []
  debug_session: ""

- truth: "Authenticated users should read/write to database, not localStorage. Different tenants should see different data."
  status: resolved
  reason: "User reported: different accounts on same browser see same data (localStorage shared), different browsers see different data (no database sync). App still using localStorage even when authenticated."
  severity: blocker
  test: 3
  root_cause: "Three issues: (1) isDemoMode detection broken, (2) tenant_id not auto-populated on INSERT, (3) Generate RCT used store instead of database mutation"
  artifacts:
    - src/utils/authStorage.ts (created)
    - supabase/migrations/00027_tenant_id_defaults.sql (created)
    - src/components/rct/RCTTable.tsx (updated)
  missing: []
  debug_session: ".planning/debug/resolved/auth-data-routing-broken.md"
