-- Super-admin cross-tenant read access for impersonation feature
-- This migration adds SELECT RLS policies for super-admins on all tenant-scoped tables
-- Super-admins can read data from ANY tenant while impersonating
-- Uses the existing public.is_super_admin() function from migration 00031
-- NOTE: This migration is idempotent (safe to run multiple times)

-- =============================================================================
-- TENANT-SCOPED TABLES (15 tables)
-- =============================================================================

-- 1. controls
DROP POLICY IF EXISTS "controls_superadmin_read" ON public.controls;
CREATE POLICY "controls_superadmin_read" ON public.controls
  FOR SELECT TO authenticated
  USING (public.is_super_admin());

-- 2. rct_rows
DROP POLICY IF EXISTS "rct_rows_superadmin_read" ON public.rct_rows;
CREATE POLICY "rct_rows_superadmin_read" ON public.rct_rows
  FOR SELECT TO authenticated
  USING (public.is_super_admin());

-- 3. taxonomy_nodes
DROP POLICY IF EXISTS "taxonomy_nodes_superadmin_read" ON public.taxonomy_nodes;
CREATE POLICY "taxonomy_nodes_superadmin_read" ON public.taxonomy_nodes
  FOR SELECT TO authenticated
  USING (public.is_super_admin());

-- 4. control_links
DROP POLICY IF EXISTS "control_links_superadmin_read" ON public.control_links;
CREATE POLICY "control_links_superadmin_read" ON public.control_links
  FOR SELECT TO authenticated
  USING (public.is_super_admin());

-- 5. control_tests
DROP POLICY IF EXISTS "control_tests_superadmin_read" ON public.control_tests;
CREATE POLICY "control_tests_superadmin_read" ON public.control_tests
  FOR SELECT TO authenticated
  USING (public.is_super_admin());

-- 6. remediation_plans
DROP POLICY IF EXISTS "remediation_plans_superadmin_read" ON public.remediation_plans;
CREATE POLICY "remediation_plans_superadmin_read" ON public.remediation_plans
  FOR SELECT TO authenticated
  USING (public.is_super_admin());

-- 7. tickets
DROP POLICY IF EXISTS "tickets_superadmin_read" ON public.tickets;
CREATE POLICY "tickets_superadmin_read" ON public.tickets
  FOR SELECT TO authenticated
  USING (public.is_super_admin());

-- 8. comments
DROP POLICY IF EXISTS "comments_superadmin_read" ON public.comments;
CREATE POLICY "comments_superadmin_read" ON public.comments
  FOR SELECT TO authenticated
  USING (public.is_super_admin());

-- 9. pending_changes
DROP POLICY IF EXISTS "pending_changes_superadmin_read" ON public.pending_changes;
CREATE POLICY "pending_changes_superadmin_read" ON public.pending_changes
  FOR SELECT TO authenticated
  USING (public.is_super_admin());

-- 10. audit_log
DROP POLICY IF EXISTS "audit_log_superadmin_read" ON public.audit_log;
CREATE POLICY "audit_log_superadmin_read" ON public.audit_log
  FOR SELECT TO authenticated
  USING (public.is_super_admin());

-- 11. custom_columns
DROP POLICY IF EXISTS "custom_columns_superadmin_read" ON public.custom_columns;
CREATE POLICY "custom_columns_superadmin_read" ON public.custom_columns
  FOR SELECT TO authenticated
  USING (public.is_super_admin());

-- 12. score_labels
DROP POLICY IF EXISTS "score_labels_superadmin_read" ON public.score_labels;
CREATE POLICY "score_labels_superadmin_read" ON public.score_labels
  FOR SELECT TO authenticated
  USING (public.is_super_admin());

-- 13. taxonomy_weights
DROP POLICY IF EXISTS "taxonomy_weights_superadmin_read" ON public.taxonomy_weights;
CREATE POLICY "taxonomy_weights_superadmin_read" ON public.taxonomy_weights
  FOR SELECT TO authenticated
  USING (public.is_super_admin());

-- 14. knowledge_base
DROP POLICY IF EXISTS "knowledge_base_superadmin_read" ON public.knowledge_base;
CREATE POLICY "knowledge_base_superadmin_read" ON public.knowledge_base
  FOR SELECT TO authenticated
  USING (public.is_super_admin());

-- 15. feature_flags (tenant-scoped, NOT global_feature_flags)
DROP POLICY IF EXISTS "feature_flags_superadmin_read" ON public.feature_flags;
CREATE POLICY "feature_flags_superadmin_read" ON public.feature_flags
  FOR SELECT TO authenticated
  USING (public.is_super_admin());

-- =============================================================================
-- ADDITIONAL TABLES FOR IMPERSONATION UI
-- =============================================================================

-- tenants table - super-admin can read all tenants for tenant selection
-- First enable RLS on tenants table if not already enabled
ALTER TABLE public.tenants ENABLE ROW LEVEL SECURITY;

-- Policy for super-admin to read all tenants
DROP POLICY IF EXISTS "tenants_superadmin_read" ON public.tenants;
CREATE POLICY "tenants_superadmin_read" ON public.tenants
  FOR SELECT TO authenticated
  USING (public.is_super_admin());

-- Policy for regular users to read their own tenant
DROP POLICY IF EXISTS "tenants_own_tenant_read" ON public.tenants;
CREATE POLICY "tenants_own_tenant_read" ON public.tenants
  FOR SELECT TO authenticated
  USING (id = public.tenant_id());

-- profiles table - super-admin can read all profiles for profile selection within tenant
-- Note: profiles_superadmin_self_read already exists from 00031 for super-admin's own profile
-- This policy allows super-admin to read ALL profiles (for impersonation selection)
DROP POLICY IF EXISTS "profiles_superadmin_all_read" ON public.profiles;
CREATE POLICY "profiles_superadmin_all_read" ON public.profiles
  FOR SELECT TO authenticated
  USING (public.is_super_admin());

-- =============================================================================
-- COMMENTS
-- =============================================================================

COMMENT ON POLICY "controls_superadmin_read" ON public.controls IS 'Allow super-admins to read all controls for impersonation';
COMMENT ON POLICY "rct_rows_superadmin_read" ON public.rct_rows IS 'Allow super-admins to read all RCT rows for impersonation';
COMMENT ON POLICY "taxonomy_nodes_superadmin_read" ON public.taxonomy_nodes IS 'Allow super-admins to read all taxonomy nodes for impersonation';
COMMENT ON POLICY "tenants_superadmin_read" ON public.tenants IS 'Allow super-admins to read all tenants for tenant switching';
COMMENT ON POLICY "profiles_superadmin_all_read" ON public.profiles IS 'Allow super-admins to read all profiles for profile impersonation';
