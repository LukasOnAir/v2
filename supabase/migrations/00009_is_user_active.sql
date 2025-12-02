-- Helper function to check if current user is active
-- Used in RLS policies to enforce deactivation at database level
-- Addresses Pitfall 3: Deactivated user JWT is still valid until expiry

CREATE OR REPLACE FUNCTION public.is_user_active()
RETURNS BOOLEAN AS $$
  SELECT COALESCE(
    (SELECT is_active FROM public.profiles WHERE id = auth.uid()),
    FALSE
  );
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- SECURITY DEFINER: Allows RLS policies to call this even when user's access is restricted
-- STABLE: Result doesn't change within a transaction (performance hint)
-- COALESCE FALSE: Fail-safe - if no profile found, treat as inactive

COMMENT ON FUNCTION public.is_user_active() IS 'Returns TRUE if current user''s profile is_active, FALSE otherwise. Used in RLS policies to block deactivated users at database level.';
