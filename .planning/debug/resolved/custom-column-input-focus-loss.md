---
status: resolved
trigger: "Diagnose why custom column text/number input exits after typing 1 character"
created: 2026-01-19T12:00:00Z
updated: 2026-01-27T10:00:00Z
symptoms_prefilled: true
goal: find_and_fix
---

## Current Focus

hypothesis: CONFIRMED - customColumnDefs useMemo depends on handleCustomValueChange which changes on every rows update
test: Traced dependency chain in RCTTable.tsx
expecting: Find state update that causes component tree to remount
next_action: Document root cause

## Symptoms

expected: User can type multiple characters continuously in custom column text/number inputs
actual: After typing 1 character, focus exits the input box, requiring click to continue
errors: None reported
reproduction: Enter any character in custom column text/number input field
started: Unknown

## Eliminated

## Evidence

- timestamp: 2026-01-19T12:05:00Z
  checked: RCTTable.tsx lines 87-98 - handleCustomValueChange callback
  found: Callback has `rows` in its dependency array (line 98)
  implication: Callback identity changes whenever rows change

- timestamp: 2026-01-19T12:06:00Z
  checked: RCTTable.tsx lines 101-182 - customColumnDefs useMemo
  found: Depends on handleCustomValueChange (line 182)
  implication: When callback changes, customColumnDefs recreates all column definitions

- timestamp: 2026-01-19T12:07:00Z
  checked: RCTTable.tsx lines 185-289 - columns useMemo
  found: Spreads customColumnDefs at end (line 288)
  implication: New column defs = new cell renderer functions = React unmounts old inputs

- timestamp: 2026-01-19T12:08:00Z
  checked: Flow analysis
  found: User types -> onChange -> handleCustomValueChange -> updateRow -> rows changes -> handleCustomValueChange identity changes -> customColumnDefs recreated -> columns recreated -> cell functions recreated -> input component unmounts/remounts -> focus lost
  implication: This is the exact cause of 1-character focus loss

## Resolution

root_cause: |
  The `handleCustomValueChange` callback on line 87-98 includes `rows` in its dependency array.
  When a user types, onChange calls this callback, which calls `updateRow`, which updates `rows` in the store.
  This causes `handleCustomValueChange` to get a new identity (new function reference).

  The `customColumnDefs` useMemo on line 101-182 depends on `handleCustomValueChange`.
  When the callback identity changes, all custom column definitions are recreated.
  This includes new cell renderer functions (the arrow functions on lines 120-127, 131-138).

  React sees these as new components, so it unmounts the old input and mounts a new one.
  The new input does not have focus, so the user must click again.

  Chain: type -> updateRow(rows) -> rows changes -> handleCustomValueChange changes ->
         customColumnDefs recreated -> cell functions recreated -> input unmounts -> focus lost

fix: |
  Added a `rowsRef` ref to RCTTable component that stays in sync with the `rows` state.
  Changed `handleCustomValueChange` to read from `rowsRef.current` instead of the `rows` closure.
  Removed `rows` from the dependency array of `handleCustomValueChange`.

  This gives `handleCustomValueChange` a stable identity - it no longer recreates when rows change.
  The callback chain is now broken:
  - type -> updateRow -> rows changes -> handleCustomValueChange stays SAME ->
    customColumnDefs stays SAME -> cell functions stay SAME -> input does NOT remount -> focus preserved

verification: TypeScript compilation passes (npx tsc --noEmit --skipLibCheck)
files_changed:
  - src/components/rct/RCTTable.tsx
