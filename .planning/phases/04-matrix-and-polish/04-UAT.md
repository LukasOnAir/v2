---
status: diagnosed
phase: 04-matrix-and-polish
source: [04-03-SUMMARY.md, 04-04-SUMMARY.md, 04-05-SUMMARY.md]
started: 2026-01-20T10:00:00Z
updated: 2026-01-20T10:15:00Z
---

## Current Test

[testing complete]

## Tests

### 1. Jump to Filtered RCT
expected: In Matrix view, click a cell to open expanded view. Click "Jump to RCT". RCT page shows filtered view with only matching rows.
result: pass
notes: |
  Bug observed: Risk ID and Process ID columns visible with UUIDs (should be hidden)
  Feature requests logged:
  - Click Risk/Process header in Matrix to jump to filtered RCT
  - RCT option to show higher hierarchy levels with overlapping names in headers

### 2. Excel Matrix Shows All L1 Items
expected: Export to Excel. Open the Matrix sheet. All Risk L1 items appear as columns and all Process L1 items appear as rows, regardless of whether they have RCT data.
result: pass

### 3. Excel Taxonomy Uses Hierarchical IDs
expected: In the exported Excel, check Risk Taxonomy and Process Taxonomy sheets. ID column shows "1", "1.1", "1.2.3" format (not UUIDs like "69534640-ce54-...").
result: pass

### 4. Control Owner Cannot Edit RCT
expected: Select "Control Owner" role. On RCT page, all score fields (gross P/I, net P/I) are disabled. Custom column cells are also disabled.
result: pass

### 5. Control Owner Cannot Edit Matrix
expected: As Control Owner, open a Matrix cell expansion. Score dropdowns are disabled/grayed out. Cannot change any values.
result: pass

### 6. Control Owner Cannot Edit Taxonomy
expected: As Control Owner, navigate to Taxonomy page. "Add" buttons are hidden. Cannot add, edit, or delete taxonomy items.
result: pass
notes: |
  Bug observed: Control Owner can still add columns to RCT (should be restricted)

### 7. Per-Control Change Request
expected: As Control Owner, open Control Panel on an RCT row with controls. Each control card has its own "Request Change" button. Clicking opens form specific to that control.
result: pass
notes: |
  Minor UI: Text box should be larger or auto-resize with content
  Feature needed: Risk Manager needs UI to view/manage change requests

## Summary

total: 7
passed: 7
issues: 3
pending: 0
skipped: 0

## Gaps

- truth: "Risk ID and Process ID columns should be hidden in RCT"
  status: failed
  reason: "User reported: Risk ID and Process ID columns visible with UUID values"
  severity: minor
  test: 1
  root_cause: "Zustand persist middleware restores old columnVisibility from localStorage lacking riskId/processId:false entries; TanStack Table treats missing keys as visible"
  artifacts:
    - path: "src/stores/rctStore.ts"
      issue: "Missing merge logic for new default visibility settings with persisted state"
  missing:
    - "Add merge function to zustand persist config to force riskId:false, processId:false"
  debug_session: ".planning/debug/rct-hidden-columns-visible.md"

- truth: "Control Owner cannot add columns to RCT"
  status: failed
  reason: "User reported: Control Owner can still add columns to RCT"
  severity: minor
  test: 6
  root_cause: "RCTToolbar.tsx does not use usePermissions hook; Add Column and Manage Columns buttons render unconditionally despite canManageCustomColumns flag existing"
  artifacts:
    - path: "src/components/rct/RCTToolbar.tsx"
      issue: "Missing usePermissions import and conditional rendering for column management buttons"
  missing:
    - "Import usePermissions, wrap Add Column and Manage Columns buttons with canManageCustomColumns check"
  debug_session: ".planning/debug/control-owner-add-columns.md"

- truth: "Change request text box should auto-resize or be larger"
  status: failed
  reason: "User reported: box needs to be a bit larger or move with added text"
  severity: cosmetic
  test: 7
  root_cause: "Textarea has rows={2} and resize-none class preventing expansion; lacks auto-resize handler present in similar Notes textarea"
  artifacts:
    - path: "src/components/rct/ControlPanel.tsx"
      issue: "Lines 280-286: textarea has fixed rows={2} and resize-none class"
  missing:
    - "Remove resize-none, add auto-resize onChange handler, increase rows to 3"
  debug_session: ""

## Feature Requests (out of scope for current verification)

- Click Risk/Process header in Matrix to jump to filtered RCT
- RCT option to show higher hierarchy levels with overlapping names in headers
- Risk Manager UI to view and manage submitted change requests
