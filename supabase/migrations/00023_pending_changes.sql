-- Pending changes for four-eye approval workflow
-- Tracks proposed modifications awaiting manager review

CREATE TABLE public.pending_changes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  entity_type TEXT NOT NULL CHECK (entity_type IN ('control', 'risk', 'process')),
  entity_id UUID NOT NULL,
  entity_name TEXT NOT NULL,
  change_type TEXT NOT NULL CHECK (change_type IN ('create', 'update', 'delete')),
  current_values JSONB DEFAULT '{}',
  proposed_values JSONB NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  submitted_by TEXT NOT NULL,
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  reviewed_by TEXT,
  reviewed_at TIMESTAMPTZ,
  rejection_reason TEXT,
  version INT DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for query performance
CREATE INDEX idx_pending_changes_tenant ON public.pending_changes(tenant_id);
CREATE INDEX idx_pending_changes_status ON public.pending_changes(tenant_id, status);
CREATE INDEX idx_pending_changes_entity ON public.pending_changes(entity_type, entity_id);

-- Enable RLS
ALTER TABLE public.pending_changes ENABLE ROW LEVEL SECURITY;

-- Tenant isolation policy
CREATE POLICY "pending_changes_tenant_isolation" ON public.pending_changes
  FOR ALL TO authenticated
  USING (tenant_id = (SELECT public.tenant_id()))
  WITH CHECK (tenant_id = (SELECT public.tenant_id()));

-- Grant permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON public.pending_changes TO authenticated;

COMMENT ON TABLE public.pending_changes IS 'Four-eye approval workflow for control, risk, and process changes';
COMMENT ON COLUMN public.pending_changes.current_values IS 'Snapshot of values at submission time';
COMMENT ON COLUMN public.pending_changes.proposed_values IS 'New values (full for create, delta for update)';
COMMENT ON COLUMN public.pending_changes.version IS 'Increments on re-edit before approval';
