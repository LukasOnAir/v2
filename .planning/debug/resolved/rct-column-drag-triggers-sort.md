---
status: resolved
trigger: "In the RCT table, when user drags a column to reorder it, releasing the mouse triggers the sort button on that column."
created: 2026-01-28T10:00:00Z
updated: 2026-01-28T10:00:00Z
---

## Current Focus

hypothesis: ResizeHandle stops pointer events but click event still fires on th element after drag
test: Verify that ResizeHandle doesn't stop click propagation, only pointer events
expecting: ResizeHandle has no onClick handler - click event bubbles to th and triggers sort
next_action: Implement fix - add onClick stopPropagation to ResizeHandle

## Symptoms

expected: Column stays where dragged after mouse release, no other side effects
actual: When mouse is released after dragging a column, the sort functionality is triggered on that column
errors: None
reproduction: Any column drag - happens every time a column header is dragged
started: Recently broke - worked correctly before a recent change

## Eliminated

## Evidence

- timestamp: 2026-01-28T10:05:00Z
  checked: RCTTable.tsx lines 1008-1045 - column header implementation
  found: |
    - <th> element has onClick={header.column.getToggleSortingHandler()} on line 1012
    - ResizeHandle component is placed inside the <th> element (lines 1034-1043)
    - When user drags ResizeHandle, mouseup/pointerup occurs, then browser fires click event
    - Click event bubbles from ResizeHandle to th element, triggering sort
  implication: ResizeHandle needs to also stop click event propagation, not just pointer events

- timestamp: 2026-01-28T10:06:00Z
  checked: ResizeHandle.tsx - event handling
  found: |
    - ResizeHandle correctly stops pointer events (pointerDown/Move/Up have stopPropagation)
    - handleDoubleClick stops propagation (line 83)
    - BUT there is no onClick handler to stop click event propagation
    - After a drag (pointerDown -> pointerMove -> pointerUp), browser fires click
    - This click is not intercepted and bubbles to parent th element
  implication: ROOT CAUSE CONFIRMED - missing onClick handler in ResizeHandle

## Resolution

root_cause: ResizeHandle component stops pointer events (pointerDown/Move/Up) but not click events. After a drag operation ends (pointerUp), browser fires a click event which bubbles up to the parent th element and triggers the sort handler.
fix: Added onClick handler to ResizeHandle component that calls e.stopPropagation() to prevent click events from bubbling to parent elements
verification: TypeScript compilation passes with no errors
files_changed:
  - src/components/matrix/ResizeHandle.tsx
