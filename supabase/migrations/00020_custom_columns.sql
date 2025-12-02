-- Custom column definitions for RCT
-- User-defined columns that extend the Risk Control Table

CREATE TABLE public.custom_columns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('text', 'number', 'dropdown', 'date', 'formula')),
  options TEXT[],
  formula TEXT,
  width INT,
  sort_order INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for query performance
CREATE INDEX idx_custom_columns_tenant ON public.custom_columns(tenant_id);

-- Enable RLS
ALTER TABLE public.custom_columns ENABLE ROW LEVEL SECURITY;

-- Tenant isolation policy
CREATE POLICY "custom_columns_tenant_isolation" ON public.custom_columns
  FOR ALL TO authenticated
  USING (tenant_id = (SELECT public.tenant_id()))
  WITH CHECK (tenant_id = (SELECT public.tenant_id()));

-- Grant permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON public.custom_columns TO authenticated;

COMMENT ON TABLE public.custom_columns IS 'User-defined column definitions for the Risk Control Table';
COMMENT ON COLUMN public.custom_columns.type IS 'Column type: text, number, dropdown, date, or formula';
COMMENT ON COLUMN public.custom_columns.options IS 'Array of dropdown options (for dropdown type)';
COMMENT ON COLUMN public.custom_columns.formula IS 'Formula expression (for formula type)';
