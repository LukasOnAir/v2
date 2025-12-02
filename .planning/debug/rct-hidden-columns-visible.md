---
status: investigating
trigger: "Diagnose why Risk ID and Process ID columns are visible in RCT when they should be hidden"
created: 2026-01-20T10:00:00Z
updated: 2026-01-20T10:01:00Z
symptoms_prefilled: true
goal: find_root_cause_only
---

## Current Focus

hypothesis: LocalStorage persistence overrides the defaults - existing users have old columnVisibility state without riskId/processId entries
test: Analyze code flow for persisted state vs defaults
expecting: Confirm that persisted state from before 04-04 does not include riskId:false, processId:false
next_action: Confirm root cause and document

## Symptoms

expected: Risk ID and Process ID columns should be hidden (added for URL filtering only)
actual: Columns are visible showing UUID values
errors: None (functional but unwanted visibility)
reproduction: Open RCT view, observe Risk ID and Process ID columns
started: After 04-04-PLAN implementation

## Eliminated

## Evidence

- timestamp: 2026-01-20T10:01:00Z
  checked: rctStore.ts columnVisibility defaults (lines 61-65)
  found: Defaults ARE correctly set to { riskId: false, processId: false }
  implication: Defaults are correct, issue is elsewhere

- timestamp: 2026-01-20T10:01:00Z
  checked: rctStore.ts persistence config (lines 227-231)
  found: Store uses zustand persist with localStorage key 'riskguard-rct', persists ENTIRE state including columnVisibility
  implication: Existing users have persisted columnVisibility from BEFORE these columns were added - their state has {} or other columns but NOT riskId:false, processId:false

- timestamp: 2026-01-20T10:01:00Z
  checked: RCTTable.tsx column definitions (lines 296-297)
  found: Columns have enableHiding:true but NO explicit visibility:false in column definition
  implication: TanStack Table relies entirely on state.columnVisibility, which comes from persisted store

- timestamp: 2026-01-20T10:01:00Z
  checked: TanStack Table visibility behavior
  found: When a column is NOT in columnVisibility object, TanStack treats it as visible (undefined = visible)
  implication: Old persisted state without riskId/processId keys means columns default to visible

## Resolution

root_cause: Zustand persist middleware restores old columnVisibility state from localStorage that lacks riskId:false and processId:false entries. TanStack Table treats missing keys as visible (undefined=true), so columns show despite correct initial defaults.
fix:
verification:
files_changed: []
