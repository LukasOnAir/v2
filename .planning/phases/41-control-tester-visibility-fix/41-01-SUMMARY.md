---
phase: 41
plan: 01
subsystem: controls
tags: [bug-fix, demo-mode, uuid, assignment]

dependency_graph:
  requires: [38-02]
  provides: [control-tester-visibility]
  affects: []

tech_stack:
  added: []
  patterns:
    - DEMO_TESTERS constant with real profile UUIDs
    - Migration script for data correction

key_files:
  created:
    - supabase/seed-scripts/41-01-fix-assigned-tester-ids.sql
  modified:
    - src/components/controls/ControlDetailPanel.tsx
    - .planning/STATE.md

decisions:
  - Demo mode assignment uses real profile UUIDs (not mock strings like "tester-1")
  - DEMO_TESTERS constant mirrors UUIDs from 38-02-demo-profiles.sql

metrics:
  duration: 4 min
  completed: 2026-01-28
---

# Phase 41 Plan 01: Fix Control Tester Visibility Summary

**One-liner:** Fixed ID mismatch where demo mode used mock strings ("tester-1") instead of real profile UUIDs, breaking control visibility for testers.

## What Was Built

### 1. Updated Demo Mode Assignment Dropdown

Added `DEMO_TESTERS` constant to `ControlDetailPanel.tsx` that uses real profile UUIDs matching the seed data from `38-02-demo-profiles.sql`:

```typescript
const DEMO_TESTERS = [
  { id: 'a1b2c3d4-e5f6-7890-abcd-ef1234567891', name: 'Alice Tester' },
  { id: 'a1b2c3d4-e5f6-7890-abcd-ef1234567892', name: 'Bob Tester' },
  { id: 'a1b2c3d4-e5f6-7890-abcd-ef1234567893', name: 'Carol Tester' },
] as const
```

The dropdown now:
- Shows proper names (Alice Tester, Bob Tester, Carol Tester) instead of generic "Tester 1"
- Stores real UUIDs as `assigned_tester_id` instead of mock strings
- Maintains consistency between demo mode and authenticated mode data structures

### 2. Created Migration Script

`supabase/seed-scripts/41-01-fix-assigned-tester-ids.sql` updates existing controls with mock string assignments to use real profile UUIDs:

| Mock String | Maps To | Profile |
|-------------|---------|---------|
| tester-1 | a1b2c3d4-e5f6-7890-abcd-ef1234567891 | Alice Tester |
| tester-2 | a1b2c3d4-e5f6-7890-abcd-ef1234567892 | Bob Tester |
| tester-3 | a1b2c3d4-e5f6-7890-abcd-ef1234567893 | Carol Tester |

The script is:
- Idempotent (safe to run multiple times)
- Scoped to demo tenant only (5ea03edb-6e79-4b62-bd36-39f1963d0640)
- Reports number of rows updated via RAISE NOTICE

### 3. Documented Pending Migration

Added to STATE.md pending todos: "Run supabase/seed-scripts/41-01-fix-assigned-tester-ids.sql to migrate existing mock string assignments"

## Root Cause Analysis

The bug had two components:

1. **Data mismatch:** Demo mode dropdown stored mock strings ("tester-1") in `assigned_tester_id`, but `useMyAssignedControls` queries match against `user.id` which is always a UUID.

2. **Query never matches:** When a Control Tester logs in, their `user.id` is a UUID like `a1b2c3d4-...`, but the controls table had `assigned_tester_id = 'tester-1'` - these never match.

## Deviations from Plan

None - plan executed exactly as written.

## Verification

1. Build passes with no TypeScript errors
2. DEMO_TESTERS UUIDs match 38-02-demo-profiles.sql exactly
3. Dropdown renders proper names (Alice Tester, Bob Tester, Carol Tester)
4. Migration script uses correct tenant ID and profile UUIDs

## Next Steps

- Run migration script via Supabase SQL Editor to fix existing assignments
- Note: FK constraint on profiles.id to auth.users may affect demo profiles in production environments
