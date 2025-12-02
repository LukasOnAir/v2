---
phase: 16
plan: 08
subsystem: approval-workflow
tags: [batching, per-link-scores, approval, gap-closure]
completed: 2026-01-23
duration: 4 min

dependency-graph:
  requires: [16-01, 16-02, 16-03, 16-04, 16-05, 16-06, 16-07]
  provides: [batched-pending-changes, per-link-approval-routing]
  affects: []

tech-stack:
  added: []
  patterns:
    - Merge-on-duplicate pattern for pending changes
    - Link-prefixed field naming for per-link score identification

key-files:
  created: []
  modified:
    - src/stores/approvalStore.ts
    - src/components/rct/ControlPanel.tsx

decisions:
  - decision: "Merge pending changes by entityId + submittedBy + status='pending'"
    rationale: "Same entity edited multiple times by same user should batch into single approval"
  - decision: "Use link_netProbability/link_netImpact with _linkId for per-link overrides"
    rationale: "Distinguishes link-level from control-level changes while batching with same control"

metrics:
  tasks: 2/2
  commits: 2
---

# Phase 16 Plan 08: Gap Closure Round 2 Summary

Implemented pending change batching and per-link score approval routing to close two remaining approval workflow gaps.

## What Was Built

### 1. Pending Change Batching (approvalStore.ts)

Modified `createPendingChange` to detect and merge with existing pending changes:

```typescript
// Check for existing pending change to merge with
const existingIdx = get().pendingChanges.findIndex(
  (c) =>
    c.entityId === change.entityId &&
    c.submittedBy === change.submittedBy &&
    c.status === 'pending'
)

if (existingIdx !== -1) {
  // Merge proposed values (new values override old for same field)
  state.pendingChanges[existingIdx].proposedValues = {
    ...existing.proposedValues,
    ...change.proposedValues,
  }
  // Keep original current values for accurate diff
  state.pendingChanges[existingIdx].currentValues = {
    ...change.currentValues,
    ...existing.currentValues,
  }
}
```

**Key behaviors:**
- Same entityId + submittedBy + pending status = merge
- New proposedValues override old for same field
- Original currentValues preserved for accurate "before" state
- Version incremented on each merge
- Audit log tracks field additions

### 2. Per-Link Score Approval Routing (ControlPanel.tsx)

Added `handleLinkedControlScoreChange` callback for approval-aware per-link updates:

```typescript
const handleLinkedControlScoreChange = useCallback(
  (linkId, controlId, controlName, field, value) => {
    const requiresApproval = isApprovalRequired('control', controlId) && role !== 'manager'

    if (requiresApproval) {
      createPendingChange({
        entityType: 'control',
        entityId: controlId,
        entityName: `${controlName} (per-risk override)`,
        changeType: 'update',
        proposedValues: { [`link_${field}`]: value, _linkId: linkId },
        currentValues: { [`link_${field}`]: currentValue, _linkId: linkId },
        submittedBy: role,
      })
      return
    }
    // No approval - apply directly
    updateLink(linkId, { [field]: value })
  },
  [...]
)
```

Updated `applyPendingChange` to handle link score overrides:

```typescript
if (hasLinkScores) {
  // Apply per-link score overrides
  const linkUpdates = {}
  if (proposedValues.link_netProbability !== undefined) {
    linkUpdates.netProbability = proposedValues.link_netProbability
  }
  controlsStore.updateLink(linkId, linkUpdates)
}
```

## Gaps Closed

| Gap | Description | Resolution |
|-----|-------------|------------|
| Gap 5 | Per-link score changes bypass approval | Routed through `handleLinkedControlScoreChange` |
| Gap 6 | Multiple field changes create separate pending changes | Merge logic in `createPendingChange` |

## Decisions Made

1. **Merge by entityId + submittedBy:** Same user editing same entity should see single consolidated pending change, not multiple.

2. **Preserve original currentValues:** When merging, keep the first captured currentValues to show true "before" state from when changes started.

3. **Link-prefixed fields:** Use `link_netProbability` naming convention with `_linkId` to distinguish per-link from control-level changes while still batching under same controlId.

## Verification Checklist

- [x] Multiple changes to same entity by same submitter merge into single pending change
- [x] Merged pending change preserves original currentValues for accurate diff
- [x] Per-link score changes create pending changes when approval required
- [x] Per-link approved changes apply to link, not base control
- [x] Manager role bypasses approval for all score changes
- [x] TypeScript compiles without errors
- [x] No regressions in existing approval workflow

## Commits

| Hash | Description |
|------|-------------|
| 092df1a | feat(16-08): implement pending change batching in approvalStore |
| 3d20982 | feat(16-08): route per-link score changes through approval workflow |

## Files Modified

- `src/stores/approvalStore.ts` - Batching logic + per-link apply handling
- `src/components/rct/ControlPanel.tsx` - Approval-aware per-link score handler
