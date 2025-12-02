---
phase: 16-four-eye-approval
plan: 06
subsystem: approval-workflow
tags: [four-eye, approval, controls, taxonomy, gap-closure]

dependency-graph:
  requires: [16-02, 16-03, 16-05]
  provides:
    - RCT ControlPanel approval integration
    - Taxonomy description change tracking
    - Complete approval coverage for all edit operations
  affects: []

tech-stack:
  added: []
  patterns:
    - Approval-aware wrapper for embedded controls
    - Unified taxonomy update handler for name and description

key-files:
  created: []
  modified:
    - src/components/rct/ControlPanel.tsx
    - src/hooks/useApprovalAwareTaxonomy.ts
    - src/components/taxonomy/TaxonomyTree.tsx
    - src/stores/approvalStore.ts

decisions:
  - id: embedded-control-wrapper
    choice: Custom approval wrapper for embedded controls
    reason: "Embedded controls use rctStore.updateControl, not controlsStore, requiring a local wrapper that checks approval settings and routes to pending change creation"
  - id: unified-taxonomy-update
    choice: Single updateDescriptionWithApproval function
    reason: "Follows same pattern as renameTaxonomyItemWithApproval for consistency"
  - id: approval-store-update-handler
    choice: Enhanced applyPendingChange to handle both name and description
    reason: "Taxonomy updates can now include name OR description OR both fields"

metrics:
  duration: 6 min
  completed: 2026-01-23
---

# Phase 16 Plan 06: Gap Closure Summary

**One-liner:** Close approval workflow gaps in RCT ControlPanel and taxonomy description changes

## What Was Built

### Gap 1: RCT ControlPanel Approval Integration

**Problem:** All control field changes in RCT ControlPanel bypassed approval workflow (direct `updateControl` calls at 5 locations).

**Solution:**
- Added `handleEmbeddedControlUpdateWithApproval` wrapper function
- Routes embedded control updates through approval when four-eye enabled
- Checks `isApprovalRequired('control', controlId)` and role !== 'manager'
- Creates pending change instead of direct update when approval required
- Shows notification toast on submission

**UI Enhancements:**
- ApprovalBadge displayed on control cards with pending changes
- Amber border and background tint for pending controls
- Notification toast for approval submission feedback

**For Linked Controls:**
- Use existing `updateControlWithApproval` hook from useApprovalAwareUpdate
- Same approval flow for name, controlType, description, comment fields

### Gap 2: Taxonomy Description Change Tracking

**Problem:** Taxonomy description changes bypassed approval (only renames were tracked).

**Solution:**
- Added `updateDescriptionWithApproval` to useApprovalAwareTaxonomy hook
- Follows same pattern as `renameTaxonomyItemWithApproval`
- Creates pending change with description in proposedValues/currentValues
- Updated TaxonomyTree handleDescriptionChange to use approval-aware function

**Store Enhancement:**
- Updated `applyPendingChange` in approvalStore to handle description updates
- Now handles both `name` and `description` fields in taxonomy updates

## Files Modified

| File | Changes |
|------|---------|
| src/components/rct/ControlPanel.tsx | +99 lines - approval-aware updates, badges, toast |
| src/hooks/useApprovalAwareTaxonomy.ts | +43 lines - updateDescriptionWithApproval function |
| src/components/taxonomy/TaxonomyTree.tsx | +7/-6 lines - use approval-aware description handler |
| src/stores/approvalStore.ts | +8/-1 lines - enhanced taxonomy update handler |

## Verification Checklist

**Gap 1 (RCT ControlPanel bypasses approval):**
- [x] Edit control name in RCT panel -> creates pending change when four-eye enabled
- [x] Edit control type in RCT panel -> creates pending change
- [x] Edit control scores in RCT panel -> creates pending change
- [x] Edit control description in RCT panel -> creates pending change
- [x] Pending badge visible on controls with unapproved changes
- [x] Manager role can still edit directly (no pending change created)

**Gap 2 (Taxonomy description not tracked):**
- [x] Edit risk description -> creates pending change when four-eye enabled
- [x] Edit process description -> creates pending change when four-eye enabled
- [x] Pending change includes description in currentValues and proposedValues
- [x] Notification toast appears when description change submitted

## Commits

| Commit | Type | Description |
|--------|------|-------------|
| 1129ba6 | feat | Wire RCT ControlPanel to approval-aware updates |
| f6cc5ed | feat | Add taxonomy description change approval routing |

## Deviations from Plan

None - plan executed exactly as written.

## Next Phase Readiness

Phase 16 gap closure complete. All four-eye approval gaps have been addressed:
1. RCT ControlPanel now routes all control changes through approval
2. Taxonomy description changes now tracked with approval workflow

Ready for Phase 17 (Key Risk Classification) or verification testing.
