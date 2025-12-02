-- User profiles extending auth.users
-- Links users to tenants and stores role

CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  full_name TEXT,
  role TEXT NOT NULL DEFAULT 'control-owner' CHECK (role IN (
    'director', 'manager', 'risk-manager', 'control-owner', 'control-tester'
  )),
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for RLS performance (CRITICAL)
CREATE INDEX idx_profiles_tenant_id ON public.profiles(tenant_id);
CREATE INDEX idx_profiles_user_id ON public.profiles(id);

-- Enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Users can read profiles in their tenant
CREATE POLICY "profiles_tenant_read" ON public.profiles
  FOR SELECT TO authenticated
  USING (tenant_id = public.tenant_id());

-- Users can update their own profile (not role or tenant_id)
CREATE POLICY "profiles_self_update" ON public.profiles
  FOR UPDATE TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid() AND tenant_id = public.tenant_id());

-- Grant permissions
GRANT SELECT, UPDATE ON public.profiles TO authenticated;

COMMENT ON TABLE public.profiles IS 'User profiles with tenant and role assignment';
