---
phase: 23-email-scheduling
plan: 03
subsystem: infra
tags: [pg_cron, edge-functions, vercel-cron, scheduling, reminders, supabase]

# Dependency graph
requires:
  - phase: 23-02
    provides: send-notification Edge Function patterns and Resend integration
  - phase: 22-authorization
    provides: Profile and auth patterns for recipient lookup
provides:
  - process-reminders Edge Function for batch reminder processing
  - pg_cron daily job at 8 AM UTC (primary scheduler)
  - Vercel cron backup scheduler (redundancy)
  - Stub queries for SCHED-01, SCHED-02, SCHED-03
affects: [controls-database-migration, remediation-database, frontend-integration]

# Tech tracking
tech-stack:
  added: [pg_cron, pg_net, supabase-vault]
  patterns:
    - Dual authentication (service role OR cron secret)
    - Batch processing with configurable BATCH_SIZE
    - Stub query pattern for future database tables

key-files:
  created:
    - supabase/functions/process-reminders/index.ts
    - supabase/migrations/00012_scheduled_jobs.sql
    - api/cron/reminders.ts
  modified:
    - supabase/config.toml
    - vercel.json

key-decisions:
  - "Dual auth pattern: Accept service role (pg_cron) OR cron secret (Vercel) for redundancy"
  - "Stub queries as comments: Ready for database tables, no runtime errors"
  - "BATCH_SIZE = 50: Balances throughput with Edge Function timeout limits"
  - "Migration renamed to 00012: Avoid conflict with existing 00011_email_preferences"

patterns-established:
  - "Pattern: Dual authentication for cron-triggered functions"
  - "Pattern: Stub SQL queries with detailed comments for future implementation"
  - "Pattern: Vercel serverless function as cron backup for Supabase pg_cron"

# Metrics
duration: 8min
completed: 2026-01-25
---

# Phase 23 Plan 03: Scheduled Reminders Summary

**pg_cron infrastructure at 8 AM UTC with Vercel cron backup and process-reminders Edge Function for test due/overdue/remediation deadline notifications**

## Performance

- **Duration:** 8 min
- **Started:** 2026-01-25T10:55:39Z
- **Completed:** 2026-01-25T11:03:39Z
- **Tasks:** 4
- **Files modified:** 5

## Accomplishments
- Created process-reminders Edge Function with stub queries for all 3 reminder types
- Set up pg_cron job running daily at 8 AM UTC (primary scheduler)
- Added Vercel cron backup scheduler for redundancy (SCHED-04)
- Deployed Edge Function and applied database migration

## Task Commits

Each task was committed atomically:

1. **Task 1: Create process-reminders Edge Function** - `7909fcc` (feat)
2. **Task 2: Create pg_cron Migration** - `b48f067` (feat)
3. **Task 3: Add Vercel Cron Backup** - `e889985` (feat)
4. **Task 4: Configure and Deploy** - `559c314` (chore)

## Files Created/Modified
- `supabase/functions/process-reminders/index.ts` - Batch processor with stub queries for SCHED-01, SCHED-02, SCHED-03
- `supabase/migrations/00012_scheduled_jobs.sql` - pg_cron job creation and Vault secret documentation
- `api/cron/reminders.ts` - Vercel serverless function as backup scheduler
- `vercel.json` - Added crons section for daily schedule
- `supabase/config.toml` - Added [functions.process-reminders] section

## Cron Configuration

### Primary: pg_cron (Supabase)
- **Job name:** `process-daily-reminders`
- **Schedule:** `0 8 * * *` (daily at 8 AM UTC)
- **Target:** `/functions/v1/process-reminders`
- **Auth:** Service role key from Supabase Vault

### Backup: Vercel Cron
- **Path:** `/api/cron/reminders`
- **Schedule:** `0 8 * * *` (daily at 8 AM UTC)
- **Auth:** CRON_SECRET header

## User Setup Required

**Vault secrets must be configured manually in Supabase SQL Editor:**

1. Go to: Supabase Dashboard -> SQL Editor
2. Run these commands (replace placeholders):

```sql
-- Store the project URL
SELECT vault.create_secret(
  'https://sjjwkdyliejfgmvuzpjp.supabase.co',
  'project_url',
  'RiskGuard project URL for pg_cron'
);

-- Store the service role key (from Dashboard -> Settings -> API)
SELECT vault.create_secret(
  '[SERVICE_ROLE_KEY]',
  'service_role_key',
  'Supabase service role key for scheduled function calls'
);
```

3. Verify: `SELECT name FROM vault.secrets;`

**Environment variable for Vercel:**
- `CRON_SECRET` - Random UUID for cron authentication
- Add to Vercel Dashboard -> Project Settings -> Environment Variables

## Stub Queries Ready for Database

The following queries are ready as comments in process-reminders and will work once tables exist:

| Requirement | Query Target | Waiting For |
|-------------|--------------|-------------|
| SCHED-01: Test due in 7 days | controls table | Controls database migration |
| SCHED-02: Test overdue | controls table | Controls database migration |
| SCHED-03: Remediation due in 7 days | remediation_plans table | Remediation database migration |

## Decisions Made
- Dual authentication pattern accepts both service role (pg_cron) and cron secret (Vercel)
- Stub queries as SQL comments prevent runtime errors while awaiting database tables
- BATCH_SIZE = 50 to balance throughput with Edge Function timeout limits
- Renamed migration to 00012 to avoid conflict with existing 00011_email_preferences

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Renamed migration to 00012**
- **Found during:** Task 4 (db push)
- **Issue:** Migration 00011_scheduled_jobs.sql conflicted with existing 00011_email_preferences.sql
- **Fix:** Renamed to 00012_scheduled_jobs.sql and updated comment
- **Files modified:** supabase/migrations/00012_scheduled_jobs.sql
- **Verification:** Migration applied successfully

**2. [Rule 3 - Blocking] Repaired migration history**
- **Found during:** Task 4 (db push)
- **Issue:** Migration history out of sync - migrations 00001-00011 applied but not tracked
- **Fix:** Ran `supabase migration repair 00001-00011 --status applied`
- **Verification:** db push succeeded for new migration

---

**Total deviations:** 2 auto-fixed (2 blocking)
**Impact on plan:** Both fixes necessary to apply migration. No scope creep.

## Issues Encountered
- Vercel cron requires serverless function in api/ folder (not Next.js API routes) - created correct structure
- Project is Vite SPA, not Next.js - adapted API route accordingly

## Next Phase Readiness
- Scheduling infrastructure complete and running
- Edge Function deployed and ready
- Waiting for Vault secret configuration (user manual step)
- Waiting for database tables (controls, remediation_plans) to enable actual reminder processing
- When tables exist, uncomment queries in process-reminders and implement email sending loop

---
*Phase: 23-email-scheduling*
*Completed: 2026-01-25*
