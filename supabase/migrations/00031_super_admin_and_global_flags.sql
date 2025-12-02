-- Super-admin flag and global (tenant-agnostic) feature flags
-- Super-admins can toggle features that affect ALL tenants
-- NOTE: This migration is idempotent (safe to run multiple times)

-- Add is_super_admin column to profiles (if not exists)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'profiles'
    AND column_name = 'is_super_admin'
  ) THEN
    ALTER TABLE public.profiles ADD COLUMN is_super_admin BOOLEAN DEFAULT FALSE;
  END IF;
END $$;

-- Allow tenant_id to be NULL for super-admins only
-- Drop the NOT NULL constraint on tenant_id (idempotent)
ALTER TABLE public.profiles
ALTER COLUMN tenant_id DROP NOT NULL;

-- Add CHECK constraint - tenant_id required unless super-admin
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.constraint_column_usage
    WHERE constraint_name = 'profiles_tenant_id_required_for_non_superadmin'
  ) THEN
    ALTER TABLE public.profiles
    ADD CONSTRAINT profiles_tenant_id_required_for_non_superadmin
    CHECK (is_super_admin = TRUE OR tenant_id IS NOT NULL);
  END IF;
END $$;

-- Index for super-admin lookups
CREATE INDEX IF NOT EXISTS idx_profiles_is_super_admin
ON public.profiles(is_super_admin) WHERE is_super_admin = TRUE;

-- Update profiles RLS to allow super-admins to read their own profile
DROP POLICY IF EXISTS "profiles_superadmin_self_read" ON public.profiles;
CREATE POLICY "profiles_superadmin_self_read" ON public.profiles
  FOR SELECT TO authenticated
  USING (id = auth.uid() AND is_super_admin = TRUE);

-- Allow super-admins to update their own profile
DROP POLICY IF EXISTS "profiles_superadmin_self_update" ON public.profiles;
CREATE POLICY "profiles_superadmin_self_update" ON public.profiles
  FOR UPDATE TO authenticated
  USING (id = auth.uid() AND is_super_admin = TRUE)
  WITH CHECK (id = auth.uid() AND is_super_admin = TRUE);

-- Global feature flags table (no tenant_id - affects ALL tenants)
CREATE TABLE IF NOT EXISTS public.global_feature_flags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  feature_key TEXT NOT NULL UNIQUE,
  enabled BOOLEAN DEFAULT TRUE,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for feature lookup
CREATE INDEX IF NOT EXISTS idx_global_feature_flags_key
ON public.global_feature_flags(feature_key);

-- Enable RLS
ALTER TABLE public.global_feature_flags ENABLE ROW LEVEL SECURITY;

-- RLS Policies (drop and recreate for idempotency)
DROP POLICY IF EXISTS "global_feature_flags_read" ON public.global_feature_flags;
CREATE POLICY "global_feature_flags_read" ON public.global_feature_flags
  FOR SELECT TO authenticated
  USING (TRUE);

DROP POLICY IF EXISTS "global_feature_flags_superadmin_insert" ON public.global_feature_flags;
CREATE POLICY "global_feature_flags_superadmin_insert" ON public.global_feature_flags
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND is_super_admin = TRUE
    )
  );

DROP POLICY IF EXISTS "global_feature_flags_superadmin_update" ON public.global_feature_flags;
CREATE POLICY "global_feature_flags_superadmin_update" ON public.global_feature_flags
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND is_super_admin = TRUE
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND is_super_admin = TRUE
    )
  );

DROP POLICY IF EXISTS "global_feature_flags_superadmin_delete" ON public.global_feature_flags;
CREATE POLICY "global_feature_flags_superadmin_delete" ON public.global_feature_flags
  FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND is_super_admin = TRUE
    )
  );

-- Grant permissions (RLS policies control actual access)
GRANT SELECT ON public.global_feature_flags TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.global_feature_flags TO authenticated;

-- Table comment
COMMENT ON TABLE public.global_feature_flags IS 'Global feature visibility flags controllable by super-admins only';
COMMENT ON COLUMN public.profiles.is_super_admin IS 'Developer accounts with cross-tenant admin access';

-- Helper function to check if current user is super-admin
CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT is_super_admin FROM public.profiles WHERE id = auth.uid()),
    FALSE
  );
$$;

COMMENT ON FUNCTION public.is_super_admin() IS 'Returns TRUE if current user is a super-admin';

-- Seed default global RFI feature flag (enabled by default)
INSERT INTO public.global_feature_flags (feature_key, enabled, description)
VALUES ('show_rfi', true, 'Show RFI document button in header')
ON CONFLICT (feature_key) DO NOTHING;
