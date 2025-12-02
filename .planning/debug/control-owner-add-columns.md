---
status: diagnosed
trigger: "Diagnose why Control Owner can still add columns to RCT"
created: 2026-01-20T10:00:00Z
updated: 2026-01-20T10:05:00Z
symptoms_prefilled: true
goal: find_root_cause_only
---

## Current Focus

hypothesis: CONFIRMED - RCTToolbar does not use canManageCustomColumns permission
test: Verified by reading source files
expecting: N/A - root cause found
next_action: Report diagnosis

## Symptoms

expected: Control Owner role should be view-only, unable to add columns to RCT
actual: Control Owner can still add columns to RCT
errors: N/A (functional bug, not error)
reproduction: Log in as Control Owner, navigate to RCT, click Add Column
started: After 04-05-PLAN added permission checks (but missed this functionality)

## Eliminated

## Evidence

- timestamp: 2026-01-20T10:02:00Z
  checked: src/hooks/usePermissions.ts
  found: canManageCustomColumns flag EXISTS (line 23) - returns isRiskManager
  implication: Permission flag is properly defined, issue is in UI not using it

- timestamp: 2026-01-20T10:03:00Z
  checked: src/components/rct/RCTToolbar.tsx
  found: No import of usePermissions hook. "Add Column" button (lines 120-126) and "Manage Columns" button (lines 112-118) are ALWAYS rendered - no permission check
  implication: PRIMARY ISSUE - toolbar buttons not guarded

- timestamp: 2026-01-20T10:04:00Z
  checked: src/components/rct/ColumnManager.tsx
  found: No import of usePermissions hook. Delete buttons (line 96-101) and drag handles (line 67-73) always rendered
  implication: SECONDARY ISSUE - even if toolbar hidden, ColumnManager allows destructive actions

- timestamp: 2026-01-20T10:04:30Z
  checked: src/components/rct/AddColumnDialog.tsx
  found: No import of usePermissions hook. Dialog allows full column creation without permission check
  implication: TERTIARY ISSUE - dialog itself has no guard (defense in depth missing)

## Resolution

root_cause: RCTToolbar.tsx does not import usePermissions hook and does not conditionally render "Add Column" and "Manage Columns" buttons based on canManageCustomColumns flag
fix: (to be implemented)
verification: (to be verified)
files_changed: []
