-- Migration: 00017_rct_rows.sql
-- Purpose: Create rct_rows table for Risk-Process combinations with scores
-- Phase: 26-shared-tenant-database
-- Dependencies: 00001_tenants.sql, 00013_taxonomy_nodes.sql, 00016_control_links.sql

-- RCT_ROWS: Risk-Process combinations with scores
-- row_id is composite: lowest-level risk UUID + ":" + lowest-level process UUID
CREATE TABLE public.rct_rows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  row_id TEXT NOT NULL,  -- "{riskLeafId}:{processLeafId}"
  risk_id UUID NOT NULL REFERENCES public.taxonomy_nodes(id) ON DELETE CASCADE,
  process_id UUID NOT NULL REFERENCES public.taxonomy_nodes(id) ON DELETE CASCADE,
  gross_probability INT CHECK (gross_probability BETWEEN 1 AND 5),
  gross_impact INT CHECK (gross_impact BETWEEN 1 AND 5),
  gross_score INT GENERATED ALWAYS AS (gross_probability * gross_impact) STORED,
  gross_probability_comment TEXT,
  gross_impact_comment TEXT,
  risk_appetite INT DEFAULT 9,
  within_appetite INT GENERATED ALWAYS AS (risk_appetite - (gross_probability * gross_impact)) STORED,
  custom_values JSONB DEFAULT '{}',  -- Dynamic custom columns
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT unique_row_per_tenant UNIQUE (tenant_id, row_id)
);

COMMENT ON TABLE public.rct_rows IS 'Risk Control Table rows: risk-process combinations with scores';
COMMENT ON COLUMN public.rct_rows.row_id IS 'Composite key: {riskLeafId}:{processLeafId}';
COMMENT ON COLUMN public.rct_rows.risk_id IS 'Reference to lowest-level risk taxonomy node';
COMMENT ON COLUMN public.rct_rows.process_id IS 'Reference to lowest-level process taxonomy node';
COMMENT ON COLUMN public.rct_rows.gross_score IS 'Auto-computed: gross_probability * gross_impact';
COMMENT ON COLUMN public.rct_rows.within_appetite IS 'Auto-computed: risk_appetite - gross_score';
COMMENT ON COLUMN public.rct_rows.custom_values IS 'JSONB storage for user-defined custom columns';

-- Indexes
CREATE INDEX idx_rct_tenant ON public.rct_rows(tenant_id);
CREATE INDEX idx_rct_row_id ON public.rct_rows(tenant_id, row_id);
CREATE INDEX idx_rct_risk ON public.rct_rows(risk_id);
CREATE INDEX idx_rct_process ON public.rct_rows(process_id);
CREATE INDEX idx_rct_custom_values ON public.rct_rows USING GIN(custom_values);

-- RLS
ALTER TABLE public.rct_rows ENABLE ROW LEVEL SECURITY;

CREATE POLICY "rct_tenant_isolation" ON public.rct_rows
  FOR ALL TO authenticated
  USING (tenant_id = (SELECT public.tenant_id()))
  WITH CHECK (tenant_id = (SELECT public.tenant_id()));

GRANT SELECT, INSERT, UPDATE, DELETE ON public.rct_rows TO authenticated;

-- Updated_at trigger
CREATE OR REPLACE FUNCTION update_rct_rows_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_rct_rows_updated_at
  BEFORE UPDATE ON public.rct_rows
  FOR EACH ROW
  EXECUTE FUNCTION update_rct_rows_timestamp();

-- Now add the FK from control_links to rct_rows
ALTER TABLE public.control_links
  ADD CONSTRAINT fk_control_links_rct_row
  FOREIGN KEY (rct_row_id) REFERENCES public.rct_rows(id) ON DELETE CASCADE;
