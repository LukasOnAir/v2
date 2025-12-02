---
status: complete
phase: 03-risk-control-table
source: [03-04-SUMMARY.md]
started: 2026-01-19T17:45:00Z
updated: 2026-01-19T17:50:00Z
type: retest
---

## Current Test

[testing complete]

## Tests

### 1. Column Alignment
expected: Table columns align properly - header widths match body widths. No overlapping text. Long text truncates with "..." and shows full text on hover.
result: pass
note: "User suggestion: make column resize handle more visible (vertical line indicator)"

### 2. Column Resizing
expected: Hover over right edge of any column header - orange resize bar appears. Drag to resize column width. Width persists while scrolling.
result: pass

### 3. Column Visibility Checkboxes
expected: Open column visibility menu (eye icon). Click any checkbox - column hides/shows. Show All and Hide All buttons work.
result: pass

### 4. Risk L1 ID Filter
expected: Click filter icon on Risk L1 ID column. Dropdown shows unique values with checkboxes. Select/deselect values - rows filter correctly.
result: pass

### 5. Custom Column Text/Number Input
expected: Add a Text custom column. Click the cell and type a full word - input maintains focus throughout typing. Same for Number column.
result: pass

### 6. Score Dropdowns
expected: Probability and Impact columns show dropdowns with "1 - Rare" through "5 - Almost Certain" format (or similar labels). Selecting a value updates the cell.
result: pass

### 7. Column Order - Controls Position
expected: Controls column appears between "Within Appetite" and "Net Score" columns in the table.
result: pass

### 8. Control Type Dropdown
expected: Open control panel. Control type dropdown shows 10 options (Preventative, Detective, etc.). Info (i) icon shows descriptions for each type.
result: pass

### 9. Cell Comments
expected: Gross Probability and Gross Impact cells have a comment icon. Click to open popover, add comment, save. Icon shows filled state when comment exists.
result: pass

### 10. Info Icons on Headers
expected: Gross Prob. and Gross Impact column headers have (i) icons. Hover shows score definitions. Click opens edit dialog to customize labels/descriptions.
result: pass

### 11. Notes Textarea Auto-Expand
expected: In control panel, the Notes textarea auto-expands as you type more text. Can also manually resize by dragging corner.
result: pass

### 12. Delete Custom Column
expected: Open Manage Columns dialog. Custom columns have delete button. Pre-installed columns cannot be deleted.
result: pass

### 13. Column Drag Reorder
expected: In Manage Columns dialog, drag custom columns to reorder them. Order persists in the table.
result: pass

### 14. Edit Formula Column
expected: Create a Formula column. Open Manage Columns. Click edit button on formula column. Dialog opens to modify formula.
result: pass

## Summary

total: 14
passed: 14
issues: 0
pending: 0
skipped: 0

## Gaps

[none yet]
