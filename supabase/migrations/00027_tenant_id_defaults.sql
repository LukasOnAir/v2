-- Migration: 00027_tenant_id_defaults.sql
-- Purpose: Auto-populate tenant_id on INSERT using trigger (DEFAULT doesn't support subqueries)
-- Phase: 26-shared-tenant-database (fix)
-- Issue: Frontend mutations don't pass tenant_id, causing inserts to fail

-- Create a reusable function that sets tenant_id from JWT claims
CREATE OR REPLACE FUNCTION public.set_tenant_id()
RETURNS TRIGGER AS $$
BEGIN
  -- Only set if not already provided
  IF NEW.tenant_id IS NULL THEN
    NEW.tenant_id := public.tenant_id();
  END IF;

  -- Fail if still null (user not authenticated or no tenant)
  IF NEW.tenant_id IS NULL THEN
    RAISE EXCEPTION 'tenant_id is required and could not be determined from session';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION public.set_tenant_id() IS 'Trigger function to auto-populate tenant_id from JWT claims on INSERT';

-- Apply trigger to all tenant-scoped tables

-- Core tables
CREATE TRIGGER trg_taxonomy_nodes_tenant_id
  BEFORE INSERT ON public.taxonomy_nodes
  FOR EACH ROW
  EXECUTE FUNCTION public.set_tenant_id();

CREATE TRIGGER trg_taxonomy_weights_tenant_id
  BEFORE INSERT ON public.taxonomy_weights
  FOR EACH ROW
  EXECUTE FUNCTION public.set_tenant_id();

CREATE TRIGGER trg_controls_tenant_id
  BEFORE INSERT ON public.controls
  FOR EACH ROW
  EXECUTE FUNCTION public.set_tenant_id();

CREATE TRIGGER trg_control_links_tenant_id
  BEFORE INSERT ON public.control_links
  FOR EACH ROW
  EXECUTE FUNCTION public.set_tenant_id();

CREATE TRIGGER trg_rct_rows_tenant_id
  BEFORE INSERT ON public.rct_rows
  FOR EACH ROW
  EXECUTE FUNCTION public.set_tenant_id();

-- Secondary tables
CREATE TRIGGER trg_control_tests_tenant_id
  BEFORE INSERT ON public.control_tests
  FOR EACH ROW
  EXECUTE FUNCTION public.set_tenant_id();

CREATE TRIGGER trg_remediation_plans_tenant_id
  BEFORE INSERT ON public.remediation_plans
  FOR EACH ROW
  EXECUTE FUNCTION public.set_tenant_id();

CREATE TRIGGER trg_custom_columns_tenant_id
  BEFORE INSERT ON public.custom_columns
  FOR EACH ROW
  EXECUTE FUNCTION public.set_tenant_id();

CREATE TRIGGER trg_tickets_tenant_id
  BEFORE INSERT ON public.tickets
  FOR EACH ROW
  EXECUTE FUNCTION public.set_tenant_id();

CREATE TRIGGER trg_ticket_entity_links_tenant_id
  BEFORE INSERT ON public.ticket_entity_links
  FOR EACH ROW
  EXECUTE FUNCTION public.set_tenant_id();

CREATE TRIGGER trg_comments_tenant_id
  BEFORE INSERT ON public.comments
  FOR EACH ROW
  EXECUTE FUNCTION public.set_tenant_id();

CREATE TRIGGER trg_pending_changes_tenant_id
  BEFORE INSERT ON public.pending_changes
  FOR EACH ROW
  EXECUTE FUNCTION public.set_tenant_id();

CREATE TRIGGER trg_approval_settings_tenant_id
  BEFORE INSERT ON public.approval_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.set_tenant_id();

CREATE TRIGGER trg_score_labels_tenant_id
  BEFORE INSERT ON public.score_labels
  FOR EACH ROW
  EXECUTE FUNCTION public.set_tenant_id();
