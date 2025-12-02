-- Enable anonymous (unauthenticated) users to read global feature flags
-- This allows login/signup pages to check feature visibility before authentication
-- NOTE: This migration is idempotent (safe to run multiple times)

-- Grant SELECT permission to anon role
GRANT SELECT ON public.global_feature_flags TO anon;

-- Add RLS policy for anonymous read access
DROP POLICY IF EXISTS "global_feature_flags_anon_read" ON public.global_feature_flags;
CREATE POLICY "global_feature_flags_anon_read" ON public.global_feature_flags
  FOR SELECT TO anon
  USING (TRUE);

COMMENT ON POLICY "global_feature_flags_anon_read" ON public.global_feature_flags
  IS 'Allows unauthenticated users (login page visitors) to check feature visibility';

-- Seed the show_signup flag (enabled=true by default for backwards compatibility)
-- When enabled: Login page shows "Sign up" link for public registration
-- When disabled: Login page shows "Contact Director for invitation" message
INSERT INTO public.global_feature_flags (feature_key, enabled, description)
VALUES ('show_signup', true, 'Show signup link on login page for public registration')
ON CONFLICT (feature_key) DO NOTHING;
