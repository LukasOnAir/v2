-- RLS helper function to extract tenant_id from JWT
-- Uses app_metadata (NOT user_metadata - security critical)
-- Created in public schema (auth schema is protected by Supabase)

CREATE OR REPLACE FUNCTION public.tenant_id()
RETURNS UUID AS $$
  SELECT COALESCE(
    (current_setting('request.jwt.claims', true)::json -> 'app_metadata' ->> 'tenant_id')::uuid,
    NULL
  );
$$ LANGUAGE sql STABLE SECURITY DEFINER;

COMMENT ON FUNCTION public.tenant_id() IS 'Extract tenant_id from JWT app_metadata for RLS policies';

-- Helper to get current user role
CREATE OR REPLACE FUNCTION public.user_role()
RETURNS TEXT AS $$
  SELECT COALESCE(
    (current_setting('request.jwt.claims', true)::json -> 'app_metadata' ->> 'role'),
    NULL
  );
$$ LANGUAGE sql STABLE SECURITY DEFINER;

COMMENT ON FUNCTION public.user_role() IS 'Extract role from JWT app_metadata for RLS policies';
