---
status: resolved
trigger: "RCT tab net scores are not calculating correctly"
created: 2026-01-28T10:00:00Z
updated: 2026-01-28T10:00:00Z
---

## Current Focus

hypothesis: The `calculateNetScoresFromLinks` function uses demo mode store data even in authenticated mode, missing DB control links/controls
test: Check if calculateNetScoresFromLinks uses useControlsStore.getState() directly instead of passed data
expecting: If it uses store.getState(), it won't have DB data in authenticated mode
next_action: Verify calculateNetScoresFromLinks data source and compare with RCTTable data flow

## Symptoms

expected:
- When NO controls linked to a risk×process: net score = gross score (accept risk)
- When controls ARE linked: net score = lowest probability score AND lowest impact score among all controls linked to that risk×process combination
- Each control has a different effect on each risk×process it's linked to

actual:
- When 0 controls: net score IS visible (possibly wrong value?)
- When controls exist: net score does NOT appear
- Net score calculation appears inverted from expected behavior

errors: None reported yet

reproduction: Happens on any RCT row in the RCT tab

started: Unknown - may never have worked correctly

## Eliminated

## Evidence

- timestamp: 2026-01-28T10:05:00Z
  checked: RCTTable.tsx netScoresByRow useMemo (lines 438-485)
  found: |
    The netScoresByRow calculation calls `calculateNetScoresFromLinks(row.id)` which is imported from rctStore.
    However, RCTTable uses `dbControlLinks` and `dbControls` from hooks in authenticated mode, NOT the store.
  implication: calculateNetScoresFromLinks uses store state which is empty in authenticated mode

- timestamp: 2026-01-28T10:06:00Z
  checked: rctStore.ts calculateNetScoresFromLinks (lines 56-96)
  found: |
    ```typescript
    export function calculateNetScoresFromLinks(rowId: string) {
      const { controls, controlLinks } = useControlsStore.getState()
      // ...uses these store values for calculation
    }
    ```
    This function ALWAYS uses useControlsStore.getState() to get controls and controlLinks.
  implication: In authenticated mode, store is empty - function returns null values incorrectly

- timestamp: 2026-01-28T10:07:00Z
  checked: RCTTable.tsx data sources (lines 361-372)
  found: |
    ```typescript
    const { data: dbControlLinks } = useControlLinks()
    const { data: dbControls } = useControls()
    // ...
    const controlLinks = isDemoMode ? storeControlLinks : (dbControlLinks || [])
    const allControls = isDemoMode ? storeControls : (dbControls || [])
    ```
    RCTTable correctly switches between store and DB data based on mode.
    BUT calculateNetScoresFromLinks ignores this and always uses store.
  implication: ROOT CAUSE IDENTIFIED - data source mismatch between RCTTable and helper function

## Resolution

root_cause: |
  `calculateNetScoresFromLinks` in rctStore.ts uses `useControlsStore.getState()` to access
  controls and controlLinks. In authenticated mode, the store is empty because data comes
  from database hooks (useControlLinks, useControls). The function should accept the data
  as parameters instead of accessing the store directly.

  This explains both symptoms:
  1. "When 0 controls: net score IS visible" - The netScoresByRow useMemo in RCTTable has
     a fallback: if hasAnyControls is false, it uses gross score as net score. Since
     linkCountByRow is calculated from the correct dbControlLinks, but calculateNetScoresFromLinks
     returns nulls (store is empty), hasAnyControls can be incorrectly false or the scores
     come from gross values.
  2. "When controls exist: net score does NOT appear" - When there ARE linked controls in the
     DB, calculateNetScoresFromLinks returns nulls because it reads from empty store,
     so allProbs/allImps arrays are empty, leading to null netScore.

fix: |
  Modified `calculateNetScoresFromLinks` to accept controls and controlLinks as parameters
  instead of accessing useControlsStore.getState() directly:

  1. rctStore.ts: Changed function signature to accept (rowId, controls, controlLinks)
  2. rctStore.ts: Added ControlLink type import
  3. rctStore.ts: Updated legacy wrapper to pass store data for backwards compatibility
  4. RCTTable.tsx: Updated call to pass allControls and controlLinks (correct data source)

verification: |
  - TypeScript compiles successfully (npx tsc --noEmit)
  - Logic flow verified: RCTTable.tsx correctly passes allControls and controlLinks
    to calculateNetScoresFromLinks, which are derived from either store (demo) or
    database hooks (authenticated) based on isDemoMode
  - Legacy wrapper function preserved for any backwards compatibility needs
files_changed:
  - src/stores/rctStore.ts
  - src/components/rct/RCTTable.tsx
