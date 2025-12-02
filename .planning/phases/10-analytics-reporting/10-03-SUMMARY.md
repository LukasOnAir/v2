---
phase: 10-analytics-reporting
plan: 03
subsystem: analytics
tags: [sampling, AICPA, aggregation, heatmap, useMemo, L1-categories]

# Dependency graph
requires:
  - phase: 10-analytics-reporting
    plan: 01
    provides: calculateSampleSize utility and useAggregationByCategory hook
provides:
  - SamplingCalculator UI for population-based sample size recommendations
  - SamplingResults display component with methodology notes
  - AggregationReport with risk/process L1 grouping toggle
affects: [analytics dashboard, testing guidance page]

# Tech tracking
tech-stack:
  added: []
  patterns: [controlled form inputs with useMemo calculation, toggle button group for category switching]

key-files:
  created:
    - src/components/analytics/SamplingCalculator.tsx
    - src/components/analytics/SamplingResults.tsx
    - src/components/analytics/AggregationReport.tsx
  modified:
    - src/components/analytics/index.ts

key-decisions:
  - "Collapsible details/summary for methodology documentation (simple native HTML)"
  - "Toggle buttons use accent bg for active state, surface for inactive"
  - "Score cells use inline styles for heatmap background (getHeatmapColor utility)"
  - "Category table shows both categoryName and categoryId for clarity"

patterns-established:
  - "Radio button groups for discrete options (confidence level, deviation rates)"
  - "Select dropdown for expected deviation (0/1/2%) to save horizontal space"
  - "Alternating row colors with bg-surface / bg-surface-elevated"

# Metrics
duration: 3min
completed: 2026-01-21
---

# Phase 10 Plan 03: Sampling Calculator & Aggregation Report Summary

**AICPA-aligned sampling calculator UI with methodology documentation and risk aggregation table grouped by L1 categories**

## Performance

- **Duration:** 3 min
- **Started:** 2026-01-21
- **Completed:** 2026-01-21
- **Tasks:** 2
- **Files modified:** 4

## Accomplishments
- Created SamplingResults component to display recommended sample size and methodology notes
- Built SamplingCalculator with form inputs for population size, confidence level, tolerable/expected deviation
- Added collapsible methodology section explaining AICPA attribute sampling approach
- Created AggregationReport showing average scores grouped by risk or process L1 categories
- Score cells use heatmap colors with contrasting text for visual severity indication
- Updated analytics barrel export with all new components

## Task Commits

Each task was committed atomically:

1. **Task 1: Create Sampling Calculator components** - `1e95df6` (feat)
2. **Task 2: Create Aggregation Report component** - `5d1410c` (feat)

## Files Created/Modified
- `src/components/analytics/SamplingResults.tsx` - Display component for sample size recommendations
- `src/components/analytics/SamplingCalculator.tsx` - Form with inputs and methodology documentation
- `src/components/analytics/AggregationReport.tsx` - Risk aggregation table with L1 grouping toggle
- `src/components/analytics/index.ts` - Added exports for SamplingCalculator, SamplingResults, AggregationReport

## Decisions Made
- Used native HTML details/summary for methodology collapsible (no extra dependency)
- Radio buttons for confidence and tolerable deviation (2 options each)
- Select dropdown for expected deviation (3 options, saves space)
- Heatmap colors applied via inline styles for dynamic background
- Category ID shown below name in smaller text for reference

## Deviations from Plan
None - plan executed exactly as written.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Sampling calculator ready for integration into testing guidance pages
- Aggregation report ready for analytics dashboard
- All analytics components exported from single barrel file
- Phase 10 analytics suite complete (infrastructure, trends, sampling/aggregation)

---
*Phase: 10-analytics-reporting*
*Completed: 2026-01-21*
