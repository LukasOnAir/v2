---
status: resolved
trigger: "RCT category in ticket linked items shows 'undefined x undefined' instead of 'RISK ID + RISK NAME x PROCES ID + PROCES NAME'"
created: 2026-01-28T10:00:00Z
updated: 2026-01-28T10:20:00Z
---

## Current Focus

hypothesis: CONFIRMED - RCT data from database lacks denormalized riskName/processName fields
test: Applied fix to look up names from taxonomy using riskId/processId
expecting: RCT dropdown should now show "RISK_ID RISK_NAME x PROCESS_ID PROCESS_NAME" format
next_action: COMPLETE

## Symptoms

expected: RCT dropdown in ticket linked items should show "RISK ID + RISK NAME x PROCES ID + PROCES NAME" format
actual: All RCT items display as "undefined x undefined"
errors: No console errors visible
reproduction: Open Tickets tab -> open any ticket -> look at linked items -> select RCT category
started: Unknown
additional_context: RCT can be quite large, so the dropdown should be searchable

## Eliminated

## Evidence

- timestamp: 2026-01-28T10:05:00Z
  checked: TicketForm.tsx lines 377-380 - RCT row mapping
  found: Code accesses `row.riskName` and `row.processName` directly
  implication: These properties must exist on the row objects

- timestamp: 2026-01-28T10:07:00Z
  checked: src/types/rct.ts - RCTRow interface (lines 107-154)
  found: RCTRow type includes riskName (line 121) and processName (line 135)
  implication: Full type has these fields, but may not be populated from all sources

- timestamp: 2026-01-28T10:09:00Z
  checked: src/hooks/useRCTRows.ts - Database hook
  found: Returns RCTRowData type which only has riskId/processId, NOT riskName/processName
  implication: Comment at line 11-13 confirms "denormalized columns are joined in component layer"

- timestamp: 2026-01-28T10:10:00Z
  checked: TicketForm.tsx line 106
  found: `const rctRows = isDemoMode ? storeRctRows : (dbRctRows || [])`
  implication: In authenticated mode, uses dbRctRows which is RCTRowData[] without name fields

- timestamp: 2026-01-28T10:11:00Z
  checked: rctStore.ts line 104
  found: Demo mode store uses full RCTRow[] type with riskName/processName
  implication: Bug only affects authenticated mode, demo mode works correctly

- timestamp: 2026-01-28T10:18:00Z
  checked: TypeScript compilation and production build
  found: Both pass without errors
  implication: Fix is syntactically correct and compatible with existing code

## Resolution

root_cause: In authenticated mode, useRCTRows() returns RCTRowData[] from database which only contains riskId/processId references. The code at TicketForm lines 377-380 tried to access row.riskName and row.processName which don't exist on RCTRowData, resulting in "undefined x undefined".

fix: Added taxonomy lookup maps (riskNameMap, processNameMap) built from flatRisks/flatProcesses. Modified RCT row mapping to look up risk/process info using riskId/processId, with fallback to showing the ID if lookup fails. Format is now "HIERARCHICAL_ID NAME x HIERARCHICAL_ID NAME".

verification: TypeScript compiles, production build succeeds. Requires browser testing to confirm visual correctness.

files_changed:
  - src/components/tickets/TicketForm.tsx
