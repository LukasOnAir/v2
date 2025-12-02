---
status: resolved
trigger: "add-column-not-persisting - Adding a column via Add Column dialog - dialog closes as if successful but column doesn't appear in the table"
created: 2026-01-27T10:00:00Z
updated: 2026-01-27T10:00:00Z
---

## Current Focus

hypothesis: AddColumnDialog uses rctStore.addCustomColumn (local state) instead of useAddCustomColumn hook (database mutation)
test: Check if AddColumnDialog imports/uses useAddCustomColumn hook
expecting: AddColumnDialog does NOT use database hook, only uses local store
next_action: Verify AddColumnDialog does not call useAddCustomColumn, then fix to use database mutation

## Symptoms

expected: When user fills in column description in Add Column dialog and clicks Add, the new column should appear in the RCT table
actual: Dialog closes as if successful, but the new column doesn't appear in the table
errors: None visible - appears to succeed but doesn't persist
reproduction: Open RCT, click Add Column, fill in description, click Add
started: Regression - used to work, now broken

## Eliminated

## Evidence

- timestamp: 2026-01-27T10:05:00Z
  checked: AddColumnDialog.tsx line 80
  found: handleSubmit calls `addCustomColumn(column)` from useRCTStore
  implication: Uses local zustand store, NOT database mutation

- timestamp: 2026-01-27T10:05:00Z
  checked: AddColumnDialog.tsx imports
  found: imports `useRCTStore` from stores/rctStore, NO import of useAddCustomColumn hook
  implication: Dialog is completely disconnected from database persistence

- timestamp: 2026-01-27T10:06:00Z
  checked: useCustomColumns.ts
  found: Has `useAddCustomColumn` hook that performs Supabase insert to custom_columns table
  implication: Database mutation hook exists but is NOT being used

- timestamp: 2026-01-27T10:06:00Z
  checked: rctStore.ts partialize function (lines 741-762)
  found: When NOT in demo mode (authenticated), customColumns is NOT persisted to localStorage
  implication: In authenticated mode, local store changes are ephemeral - only UI preferences persist

- timestamp: 2026-01-27T10:08:00Z
  checked: RCTTable.tsx lines 278, 287
  found: RCTTable uses `useCustomColumns()` database hook to load columns in authenticated mode
  implication: Columns are READ from database, but AddColumnDialog writes to local store - complete disconnect

## Resolution

root_cause: AddColumnDialog uses `useRCTStore.addCustomColumn()` which only writes to local Zustand store. In authenticated mode, RCTTable reads custom columns from the database via `useCustomColumns()` hook. The local store write is ephemeral in authenticated mode (not persisted). The database hook `useAddCustomColumn()` exists but is not used by the dialog.
fix: Modified AddColumnDialog, ColumnManager, and EditFormulaDialog to use database hooks (useAddCustomColumn, useDeleteCustomColumn, useUpdateCustomColumn, useReorderCustomColumns) in authenticated mode while keeping local store updates for demo mode.
verification: TypeScript compilation passes. All three components now properly detect demo vs authenticated mode and route operations accordingly.
files_changed:
  - src/components/rct/AddColumnDialog.tsx
  - src/components/rct/ColumnManager.tsx
  - src/components/rct/EditFormulaDialog.tsx
