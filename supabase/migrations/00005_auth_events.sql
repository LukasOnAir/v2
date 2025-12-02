-- Authentication event logging (SEC-02)
-- Records login, logout, failed attempts, password resets

CREATE TABLE public.auth_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  event_type TEXT NOT NULL CHECK (event_type IN (
    'login', 'logout', 'login_failed', 'signup',
    'password_reset_request', 'password_reset_complete',
    'email_verified'
  )),
  email TEXT,
  ip_address TEXT,
  user_agent TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_auth_events_tenant_id ON public.auth_events(tenant_id);
CREATE INDEX idx_auth_events_user_id ON public.auth_events(user_id);
CREATE INDEX idx_auth_events_created_at ON public.auth_events(created_at DESC);
CREATE INDEX idx_auth_events_event_type ON public.auth_events(event_type);

-- Enable RLS
ALTER TABLE public.auth_events ENABLE ROW LEVEL SECURITY;

-- Directors and managers can view auth events for their tenant
CREATE POLICY "auth_events_tenant_read" ON public.auth_events
  FOR SELECT TO authenticated
  USING (tenant_id = public.tenant_id());

-- Insert allowed for authenticated users (frontend logs events)
CREATE POLICY "auth_events_insert" ON public.auth_events
  FOR INSERT TO authenticated
  WITH CHECK (true);  -- Allow any insert, tenant_id can be null for failed logins

-- Grant permissions
GRANT SELECT, INSERT ON public.auth_events TO authenticated;

COMMENT ON TABLE public.auth_events IS 'Authentication event log for security auditing';
