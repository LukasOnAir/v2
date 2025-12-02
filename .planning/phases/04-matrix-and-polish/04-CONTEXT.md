# Phase 4: Matrix and Polish - Context

**Gathered:** 2026-01-19
**Status:** Ready for planning

<domain>
## Phase Boundary

Visualize risk posture in aggregated Risk-Process Matrix and prepare demo for Holland Casino. Includes export to Excel and role-based access (Risk Manager vs Control Owner views).

</domain>

<decisions>
## Implementation Decisions

### Matrix Layout
- Scrollable grid with fixed viewport, scroll in both directions
- Cell size: Medium (60×60px) — shows score number inside cell
- Both headers sticky — process names stick left, risk names stick top while scrolling
- Leaf nodes displayed with expandable hierarchy — user can expand to see L2/L1 names when L3 is lowest leaf

### Aggregation Display
- Adaptive display: number + color when zoomed in, heatmap color only when zoomed out
- Weighted average calculation from child RCT rows
- Weights defined per hierarchy level in the matrix (not per RCT row)
- Weight editing UI is hidden by default — user can opt to configure weights per level

### Navigation & Drill-down
- Click cell to expand in place — shows mini-table of related RCT rows
- Expanded view shows key columns by default: Risk, Process, Gross, Net score
- Columns in expanded view are configurable by user
- Close expanded view: click cell again OR click outside (both work)
- Expanded view is editable — scores can be changed directly
- "Jump to RCT" option available to navigate to full RCT with filters applied

### Export
- Export includes RCT + Matrix + Taxonomies (complete data, separate sheets)
- User prompted before export: "Export filtered view or all data?"

### Roles
- Role switcher as dropdown in app header — persistent across views
- Risk Manager: Full access to view and edit all data
- Control Owner: Can register/process controls in specified manner, cannot edit control definitions
- Control Owner can request changes via comment thread (explains why control needs review)

### Claude's Discretion
- Weight editing UI placement (settings panel vs inline on headers)
- Exact zoom threshold for switching between number+color vs color-only display
- Comment thread implementation details
- Transition animations for expand/collapse

</decisions>

<specifics>
## Specific Ideas

- Hierarchy expansion should make it clear which L1/L2 a leaf belongs to (breadcrumb-style or nested visual)
- Change request workflow: Control Owner flags issue + adds comment → Risk Manager sees flagged items and can respond
- Export should feel like a standard Excel export — familiar to enterprise users

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 04-matrix-and-polish*
*Context gathered: 2026-01-19*
