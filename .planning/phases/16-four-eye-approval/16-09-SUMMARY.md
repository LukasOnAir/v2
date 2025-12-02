---
phase: 16
plan: 09
subsystem: four-eye-approval
tags: [approval-workflow, draft-state, ux, gap-closure]
dependency-graph:
  requires: [16-08]
  provides: [explicit-submission-workflow, filtered-diff-viewer]
  affects: []
tech-stack:
  added: []
  patterns: [draft-state-management, explicit-submission]
key-files:
  created: []
  modified:
    - src/components/controls/ControlDetailPanel.tsx
    - src/components/rct/ControlPanel.tsx
    - src/components/approval/DiffViewer.tsx
decisions:
  - "Draft changes tracked in local state until explicit submission"
  - "Send for Approval button only appears when drafts exist and approval required"
  - "Manager role bypasses approval workflow - applies directly"
  - "Internal metadata fields (_linkId, etc.) filtered from diff display"
  - "Per-control draft tracking in ControlPanel allows multiple controls with pending edits"
metrics:
  duration: 8 min
  completed: 2026-01-23
---

# Phase 16 Plan 09: Explicit Approval Workflow Summary

**One-liner:** Draft-based editing with explicit "Send for Approval" button replaces auto-submit on blur, plus internal metadata filtered from diff viewer.

## Objectives Achieved

1. **Explicit Submission Workflow (Gap 7)**
   - Field changes no longer auto-submit to approval when non-Manager blurs
   - Changes accumulate in draft state with visual indicators
   - "Send for Approval" button submits all drafts as single pending change
   - Manager role applies changes directly without approval workflow

2. **Filtered Diff Viewer (Gap 8)**
   - Internal metadata fields (prefixed with `_`) hidden from diff display
   - `_linkId` and other implementation details not shown to approvers
   - Clean, user-focused diff shows only meaningful field changes

## Technical Implementation

### ControlDetailPanel Changes
- Added draft state: `draftChanges` for accumulating field changes
- Added local state for type and scores to preserve draft values
- Handlers now add to draft instead of calling `updateControlWithApproval`
- "Send for Approval" button in header when drafts exist
- Visual indicators (amber ring) on fields with draft changes
- Drafts cleared on dialog close or control change

### ControlPanel Changes
- Added per-control draft tracking: `controlDrafts` map
- `addToDraft(controlId, field, value)` helper for accumulation
- `requiresApprovalFor(controlId)` helper for approval check
- `handleSubmitControlDrafts` creates single pending change per control
- Send button appears on each control card with pending drafts
- "Unsaved" badge indicates controls with draft changes
- Works for both embedded (rctStore) and linked (controlsStore) controls

### DiffViewer Changes
- Added filter: `fields.filter(field => !field.startsWith('_'))`
- Excludes `_linkId` and future internal metadata
- Comment explains convention for maintainability

## Commits

| Hash | Type | Description |
|------|------|-------------|
| 76d7e36 | feat | Add draft state and explicit submission to ControlDetailPanel |
| e7ed1c6 | feat | Add draft state and explicit submission to ControlPanel |
| 11902ec | fix | Filter internal metadata from DiffViewer |

## Deviations from Plan

None - plan executed exactly as written.

## Verification Results

- Build passes: `npm run build` completes successfully
- All three tasks completed with atomic commits
- Both gaps addressed (Gap 7 and Gap 8)

## Next Phase Readiness

Phase 16 (Four-Eye Approval) gap closure complete with:
- Gaps 1-8 all closed across plans 16-06 through 16-09
- Explicit submission workflow improves UX
- Clean diff viewer hides implementation details
- Ready for UAT or next phase (17 - Key Risk Classification)
