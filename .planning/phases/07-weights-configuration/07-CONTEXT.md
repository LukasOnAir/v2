# Phase 7: Weights Configuration - Context

**Gathered:** 2026-01-21
**Status:** Ready for planning

<domain>
## Phase Boundary

User-configurable weights per taxonomy level that affect Matrix and Sunburst aggregation calculations. Users can set weight multipliers that change how child scores roll up to parent aggregates.

</domain>

<decisions>
## Implementation Decisions

### Settings Location
- Weights configured within the Taxonomy page (not a separate settings page)
- Risk and Process taxonomies have independent weight configurations
- Per-level inline display: weight badge shown on each tree node
- Each taxonomy tab manages its own set of weights

### Weight Granularity
- Decimal multiplier format (0.5, 1.0, 2.0, etc.)
- Range: 0.1 to 5.0
- One decimal place precision (0.1, 0.5, 1.0, 2.5, etc.)
- Default weight: 1.0 (equal weighting)
- Per-level weights with per-node override capability
  - Level sets the default weight for all nodes at that level
  - Individual nodes can have custom weight that overrides level default

### Input Format
- Click-to-edit interaction on the weight badge
- Click badge → inline number input appears → edit → blur/enter to save
- No preset configurations (users always set weights manually)

### Claude's Discretion
- Visual indicator for nodes with custom weight overrides (differentiate from level defaults)
- Input validation approach (prevent invalid vs show error state)
- Exact badge styling and placement within tree nodes
- How level-default vs node-override relationship is communicated in UI

</decisions>

<specifics>
## Specific Ideas

No specific requirements — open to standard approaches

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 07-weights-configuration*
*Context gathered: 2026-01-21*
