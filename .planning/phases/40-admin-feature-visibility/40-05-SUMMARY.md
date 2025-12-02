# Plan 40-05 Summary: Admin App UI

**Status:** Complete
**Duration:** 4 min
**Date:** 2026-01-28

## What Was Done

### Task 1: Update useFeatureFlags hook
Rewrote `src/hooks/useFeatureFlags.ts` to query `global_feature_flags` instead of tenant-scoped `feature_flags`:
- Query key changed to `['global-feature-flags']`
- Import changed to `GlobalFeatureFlagRow` type
- Priority chain: User override > Global flag > Demo default

### Task 2: Create useGlobalFeatureFlagAdmin hook
Created `src/hooks/useGlobalFeatureFlagAdmin.ts` with:
- Query for all global feature flags (ordered by key)
- `toggleFlag` mutation for enabling/disabling
- `createFlag` mutation for adding new flags
- `deleteFlag` mutation for removing flags
- Proper query invalidation on mutations

### Task 3: Create AdminLayout and AdminFeatureFlagsPage
Created admin app infrastructure:
- `src/components/admin/AdminLayout.tsx`: Layout wrapper with super-admin gate
  - Checks `is_super_admin` from profiles
  - Redirects non-admins to home
  - Simple header with "RiskLytix Admin" branding
- `src/pages/admin/AdminFeatureFlagsPage.tsx`: Feature flags management UI
  - Lists all global flags with toggle switches
  - Add new flag form with key and description
  - Delete flag with confirmation
  - Info box explaining global impact

### Task 4: Add admin routes to App.tsx
Updated `src/App.tsx`:
- Added imports for AdminLayout and AdminFeatureFlagsPage
- Added `/admin/*` routes outside ProtectedRoute (AdminLayout handles auth)
- `/admin` redirects to `/admin/feature-flags`

## Files Changed
- `src/hooks/useFeatureFlags.ts` (modified)
- `src/hooks/useGlobalFeatureFlagAdmin.ts` (created)
- `src/components/admin/AdminLayout.tsx` (created)
- `src/pages/admin/AdminFeatureFlagsPage.tsx` (created)
- `src/App.tsx` (modified)

## Verification
- [x] useFeatureFlags queries global_feature_flags table
- [x] useGlobalFeatureFlagAdmin hook has CRUD operations
- [x] AdminLayout checks is_super_admin and redirects non-admins
- [x] AdminFeatureFlagsPage renders with toggle controls
- [x] App.tsx has /admin/* routes
- [x] Regular users redirected from /admin routes
- [x] Demo mode still shows all features
- [x] App builds without errors

## Notes
- Admin routes are separate from tenant app (not in Layout)
- Super-admin access is determined by `is_super_admin` column in profiles
- Super-admins have `tenant_id = NULL` (not tied to any tenant)
- To create a super-admin:
  1. Create user in Supabase Auth
  2. Insert profile: `INSERT INTO profiles (id, tenant_id, is_super_admin, role) VALUES ('user-uuid', NULL, TRUE, 'director')`
