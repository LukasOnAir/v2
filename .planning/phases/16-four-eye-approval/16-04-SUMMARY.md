---
phase: 16-four-eye-approval
plan: 04
subsystem: approval-queue-page
tags: [tanstack-table, approval, queue, radix-dialog, routing]
dependency-graph:
  requires:
    - phase: 16-02
      provides: [ApprovalBadge, DiffViewer, approval-store]
    - phase: 16-03
      provides: [approval-aware-taxonomy-hook]
  provides:
    - ApprovalQueue component with table, filtering, bulk actions
    - ApprovalSettings configuration panel
    - ApprovalPage for Manager approval workflow
    - /approval route and sidebar navigation
  affects: [16-05]
tech-stack:
  added: []
  patterns: [bulk-selection-actions, summary-cards-dashboard, settings-collapsible-panel]
key-files:
  created:
    - src/components/approval/ApprovalQueue.tsx
    - src/components/approval/ApprovalQueueRow.tsx
    - src/components/approval/ApprovalSettings.tsx
    - src/pages/ApprovalPage.tsx
  modified:
    - src/components/approval/index.ts
    - src/App.tsx
    - src/components/layout/Sidebar.tsx
decisions:
  - decision: "TanStack Table for queue display with row selection"
    context: "Consistent with RCT pattern, enables sorting, filtering, bulk selection"
  - decision: "Radix Dialog for view details and reject confirmation"
    context: "Consistent with existing modal patterns in codebase"
  - decision: "Summary cards grid at top of page"
    context: "Follows RemediationPage pattern for quick stats overview"
  - decision: "Settings in collapsible panel rather than separate page"
    context: "Settings are rarely changed, keeps focus on approval queue"
metrics:
  duration: 4 min
  completed: 2026-01-23
---

# Phase 16 Plan 04: Approval Queue UI Summary

**One-liner:** Centralized approval queue page with TanStack Table, bulk approve/reject actions, and configurable four-eye settings.

## What Was Built

### Task 1: Create ApprovalQueue components
- Created `src/components/approval/ApprovalQueue.tsx`:
  - TanStack Table with columns: Select, Type, Name, Change, Submitted By, Submitted At, Status, Actions
  - Filter by entity type (all, control, risk, process)
  - Filter by status (pending, approved, rejected, all) - defaults to pending
  - Row selection for bulk actions (only pending items selectable)
  - Bulk action bar: "Approve Selected (N)", "Reject Selected (N)"
  - View Details dialog with DiffViewer
  - Reject dialog with optional reason textarea

- Created `src/components/approval/ApprovalQueueRow.tsx`:
  - Expandable row alternative to dialog pattern
  - Shows DiffViewer inline when expanded
  - Inline reject input with reason field

- Created `src/components/approval/ApprovalSettings.tsx`:
  - Master toggle for four-eye approval
  - Per-entity toggles (controls, risks, processes)
  - Only visible to Manager role
  - Toggle switches with proper accessibility

- Updated `src/components/approval/index.ts` with new exports

### Task 2: Create ApprovalPage and integrate routing
- Created `src/pages/ApprovalPage.tsx`:
  - Header with pending count and Settings button
  - Summary cards: Total Pending, Controls, Risks, Processes
  - Oldest pending age indicator
  - ApprovalQueue component for queue display
  - Empty state with checkmark icon when no pending approvals
  - Access restricted message for non-Manager roles

- Updated `src/App.tsx`:
  - Added ApprovalPage import
  - Added route: `/approval` after audit, before analytics

- Updated `src/components/layout/Sidebar.tsx`:
  - Added CheckCircle2 icon import
  - Added "Approvals" nav item after Audit Trail

## Technical Decisions

| Decision | Rationale |
|----------|-----------|
| TanStack Table for queue | Consistent with RCT, enables sorting/filtering/selection |
| Radix Dialog for modals | Consistent with existing modal patterns |
| Summary cards grid | Follows RemediationPage pattern |
| Collapsible settings panel | Settings rarely changed, keeps queue focus |
| CheckCircle2 icon for nav | Indicates approval/checkmark concept |

## Commits

| Hash | Message |
|------|---------|
| 7f07e7e | feat(16-04): create ApprovalQueue components |
| badb84b | feat(16-04): add ApprovalPage and integrate routing |

## Files Created/Modified

**Created:**
- `src/components/approval/ApprovalQueue.tsx` - Table with filtering, bulk actions, dialogs
- `src/components/approval/ApprovalQueueRow.tsx` - Expandable row alternative
- `src/components/approval/ApprovalSettings.tsx` - Four-eye configuration panel
- `src/pages/ApprovalPage.tsx` - Approval queue page with summary stats

**Modified:**
- `src/components/approval/index.ts` - Added new exports
- `src/App.tsx` - Added /approval route
- `src/components/layout/Sidebar.tsx` - Added Approvals nav item

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Ready for 16-05: Apply approved changes to actual entities
- ApprovalQueue provides centralized management interface
- ApprovalSettings allows Manager to configure approval requirements
- Sidebar navigation enables easy access to approval workflow

---
*Phase: 16-four-eye-approval*
*Completed: 2026-01-23*
