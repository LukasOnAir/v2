-- Audit log for entity changes (SEC-01)
-- Records create/update/delete on multi-tenant tables

CREATE TABLE public.audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  entity_type TEXT NOT NULL,
  entity_id UUID,
  entity_name TEXT,
  change_type TEXT NOT NULL CHECK (change_type IN ('create', 'update', 'delete')),
  old_data JSONB,
  new_data JSONB,
  user_id UUID REFERENCES auth.users(id),
  user_email TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for efficient queries
CREATE INDEX idx_audit_log_tenant_id ON public.audit_log(tenant_id);
CREATE INDEX idx_audit_log_entity_type ON public.audit_log(entity_type);
CREATE INDEX idx_audit_log_created_at ON public.audit_log(created_at DESC);
CREATE INDEX idx_audit_log_entity_id ON public.audit_log(entity_id);

-- Enable RLS
ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;

-- Users can only see their tenant's audit logs
CREATE POLICY "audit_log_tenant_read" ON public.audit_log
  FOR SELECT TO authenticated
  USING (tenant_id = public.tenant_id());

-- Insert allowed for authenticated users (triggers will use this)
CREATE POLICY "audit_log_insert" ON public.audit_log
  FOR INSERT TO authenticated
  WITH CHECK (tenant_id = public.tenant_id());

-- Grant permissions
GRANT SELECT, INSERT ON public.audit_log TO authenticated;

COMMENT ON TABLE public.audit_log IS 'Audit trail for entity changes - immutable log';

-- Generic audit trigger function
CREATE OR REPLACE FUNCTION audit_changes()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.audit_log (
      tenant_id, entity_type, entity_id, entity_name, change_type, new_data, user_id, user_email
    ) VALUES (
      NEW.tenant_id,
      TG_TABLE_NAME,
      NEW.id,
      COALESCE(NEW.name, NEW.id::text),
      'create',
      to_jsonb(NEW),
      auth.uid(),
      (SELECT email FROM auth.users WHERE id = auth.uid())
    );
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    INSERT INTO public.audit_log (
      tenant_id, entity_type, entity_id, entity_name, change_type, old_data, new_data, user_id, user_email
    ) VALUES (
      NEW.tenant_id,
      TG_TABLE_NAME,
      NEW.id,
      COALESCE(NEW.name, NEW.id::text),
      'update',
      to_jsonb(OLD),
      to_jsonb(NEW),
      auth.uid(),
      (SELECT email FROM auth.users WHERE id = auth.uid())
    );
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO public.audit_log (
      tenant_id, entity_type, entity_id, entity_name, change_type, old_data, user_id, user_email
    ) VALUES (
      OLD.tenant_id,
      TG_TABLE_NAME,
      OLD.id,
      COALESCE(OLD.name, OLD.id::text),
      'delete',
      to_jsonb(OLD),
      auth.uid(),
      (SELECT email FROM auth.users WHERE id = auth.uid())
    );
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION audit_changes() IS 'Generic trigger function for audit logging';
