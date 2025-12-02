-- Pending invitations table for Director-managed user invitations
-- Stores invitation tokens with 7-day expiry, bypassing Supabase Auth's 24-hour limit
-- Part of USER-01, USER-02, USER-03, USER-04 requirements

CREATE TABLE public.pending_invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN (
    'manager', 'risk-manager', 'control-owner', 'control-tester'
  )),
  token UUID NOT NULL DEFAULT gen_random_uuid(),
  invited_by UUID NOT NULL REFERENCES auth.users(id),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '7 days'),
  accepted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),

  -- Prevent duplicate invitations for same email in same tenant
  CONSTRAINT unique_pending_email_tenant UNIQUE (tenant_id, email)
);

-- Note: 'director' role is NOT included in the role check constraint
-- Directors are bootstrapped via other means (tenant creation or manual setup)

-- Indexes for performance
CREATE INDEX idx_pending_invitations_token ON public.pending_invitations(token);
CREATE INDEX idx_pending_invitations_tenant ON public.pending_invitations(tenant_id);

-- Enable Row Level Security
ALTER TABLE public.pending_invitations ENABLE ROW LEVEL SECURITY;

-- Directors in the same tenant can manage all invitations (SELECT, INSERT, UPDATE, DELETE)
CREATE POLICY "directors_manage_invitations" ON public.pending_invitations
  FOR ALL TO authenticated
  USING (
    tenant_id = public.tenant_id()
    AND public.user_role() = 'director'
  )
  WITH CHECK (
    tenant_id = public.tenant_id()
    AND public.user_role() = 'director'
  );

-- Grant permissions to authenticated users (RLS enforces Director-only access)
GRANT SELECT, INSERT, UPDATE, DELETE ON public.pending_invitations TO authenticated;

COMMENT ON TABLE public.pending_invitations IS 'Stores pending user invitations with 7-day expiry. Directors create invitations; users accept via token to join tenant.';
COMMENT ON COLUMN public.pending_invitations.token IS 'Unique invitation token sent in email link. Used for acceptance lookup.';
COMMENT ON COLUMN public.pending_invitations.expires_at IS 'Invitation expires 7 days after creation by default.';
COMMENT ON COLUMN public.pending_invitations.accepted_at IS 'NULL until user accepts invitation and creates account.';
