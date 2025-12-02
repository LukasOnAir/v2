---
status: verifying
trigger: "my-controls-not-showing - Three controls assigned to a control tester don't appear in their My Controls dashboard"
created: 2026-01-28T10:00:00Z
updated: 2026-01-28T12:15:00Z
---

## Current Focus

hypothesis: CONFIRMED - useMyAssignedControls uses auth user ID, but director viewing tester dashboard needs dropdown selection
test: Fix applied - modified useMyAssignedControls to accept optional testerId parameter
expecting: Director selecting tester from dropdown now sees that tester's controls
next_action: Verify fix works for both scenarios (actual tester and director-as-tester)

## Debug Code Remaining

Logging in useControls.ts (lines 47-50, 77-78, 81, 90, 94) - can be removed after verification

## Symptoms

expected: Controls assigned to the tester should appear in the "My Controls" list/table on their dashboard
actual: Empty list/table - no controls appear at all
errors: None reported
reproduction: Login as the tester account and navigate to My Controls dashboard
started: Recently broke - was working before

## Eliminated

- hypothesis: TesterDashboardPage uses deprecated currentTesterId from uiStore
  evidence: After first fix, TesterDashboardPage now correctly uses useMyAssignedControls hook (verified at line 13)
  timestamp: 2026-01-28T11:00:00Z

## Evidence

- timestamp: 2026-01-28T10:05:00Z
  checked: TesterDashboardPage.tsx filtering logic
  found: Uses `currentTesterId` from `useUIStore` (line 10), filters by `c.assignedTesterId === currentTesterId` (line 18)
  implication: Filtering uses hardcoded 'tester-1' instead of authenticated user's ID

- timestamp: 2026-01-28T10:06:00Z
  checked: uiStore.ts default value for currentTesterId
  found: Default value is 'tester-1' (line 47) - a mock string value, not a real UUID
  implication: No controls will match because database uses real profile UUIDs

- timestamp: 2026-01-28T10:07:00Z
  checked: useControls.ts for useMyAssignedControls hook
  found: Hook exists at line 54-73, correctly filters by `.eq('assigned_tester_id', user.id)` using AuthContext
  implication: Correct hook exists but TesterDashboardPage doesn't use it

- timestamp: 2026-01-28T10:08:00Z
  checked: Recent git commits
  found: Commit ed3d27d added useMyAssignedControls hook but TesterDashboardPage was not updated to use it
  implication: The hook was created but not wired to the page

- timestamp: 2026-01-28T10:09:00Z
  checked: controls table schema and seeded data
  found: assigned_tester_id column stores real profile UUIDs (references profiles(id))
  implication: Filtering by 'tester-1' string will never match real UUIDs

- timestamp: 2026-01-28T11:25:00Z
  checked: First fix verification - TesterDashboardPage now uses useMyAssignedControls
  found: Line 13 shows `const { data: assignedControls = [], isLoading } = useMyAssignedControls()` - CORRECT
  implication: Problem is NOT in TesterDashboardPage wiring; problem is upstream in the hook or data

- timestamp: 2026-01-28T11:28:00Z
  checked: useMyAssignedControls hook implementation
  found: Queries `.eq('assigned_tester_id', user.id)` where user comes from useAuth()
  implication: If user.id doesn't match any control's assigned_tester_id, returns empty

- timestamp: 2026-01-28T11:29:00Z
  checked: ControlDetailPanel tester assignment dropdown
  found: In demo mode shows "tester-1", "tester-2", "tester-3" mock options; in auth mode shows real profiles
  implication: If controls were assigned in demo mode, assigned_tester_id would be "tester-1" (not a UUID)

- timestamp: 2026-01-28T11:45:00Z
  checked: TesterHeader.tsx - tester selector dropdown
  found: Has dropdown using useControlTesters() to show testers, stores selection in currentTesterId (uiStore)
  implication: This is a leftover from demo mode - in auth mode, useMyAssignedControls uses user.id, NOT currentTesterId

- timestamp: 2026-01-28T11:46:00Z
  checked: useMyAssignedControls vs currentTesterId
  found: useMyAssignedControls() queries by user.id from AuthContext, completely ignores currentTesterId from uiStore
  implication: TesterHeader dropdown is decorative in auth mode - doesn't affect data filtering

## Resolution

root_cause: useMyAssignedControls() always used the authenticated user's ID from AuthContext. When a director uses the tester selector dropdown to view a specific tester's dashboard, the auth user ID is still the director's - so no controls matched.

fix: |
  1. Modified useMyAssignedControls(testerId?: string) to accept an optional tester ID parameter
  2. Modified TesterDashboardPage to determine which tester ID to use:
     - If user is an actual control tester (role === 'control-tester'): use their user.id
     - If user is a director/manager viewing as a tester: use currentTesterId from uiStore (dropdown selection)
  3. The hook now uses the provided testerId if given, otherwise falls back to user.id

verification: TypeScript compiles without errors. User needs to verify in browser.

files_changed:
  - src/hooks/useControls.ts: Added optional testerId parameter to useMyAssignedControls
  - src/pages/TesterDashboardPage.tsx: Added role-aware tester ID selection logic
