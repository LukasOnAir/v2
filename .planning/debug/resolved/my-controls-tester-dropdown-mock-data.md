---
status: resolved
trigger: "My Controls page has a tester dropdown (top-right) that shows hardcoded 'Tester 1, 2, 3' instead of fetching real testers from the tenant database."
created: 2026-01-28T10:00:00Z
updated: 2026-01-28T10:10:00Z
---

## Current Focus

hypothesis: CONFIRMED - Hardcoded <option> tags in Header.tsx and TesterHeader.tsx
test: N/A - root cause confirmed
expecting: N/A
next_action: COMPLETE

## Symptoms

expected: Dropdown should list testers from the tenant database. When a tester is selected, the My Controls page should show all controls assigned to that tester.
actual: Dropdown shows hardcoded mock data: "Tester 1, Tester 2, Tester 3"
errors: No console errors
reproduction: Open My Controls page, click the tester dropdown in the top right
started: Never worked - always been placeholder/mock data since the feature was added

## Eliminated

## Evidence

- timestamp: 2026-01-28T10:02:00Z
  checked: src/components/layout/Header.tsx lines 52-54
  found: Hardcoded <option> tags with values "tester-1", "tester-2", "tester-3" and labels "Tester 1", "Tester 2", "Tester 3"
  implication: This is the source of mock data in the main app header

- timestamp: 2026-01-28T10:02:00Z
  checked: src/components/layout/TesterHeader.tsx lines 24-26
  found: Same hardcoded <option> tags with "Tester 1", "Tester 2", "Tester 3"
  implication: Tester-specific header also has mock data

- timestamp: 2026-01-28T10:03:00Z
  checked: src/hooks/useProfiles.ts lines 47-49
  found: useControlTesters() hook already exists - fetches profiles with role='control-tester' from database
  implication: Solution already exists, just not being used

- timestamp: 2026-01-28T10:04:00Z
  checked: src/lib/supabase/types.ts lines 144-183
  found: Profile type has id, full_name, role, is_active fields
  implication: Can use profile.id as value and profile.full_name as label

## Resolution

root_cause: Header.tsx and TesterHeader.tsx contain hardcoded <option> elements instead of using the existing useControlTesters() hook to fetch real testers from the database.

fix:
1. Added useControlTesters() hook import from @/hooks/useProfiles to both files
2. Added useEffect to auto-select first tester when data loads (prevents stale/invalid tester ID)
3. Replaced hardcoded <option> tags with dynamic mapping over testers array
4. Added loading state ("Loading...") and empty state ("No testers available")
5. Added disabled prop to select when loading

verification: TypeScript compilation passes (npx tsc --noEmit)

files_changed:
- src/components/layout/Header.tsx
- src/components/layout/TesterHeader.tsx
