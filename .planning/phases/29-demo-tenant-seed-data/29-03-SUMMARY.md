---
phase: 29-demo-tenant-seed-data
plan: 03
subsystem: database
tags: [sql, seed-data, rct, controls, remediation, postgresql, supabase]

# Dependency graph
requires:
  - phase: 29-01
    provides: risk taxonomy nodes (61 nodes, L1-L5) for demo tenant
  - phase: 29-02
    provides: process taxonomy nodes (56 nodes, L1-L5) for demo tenant
provides:
  - RCT rows seed SQL (25 risk-process pairings with gross scores)
  - Controls seed SQL (15 controls with various types)
  - Control links seed SQL (30 control-to-RCT row links with net scores)
  - Control tests seed SQL (20 tests with pass/partial/fail distribution)
  - Remediation plans seed SQL (5 plans with various statuses)
affects: [29-04, demo-showcase, demo-tenant-presentation]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - DO block with variable declarations for cross-referencing entity IDs
    - Name-based taxonomy lookup for foreign key references
    - Reverse dependency order DELETE for clean slate seeding
    - JSONB action_items structure for remediation plan tracking

key-files:
  created:
    - supabase/seed-scripts/29-03-rct-controls-remediation.sql
  modified: []

key-decisions:
  - "25 RCT rows created with varied gross scores (4-20) demonstrating full risk spectrum"
  - "15 controls with mix of types: Preventative (7), Detective (5), Corrective (3)"
  - "30 control links created with net scores lower than gross to show control effectiveness"
  - "20 control tests with distribution: 12 pass, 4 partial, 4 fail"
  - "5 remediation plans: 1 open/critical, 2 in-progress, 1 resolved, 1 closed"
  - "Name-based taxonomy lookup used instead of hardcoded UUIDs for portability"

patterns-established:
  - "RCT seed data pattern: meaningful risk-process pairings with realistic comments"
  - "Control test evidence pattern: detailed evidence, findings, and recommendations"
  - "Remediation action_items JSONB: array of {id, description, completed, completedDate}"

# Metrics
duration: 4min
completed: 2026-01-27
---

# Phase 29 Plan 03: RCT Controls Remediation Summary

**Comprehensive RCT seed data with 25 risk-process pairings, 15 controls, 30 control links, 20 tests (12 pass/4 partial/4 fail), and 5 remediation plans showcasing complete risk management workflow**

## Performance

- **Duration:** 4 min
- **Started:** 2026-01-27T19:26:15Z
- **Completed:** 2026-01-27T19:30:26Z
- **Tasks:** 1
- **Files created:** 1

## Accomplishments

- Created 25 RCT rows linking specific L3 risks to L2/L3 processes with realistic gross probability/impact scores
- Created 15 controls covering Preventative (7), Detective (5), and Corrective (3) types with quarterly/monthly/annual test frequencies
- Created 30 control links connecting controls to relevant RCT rows with net scores demonstrating control effectiveness
- Created 20 control tests with varied results: 12 pass (effectiveness 4-5), 4 partial (effectiveness 2-3), 4 fail (effectiveness 1-2)
- Created 5 remediation plans for failed tests: 1 open/critical, 2 in-progress/high-medium, 1 resolved, 1 closed
- All entities include realistic comments, evidence, findings, recommendations, and action items

## Task Commits

Each task was committed atomically:

1. **Task 1: Create RCT and controls seed SQL script** - `efc517a` (feat)

## Files Created/Modified

- `supabase/seed-scripts/29-03-rct-controls-remediation.sql` - Complete seed SQL for RCT, controls, control links, control tests, and remediation plans (~995 lines)

## Decisions Made

1. **Name-based taxonomy lookup:** Used SELECT by name instead of hardcoded UUIDs for taxonomy references, making script portable if taxonomy node IDs change
2. **Varied gross scores:** Spread gross scores across the 1-5 x 1-5 matrix (4 to 20) to demonstrate low, medium, and high risk combinations
3. **Control type distribution:** Focused on Preventative (7) and Detective (5) with fewer Corrective (3) to match typical control environment
4. **Test frequency mix:** Used quarterly (7), monthly (5), and annually (3) frequencies to show varied testing cadences
5. **Realistic test history:** Tests span 2025 calendar year with realistic evidence and findings for each result type
6. **Remediation workflow:** All 4 statuses represented (open, in-progress, resolved, closed) with progressive action item completion

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None - SQL script created following established pattern from previous phase documentation.

## User Setup Required

**Manual execution required.** The SQL script must be executed in Supabase SQL Editor after running 29-01 and 29-02 scripts:

1. Open Supabase Dashboard > SQL Editor
2. Paste contents of `supabase/seed-scripts/29-03-rct-controls-remediation.sql`
3. Execute the script
4. Verify with queries at end of script:
   - RCT rows: ~25
   - Controls: ~15
   - Control links: ~30
   - Control tests: ~20
   - Remediation plans: ~5

## Next Phase Readiness

- RCT, controls, and remediation data complete for demo tenant
- All major features showcased: varied risk levels, control types, test outcomes, remediation workflows
- Ready for UI demonstration and user acceptance testing
- Phase 29 seed data complete (29-01 risk taxonomy + 29-02 process taxonomy + 29-03 RCT/controls)

---
*Phase: 29-demo-tenant-seed-data*
*Completed: 2026-01-27*
