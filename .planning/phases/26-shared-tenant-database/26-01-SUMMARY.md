---
phase: 26-shared-tenant-database
plan: 01
subsystem: database
tags: [postgresql, rls, supabase, migrations, taxonomy, rct]

# Dependency graph
requires:
  - phase: 21-database-auth-foundation
    provides: tenants table, profiles table, RLS helper functions (public.tenant_id())
provides:
  - taxonomy_nodes table for hierarchical risk/process trees
  - taxonomy_weights table for aggregation weight configuration
  - controls table for risk control definitions
  - control_links junction table for control-to-RCT mapping
  - rct_rows table for risk-process score combinations
  - TypeScript types for all new tables
affects: [26-02, 26-03, phase-27]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "GENERATED ALWAYS AS for computed score columns"
    - "Trigger function for hierarchical ID generation"
    - "UUID[] path array for materialized ancestor paths"

key-files:
  created:
    - supabase/migrations/00013_taxonomy_nodes.sql
    - supabase/migrations/00014_taxonomy_weights.sql
    - supabase/migrations/00015_controls.sql
    - supabase/migrations/00016_control_links.sql
    - supabase/migrations/00017_rct_rows.sql
  modified:
    - src/lib/supabase/types.ts

key-decisions:
  - "Store both risk and process taxonomies in single taxonomy_nodes table with type column"
  - "Use adjacency list + path array for hierarchy (not ltree extension)"
  - "GENERATED ALWAYS AS columns for net_score, gross_score, within_appetite"
  - "JSONB custom_values column for user-defined RCT columns"
  - "Control_links FK to rct_rows added in 00017 after rct_rows table creation"

patterns-established:
  - "Trigger-based hierarchical_id generation for taxonomy nodes"
  - "Updated_at triggers for mutable tables (taxonomy_nodes, controls, rct_rows)"
  - "UNIQUE constraints on composite keys (tenant_id + row_id, control_id + rct_row_id)"

# Metrics
duration: 6min
completed: 2026-01-26
---

# Phase 26 Plan 01: Core Database Schema Summary

**5 PostgreSQL migrations for taxonomy_nodes, taxonomy_weights, controls, control_links, and rct_rows with RLS tenant isolation and GENERATED score columns**

## Performance

- **Duration:** 6 min
- **Started:** 2026-01-26T13:33:30Z
- **Completed:** 2026-01-26T13:39:02Z
- **Tasks:** 3
- **Files modified:** 6

## Accomplishments

- Created 5 SQL migration files (00013-00017) for core application data tables
- All tables have RLS policies using (SELECT public.tenant_id()) pattern for performance
- GENERATED columns auto-compute scores (net_score, gross_score, within_appetite)
- Trigger auto-generates hierarchical_id and path array on taxonomy node insert
- TypeScript types added for all new tables with Row/Insert/Update variants

## Task Commits

Each task was committed atomically:

1. **Task 1: Create taxonomy_nodes migration** - `d43e4f7` (feat)
2. **Task 2: Create taxonomy_weights, controls, control_links, rct_rows migrations** - `aa6bb51` (feat)
3. **Task 3: Add TypeScript types** - `254fec7` (feat)

## Files Created/Modified

- `supabase/migrations/00013_taxonomy_nodes.sql` - Hierarchical taxonomy tree table with trigger
- `supabase/migrations/00014_taxonomy_weights.sql` - Per-node and per-level weight configuration
- `supabase/migrations/00015_controls.sql` - Risk control definitions with test scheduling
- `supabase/migrations/00016_control_links.sql` - Control-to-RCT-row junction table
- `supabase/migrations/00017_rct_rows.sql` - Risk-process combinations with scores
- `src/lib/supabase/types.ts` - TypeScript types for all new tables

## Decisions Made

- **Single taxonomy_nodes table for both risk and process:** Using type column (CHECK constraint) instead of separate tables reduces duplication and simplifies queries
- **Adjacency list + path array:** Chosen over ltree extension for flexibility during taxonomy changes. Trigger auto-maintains path array for efficient ancestor queries
- **GENERATED columns for scores:** Database computes net_score, gross_score, within_appetite - prevents client/server computation drift
- **JSONB for custom_values:** Allows tenant-specific custom columns without schema changes
- **Deferred FK on control_links:** Control_links created before rct_rows, FK constraint added at end of 00017

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

- **Docker/Supabase not running:** Could not execute `npx supabase db push` or `npx supabase gen types typescript` to apply migrations and regenerate types. TypeScript types were manually added based on migration schemas. When Docker is available, run:
  ```bash
  npx supabase db push
  npx supabase gen types typescript --local > src/lib/supabase/types.ts
  ```

## User Setup Required

**Manual migration push required when local Supabase is running:**
1. Start Docker Desktop
2. Run `npx supabase start`
3. Run `npx supabase db push`
4. Verify tables exist: `npx supabase db diff`

## Next Phase Readiness

- Database schema ready for React Query hooks and data access layer
- 5 core tables defined with proper indexes and RLS
- TypeScript types available for type-safe database operations
- Migration files ready to apply when Supabase is available

---
*Phase: 26-shared-tenant-database*
*Plan: 01*
*Completed: 2026-01-26*
