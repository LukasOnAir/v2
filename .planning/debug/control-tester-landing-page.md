---
status: verifying
trigger: "Control Tester role should land on My Controls page after login, but currently lands on Taxonomy page"
created: 2026-01-28T10:00:00Z
updated: 2026-01-28T11:35:00Z
---

## Current Focus

hypothesis: CONFIRMED - LoginPage.tsx bypasses ProtectedRoute by navigating directly to /taxonomy
test: Fix applied - changed default from '/taxonomy' to '/'
expecting: Control Tester now lands on /tester (My Controls) after login
next_action: User verification needed - login as Control Tester

## Symptoms

expected: Control Tester users should be redirected to "My Controls" page after login
actual: Control Tester users land on "Taxonomy" page instead
errors: None - page loads correctly, just wrong destination
reproduction: Login as a user with Control Tester role
started: Never worked - this is a new requirement to implement

## Eliminated

- hypothesis: ProtectedRoute lacks role-based redirect logic
  evidence: ProtectedRoute DOES have the logic (lines 28-33), but it only checks location.pathname === '/'
  timestamp: 2026-01-28T11:20:00Z

- hypothesis: Role is not available when ProtectedRoute renders
  evidence: Role comes from AuthContext which is set before navigation completes
  timestamp: 2026-01-28T11:25:00Z

## Evidence

- timestamp: 2026-01-28T10:05:00Z
  checked: App.tsx routing structure
  found: |
    Line 81: `<Route index element={<Navigate to="/taxonomy" replace />} />`
    This is inside the Layout wrapper and redirects ALL authenticated users to /taxonomy
    Line 99-101: TesterLayout with /tester route exists for Control Testers
  implication: Default redirect doesn't account for user role

- timestamp: 2026-01-28T10:06:00Z
  checked: ProtectedRoute.tsx
  found: |
    Lines 28-33 DO have role-based redirect:
    ```
    if (role === ROLES.CONTROL_TESTER && location.pathname === '/') {
      return <Navigate to="/tester" replace />
    }
    ```
    This logic is CORRECT but never triggers!
  implication: The condition location.pathname === '/' is never true during login flow

- timestamp: 2026-01-28T11:15:00Z
  checked: LoginPage.tsx login flow
  found: |
    ROOT CAUSE IDENTIFIED!
    Line 61: `const from = (location.state as { from?: { pathname: string } })?.from?.pathname || '/taxonomy'`
    Line 92: `navigate(from, { replace: true })`

    After successful login, LoginPage navigates DIRECTLY to '/taxonomy' (the default)
    This BYPASSES the ProtectedRoute's pathname === '/' check entirely!

    The ProtectedRoute logic would work if users hit '/', but LoginPage never sends them there.
  implication: Fix must be in LoginPage.tsx - navigate to '/' instead of hardcoded '/taxonomy'

- timestamp: 2026-01-28T11:20:00Z
  checked: AuthConfirmPage.tsx (email verification callback)
  found: |
    Lines 50, 68, 77 all use: `navigate('/', { replace: true })`
    AuthConfirmPage correctly navigates to '/' - this would trigger the ProtectedRoute logic!
    But LoginPage uses '/taxonomy' directly.
  implication: LoginPage is inconsistent with AuthConfirmPage approach

- timestamp: 2026-01-28T11:35:00Z
  checked: Fix applied and TypeScript compilation
  found: |
    Changed LoginPage.tsx line 61:
    FROM: `const from = ... || '/taxonomy'`
    TO:   `const from = ... || '/'`

    TypeScript compiles without errors.
  implication: Fix is syntactically correct, awaiting user verification

## Resolution

root_cause: |
  LoginPage.tsx line 61 hardcodes '/taxonomy' as the default post-login destination:
  `const from = ... || '/taxonomy'`

  After successful login (line 92), it navigates directly to '/taxonomy', completely
  bypassing the ProtectedRoute's role-based redirect which only checks pathname === '/'.

  The ProtectedRoute fix was correct but ineffective because the login flow never
  routes users through '/' - it goes directly to '/taxonomy'.

fix: |
  Changed LoginPage.tsx line 61 to use '/' as the default instead of '/taxonomy':
  `const from = ... || '/'`

  Login flow now:
  1. LoginPage navigates to '/'
  2. ProtectedRoute intercepts at '/'
  3. ProtectedRoute checks role - if Control Tester, redirect to '/tester'
  4. If other role, render Outlet -> Layout -> index route -> Navigate to '/taxonomy'

  This keeps role-based redirect logic centralized in ProtectedRoute.

verification: |
  - TypeScript compiles without errors
  - Fix applied to src/pages/LoginPage.tsx
  - Awaiting user test: login as Control Tester and verify landing on My Controls page

files_changed:
  - src/pages/LoginPage.tsx
