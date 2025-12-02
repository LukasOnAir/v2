---
phase: 26-shared-tenant-database
plan: 02
subsystem: database
tags: [postgresql, supabase, rls, migrations, jsonb]

# Dependency graph
requires:
  - phase: 26-01
    provides: controls, rct_rows, taxonomy_nodes tables for FK references
provides:
  - control_tests table for test execution tracking
  - remediation_plans table for action plans
  - custom_columns table for RCT extensibility
  - tickets and ticket_entity_links tables for task management
  - comments table for threaded collaboration
  - pending_changes table for four-eye approval workflow
  - approval_settings table for per-tenant configuration
  - score_labels table for custom 1-5 scale labels
affects: [26-03, 26-04, phase-27]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "JSONB for flexible data (action_items, recurrence, entity_overrides)"
    - "Polymorphic entity references with entity_type + entity_id pattern"
    - "Self-referential FK for threaded comments (parent_id)"
    - "UNIQUE constraint on (tenant_id) for singleton settings"

key-files:
  created:
    - supabase/migrations/00018_control_tests.sql
    - supabase/migrations/00019_remediation_plans.sql
    - supabase/migrations/00020_custom_columns.sql
    - supabase/migrations/00021_tickets.sql
    - supabase/migrations/00022_comments.sql
    - supabase/migrations/00023_pending_changes.sql
    - supabase/migrations/00024_approval_settings.sql
    - supabase/migrations/00025_score_labels.sql
  modified: []

key-decisions:
  - "TicketStatus includes 'review' to match TypeScript type (plan said 'done' only)"
  - "approval_settings has no DELETE grant (one row per tenant, managed via upsert)"
  - "JSONB DEFAULT '[]' for action_items vs empty object for entity_overrides"

patterns-established:
  - "JSONB arrays for embedded collections (action_items)"
  - "Polymorphic references via entity_type CHECK + entity_id UUID"
  - "approval_settings as singleton pattern (UNIQUE on tenant_id)"

# Metrics
duration: 4min
completed: 2026-01-26
---

# Phase 26 Plan 02: Supporting Tables Summary

**8 SQL migrations for control tests, remediation plans, tickets, comments, pending changes, approval settings, and score labels with tenant-isolated RLS**

## Performance

- **Duration:** 4 min
- **Started:** 2026-01-26T13:34:03Z
- **Completed:** 2026-01-26T13:38:24Z
- **Tasks:** 3
- **Files created:** 8

## Accomplishments
- Created control_tests and remediation_plans tables for testing workflow
- Created tickets with ticket_entity_links for polymorphic task management
- Created comments with self-referential threading support
- Created pending_changes for four-eye approval workflow
- Created approval_settings as per-tenant singleton configuration
- Created custom_columns for RCT extensibility
- Created score_labels for custom probability/impact labels
- All tables have tenant-isolated RLS policies using (SELECT public.tenant_id()) pattern

## Task Commits

Each task was committed atomically:

1. **Task 1: Create control_tests, remediation_plans, custom_columns migrations** - `eb03b69` (feat)
2. **Task 2: Create tickets and ticket_entity_links migrations** - `dbfb5dc` (feat)
3. **Task 3: Create comments, pending_changes, approval_settings, score_labels migrations** - `b1431b9` (feat)

## Files Created

- `supabase/migrations/00018_control_tests.sql` - Test execution records with results and findings
- `supabase/migrations/00019_remediation_plans.sql` - Action plans for failed tests with JSONB action_items
- `supabase/migrations/00020_custom_columns.sql` - User-defined RCT column definitions
- `supabase/migrations/00021_tickets.sql` - Task tickets and polymorphic entity links
- `supabase/migrations/00022_comments.sql` - Threaded comments with parent_id self-reference
- `supabase/migrations/00023_pending_changes.sql` - Four-eye approval workflow records
- `supabase/migrations/00024_approval_settings.sql` - Per-tenant approval configuration
- `supabase/migrations/00025_score_labels.sql` - Custom probability/impact scale labels

## Decisions Made

1. **TicketStatus includes 'review'** - Plan specified CHECK for 'todo','in-progress','done' but TypeScript TicketStatus type includes 'review'. Aligned database with TypeScript for consistency.

2. **approval_settings no DELETE grant** - One row per tenant managed via upsert. Prevents accidental deletion of tenant configuration.

3. **JSONB DEFAULT patterns** - Used '[]' for action_items (array of items) and '{}' for entity_overrides (key-value map) to match expected data structures.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed TicketStatus CHECK constraint**
- **Found during:** Task 2 (tickets migration)
- **Issue:** Plan specified CHECK for 'todo','in-progress','done' but TypeScript has 'review' status
- **Fix:** Added 'review' to CHECK constraint to match TicketStatus type
- **Files modified:** supabase/migrations/00021_tickets.sql
- **Verification:** CHECK constraint matches TypeScript union type exactly
- **Committed in:** dbfb5dc (Task 2 commit)

---

**Total deviations:** 1 auto-fixed (1 bug fix for type alignment)
**Impact on plan:** Essential for TypeScript/database consistency. No scope creep.

## Issues Encountered

- Supabase CLI commands (`migration list`, `db push --dry-run`) require linked project or running local database - verified migrations exist via file system instead

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- All 8 supporting tables ready for Plan 26-01's core tables (taxonomy_nodes, controls, rct_rows)
- Migrations reference Plan 01 tables via FK - must run Plan 01 first when applying to database
- TypeScript types in src/types/ align with database CHECK constraints
- Ready for Plan 26-03 (React Query hooks and data fetching)

---
*Phase: 26-shared-tenant-database*
*Completed: 2026-01-26*
