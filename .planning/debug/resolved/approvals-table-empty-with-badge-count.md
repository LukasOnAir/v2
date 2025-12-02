---
status: resolved
trigger: "In production, director sees 3 pending approvals (bell icon badge + sidebar button both show 3). Approvals tab header also says '3 pending'. But the table itself shows no rows to approve."
created: 2026-01-28T10:00:00Z
updated: 2026-01-28T10:00:00Z
---

## Current Focus

hypothesis: CONFIRMED - Badge count and table data come from different sources in authenticated mode
test: Traced data sources for all components showing approval counts
expecting: Discrepancy in data source based on isDemoMode
next_action: Fix all components to use consistent data source based on isDemoMode

## Symptoms

expected: The 3 pending approvals indicated by the badge should be visible as rows in the approvals table
actual: Badge shows 3, sidebar shows 3, tab header says "3 pending", but table is empty - no approval items displayed
errors: No errors visible in console or network tab
reproduction: Login as Director user in production, click on approvals tab
started: Recently - was working before, stopped at some point

## Eliminated

## Evidence

- timestamp: 2026-01-28T10:05:00Z
  checked: Data source architecture for approval components
  found: |
    - Sidebar badge (line 36): Uses `useApprovalStore.getPendingCount()` - ALWAYS from Zustand localStorage store
    - ApprovalPage header (line 14): Uses `useApprovalStore.pendingChanges` - ALWAYS from Zustand store
    - ApprovalQueue table (line 67): Uses `isDemoMode ? storePendingChanges : dbPendingChanges` - switches source based on isDemoMode
    - isDemoMode is determined by `!authRole` in usePermissions (line 26)
  implication: When user is authenticated (production), isDemoMode=false, so ApprovalQueue fetches from DATABASE while badge/header count from STORE

- timestamp: 2026-01-28T10:10:00Z
  checked: Header.tsx bell icon badge source
  found: Header line 17 uses `useApprovalStore.getPendingCount()` - ALWAYS from localStorage store, no isDemoMode check
  implication: Confirms same pattern - badges always from store, never from database in authenticated mode

## Resolution

root_cause: |
  Data source mismatch between badge counts and table display in authenticated mode:
  - Header.tsx, Sidebar.tsx, ApprovalPage.tsx: ALL use useApprovalStore (Zustand/localStorage) for pending counts
  - ApprovalQueue.tsx: Uses isDemoMode to switch between store (demo) and database (authenticated)

  When Director is logged in (isDemoMode=false):
  - Badges show count from localStorage (3 items from demo data)
  - Table fetches from database (empty or different data)

  The fix must make all components use the same dual-source pattern as ApprovalQueue.
fix: |
  Applied consistent dual-source pattern (store for demo, database for authenticated) to all components:

  1. Header.tsx:
     - Added import for usePendingCount
     - Now uses isDemoMode to choose between storePendingCount and dbPendingCount

  2. Sidebar.tsx:
     - Added import for usePendingCount
     - Now uses isDemoMode to choose between storePendingCount and dbPendingCount

  3. ApprovalPage.tsx:
     - Added import for usePendingChanges
     - Now uses isDemoMode to choose between storePendingChanges and dbPendingChanges

  All components now follow the same dual-source pattern as ApprovalQueue.tsx
verification: |
  - TypeScript compilation: PASSED (no errors)
  - Production build: PASSED (builds successfully)
  - Logic verification: All three components now use the same dual-source pattern:
    * isDemoMode = true (no auth): Uses Zustand store (localStorage)
    * isDemoMode = false (authenticated): Uses database via React Query hooks

  When Director logs in:
  - isDemoMode = false (authRole is set)
  - Header badge reads from database via usePendingCount
  - Sidebar badge reads from database via usePendingCount
  - ApprovalPage stats read from database via usePendingChanges
  - ApprovalQueue table reads from database via usePendingChanges

  All components now show consistent data from the same source.
files_changed:
  - src/components/layout/Header.tsx
  - src/components/layout/Sidebar.tsx
  - src/pages/ApprovalPage.tsx
