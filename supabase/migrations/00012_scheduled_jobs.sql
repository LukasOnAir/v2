-- 00012_scheduled_jobs.sql
-- pg_cron job setup for scheduled reminder processing
-- Part of Phase 23: Email & Scheduling (SCHED-04)

-- ============================================================================
-- EXTENSIONS
-- ============================================================================
-- pg_cron and pg_net should already be enabled in Supabase
-- These are no-ops if already enabled
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA pg_catalog;
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- ============================================================================
-- VAULT SECRETS (MANUAL SETUP REQUIRED)
-- ============================================================================
-- IMPORTANT: The following commands must be run MANUALLY in Supabase SQL Editor
-- They cannot be run in migrations due to Vault permissions
--
-- 1. Go to: Supabase Dashboard -> SQL Editor
-- 2. Run these commands (replace [PROJECT_REF] and [SERVICE_ROLE_KEY]):
--
-- -- Store the project URL
-- SELECT vault.create_secret(
--   'https://[PROJECT_REF].supabase.co',
--   'project_url',
--   'RiskGuard project URL for pg_cron'
-- );
--
-- -- Store the service role key (from Dashboard -> Settings -> API)
-- SELECT vault.create_secret(
--   '[SERVICE_ROLE_KEY]',
--   'service_role_key',
--   'Supabase service role key for scheduled function calls'
-- );
--
-- 3. Verify secrets were created:
-- SELECT name FROM vault.secrets;
--
-- ============================================================================

-- ============================================================================
-- CRON JOB: Daily Reminder Processing
-- ============================================================================
-- Schedule: Daily at 8 AM UTC
-- Target: process-reminders Edge Function
-- Authentication: Service role key from Vault
-- ============================================================================

-- Note: This will fail until Vault secrets are configured
-- Supabase will show an error in cron.job_run_details if secrets are missing

SELECT cron.schedule(
  'process-daily-reminders',
  '0 8 * * *',
  $$
  SELECT net.http_post(
    url := (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'project_url') || '/functions/v1/process-reminders',
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'service_role_key'),
      'Content-Type', 'application/json'
    ),
    body := jsonb_build_object(
      'trigger', 'daily-reminder',
      'timestamp', NOW()::text,
      'source', 'pg_cron'
    )
  );
  $$
);

-- Add comment explaining the job
COMMENT ON EXTENSION pg_cron IS 'pg_cron scheduled jobs for RiskGuard email reminders';

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================
-- After applying this migration, verify the job was created:
--
-- -- List all cron jobs
-- SELECT * FROM cron.job WHERE jobname = 'process-daily-reminders';
--
-- -- Check job run history
-- SELECT * FROM cron.job_run_details
-- WHERE jobid = (SELECT jobid FROM cron.job WHERE jobname = 'process-daily-reminders')
-- ORDER BY start_time DESC
-- LIMIT 10;
--
-- ============================================================================

-- ============================================================================
-- MANUAL TRIGGER FOR TESTING
-- ============================================================================
-- To manually trigger the reminder processing (for testing):
--
-- SELECT net.http_post(
--   url := (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'project_url') || '/functions/v1/process-reminders',
--   headers := jsonb_build_object(
--     'Authorization', 'Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'service_role_key'),
--     'Content-Type', 'application/json'
--   ),
--   body := jsonb_build_object(
--     'trigger', 'manual-test',
--     'timestamp', NOW()::text
--   )
-- );
--
-- ============================================================================

-- ============================================================================
-- CLEANUP (if needed)
-- ============================================================================
-- To remove the cron job:
-- SELECT cron.unschedule('process-daily-reminders');
--
-- To remove Vault secrets:
-- SELECT vault.delete_secret((SELECT id FROM vault.secrets WHERE name = 'project_url'));
-- SELECT vault.delete_secret((SELECT id FROM vault.secrets WHERE name = 'service_role_key'));
--
-- ============================================================================
