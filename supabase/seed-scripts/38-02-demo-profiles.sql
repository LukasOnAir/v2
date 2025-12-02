-- Demo tenant control-tester and control-owner users for assignment dropdown
-- Phase 38-02: Control Assignment & Hub Parity
--
-- These profiles are for demonstration and testing purposes only.
-- Demo tenant UUID: 5ea03edb-6e79-4b62-bd36-39f1963d0640
--
-- NOTE: For these profiles to appear in the assignment dropdown, they need
-- matching entries in auth.users (Supabase Auth). In production, users are
-- created via the invite flow which creates both auth.users and profiles.
--
-- For development/testing with these demo profiles:
-- 1. Use Supabase Dashboard to create auth users with matching IDs, OR
-- 2. Use service role API to create auth users programmatically
--
-- This seed is idempotent - uses ON CONFLICT DO UPDATE for re-runability.

DO $$
DECLARE
  demo_tenant_id UUID := '5ea03edb-6e79-4b62-bd36-39f1963d0640';
  tester1_id UUID := 'a1b2c3d4-e5f6-7890-abcd-ef1234567891';
  tester2_id UUID := 'a1b2c3d4-e5f6-7890-abcd-ef1234567892';
  tester3_id UUID := 'a1b2c3d4-e5f6-7890-abcd-ef1234567893';
  owner1_id UUID := 'b1c2d3e4-f5a6-7890-bcde-f12345678901';
  owner2_id UUID := 'b1c2d3e4-f5a6-7890-bcde-f12345678902';
BEGIN
  -- Insert profiles for control testers
  -- These users appear in the "Assigned Tester" dropdown in ControlDetailPanel
  INSERT INTO public.profiles (id, tenant_id, full_name, role, is_active)
  VALUES
    (tester1_id, demo_tenant_id, 'Alice Tester', 'control-tester', true),
    (tester2_id, demo_tenant_id, 'Bob Tester', 'control-tester', true),
    (tester3_id, demo_tenant_id, 'Carol Tester', 'control-tester', true),
    (owner1_id, demo_tenant_id, 'David Owner', 'control-owner', true),
    (owner2_id, demo_tenant_id, 'Eve Owner', 'control-owner', true)
  ON CONFLICT (id) DO UPDATE SET
    full_name = EXCLUDED.full_name,
    role = EXCLUDED.role,
    is_active = EXCLUDED.is_active;

  RAISE NOTICE 'Demo profiles seeded: 3 control-testers, 2 control-owners for tenant %', demo_tenant_id;
END $$;

-- Verification query (run manually to confirm):
-- SELECT id, full_name, role, is_active
-- FROM public.profiles
-- WHERE tenant_id = '5ea03edb-6e79-4b62-bd36-39f1963d0640'
-- AND role IN ('control-tester', 'control-owner');
