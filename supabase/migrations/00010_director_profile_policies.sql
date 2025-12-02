-- Director profile management policies
-- Allows Directors to update is_active status for users in their tenant
-- Security: Directors cannot modify their own is_active status (prevents self-escalation)

-- Policy: Directors can update other users' profiles in their tenant
-- This enables deactivation/reactivation of users
-- The id != auth.uid() check prevents Directors from modifying their own status
CREATE POLICY "directors_update_user_status" ON public.profiles
  FOR UPDATE TO authenticated
  USING (
    tenant_id = public.tenant_id()
    AND public.user_role() = 'director'
    AND id != auth.uid()
  )
  WITH CHECK (
    tenant_id = public.tenant_id()
    AND public.user_role() = 'director'
    AND id != auth.uid()
  );

-- Note: The existing "profiles_self_update" policy (from 00003_profiles.sql) handles
-- users updating their own profile (name). This new policy specifically handles
-- Director -> other user updates for the is_active field.
--
-- Security considerations:
-- 1. Directors can only modify users in their own tenant (tenant_id = public.tenant_id())
-- 2. Directors cannot modify their own profile via this policy (id != auth.uid())
-- 3. This prevents a Director from accidentally or maliciously deactivating themselves
-- 4. Addresses Pitfall 5 from research: prevents role self-escalation attacks

COMMENT ON POLICY "directors_update_user_status" ON public.profiles IS 'Directors can update other users is_active status in their tenant. Self-modification blocked for security.';
