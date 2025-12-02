---
phase: 36-mobile-control-tester
plan: 03
subsystem: ui
tags: [mobile, wizard, pwa, photo-upload, supabase-storage, offline]

# Dependency graph
requires:
  - phase: 36-01
    provides: PWA infrastructure
  - phase: 36-02
    provides: Offline queue and sync hooks
provides:
  - Step-by-step test wizard for mobile testers
  - Photo upload to Supabase storage
  - Full-screen wizard overlay for immersive mobile experience
  - Offline test submission with automatic reconnect sync
affects: [36-05, mobile-testing, tester-experience]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - Full-screen overlay wizard pattern for mobile
    - capture="environment" for rear camera access
    - Supabase storage upload with public URLs

key-files:
  created:
    - supabase/migrations/00029_test_evidence_bucket.sql
    - src/components/tester/PhotoUpload.tsx
    - src/components/tester/TestWizard.tsx
    - src/components/tester/WizardStep.tsx
  modified:
    - src/components/tester/index.ts
    - src/components/tester/TesterControlCard.tsx
    - src/pages/TesterDashboardPage.tsx

key-decisions:
  - "Use capture=environment for rear camera (common for evidence photos)"
  - "4-step wizard: Review > Result > Evidence > Submit"
  - "Result buttons: Pass/Fail/Partially (jargon-free labels)"
  - "Full-screen overlay for immersive mobile wizard experience"
  - "Combine photo URL and notes into single evidence field"

patterns-established:
  - "Full-screen wizard pattern: fixed inset-0 z-50 with header close button"
  - "WizardStep component for consistent step layout"
  - "PhotoUpload with preview and Supabase storage integration"

# Metrics
duration: 5min
completed: 2026-01-28
---

# Phase 36 Plan 03: Guided Testing Flow Summary

**Step-by-step test wizard with 4-stage flow, photo upload to Supabase storage, and full-screen mobile overlay**

## Performance

- **Duration:** 5 min
- **Started:** 2026-01-28T10:17:22Z
- **Completed:** 2026-01-28T10:22:07Z
- **Tasks:** 3
- **Files modified:** 7

## Accomplishments

- Created test-evidence storage bucket with RLS policies for photo uploads
- Built PhotoUpload component with camera capture and Supabase storage integration
- Implemented TestWizard with 4 clear steps: Review, Result, Evidence, Submit
- Integrated wizard as full-screen overlay in TesterControlCard
- Added OfflineIndicator and auto-sync to TesterDashboardPage

## Task Commits

Each task was committed atomically:

1. **Task 1: Create storage bucket migration and PhotoUpload component** - `855b3c1` (feat)
2. **Task 2: Create TestWizard and WizardStep components** - `36ff093` (feat)
3. **Task 3: Integrate TestWizard into TesterControlCard and Dashboard** - `d5793db` (feat)

## Files Created/Modified

- `supabase/migrations/00029_test_evidence_bucket.sql` - Storage bucket with RLS for test evidence photos
- `src/components/tester/PhotoUpload.tsx` - Camera capture and Supabase upload component
- `src/components/tester/WizardStep.tsx` - Reusable step wrapper with title/subtitle
- `src/components/tester/TestWizard.tsx` - 4-step guided test flow with progress bar
- `src/components/tester/index.ts` - Barrel exports for new components
- `src/components/tester/TesterControlCard.tsx` - Full-screen wizard overlay integration
- `src/pages/TesterDashboardPage.tsx` - OfflineIndicator and usePendingSync activation

## Decisions Made

- **capture="environment"**: Rear camera is more appropriate for evidence photos (front camera uses "user")
- **4-step wizard structure**: Keeps each step focused and reduces cognitive load
- **Jargon-free labels**: "Pass/Fail/Partially" instead of "Effective/Ineffective/Partially Effective"
- **Full-screen overlay**: Provides immersive mobile experience without distractions
- **Evidence combination**: Photo URL and notes merged into single evidence field for simplicity

## Deviations from Plan

None - plan executed exactly as written.

## User Setup Required

**External services require manual configuration.** Run the storage bucket migration or create manually:

1. Run `npx supabase db push` to apply migration 00029, OR
2. Go to Supabase Dashboard > Storage and create bucket named "test-evidence" with public access

## Next Phase Readiness

- Guided testing flow complete with offline support
- Ready for 36-05 (Test/Verification) to validate mobile experience
- Photo upload requires storage bucket to be created (migration or dashboard)

---
*Phase: 36-mobile-control-tester*
*Completed: 2026-01-28*
