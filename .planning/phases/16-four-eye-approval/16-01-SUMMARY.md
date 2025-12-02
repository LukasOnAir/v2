---
phase: 16-four-eye-approval
plan: 01
subsystem: approval-infrastructure
tags: [zustand, permissions, roles, four-eye]
dependency-graph:
  requires: []
  provides: [approval-types, approval-store, manager-role, manager-permissions]
  affects: [16-02, 16-03, 16-04, 16-05]
tech-stack:
  added: []
  patterns: [role-hierarchy-inheritance, per-entity-overrides]
key-files:
  created:
    - src/types/approval.ts
    - src/stores/approvalStore.ts
  modified:
    - src/stores/uiStore.ts
    - src/hooks/usePermissions.ts
    - src/types/audit.ts
    - src/components/layout/Header.tsx
decisions:
  - decision: "Manager inherits all Risk Manager permissions via role hierarchy"
    context: "Avoids duplicating permission checks; Manager is a superset of Risk Manager"
  - decision: "globalEnabled defaults to false for opt-in activation"
    context: "Prevents accidental blocking of changes in existing deployments"
  - decision: "Per-entity overrides stored in entityOverrides map"
    context: "Allows fine-grained control over which entities require approval"
metrics:
  duration: 4 min
  completed: 2026-01-23
---

# Phase 16 Plan 01: Approval Infrastructure Summary

**One-liner:** Manager role with approval permissions and Zustand store for pending changes with per-entity override support.

## What Was Built

### Task 1: Approval Types and Store
- Created `src/types/approval.ts` with:
  - `PendingChangeEntityType`: 'control' | 'risk' | 'process'
  - `ApprovalStatus`: 'pending' | 'approved' | 'rejected'
  - `PendingChange` interface with full lifecycle tracking
  - `ApprovalSettings` interface with global toggle and entity type flags
- Created `src/stores/approvalStore.ts` with:
  - State: `pendingChanges[]` and `settings` (ApprovalSettings)
  - CRUD: `createPendingChange`, `approveChange`, `rejectChange`
  - Settings: `updateSettings`, `toggleEntityApproval`
  - Queries: `getPendingForEntity`, `getPendingCount`, `isApprovalRequired`
  - Cleanup: `clearApprovedRejected` (removes entries older than 30 days)
  - Audit logging integrated for all state changes

### Task 2: Manager Role Extension
- Extended `uiStore.ts`:
  - Added `AppRole` type: `'manager' | 'risk-manager' | 'control-owner'`
  - Role selector updated to use `AppRole` type
- Extended `usePermissions.ts`:
  - `isManager = role === 'manager'`
  - `isRiskManager = role === 'risk-manager' || isManager` (inheritance)
  - Manager-only permissions: `canApproveChanges`, `canRejectChanges`, `canToggleFourEye`, `canRegenerateRCT`
- Extended `audit.ts`:
  - Added `'pendingChange'` to `EntityType` union
- Updated `Header.tsx`:
  - Three role options in hierarchy order: Manager, Risk Manager, Control Owner

## Technical Decisions

| Decision | Rationale |
|----------|-----------|
| Role hierarchy inheritance | Manager inherits RM permissions to avoid duplication |
| Global toggle defaults false | Opt-in activation prevents blocking existing workflows |
| Per-entity overrides map | Fine-grained control for specific entities |
| 30-day cleanup for resolved | Balance history retention with storage efficiency |

## Commits

| Hash | Message |
|------|---------|
| e2fb870 | feat(16-01): create approval types and store |
| 329c7e3 | feat(16-01): extend role system with Manager |

## Deviations from Plan

None - plan executed exactly as written.

## Next Phase Readiness

- Ready for 16-02: UI for approval queue display
- Ready for 16-03: Control creation interceptor
- `useApprovalStore` provides all necessary state management
- `usePermissions` provides Manager-only permission checks
