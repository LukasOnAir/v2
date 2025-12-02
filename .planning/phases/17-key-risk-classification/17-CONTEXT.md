# Phase 17: Key Risk Classification - Context

**Gathered:** 2026-01-24
**Status:** Ready for planning

<domain>
## Phase Boundary

User can classify risks and controls as "key" or "non-key" for prioritization. Key items have visual indicators, can be filtered across views, and can be grouped in reports.

</domain>

<decisions>
## Implementation Decisions

### Marking mechanism
- Risks marked as key in the Taxonomy tree (not RCT)
- Controls marked as key in both Control panel (RCT) AND Controls Hub
- Interaction: Badge click (star icon) — not checkbox or dropdown
- Permission: Manager only can mark items as key

### Visual indication
- Icon: Filled star for key items
- Color: Gold/amber (matches accent theme)
- Placement: Claude's discretion (before or after name)
- Non-key items: No indicator shown (only key items display star)

### Inheritance rules
- Fully independent — no inheritance between risks and controls
- Controls can be key even if linked risks are not key
- Any taxonomy level (L1-L5) can be marked key independently
- Parent-child: No inheritance — each node marked independently

### Filter behavior
- RCT: Key status as a filterable column
- Matrix: Toolbar toggle to show only key risks/processes
- Controls Hub: Key as filterable column in table
- Sunburst: Toggle to show only key risks

### Claude's Discretion
- Star icon placement (before or after name)
- Exact star styling (filled vs solid, size)
- Column position for key status in RCT/Controls Hub

</decisions>

<specifics>
## Specific Ideas

- Star icon follows existing badge patterns in the app
- Gold/amber matches Holland Casino branding accents
- Key filtering should feel consistent with existing Excel-like filters

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 17-key-risk-classification*
*Context gathered: 2026-01-24*
