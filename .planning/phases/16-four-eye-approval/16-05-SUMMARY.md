---
phase: 16-four-eye-approval
plan: 05
subsystem: approval-workflow-completion
tags: [notification-badge, role-permissions, apply-changes, header-bell]
dependency-graph:
  requires:
    - phase: 16-04
      provides: [ApprovalQueue, ApprovalSettings, ApprovalPage]
    - phase: 16-03
      provides: [approval-aware-taxonomy-hook]
    - phase: 16-02
      provides: [approval-aware-control-hook]
  provides:
    - Notification badge for pending approvals in Sidebar
    - Header bell icon with count for Manager quick access
    - applyPendingChange function to commit approved changes
    - RCT Regenerate button restricted to Manager role
  affects: [17-key-risk-classification, future-approval-enhancements]
tech-stack:
  added: []
  patterns: [header-notification-badge, role-restricted-actions]
key-files:
  created: []
  modified:
    - src/components/layout/Header.tsx
    - src/components/layout/Sidebar.tsx
    - src/components/rct/RCTToolbar.tsx
    - src/stores/approvalStore.ts
decisions:
  - decision: "Amber badge color for pending count"
    context: "Matches ApprovalBadge pending color for visual consistency"
  - decision: "Bell icon in header as Manager-only"
    context: "Non-managers don't need quick access to approvals they can't process"
  - decision: "9+ max display in header badge"
    context: "Space-constrained header uses smaller threshold than sidebar 99+"
metrics:
  duration: 5 min
  completed: 2026-01-23
---

# Phase 16 Plan 05: Apply Approved Changes Summary

**One-liner:** Notification badges in Sidebar and Header for Manager visibility, applyPendingChange to commit approvals, and RCT Regenerate restricted to Manager role.

## What Was Built

### Task 1: Add notification badge and apply pending changes
- Updated `src/stores/approvalStore.ts`:
  - Added `applyPendingChange` function that routes approved changes to real stores
  - Handles control create/update/delete via controlsStore
  - Handles risk/process rename/delete/create via taxonomyStore
  - Called automatically after `approveChange` sets status

- Updated `src/components/layout/Sidebar.tsx`:
  - Added pending count badge on Approvals nav item
  - Badge only visible to Manager role
  - Shows count with "99+" cap for large numbers

- Updated `src/components/layout/Header.tsx`:
  - Added Bell icon with badge for Manager role
  - Click navigates to /approval page
  - Badge shows count with "9+" cap

### Task 2: Restrict RCT Regenerate to Manager
- Updated `src/components/rct/RCTToolbar.tsx`:
  - Wrapped Regenerate button in `canRegenerateRCT` permission check
  - Button completely hidden for Risk Manager and Control Owner
  - Only visible and functional for Manager role

### Task 3: Human Verification (Checkpoint)
- Verification performed by user
- Multiple gaps identified (documented below)

## Technical Decisions

| Decision | Rationale |
|----------|-----------|
| Amber badge color | Consistent with ApprovalBadge pending styling |
| Manager-only bell icon | Non-managers cannot process approvals |
| Small header badge threshold (9+) | Space constraints in header |
| applyPendingChange called from approveChange | Ensures approved changes always applied |

## Commits

| Hash | Message |
|------|---------|
| b8df8e1 | feat(16-05): add notification badge and apply pending changes |
| 81723bb | feat(16-05): restrict RCT Regenerate to Manager role |

## Files Modified

- `src/stores/approvalStore.ts` - Added applyPendingChange function
- `src/components/layout/Sidebar.tsx` - Pending count badge on Approvals nav
- `src/components/layout/Header.tsx` - Bell icon with badge for Manager
- `src/components/rct/RCTToolbar.tsx` - Regenerate button restricted to Manager

## Deviations from Plan

None - Tasks 1 and 2 executed exactly as written.

## Issues Encountered During Verification

Human verification (Task 3) revealed gaps in the current implementation that require follow-up work:

### Gap 1: Description changes not tracked for risks/processes
- **Issue:** Approval workflow only captures taxonomy rename operations, not description changes
- **Impact:** Risk Manager can edit risk/process descriptions without Manager approval
- **Scope:** Requires extending approval-aware taxonomy hook to track description field
- **Status:** Deferred to future enhancement

### Gap 2: Rejection reason not visible during control editing
- **Issue:** When Risk Manager edits a control with a rejected pending change, the rejection reason is not clearly visible in the edit UI
- **Impact:** User doesn't know why their previous change was rejected
- **Scope:** Requires adding rejection reason display in ControlDetailPanel
- **Status:** Deferred to future enhancement

### Gap 3: Pending state doesn't show proposed values
- **Issue:** After submitting a control change for approval, the committed values disappear and only the original values are shown
- **Impact:** User cannot see what they proposed, loses context
- **Scope:** Requires showing pending/proposed values in the UI while awaiting approval
- **Status:** Deferred to future enhancement

### Gap 4: Control score changes not captured
- **Issue:** Some control field changes bypass the approval workflow entirely
- **Impact:** Score changes may not trigger four-eye approval when they should
- **Scope:** Requires auditing which fields are tracked in approval-aware hook
- **Status:** Deferred to future enhancement

## Out of Scope Items Noted

- **RCT P/I comments in Control Hub:** User requested this feature during verification. This is out of scope for Phase 16 (Four-Eye Approval) and should be added as a separate enhancement phase.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

**Phase 16 Core Complete:**
- Role system with Manager/Risk Manager/Control Owner permissions
- Four-eye approval settings (global and per-entity)
- Pending change creation for controls and taxonomies
- Approval queue page with bulk actions
- Notification badges for Manager visibility
- RCT regenerate restricted to Manager

**Follow-up Work Required:**
The gaps identified during verification represent UX improvements that should be addressed in a future enhancement phase. The core four-eye approval workflow is functional but has rough edges:

1. Extend field tracking for taxonomy descriptions
2. Surface rejection reasons prominently during editing
3. Show pending/proposed values in edit UI
4. Audit and complete field coverage for control changes

**Ready for Phase 17:** Key Risk Classification can proceed - the approval workflow foundation is in place even with the identified gaps.

---
*Phase: 16-four-eye-approval*
*Completed: 2026-01-23*
