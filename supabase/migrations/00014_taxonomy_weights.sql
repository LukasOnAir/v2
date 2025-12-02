-- Migration: 00014_taxonomy_weights.sql
-- Purpose: Create taxonomy_weights table for per-node and per-level weight configuration
-- Phase: 26-shared-tenant-database
-- Dependencies: 00001_tenants.sql, 00013_taxonomy_nodes.sql

-- TAXONOMY WEIGHTS: Per-node and per-level weight configuration
CREATE TABLE public.taxonomy_weights (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('risk', 'process')),
  -- NULL node_id = level default, non-NULL = node override
  node_id UUID REFERENCES public.taxonomy_nodes(id) ON DELETE CASCADE,
  level INT CHECK (level BETWEEN 1 AND 5),
  weight NUMERIC(3,1) NOT NULL DEFAULT 1.0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT unique_weight UNIQUE (tenant_id, type, node_id, level)
);

COMMENT ON TABLE public.taxonomy_weights IS 'Weight configuration for taxonomy aggregation calculations';
COMMENT ON COLUMN public.taxonomy_weights.node_id IS 'NULL for level defaults, non-NULL for node-specific overrides';
COMMENT ON COLUMN public.taxonomy_weights.level IS 'Taxonomy level (1-5) for level default weights';
COMMENT ON COLUMN public.taxonomy_weights.weight IS 'Weight multiplier for score aggregation';

-- Index for efficient lookups
CREATE INDEX idx_weights_tenant ON public.taxonomy_weights(tenant_id, type);

-- RLS
ALTER TABLE public.taxonomy_weights ENABLE ROW LEVEL SECURITY;

CREATE POLICY "weights_tenant_isolation" ON public.taxonomy_weights
  FOR ALL TO authenticated
  USING (tenant_id = (SELECT public.tenant_id()))
  WITH CHECK (tenant_id = (SELECT public.tenant_id()));

GRANT SELECT, INSERT, UPDATE, DELETE ON public.taxonomy_weights TO authenticated;
