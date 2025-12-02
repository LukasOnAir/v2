---
phase: 07-weights-configuration
plan: 03
subsystem: ui
tags: [zustand, react, weights, sunburst, matrix, aggregation]

# Dependency graph
requires:
  - phase: 07-01
    provides: TaxonomyWeights state in taxonomyStore
  - phase: 04-matrix-polish
    provides: MatrixGrid and calculateWeightedAverage utilities
  - phase: 06-risk-sunburst
    provides: useSunburstData hook
provides:
  - Sunburst reads weights from taxonomyStore
  - Matrix reads weights from taxonomyStore
  - Weight changes in Taxonomy page immediately affect visualizations
  - Node-specific weight overrides respected in Sunburst aggregation
  - matrixStore weights deprecated with migration guidance
affects: [07-04, matrix, sunburst]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Taxonomy-specific weights: Select riskWeights vs processWeights based on current view"
    - "Level defaults passthrough: Use weights.levelDefaults for flat AggregationWeights compatibility"

key-files:
  created: []
  modified:
    - src/components/sunburst/useSunburstData.ts
    - src/components/matrix/MatrixGrid.tsx
    - src/stores/matrixStore.ts

key-decisions:
  - "Sunburst uses getEffectiveWeightForNode for per-node override support"
  - "Matrix uses riskWeights.levelDefaults (flat structure) for aggregation compatibility"
  - "matrixStore weights kept but deprecated to maintain backwards compatibility"

patterns-established:
  - "Store-to-store migration: Keep deprecated state with JSDoc @deprecated for gradual migration"
  - "Weight source selection: Choose weights based on taxonomy type being displayed"

# Metrics
duration: 4min
completed: 2026-01-21
---

# Phase 7 Plan 3: Weight Consumer Update Summary

**Sunburst and Matrix now read weights from taxonomyStore, enabling real-time weight propagation from Taxonomy page**

## Performance

- **Duration:** 4 min
- **Started:** 2026-01-21T15:32:00Z
- **Completed:** 2026-01-21T15:36:00Z
- **Tasks:** 3
- **Files modified:** 3

## Accomplishments
- useSunburstData hook reads riskWeights/processWeights from taxonomyStore
- Added getEffectiveWeightForNode helper for per-node override support in Sunburst
- MatrixGrid uses riskWeights.levelDefaults for weighted average calculations
- matrixStore weights fully deprecated with JSDoc comments and migration guidance

## Task Commits

Each task was committed atomically:

1. **Task 1: Update useSunburstData to read weights from taxonomyStore** - `2855b9f` (feat)
2. **Task 2: Update Matrix to read weights from taxonomyStore** - `f629d75` (feat)
3. **Task 3: Deprecate matrixStore weights** - `4c78512` (docs)

## Files Created/Modified
- `src/components/sunburst/useSunburstData.ts` - Replaced matrixStore with taxonomyStore weights, added node override support
- `src/components/matrix/MatrixGrid.tsx` - Use taxonomyStore.riskWeights.levelDefaults for aggregation
- `src/stores/matrixStore.ts` - Added @deprecated JSDoc comments to weights-related exports

## Decisions Made
- useSunburstData selects weights based on taxonomyType (risk vs process)
- Matrix uses riskWeights for all cells (primary visualization use case)
- calculateWeightedAverage receives levelDefaults directly (preserves flat AggregationWeights interface)
- Deprecated items retained for backwards compatibility during migration period

## Deviations from Plan
None - plan executed exactly as written.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Weight consumers fully migrated to taxonomyStore
- Ready for 07-04 (Weight Input UI) to add click-to-edit functionality
- Weight changes now propagate from Taxonomy page to Matrix and Sunburst in real-time

---
*Phase: 07-weights-configuration*
*Completed: 2026-01-21*
