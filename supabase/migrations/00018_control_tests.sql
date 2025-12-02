-- Control test records
-- Test executions linked to controls and optionally to specific RCT rows

CREATE TABLE public.control_tests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  control_id UUID NOT NULL REFERENCES public.controls(id) ON DELETE CASCADE,
  rct_row_id UUID REFERENCES public.rct_rows(id) ON DELETE SET NULL,
  tester_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  tester_name TEXT,
  test_date DATE NOT NULL,
  result TEXT NOT NULL CHECK (result IN ('pass', 'fail', 'partial', 'not-tested')),
  effectiveness INT CHECK (effectiveness IS NULL OR effectiveness BETWEEN 1 AND 5),
  evidence TEXT,
  findings TEXT,
  recommendations TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for query performance
CREATE INDEX idx_control_tests_tenant ON public.control_tests(tenant_id);
CREATE INDEX idx_control_tests_control ON public.control_tests(control_id);
CREATE INDEX idx_control_tests_date ON public.control_tests(test_date DESC);

-- Enable RLS
ALTER TABLE public.control_tests ENABLE ROW LEVEL SECURITY;

-- Tenant isolation policy (uses subquery pattern for performance)
CREATE POLICY "control_tests_tenant_isolation" ON public.control_tests
  FOR ALL TO authenticated
  USING (tenant_id = (SELECT public.tenant_id()))
  WITH CHECK (tenant_id = (SELECT public.tenant_id()));

-- Grant permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON public.control_tests TO authenticated;

COMMENT ON TABLE public.control_tests IS 'Control test execution records with results and findings';
COMMENT ON COLUMN public.control_tests.result IS 'Test outcome: pass, fail, partial, or not-tested';
COMMENT ON COLUMN public.control_tests.effectiveness IS 'Effectiveness rating 1-5 (optional)';
COMMENT ON COLUMN public.control_tests.rct_row_id IS 'Optional link to specific RCT row for context';
