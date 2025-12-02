# Phase 15: Control Tickets - Context

**Gathered:** 2026-01-23
**Status:** Ready for planning

<domain>
## Phase Boundary

Create and manage tickets for control-related tasks (maintenance, updates, reviews) with owner, deadline, status, priority tracking and dashboard overview. Tickets are task management for controls — distinct from remediation (which tracks test findings).

</domain>

<decisions>
## Implementation Decisions

### Ticket types
- 4 default categories: Maintenance, Periodic Review, Update/Change, Other
- All types share same fields: owner, deadline, status, priority, description
- Users can add custom categories beyond the 4 defaults
- Categories are extendable, not user-deletable for defaults

### Ticket workflow
- Kanban-style status progression: To Do → In Progress → Review → Done
- Priority levels match remediation: Critical, High, Medium, Low
- Optional recurrence: tickets can repeat (monthly, quarterly, annually, custom)
- Reassignment: owner can be changed freely at any time

### Control integration
- Tickets accessible from: ControlPanel, Controls Hub, and dedicated Tickets page
- Tickets can span multiple controls (many-to-many relationship)
- Control indicators: badge count ("3 tickets") plus status color (green/amber/red)
- Auto-archive: Done tickets move to archive automatically (archive period at Claude's discretion)

### Dashboard layout
- Kanban board as primary view with columns per status
- Full stats header: counts by status, priority, category, plus overdue highlight
- Drag & drop: tickets draggable between columns to change status
- Overdue visual: red border on card when past deadline

### Claude's Discretion
- Archive timing (e.g., after 7 days, 14 days, 30 days)
- Recurrence implementation details
- Exact card layout in Kanban columns
- Filter/sort controls on dashboard
- @dnd-kit implementation approach (already used in project)

</decisions>

<specifics>
## Specific Ideas

- Kanban board similar to Trello/Jira style — cards with status columns
- Recurrence useful for periodic review tasks ("Review control X every quarter")
- Multi-control tickets for tasks like "Update all authentication controls"

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 15-control-tickets*
*Context gathered: 2026-01-23*
