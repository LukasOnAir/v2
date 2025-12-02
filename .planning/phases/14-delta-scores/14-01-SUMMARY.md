---
phase: 14-delta-scores
plan: 01
subsystem: ui
tags: [zustand, d3-hierarchy, sunburst, delta-calculation, color-interpolation]

# Dependency graph
requires:
  - phase: 06-risk-sunburst
    provides: Sunburst visualization with scoreType toggle
provides:
  - ViewMode type with 4 options (net, gross, delta-gross-net, delta-vs-appetite)
  - Delta calculation logic for all view modes
  - Dynamic color scale based on max observed delta
  - Extended SunburstNode with grossValue, netValue, appetiteValue, missingDataReason
affects: [14-02 (toggle UI), 14-03 (color integration)]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - ViewMode union type for extended score viewing options
    - LeafScores interface for multi-score calculation
    - Dynamic maxDelta for proportional color scaling

key-files:
  created:
    - src/utils/deltaColors.ts
  modified:
    - src/stores/sunburstStore.ts
    - src/components/sunburst/useSunburstData.ts
    - src/components/sunburst/SunburstControls.tsx
    - src/utils/sunburstExport.ts

key-decisions:
  - "ViewMode replaces scoreType with 4 options: net, gross, delta-gross-net, delta-vs-appetite"
  - "Delta color mode: positive-bad for both delta views (higher delta = worse state)"
  - "Appetite aggregation uses minimum (most conservative threshold) rather than weighted average"
  - "maxDelta calculated across entire tree for consistent color scaling"

patterns-established:
  - "ViewMode type: exported from sunburstStore for use across components"
  - "LeafScores pattern: calculate all scores once, derive view-specific value"
  - "getMissingDataReason: human-readable explanations for null values"

# Metrics
duration: 6min
completed: 2026-01-22
---

# Phase 14 Plan 01: Delta Calculation Infrastructure Summary

**Extended sunburstStore with ViewMode supporting 4 score perspectives, updated useSunburstData with delta calculations and maxDelta, and created deltaColors utility for dynamic color scaling**

## Performance

- **Duration:** 6 min
- **Started:** 2026-01-22T10:00:00Z
- **Completed:** 2026-01-22T10:06:00Z
- **Tasks:** 3
- **Files modified:** 5

## Accomplishments
- Extended sunburstStore with ViewMode type supporting net, gross, delta-gross-net, delta-vs-appetite
- Implemented delta calculation logic for gross-net (control effectiveness) and vs-appetite (distance from threshold)
- Added dynamic color scaling with maxDelta for proportional coloring in delta modes
- Created deltaColors utility with getDeltaColor, buildDeltaGradient, getDeltaColorMode functions
- Extended SunburstNode interface with grossValue, netValue, appetiteValue, missingDataReason fields

## Task Commits

Each task was committed atomically:

1. **Task 1: Extend sunburstStore with viewMode** - `ccceed8` (feat)
2. **Task 2: Create deltaColors utility** - `9b942df` (feat)
3. **Task 3: Update useSunburstData for delta calculations** - `4405672` (feat)

## Files Created/Modified
- `src/stores/sunburstStore.ts` - Added ViewMode type with 4 options, replaced scoreType with viewMode
- `src/utils/deltaColors.ts` - New file with delta color functions (getDeltaColor, buildDeltaGradient, getDeltaColorMode)
- `src/components/sunburst/useSunburstData.ts` - Extended with delta calculations, maxDelta, and new node fields
- `src/components/sunburst/SunburstControls.tsx` - Updated to use viewMode instead of scoreType
- `src/utils/sunburstExport.ts` - Updated filter interface for viewMode with proper labels
- `src/components/sunburst/SunburstChart.tsx` - Updated to consume new useSunburstData return type

## Decisions Made
- ViewMode replaces scoreType as it better describes the 4 viewing perspectives
- Delta color mode uses "positive-bad" for both delta views (higher delta = more risk = worse = red)
- Appetite aggregation uses minimum rather than weighted average (most conservative threshold)
- maxDelta is calculated by traversing entire tree for consistent color scaling across all segments
- SunburstChart extracts hierarchyData from new hook return type for backward compatibility

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- Delta calculation infrastructure complete
- Ready for Plan 14-02: Toggle UI for selecting between 4 view modes
- Ready for Plan 14-03: Integrating delta colors into SunburstChart rendering

---
*Phase: 14-delta-scores*
*Completed: 2026-01-22*
