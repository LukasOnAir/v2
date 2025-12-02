-- Approval settings for per-tenant four-eye configuration
-- One row per tenant (UNIQUE constraint)

CREATE TABLE public.approval_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  global_enabled BOOLEAN DEFAULT FALSE,
  require_for_new_controls BOOLEAN DEFAULT FALSE,
  require_for_new_risks BOOLEAN DEFAULT FALSE,
  require_for_new_processes BOOLEAN DEFAULT FALSE,
  entity_overrides JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT unique_approval_settings UNIQUE (tenant_id)
);

-- Enable RLS
ALTER TABLE public.approval_settings ENABLE ROW LEVEL SECURITY;

-- Tenant isolation policy
CREATE POLICY "approval_settings_tenant_isolation" ON public.approval_settings
  FOR ALL TO authenticated
  USING (tenant_id = (SELECT public.tenant_id()))
  WITH CHECK (tenant_id = (SELECT public.tenant_id()));

-- Grant permissions (no DELETE - one row per tenant managed via upsert)
GRANT SELECT, INSERT, UPDATE ON public.approval_settings TO authenticated;

COMMENT ON TABLE public.approval_settings IS 'Per-tenant configuration for four-eye approval requirements';
COMMENT ON COLUMN public.approval_settings.global_enabled IS 'Master toggle for four-eye approval';
COMMENT ON COLUMN public.approval_settings.entity_overrides IS 'JSONB map of entityId -> boolean for per-entity overrides';
