-- Migration: 00028_knowledge_base.sql
-- Creates knowledge_base table for shared knowledge articles

-- Create table
CREATE TABLE public.knowledge_base (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('testing-procedure', 'best-practice', 'policy', 'template', 'reference')),
  tags TEXT[] DEFAULT '{}',
  author TEXT NOT NULL,
  related_control_types TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ
);

-- Indexes for common queries
CREATE INDEX idx_knowledge_base_tenant ON public.knowledge_base(tenant_id);
CREATE INDEX idx_knowledge_base_category ON public.knowledge_base(tenant_id, category);
CREATE INDEX idx_knowledge_base_created ON public.knowledge_base(tenant_id, created_at DESC);

-- Enable Row Level Security
ALTER TABLE public.knowledge_base ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Tenant isolation for all operations
CREATE POLICY "knowledge_base_tenant_isolation" ON public.knowledge_base
  FOR ALL TO authenticated
  USING (tenant_id = (SELECT public.tenant_id()))
  WITH CHECK (tenant_id = (SELECT public.tenant_id()));

-- Grant permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON public.knowledge_base TO authenticated;

-- Comment
COMMENT ON TABLE public.knowledge_base IS 'Shared knowledge base articles within a tenant';
