---
status: diagnosed
trigger: "Control Owner role doesn't properly restrict editing across the app - can edit RCT via matrix mini menu, can edit taxonomies, can edit custom columns"
created: 2026-01-19T10:00:00Z
updated: 2026-01-19T10:30:00Z
symptoms_prefilled: true
goal: find_root_cause_only
---

## Current Focus

hypothesis: CONFIRMED - Permission checks missing in 7 locations across 6 files
test: Verified by reading each file
expecting: N/A - root cause found
next_action: Report diagnosis

## Symptoms

expected: Control Owner should only VIEW - no RCT edits, no matrix edits, no taxonomy edits, no custom column edits
actual: Can edit RCT through matrix mini menu, can edit taxonomies, can edit custom columns (but NOT direct RCT cells)
errors: N/A - functional issue, not error
reproduction: Login as Control Owner, try editing via matrix mini menu, taxonomies, custom columns
started: After role implementation

## Eliminated

## Evidence

- timestamp: 2026-01-19T10:05:00Z
  checked: usePermissions.ts
  found: |
    Hook returns multiple permission flags but Control Owner currently gets:
    - canEditControlAssessments: true (should be false per user requirement "only view")
    - Missing permissions: canEditCustomColumns, canManageColumns (not defined)
  implication: Permission hook allows Control Owner to edit control assessments; also missing custom column permissions

- timestamp: 2026-01-19T10:10:00Z
  checked: MatrixExpandedView.tsx (lines 33-38, 84-95)
  found: |
    ScoreDropdown components for grossProbability and grossImpact have NO disabled prop.
    No usePermissions() hook imported or used at all.
    Directly calls updateRow() without any permission check.
  implication: Matrix mini menu allows anyone to edit gross scores - missing permission check

- timestamp: 2026-01-19T10:15:00Z
  checked: TaxonomyPage.tsx, TaxonomyToolbar.tsx, TaxonomyNode.tsx, TaxonomyTree.tsx
  found: |
    NO usePermissions hook imported or used in ANY taxonomy component.
    "Add Root Item" button always visible and functional.
    Delete buttons always visible and functional.
    Inline name editing always enabled (onDoubleClick).
    Description editing always enabled.
    Drag-drop always enabled.
    All CRUD operations (create, rename, move, delete) have no permission gates.
  implication: Entire taxonomy system has ZERO permission protection

- timestamp: 2026-01-19T10:20:00Z
  checked: RCTTable.tsx custom column cells (lines 206-264)
  found: |
    Custom column cell renderers (text, number, dropdown, date) have NO disabled prop.
    EditableCell, select, input elements all fully editable.
    handleCustomValueChange has no permission check.
  implication: Custom column cell values can be edited by anyone

- timestamp: 2026-01-19T10:22:00Z
  checked: RCTToolbar.tsx (lines 112-126)
  found: |
    "Manage Columns" and "Add Column" buttons have no permission check.
    No usePermissions import in file.
  implication: Anyone can add/manage custom columns

- timestamp: 2026-01-19T10:24:00Z
  checked: ColumnManager.tsx
  found: |
    No usePermissions import.
    Delete column button and reorder functionality have no permission check.
  implication: Anyone can delete/reorder custom columns

- timestamp: 2026-01-19T10:26:00Z
  checked: ControlPanel.tsx (lines 212-239)
  found: |
    ScoreDropdown for netProbability and netImpact has NO disabled prop.
    Notes textarea has no permission check.
    Only add/delete controls and controlType dropdown are properly gated.
  implication: Net P/I scores and notes can be edited by anyone (Control Owner can edit these)

## Resolution

root_cause: |
  Permission checks are completely missing in 7 distinct areas across 6 files.
  The usePermissions hook exists and works (RCTTable.tsx uses canEditGrossScores correctly),
  but it was never integrated into:
  1. MatrixExpandedView.tsx - no hook usage at all
  2. Taxonomy system (4 files) - no hook usage at all
  3. Custom column cells in RCTTable.tsx - no disabled prop based on permissions
  4. RCTToolbar.tsx - no hook usage for Add/Manage Column buttons
  5. ColumnManager.tsx - no hook usage for delete/reorder
  6. ControlPanel.tsx - net P/I and notes lack permission check

  Additionally, usePermissions.ts has:
  - canEditControlAssessments: true for both roles (should be false for Control Owner per "only view")
  - Missing permission flags for custom columns

fix:
verification:
files_changed: []
