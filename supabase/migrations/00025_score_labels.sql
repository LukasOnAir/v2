-- Score labels for custom probability/impact descriptions
-- Allows tenants to customize the 1-5 scale labels

CREATE TABLE public.score_labels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('probability', 'impact')),
  score INT NOT NULL CHECK (score BETWEEN 1 AND 5),
  label TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT unique_score_label UNIQUE (tenant_id, type, score)
);

-- Index for query performance
CREATE INDEX idx_score_labels_tenant ON public.score_labels(tenant_id);

-- Enable RLS
ALTER TABLE public.score_labels ENABLE ROW LEVEL SECURITY;

-- Tenant isolation policy
CREATE POLICY "score_labels_tenant_isolation" ON public.score_labels
  FOR ALL TO authenticated
  USING (tenant_id = (SELECT public.tenant_id()))
  WITH CHECK (tenant_id = (SELECT public.tenant_id()));

-- Grant permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON public.score_labels TO authenticated;

COMMENT ON TABLE public.score_labels IS 'Custom labels for probability and impact scores (1-5 scale)';
COMMENT ON COLUMN public.score_labels.type IS 'Score type: probability or impact';
COMMENT ON COLUMN public.score_labels.score IS 'Score value 1-5';
COMMENT ON COLUMN public.score_labels.label IS 'Display label (e.g., "Very Low", "Rare")';
