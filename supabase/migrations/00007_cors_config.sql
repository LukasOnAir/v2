-- CORS Configuration (SEC-05)
-- Note: CORS is configured via Supabase Dashboard, not SQL
--
-- Required Configuration:
-- 1. Go to Supabase Dashboard -> Settings -> API
-- 2. Under "CORS Allowed Origins", add:
--    - http://localhost:5173 (development)
--    - https://your-production-domain.com (production)
--
-- For production deployment:
-- - Remove localhost origins
-- - Add only the specific production domain
-- - Do NOT use wildcard (*) in production
--
-- Supabase PostgREST automatically handles CORS headers based on this config.
-- See: https://supabase.com/docs/guides/api/cors

-- This file serves as documentation only.
-- No SQL execution needed.

SELECT 'CORS configuration documented - configure via Supabase Dashboard' as note;
