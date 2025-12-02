-- Migration: 00015_controls.sql
-- Purpose: Create controls table for global control definitions within tenant
-- Phase: 26-shared-tenant-database
-- Dependencies: 00001_tenants.sql, 00003_profiles.sql

-- CONTROLS: Global control definitions within tenant
CREATE TABLE public.controls (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  control_type TEXT CHECK (control_type IN (
    'Preventative', 'Detective', 'Corrective', 'Directive',
    'Deterrent', 'Compensating', 'Acceptance', 'Tolerance',
    'Manual', 'Automated'
  )),
  net_probability INT CHECK (net_probability BETWEEN 1 AND 5),
  net_impact INT CHECK (net_impact BETWEEN 1 AND 5),
  net_score INT GENERATED ALWAYS AS (net_probability * net_impact) STORED,
  test_frequency TEXT CHECK (test_frequency IN ('monthly', 'quarterly', 'annually', 'as-needed')),
  next_test_date DATE,
  last_test_date DATE,
  test_procedure TEXT,
  assigned_tester_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  comment TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE public.controls IS 'Risk control definitions for mitigating risk-process combinations';
COMMENT ON COLUMN public.controls.control_type IS 'Type of control: Preventative, Detective, Corrective, etc.';
COMMENT ON COLUMN public.controls.net_score IS 'Auto-computed: net_probability * net_impact';
COMMENT ON COLUMN public.controls.test_frequency IS 'How often the control should be tested';
COMMENT ON COLUMN public.controls.assigned_tester_id IS 'Profile ID of user assigned to test this control';

-- Indexes
CREATE INDEX idx_controls_tenant ON public.controls(tenant_id);
CREATE INDEX idx_controls_tester ON public.controls(assigned_tester_id);

-- RLS
ALTER TABLE public.controls ENABLE ROW LEVEL SECURITY;

CREATE POLICY "controls_tenant_isolation" ON public.controls
  FOR ALL TO authenticated
  USING (tenant_id = (SELECT public.tenant_id()))
  WITH CHECK (tenant_id = (SELECT public.tenant_id()));

GRANT SELECT, INSERT, UPDATE, DELETE ON public.controls TO authenticated;

-- Updated_at trigger
CREATE OR REPLACE FUNCTION update_controls_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_controls_updated_at
  BEFORE UPDATE ON public.controls
  FOR EACH ROW
  EXECUTE FUNCTION update_controls_timestamp();
