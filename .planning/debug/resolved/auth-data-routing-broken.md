---
status: resolved
trigger: "Authenticated users see localStorage data instead of database data. Different accounts on same browser see identical data. Cross-browser sync doesn't work."
created: 2026-01-27T10:00:00Z
updated: 2026-01-27T10:10:00Z
---

## Current Focus

hypothesis: CONFIRMED AND FIXED
test: TypeScript compilation passed, now need to verify runtime behavior
expecting: Authenticated users should now see database data, demo users see localStorage data
next_action: Verify fix works by testing the authentication flow

## Symptoms

expected: When logged in, users should read/write data to Supabase database. Different tenants should see different data. Same account across browsers should see same data.
actual: Different accounts on same browser see the same data (localStorage shared). Different browsers show different data (no database sync). App still using localStorage even when authenticated.
errors: No console errors reported
reproduction: Log in with account A, see data. Log in with account B (different tenant), see SAME data. Open different browser, log in with account A, see DIFFERENT data.
started: First test after Phase 26 implementation

## Eliminated

- hypothesis: Page components using wrong data source
  evidence: TaxonomyPage.tsx and RCTTable.tsx both use useIsDemoMode() hook correctly
  timestamp: 2026-01-27T10:00:30Z

- hypothesis: React Query hooks not fetching database data
  evidence: useTaxonomy, useRCTRows etc all make Supabase calls without enabled guard
  timestamp: 2026-01-27T10:01:30Z

## Evidence

- timestamp: 2026-01-27T10:00:30Z
  checked: TaxonomyPage.tsx (line 49)
  found: Uses useIsDemoMode() hook which checks useAuth().session
  implication: Page components use the CORRECT method - hooks check React context

- timestamp: 2026-01-27T10:00:45Z
  checked: useTenantData.ts (lines 106-109)
  found: useIsDemoMode() returns !session from useAuth()
  implication: Hook-based check uses React context state - CORRECT approach

- timestamp: 2026-01-27T10:01:00Z
  checked: taxonomyStore.ts (lines 147-150 and 254-258)
  found: partialize() checks localStorage.getItem('sb-auth-token') - WRONG KEY
  implication: Supabase uses 'sb-<project-ref>-auth-token', not 'sb-auth-token'

- timestamp: 2026-01-27T10:01:15Z
  checked: Grep for 'sb-auth-token' across stores
  found: Same wrong key in taxonomyStore.ts (2x), rctStore.ts, controlsStore.ts
  implication: All stores have this bug - affects partialize() persistence functions

- timestamp: 2026-01-27T10:02:00Z
  checked: Supabase documentation and web search
  found: Supabase localStorage key format is 'sb-<project-ref>-auth-token'
  implication: The hardcoded 'sb-auth-token' key will NEVER match, always returns null

- timestamp: 2026-01-27T10:03:00Z
  checked: Page component data routing logic
  found: Pages use `isDemoMode ? storeData : (dbData || [])` pattern
  implication: When authenticated, pages CORRECTLY try to use database data

- timestamp: 2026-01-27T10:04:00Z
  checked: Store partialize behavior with wrong key
  found: Since key never matches, storedSession is always null, partialize always persists full data
  implication: Demo data persists to localStorage even when authenticated

- timestamp: 2026-01-27T10:04:30Z
  checked: Store hydration behavior
  found: Zustand persist loads data from localStorage on startup regardless of auth state
  implication: Old demo data gets loaded into store state on every page load

- timestamp: 2026-01-27T10:10:00Z
  checked: TypeScript compilation after fix
  found: npx tsc --noEmit passed with no errors
  implication: Fix is syntactically correct and type-safe

## Resolution

root_cause: The stores' partialize() functions check for `localStorage.getItem('sb-auth-token')` but Supabase actually stores the session under `sb-<project-ref>-auth-token` (where project-ref is the unique Supabase project identifier). This means:
1. The check ALWAYS returns null (key doesn't exist)
2. partialize() ALWAYS returns full data (thinks it's demo mode)
3. Demo data persists to localStorage even when authenticated
4. On next page load, Zustand hydrates stale localStorage data into store state
5. Page components correctly use useIsDemoMode() but the stores are polluted with old data

This explains the symptom "different accounts see same data" - they're seeing stale localStorage data from previous demo sessions.

fix: Created `src/utils/authStorage.ts` utility that properly detects Supabase session by iterating localStorage keys to find any matching the pattern `sb-*-auth-token`. Updated all three store files to use this utility:
- src/stores/taxonomyStore.ts - uses isDemoMode() from authStorage
- src/stores/rctStore.ts - uses isDemoMode() from authStorage
- src/stores/controlsStore.ts - uses isDemoMode() from authStorage

The fix:
1. Searches ALL localStorage keys for the pattern `sb-*-auth-token`
2. Validates the key contains valid JSON (actual session data)
3. Returns true for hasSupabaseSession() if found
4. isDemoMode() returns the inverse (no session = demo mode)

verification: TypeScript compilation passes. Need user to verify:
1. Log out if logged in
2. Clear localStorage (DevTools > Application > Clear site data)
3. Test demo mode works (create data without login)
4. Log in with Account A - should see database data, not localStorage
5. Log in with Account B (different tenant) - should see Account B's data
6. Same account in different browser - should see same data

files_changed:
- src/utils/authStorage.ts (created)
- src/stores/taxonomyStore.ts (updated imports and partialize)
- src/stores/rctStore.ts (updated imports and partialize)
- src/stores/controlsStore.ts (updated imports and partialize)
