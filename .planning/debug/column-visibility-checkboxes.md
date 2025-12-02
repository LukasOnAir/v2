---
status: diagnosed
trigger: "Diagnose why column visibility checkboxes don't work. User reported: the box is there, i can open it. but i cant uncheck or uncheck all. nothing happens when i click them."
created: 2026-01-19T12:00:00Z
updated: 2026-01-19T12:05:00Z
---

## Current Focus

hypothesis: CONFIRMED - Type mismatch between TanStack Table's onColumnVisibilityChange callback signature and Zustand store's setColumnVisibility function
test: Code review of callback signatures
expecting: Function signature mismatch
next_action: Return diagnosis

## Symptoms

expected: Clicking checkboxes in column visibility menu should toggle column visibility
actual: Nothing happens when clicking checkboxes or "Show all"/"Hide all" buttons
errors: None visible (silent failure)
reproduction: Open column visibility menu, click any checkbox
started: Always broken (design issue)

## Eliminated

(none - root cause found on first hypothesis)

## Evidence

- timestamp: 2026-01-19T12:01:00Z
  checked: ColumnVisibilityMenu.tsx - checkbox onChange handler
  found: Uses `column.getToggleVisibilityHandler()` - this is correct TanStack Table API
  implication: Component code is correct

- timestamp: 2026-01-19T12:02:00Z
  checked: RCTTable.tsx - table configuration (lines 292-305)
  found: `onColumnVisibilityChange: setColumnVisibility` - passes Zustand setter directly
  implication: Need to check if Zustand setter signature matches TanStack Table's expected callback

- timestamp: 2026-01-19T12:03:00Z
  checked: rctStore.ts - setColumnVisibility implementation (line 113-115)
  found: `setColumnVisibility: (visibility) => set((state) => { state.columnVisibility = visibility })`
  implication: Zustand setter expects `Record<string, boolean>` directly

- timestamp: 2026-01-19T12:04:00Z
  checked: TanStack Table onColumnVisibilityChange signature
  found: TanStack Table's `onColumnVisibilityChange` can receive either `VisibilityState` OR `Updater<VisibilityState>` (a function that takes previous state and returns new state)
  implication: ROOT CAUSE FOUND - When TanStack Table calls the handler with an updater FUNCTION, Zustand tries to set that function as the visibility state instead of calling it

## Resolution

root_cause: |
  Type signature mismatch between TanStack Table and Zustand store.

  TanStack Table's `onColumnVisibilityChange` callback receives `Updater<VisibilityState>` which can be:
  - A direct value: `{ columnId: true }`
  - An updater function: `(prev) => ({ ...prev, columnId: !prev.columnId })`

  The Zustand store's `setColumnVisibility` expects only the direct value.

  When clicking a checkbox, TanStack Table passes an UPDATER FUNCTION, but the store
  assigns that function directly to `state.columnVisibility` instead of invoking it.

  This results in `columnVisibility` being set to a function object instead of a
  visibility record, causing silent failure with no visible column changes.

fix: (not applied - diagnosis only)
verification: (not verified - diagnosis only)
files_changed: []
