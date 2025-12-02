---
phase: 43-signup-button-visibility
verified: 2026-01-28T19:45:00Z
status: passed
score: 5/5 must-haves verified
human_verification:
  - test: "Toggle show_signup flag from admin panel"
    expected: "Login page signup link toggles between visible/hidden"
    why_human: "Requires running app with Supabase and switching between admin view and login page"
  - test: "Visit login page as unauthenticated user"
    expected: "Signup link visible by default (backwards compatible)"
    why_human: "Requires browser session with no authentication"
---

# Phase 43: Signup Button Visibility Verification Report

**Phase Goal:** Super-admin can toggle signup button visibility on login page for all visitors
**Verified:** 2026-01-28T19:45:00Z
**Status:** PASSED
**Re-verification:** No - initial verification

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | Super-admin can toggle signup button on/off from admin panel | VERIFIED | `AdminFeatureFlagsPage.tsx` renders all flags from `global_feature_flags` table with toggle buttons; `useGlobalFeatureFlagAdmin.ts` provides `toggleFlag` mutation that updates flag enabled state |
| 2 | Login page shows signup link when show_signup flag is enabled | VERIFIED | `LoginPage.tsx:280-289` renders `<Link to="/signup">Sign up</Link>` when `showSignup` is truthy |
| 3 | Login page hides signup link when show_signup flag is disabled | VERIFIED | `LoginPage.tsx:290-293` renders invitation message when `showSignup` is falsy |
| 4 | Unauthenticated visitors see correct button state (no session required) | VERIFIED | `usePublicFeatureFlags.ts` queries `global_feature_flags` without session; migration `00032` grants SELECT to `anon` role |
| 5 | Default state is signup visible (backwards compatible) | VERIFIED | Migration seeds `show_signup=true`; hook defaults to `true` while loading or on error (line 33: `?? true`) |

**Score:** 5/5 truths verified

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `supabase/migrations/00032_anon_global_flags_read.sql` | Anon SELECT policy + show_signup flag seed | VERIFIED | 23 lines; Contains `GRANT SELECT...TO anon`, `CREATE POLICY...TO anon`, INSERT of show_signup with enabled=true |
| `src/hooks/usePublicFeatureFlags.ts` | Hook for unauthenticated pages to check global flags | VERIFIED | 40 lines; Exports `usePublicFeatureFlags` function; Queries `global_feature_flags` table; Returns `{ showSignup, isLoading }` |
| `src/hooks/useFeatureFlags.ts` | Updated with show_signup FeatureKey | VERIFIED | 110 lines; `FeatureKey` type includes `'show_signup'`; `DEMO_DEFAULTS` has `show_signup: true`; Returns `showSignup` accessor |
| `src/pages/LoginPage.tsx` | Conditional signup link rendering | VERIFIED | 313 lines; Imports and calls `usePublicFeatureFlags`; Conditional render based on `showSignup` variable |

### Key Link Verification

| From | To | Via | Status | Details |
|------|-----|-----|--------|---------|
| `LoginPage.tsx` | `usePublicFeatureFlags.ts` | import and hook call | WIRED | Line 6: `import { usePublicFeatureFlags }...`; Line 60: `const { showSignup } = usePublicFeatureFlags()` |
| `usePublicFeatureFlags.ts` | `global_feature_flags` table | Supabase query | WIRED | Line 19-21: `supabase.from('global_feature_flags').select('feature_key, enabled')` |
| `AdminFeatureFlagsPage.tsx` | `useGlobalFeatureFlagAdmin.ts` | import and hook call | WIRED | Line 3: import; Line 9-17: destructuring of all hook values |
| `useGlobalFeatureFlagAdmin.ts` | `global_feature_flags` table | Supabase mutations | WIRED | toggleFlag, createFlag, deleteFlag all operate on table |
| `App.tsx` | `AdminFeatureFlagsPage` | Route config | WIRED | Line 107: `<Route path="feature-flags" element={<AdminFeatureFlagsPage />} />` |

### Requirements Coverage

| Requirement | Status | Blocking Issue |
|-------------|--------|----------------|
| ADMIN-02 (signup visibility control) | SATISFIED | None |

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| None | - | - | - | No anti-patterns detected |

### Human Verification Required

#### 1. Toggle Flag from Admin Panel

**Test:** Log in as super-admin, navigate to /admin/feature-flags, toggle show_signup off, open login page in incognito
**Expected:** Login page shows "Need access? Contact your organization's Director..." instead of signup link
**Why human:** Requires running application with Supabase and testing cross-session behavior

#### 2. Verify Default State

**Test:** Clear all browser data, visit /login before any admin interaction
**Expected:** Signup link is visible ("Don't have an account? Sign up")
**Why human:** Requires fresh browser state and running database with seeded flag

#### 3. Verify Unauthenticated Access

**Test:** Open browser dev tools, check Network tab while loading /login
**Expected:** Request to global_feature_flags succeeds without authentication token
**Why human:** Requires inspecting network requests in running application

### Observations

**Cache Behavior:** The `usePublicFeatureFlags` hook has 5-minute staleTime. When super-admin toggles the flag, existing visitors with cached data won't see the change until cache expires. New visitors will see the correct state immediately. This is acceptable for a feature flag that changes rarely.

**Query Key Invalidation:** The admin toggle invalidates `global-feature-flags` (authenticated) but not `public-feature-flags` (unauthenticated). This is by design - the caches are separate for different user contexts.

---

*Verified: 2026-01-28T19:45:00Z*
*Verifier: Claude (gsd-verifier)*
