---
phase: 24-demo-seeders-deployment
plan: 04
subsystem: api
tags: [edge-function, demo-data, seeders, react, zustand, tenant-setup]

# Dependency graph
requires:
  - phase: 24-01
    provides: Preset data modules (casino, bank, insurer, generic, empty)
  - phase: 21
    provides: Auth context with tenantId, role from app_metadata
provides:
  - seed-demo-data Edge Function for loading preset data
  - PresetSelector UI component with 5 industry-specific options
  - TenantSetupPage for Director onboarding flow
affects: [24-05 (deployment), 25 (database sync)]

# Tech tracking
tech-stack:
  added: []
  patterns: [Edge Function returns data for frontend store loading]

key-files:
  created:
    - supabase/functions/seed-demo-data/index.ts
    - src/components/admin/PresetSelector.tsx
    - src/pages/TenantSetupPage.tsx
  modified:
    - src/App.tsx

key-decisions:
  - "Edge Function returns JSON for Zustand store loading (no database tables yet)"
  - "Director-only access enforced via JWT app_metadata check"
  - "TenantSetupPage is protected route but outside Layout (standalone wizard)"
  - "Path-based taxonomy lookup for RCT pairing resolution"

patterns-established:
  - "Preset selection UI: card-based grid with icons and industry tags"
  - "Tenant setup wizard: standalone page calling Edge Function, then redirect"

# Metrics
duration: 6min
completed: 2026-01-25
---

# Phase 24 Plan 04: Seed Function & Setup UI Summary

**Edge Function that processes preset data and returns JSON for Zustand stores, with PresetSelector card UI and TenantSetupPage wizard for Director onboarding**

## Performance

- **Duration:** 6 min
- **Started:** 2026-01-25T13:44:25Z
- **Completed:** 2026-01-25T13:50:07Z
- **Tasks:** 2
- **Files created:** 3
- **Files modified:** 1

## Accomplishments

- Created seed-demo-data Edge Function that validates requests, verifies Director access, and processes preset data
- Edge Function generates UUIDs, hierarchical IDs, and RCT rows from pairing definitions
- PresetSelector component with 5 options (casino, bank, insurer, generic, empty) with visual cards
- TenantSetupPage wizard that calls Edge Function and loads data into Zustand stores
- Route added at /tenant-setup within protected area (requires auth)

## Task Commits

Each task was committed atomically:

1. **Task 1: Create seed-demo-data Edge Function** - `3edfbfa` (feat)
2. **Task 2: Create PresetSelector and TenantSetupPage** - `b4bf622` (feat)

## Files Created/Modified

- `supabase/functions/seed-demo-data/index.ts` - Edge Function that processes preset data, validates JWT, returns JSON
- `src/components/admin/PresetSelector.tsx` - Card-based UI for selecting demo preset
- `src/pages/TenantSetupPage.tsx` - Setup wizard page for Directors
- `src/App.tsx` - Added /tenant-setup route

## Decisions Made

1. **Edge Function returns JSON for frontend store loading** - Since there are no database tables for risks/processes/controls yet, the Edge Function returns processed data that the frontend loads directly into Zustand stores. This avoids database schema dependency while still providing the seed data functionality.

2. **Director-only access via JWT check** - The Edge Function verifies the caller's app_metadata.role is 'director' and their tenant_id matches the request. This ensures only tenant administrators can seed demo data.

3. **TenantSetupPage outside Layout** - The setup page is a standalone wizard (no sidebar/header) to provide a focused onboarding experience, but still requires authentication via ProtectedRoute.

4. **Path-based taxonomy lookup** - RCT pairings use taxonomy name arrays (paths) that are resolved to actual IDs at runtime. This allows the preset definitions to be human-readable while the function handles ID generation.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None - all files created successfully and TypeScript compiles.

## User Setup Required

None - no external service configuration required. The Edge Function uses standard Supabase environment variables (SUPABASE_URL, SUPABASE_ANON_KEY) that are auto-injected.

## Next Phase Readiness

- seed-demo-data Edge Function ready for deployment with `supabase functions deploy`
- TenantSetupPage accessible at /tenant-setup for authenticated Directors
- Demo data flow: Select preset -> Call Edge Function -> Load into stores -> Navigate to taxonomy
- Integration testing recommended with actual Supabase project

---
*Phase: 24-demo-seeders-deployment*
*Completed: 2026-01-25*
