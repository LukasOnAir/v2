---
phase: 16-four-eye-approval
plan: 07
subsystem: approval-ui-feedback
tags: [pending-values, rejection-feedback, inline-indicators, gap-closure]
dependency-graph:
  requires:
    - phase: 16-02
      provides: [ControlDetailPanel approval integration, pending changes display]
    - phase: 16-05
      provides: [applyPendingChange, approval workflow completion]
  provides:
    - Inline pending value indicators for Risk Manager
    - Rejection alert banner for prominent feedback
    - Inline rejection indicators with revise button
    - Red ring highlighting for rejected fields
    - My pending changes summary banner
  affects: [17-key-risk-classification]
tech-stack:
  added: []
  patterns: [inline-status-indicators, field-level-feedback, role-conditional-ui]
key-files:
  created: []
  modified:
    - src/components/controls/ControlDetailPanel.tsx
decisions:
  - decision: "PendingChangeIndicator shows current -> proposed format"
    context: "Clear visual diff without separate diff viewer"
  - decision: "RejectedFieldIndicator includes inline Revise button"
    context: "Quick action without scrolling to full rejected section"
  - decision: "Red ring-1 highlighting for rejected fields"
    context: "Subtle but clear visual indication without being too intrusive"
  - decision: "My pending changes filtered by current user role"
    context: "Each user sees only their own pending submissions"
metrics:
  duration: 3 min
  completed: 2026-01-23
---

# Phase 16 Plan 07: Pending Values and Rejection Visibility Summary

**One-liner:** Inline pending value indicators and prominent rejection feedback with alert banner, field highlighting, and quick revise actions.

## What Was Built

### Gap 3 Fix: Risk Manager Cannot See Proposed Values

- Added `PendingChangeIndicator` component showing "Pending approval: oldValue -> newValue"
- Added helper functions:
  - `getPendingValue(field)` - retrieves proposed value for a field
  - `hasPendingForField(field)` - checks if field has pending change
  - `myPendingChanges` - filters to current user's pending submissions
- Added summary banner: "You have N pending changes awaiting Manager approval"
- Added inline indicators below each form field (Name, Description, Type, Net P, Net I)
- Indicators only displayed for non-Manager roles (Manager sees DiffViewer section)

### Gap 4 Fix: Rejection Feedback Not Prominent

- Added alert banner at top of content area with AlertTriangle icon:
  - "N change(s) were rejected"
  - "Your recent changes were not approved. Review the feedback below..."
- Added `RejectedFieldIndicator` component with:
  - "Rejected: Your change to 'X' was not approved"
  - Inline "Revise" button for quick resubmission
  - Rejection reason displayed below
- Added `getRejectedForField(field)` helper function
- Added red ring highlighting (`ring-1 ring-red-500/50`) on rejected fields
- Rejection indicators displayed on each form field when applicable

## Technical Decisions

| Decision | Rationale |
|----------|-----------|
| Current -> proposed arrow format | Intuitive visual diff |
| Inline revise button | Quick action without scrolling |
| Ring-1 red highlighting | Subtle but clear field indication |
| Filter by current role | Users see only their submissions |
| Alert banner at top | Immediate visibility on panel open |

## Commits

| Hash | Message |
|------|---------|
| 8fb23f8 | feat(16-07): show pending proposed values to Risk Manager |

## Files Modified

- `src/components/controls/ControlDetailPanel.tsx` - Added PendingChangeIndicator, RejectedFieldIndicator, helper functions, alert banner, and inline indicators

## Deviations from Plan

None - plan executed exactly as written. Tasks 1 and 2 were implemented together due to shared infrastructure (helper functions, component patterns).

## Gaps Closed

This plan closes the following gaps identified in 16-05 verification:

| Gap | Issue | Resolution |
|-----|-------|------------|
| Gap 3 | Risk Manager cannot see proposed values after submission | Inline pending indicators showing "current -> proposed" |
| Gap 4 | Rejection feedback not prominent | Alert banner + inline rejection indicators + red field highlighting |

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

**Phase 16 Gap Closure Complete:**
- Gap 3 (pending values visibility) - CLOSED
- Gap 4 (rejection feedback prominence) - CLOSED

**Remaining Gaps (from 16-05):**
- Gap 1: Description changes not tracked for risks/processes (requires taxonomy hook extension)
- Gap 2: Some control score changes bypass approval (requires field coverage audit)

**Ready for Phase 17:** Key Risk Classification can proceed with improved four-eye UX.

---
*Phase: 16-four-eye-approval*
*Completed: 2026-01-23*
