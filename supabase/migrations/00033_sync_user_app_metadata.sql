-- Sync app_metadata for users who signed up directly (bypassing invitation flow)
-- These users have profiles but missing JWT app_metadata, causing RLS to return no data
-- This migration is idempotent - safe to run multiple times

UPDATE auth.users u
SET raw_app_meta_data = COALESCE(u.raw_app_meta_data, '{}'::jsonb) || jsonb_build_object(
  'tenant_id', p.tenant_id::text,
  'role', p.role
)
FROM public.profiles p
WHERE u.id = p.id
  AND (u.raw_app_meta_data->>'tenant_id' IS NULL
   OR u.raw_app_meta_data->>'role' IS NULL);
