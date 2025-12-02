-- Remediation plans for failed control tests
-- Action plans to address control deficiencies

CREATE TABLE public.remediation_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  control_test_id UUID NOT NULL REFERENCES public.control_tests(id) ON DELETE CASCADE,
  control_id UUID NOT NULL REFERENCES public.controls(id) ON DELETE CASCADE,
  rct_row_id UUID REFERENCES public.rct_rows(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT,
  owner TEXT NOT NULL,
  deadline DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'in-progress', 'resolved', 'closed')),
  priority TEXT NOT NULL CHECK (priority IN ('critical', 'high', 'medium', 'low')),
  action_items JSONB DEFAULT '[]',
  notes TEXT,
  created_date DATE NOT NULL DEFAULT CURRENT_DATE,
  resolved_date DATE,
  closed_date DATE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for query performance
CREATE INDEX idx_remediation_plans_tenant ON public.remediation_plans(tenant_id);
CREATE INDEX idx_remediation_plans_status ON public.remediation_plans(tenant_id, status);
CREATE INDEX idx_remediation_plans_deadline ON public.remediation_plans(deadline);

-- Enable RLS
ALTER TABLE public.remediation_plans ENABLE ROW LEVEL SECURITY;

-- Tenant isolation policy
CREATE POLICY "remediation_plans_tenant_isolation" ON public.remediation_plans
  FOR ALL TO authenticated
  USING (tenant_id = (SELECT public.tenant_id()))
  WITH CHECK (tenant_id = (SELECT public.tenant_id()));

-- Grant permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON public.remediation_plans TO authenticated;

COMMENT ON TABLE public.remediation_plans IS 'Remediation plans to address control test failures';
COMMENT ON COLUMN public.remediation_plans.action_items IS 'JSONB array of {id, description, completed, completedDate}';
COMMENT ON COLUMN public.remediation_plans.status IS 'Workflow status: open -> in-progress -> resolved -> closed';
COMMENT ON COLUMN public.remediation_plans.priority IS 'Priority level: critical, high, medium, or low';
