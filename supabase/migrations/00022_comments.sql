-- Threaded comments on entities
-- Supports comments on risks, processes, controls, and RCT rows

CREATE TABLE public.comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  entity_type TEXT NOT NULL CHECK (entity_type IN ('risk', 'process', 'control', 'rctRow')),
  entity_id UUID NOT NULL,
  parent_id UUID REFERENCES public.comments(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  author_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  author_role TEXT NOT NULL,
  is_edited BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ
);

-- Indexes for query performance
CREATE INDEX idx_comments_tenant ON public.comments(tenant_id);
CREATE INDEX idx_comments_entity ON public.comments(entity_type, entity_id);
CREATE INDEX idx_comments_parent ON public.comments(parent_id);

-- Enable RLS
ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;

-- Tenant isolation policy
CREATE POLICY "comments_tenant_isolation" ON public.comments
  FOR ALL TO authenticated
  USING (tenant_id = (SELECT public.tenant_id()))
  WITH CHECK (tenant_id = (SELECT public.tenant_id()));

-- Grant permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON public.comments TO authenticated;

COMMENT ON TABLE public.comments IS 'Threaded comments on risks, processes, controls, and RCT rows';
COMMENT ON COLUMN public.comments.parent_id IS 'Parent comment ID for threading (null = top-level comment)';
COMMENT ON COLUMN public.comments.entity_type IS 'Type of entity being commented on';
COMMENT ON COLUMN public.comments.is_edited IS 'Whether the comment has been edited after creation';
