-- Migration: 00016_control_links.sql
-- Purpose: Create control_links junction table for many-to-many between controls and RCT rows
-- Phase: 26-shared-tenant-database
-- Dependencies: 00001_tenants.sql, 00015_controls.sql
-- Note: References rct_rows which is created in 00017, FK will be added after

-- CONTROL_LINKS: Many-to-many between controls and RCT rows
-- Note: rct_row_id FK added after rct_rows table exists (see bottom of this migration)
CREATE TABLE public.control_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  control_id UUID NOT NULL REFERENCES public.controls(id) ON DELETE CASCADE,
  rct_row_id UUID NOT NULL,
  -- Per-link score overrides (row-specific effectiveness)
  net_probability INT CHECK (net_probability BETWEEN 1 AND 5),
  net_impact INT CHECK (net_impact BETWEEN 1 AND 5),
  net_score INT GENERATED ALWAYS AS (net_probability * net_impact) STORED,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT unique_control_row UNIQUE (control_id, rct_row_id)
);

COMMENT ON TABLE public.control_links IS 'Junction table linking controls to RCT rows (many-to-many)';
COMMENT ON COLUMN public.control_links.rct_row_id IS 'Reference to RCT row (FK added after rct_rows table creation)';
COMMENT ON COLUMN public.control_links.net_probability IS 'Per-link probability override (row-specific effectiveness)';
COMMENT ON COLUMN public.control_links.net_impact IS 'Per-link impact override (row-specific effectiveness)';
COMMENT ON COLUMN public.control_links.net_score IS 'Auto-computed: net_probability * net_impact';

-- Indexes
CREATE INDEX idx_control_links_tenant ON public.control_links(tenant_id);
CREATE INDEX idx_control_links_control ON public.control_links(control_id);
CREATE INDEX idx_control_links_row ON public.control_links(rct_row_id);

-- RLS
ALTER TABLE public.control_links ENABLE ROW LEVEL SECURITY;

CREATE POLICY "control_links_tenant_isolation" ON public.control_links
  FOR ALL TO authenticated
  USING (tenant_id = (SELECT public.tenant_id()))
  WITH CHECK (tenant_id = (SELECT public.tenant_id()));

GRANT SELECT, INSERT, UPDATE, DELETE ON public.control_links TO authenticated;
