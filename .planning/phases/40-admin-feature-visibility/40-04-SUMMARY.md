# Plan 40-04 Summary: Super-admin Database Schema

**Status:** Complete
**Duration:** 3 min
**Date:** 2026-01-28

## What Was Done

### Task 1: Create global feature flags migration
Created `supabase/migrations/00031_super_admin_and_global_flags.sql` with:
- `is_super_admin` BOOLEAN column added to `profiles` table
- `tenant_id` made nullable for super-admins (CHECK constraint enforces tenant_id required for non-super-admins)
- RLS policies for super-admins to read/update their own profile
- Partial index for efficient super-admin lookups
- `global_feature_flags` table (no tenant_id - affects ALL tenants)
- RLS policies: read for all authenticated, write only for super-admins
- `is_super_admin()` helper function
- Seed data with `show_rfi` flag enabled by default

### Task 2: Update TypeScript types
Updated `src/lib/supabase/types.ts`:
- Added `GlobalFeatureFlagRow` interface
- Added `is_super_admin` to profiles Row/Insert/Update types
- Added `global_feature_flags` table definition to Database interface
- Added `is_super_admin` function to Functions interface

## Files Changed
- `supabase/migrations/00031_super_admin_and_global_flags.sql` (created)
- `src/lib/supabase/types.ts` (modified)

## Verification
- [x] Migration 00031 exists with global_feature_flags table
- [x] global_feature_flags table has no tenant_id column
- [x] is_super_admin column added to profiles
- [x] RLS policies restrict write access to super-admins only
- [x] is_super_admin() helper function created
- [x] TypeScript types updated for global flags and super-admin
- [x] TypeScript compiles without errors

## Notes
- Global feature flags are tenant-agnostic - affect ALL tenants
- Super-admin is a developer account outside the normal 5-role hierarchy
- Existing tenant-scoped `feature_flags` table remains for legacy/compatibility
