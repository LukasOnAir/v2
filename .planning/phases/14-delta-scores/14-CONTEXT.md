# Phase 14: Delta Scores - Context

**Gathered:** 2026-01-22
**Status:** Ready for planning

<domain>
## Phase Boundary

Add multiple view modes to the Sunburst chart: Net Score (current), Gross Score, Gross-Net Delta (control effectiveness), and vs Appetite Delta (distance from acceptable risk). Users can toggle between these views to analyze risk from different perspectives.

**Note:** Original roadmap specified RCT columns - scope changed to Sunburst views per user direction.

</domain>

<decisions>
## Implementation Decisions

### View modes
- Four toggle options: Net Score, Gross Score, Delta (Gross-Net), Delta (vs Appetite)
- Net Score view already exists (current behavior)
- Gross Score view shows aggregated gross scores instead of net
- Gross-Net Delta shows control effectiveness (how much risk was reduced)
- vs Appetite Delta shows distance from risk appetite threshold

### Toggle UI
- Claude's discretion on UI pattern (button group vs dropdown) based on existing toolbar design

### Color scale for deltas
- Use heatmap colors (same as current)
- Dynamic scale: "reddest" value = maximum observed delta (not fixed at 25)
- Legend shows the actual max delta value instead of 25

### Missing data handling
- Gray/neutral segment when delta can't be calculated (no gross score, no appetite, etc.)
- "No data" explanation shown in tooltip only when hovering gray segments
- Same gray treatment for all missing data scenarios
- No coverage percentage stat - keep UI simple

### Claude's Discretion
- Toggle UI implementation (button group vs dropdown)
- Exact placement in toolbar
- Tooltip content formatting
- How to handle aggregation at parent levels when children have mixed data availability

</decisions>

<specifics>
## Specific Ideas

- Legend should show actual max observed delta value, not a fixed scale
- Gray segments should be clearly distinguishable but not distracting
- Tooltip explains why a segment is gray (which data is missing)

</specifics>

<deferred>
## Deferred Ideas

- RCT delta columns (original roadmap scope) - could be a future phase if still wanted

</deferred>

---

*Phase: 14-delta-scores*
*Context gathered: 2026-01-22*
