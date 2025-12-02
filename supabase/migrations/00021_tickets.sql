-- Tickets table for task management
-- Links to various entities through ticket_entity_links junction table

CREATE TABLE public.tickets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'todo' CHECK (status IN ('todo', 'in-progress', 'review', 'done')),
  priority TEXT NOT NULL CHECK (priority IN ('critical', 'high', 'medium', 'low')),
  owner TEXT NOT NULL,
  deadline DATE NOT NULL,
  notes TEXT,
  recurrence JSONB,
  done_date TIMESTAMPTZ,
  archived BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for query performance
CREATE INDEX idx_tickets_tenant ON public.tickets(tenant_id);
CREATE INDEX idx_tickets_status ON public.tickets(tenant_id, status);
CREATE INDEX idx_tickets_deadline ON public.tickets(deadline);

-- Enable RLS
ALTER TABLE public.tickets ENABLE ROW LEVEL SECURITY;

-- Tenant isolation policy
CREATE POLICY "tickets_tenant_isolation" ON public.tickets
  FOR ALL TO authenticated
  USING (tenant_id = (SELECT public.tenant_id()))
  WITH CHECK (tenant_id = (SELECT public.tenant_id()));

-- Grant permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON public.tickets TO authenticated;

COMMENT ON TABLE public.tickets IS 'Task management tickets for control maintenance and reviews';
COMMENT ON COLUMN public.tickets.status IS 'Workflow status: todo, in-progress, review, done';
COMMENT ON COLUMN public.tickets.recurrence IS 'JSONB with interval, customDays, nextDue for recurring tickets';

-- Ticket entity links junction table
-- Links tickets to various entity types (many-to-many)
CREATE TABLE public.ticket_entity_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  ticket_id UUID NOT NULL REFERENCES public.tickets(id) ON DELETE CASCADE,
  entity_type TEXT NOT NULL CHECK (entity_type IN ('control', 'risk', 'process', 'rctRow', 'remediationPlan')),
  entity_id UUID NOT NULL,
  entity_name TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT unique_ticket_entity UNIQUE (ticket_id, entity_type, entity_id)
);

-- Indexes for query performance
CREATE INDEX idx_ticket_links_tenant ON public.ticket_entity_links(tenant_id);
CREATE INDEX idx_ticket_links_ticket ON public.ticket_entity_links(ticket_id);
CREATE INDEX idx_ticket_links_entity ON public.ticket_entity_links(entity_type, entity_id);

-- Enable RLS
ALTER TABLE public.ticket_entity_links ENABLE ROW LEVEL SECURITY;

-- Tenant isolation policy
CREATE POLICY "ticket_links_tenant_isolation" ON public.ticket_entity_links
  FOR ALL TO authenticated
  USING (tenant_id = (SELECT public.tenant_id()))
  WITH CHECK (tenant_id = (SELECT public.tenant_id()));

-- Grant permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ticket_entity_links TO authenticated;

COMMENT ON TABLE public.ticket_entity_links IS 'Junction table linking tickets to controls, risks, processes, RCT rows, or remediation plans';
COMMENT ON COLUMN public.ticket_entity_links.entity_id IS 'UUID of the linked entity (not FK - references multiple tables)';
COMMENT ON COLUMN public.ticket_entity_links.entity_name IS 'Cached entity name for display without lookup';
