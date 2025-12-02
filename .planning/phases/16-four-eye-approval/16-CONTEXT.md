# Phase 16: Four-Eye Approval - Context

**Gathered:** 2026-01-23
**Status:** Ready for planning

<domain>
## Phase Boundary

Implement approval workflow where control changes require Manager sign-off before taking effect. New "Manager" role above Risk Manager. Manager can toggle four-eye requirement globally or per-control. Pending changes shown side-by-side, Manager approves/rejects from queue or inline.

**Extended scope (per discussion):**
- Four-eye applies to controls, risk taxonomy items, process taxonomy items
- Regenerate RCT button restricted to Manager role only

</domain>

<decisions>
## Implementation Decisions

### Approval Triggers
- Per-control toggle: Manager decides which controls need four-eye approval
- Global + per-control: Global toggle affects all, with per-control overrides possible
- When enabled on a control: ALL field changes require approval (not just scores)
- New control creation: Manager decides whether this requires approval (configurable)

### Pending State UX
- Side-by-side display: Current vs proposed values shown together
- Multiple pending versions: Risk Manager can continue editing, each creates new pending version (Manager sees history)
- Visual indicators: Both badge on control name + subtle row highlight (amber/yellow)
- Reports/exports: Show approved values but include indicator that changes are pending

### Manager Workflow
- Review location: Both dedicated approval page (queue) AND inline in ControlPanel
- Queue structure: Flat list (each pending change is own row) - accommodates controls, risks, processes
- Bulk actions: Manager can select multiple and bulk approve or bulk reject
- Notifications: Nav badge showing pending count + dashboard widget for details
- RCT regeneration: Button only available to Manager role

### Rejection Handling
- Reason: Optional (field available but not required)
- After rejection: Risk Manager can revise and resubmit the same pending change
- Notification: Both badge on control ('Rejected') + entry in notifications area
- History: Both audit trail (for compliance) + quick view on control (for context)

### Claude's Discretion
- Exact UI layout of side-by-side comparison
- How pending version history is displayed
- Dashboard widget design and placement
- Notification styling and dismissal behavior

</decisions>

<specifics>
## Specific Ideas

- Pending changes should be clearly distinguishable but not alarming (amber, not red)
- Manager should be able to quickly scan approval queue and process multiple items
- Risk Manager should understand why something was rejected and be able to act on it

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 16-four-eye-approval*
*Context gathered: 2026-01-23*
