-- Feature flags for tenant-level and per-user feature visibility control
-- Enables Directors to toggle feature visibility (e.g., RFI button) globally or per-user

-- Feature flags table for global tenant settings
CREATE TABLE public.feature_flags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  feature_key TEXT NOT NULL,  -- e.g., 'show_rfi', 'show_matrix'
  enabled BOOLEAN DEFAULT TRUE,
  description TEXT,  -- Optional description for admin UI
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(tenant_id, feature_key)  -- One entry per feature per tenant
);

-- Add feature_overrides JSONB column to profiles for per-user overrides
-- Structure: { "show_rfi": false, "show_matrix": true }
-- Overrides global setting for this specific user
ALTER TABLE public.profiles
ADD COLUMN feature_overrides JSONB DEFAULT '{}';

-- Indexes for performance
CREATE INDEX idx_feature_flags_tenant_id ON public.feature_flags(tenant_id);
CREATE INDEX idx_feature_flags_lookup ON public.feature_flags(tenant_id, feature_key);

-- Enable RLS
ALTER TABLE public.feature_flags ENABLE ROW LEVEL SECURITY;

-- RLS Policies:
-- All authenticated users in tenant can read feature flags
CREATE POLICY "feature_flags_tenant_read" ON public.feature_flags
  FOR SELECT TO authenticated
  USING (tenant_id = public.tenant_id());

-- Only Directors can insert feature flags
CREATE POLICY "feature_flags_director_insert" ON public.feature_flags
  FOR INSERT TO authenticated
  WITH CHECK (tenant_id = public.tenant_id() AND public.user_role() = 'director');

-- Only Directors can update feature flags
CREATE POLICY "feature_flags_director_update" ON public.feature_flags
  FOR UPDATE TO authenticated
  USING (tenant_id = public.tenant_id() AND public.user_role() = 'director')
  WITH CHECK (tenant_id = public.tenant_id() AND public.user_role() = 'director');

-- Only Directors can delete feature flags
CREATE POLICY "feature_flags_director_delete" ON public.feature_flags
  FOR DELETE TO authenticated
  USING (tenant_id = public.tenant_id() AND public.user_role() = 'director');

-- Grant permissions (policies control actual access)
GRANT SELECT ON public.feature_flags TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.feature_flags TO authenticated;

-- Table comment
COMMENT ON TABLE public.feature_flags IS 'Feature visibility flags controllable by Directors';

-- Seed default RFI feature flag for demo tenant
INSERT INTO public.feature_flags (tenant_id, feature_key, enabled, description)
VALUES ('5ea03edb-6e79-4b62-bd36-39f1963d0640', 'show_rfi', true, 'Show RFI document button in header')
ON CONFLICT (tenant_id, feature_key) DO NOTHING;
