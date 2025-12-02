# Phase 6: Risk Sunburst Visualization - Context

**Gathered:** 2026-01-21
**Status:** Ready for planning

<domain>
## Phase Boundary

Interactive sunburst chart showing hierarchical net risk posture with weighted aggregation. Center displays overall enterprise risk score, rings expand outward through L1→L5 hierarchy levels. Scores aggregate from RCT rows up through taxonomy. Users can toggle levels, switch between Risk/Process views, and export for presentations.

</domain>

<decisions>
## Implementation Decisions

### Chart Hierarchy & Core
- Center (core) shows overall risk score — single weighted average of all L1 risks ("enterprise risk posture")
- Toggle between Risk taxonomy and Process taxonomy views
- Aggregation mode toggle: Weighted Average (uses Phase 7 weights) OR Maximum (worst-case)
- Score source toggle: Gross risk OR Net risk scores from RCT
- Aggregation mode applies to Sunburst only (Matrix keeps its own weighted average logic)

### Interaction Model
- Click segment to zoom in — clicked segment becomes new center, children expand outward
- Breadcrumb trail for navigation back (e.g., "All > Operational > IT" — click any level to jump)
- Hover shows minimal tooltip: name and score only
- Right-click context menu with "View in RCT" option to navigate to filtered RCT view

### Level Toggle Controls
- Individual checkboxes per level: L1 ☐ L2 ☐ L3 ☐ L4 ☐ L5
- Controls in toolbar/control panel near the sunburst
- Control panel also includes Export button
- Export formats: PNG and SVG
- Export includes: chart + title + color scale legend + current filters shown

### Segment Display
- Default zoom: Show hierarchical ID only (e.g., "1.2.3") — compact for small segments
- Zoomed in: Show both ID and name (e.g., "1.2.3 Cyberattack") when space allows
- Color scheme: Score-based heatmap matching RCT/Matrix (green→yellow→orange→red, 1-25 range)
- Segments with no score data: Gray/muted color by default, with option to hide them entirely

### Claude's Discretion
- Aggregation mode toggle placement (near other view controls)
- Specific D3.js / charting library choice
- Animation timing for zoom transitions
- Exact breadcrumb styling
- Responsive behavior for smaller screens

</decisions>

<specifics>
## Specific Ideas

- "This is the most usable chart for presentations about risk management" — export quality is important
- Should feel executive-friendly: clean, not cluttered
- Same color interpolation as existing RCT heatmap cells and Matrix

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 06-risk-sunburst-visualization*
*Context gathered: 2026-01-21*
