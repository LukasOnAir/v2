-- Tenants table (root of multi-tenancy)
-- No RLS on tenants - access controlled via profiles

CREATE TABLE public.tenants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Comment for documentation
COMMENT ON TABLE public.tenants IS 'Root table for multi-tenant isolation';
