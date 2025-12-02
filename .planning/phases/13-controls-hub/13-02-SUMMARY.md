---
phase: 13-controls-hub
plan: 02
status: complete
completed_at: 2026-01-22
---

## Summary

Created migration utility and integrated controlsStore with rctStore for net score calculation.

## What Was Built

### 1. Migration Utility (`src/utils/controlMigration.ts`)

**`migrateEmbeddedControls(rows: RCTRow[])`**
- Extracts controls from embedded `row.controls` arrays
- Preserves existing control IDs (critical for test history continuity)
- Creates one `ControlLink` per row-control pair
- Preserves row-specific scores in links

**`runMigrationIfNeeded()`**
- Checks `migrationVersion` in controlsStore (idempotent)
- Handles empty state gracefully
- Imports controls and links to controlsStore
- Marks migration complete with version 1
- Logs migration count to console

### 2. rctStore Integration (`src/stores/rctStore.ts`)

**Import added:**
```typescript
import { useControlsStore } from '@/stores/controlsStore'
```

**Helper function exported:**
```typescript
export function calculateNetScoreFromLinks(rowId: string): number | null
```
- Gets all links for a row from controlsStore
- Prefers link-specific score override, falls back to control's score
- Returns minimum score (most effective control)

### 3. App Startup Migration (`src/App.tsx`)

**Added imports:**
```typescript
import { useEffect } from 'react'
import { runMigrationIfNeeded } from '@/utils/controlMigration'
```

**Added useEffect:**
```typescript
useEffect(() => {
  runMigrationIfNeeded()
}, [])
```

Migration runs once on app load, before user interaction.

## Verification

- TypeScript compiles with `npx tsc --noEmit` - no errors
- Migration is idempotent (safe to run multiple times)
- Control IDs preserved (not regenerated)
- Links created for each row-control pair

## Files Modified

| File | Change |
|------|--------|
| `src/utils/controlMigration.ts` | Created - migration utility |
| `src/stores/rctStore.ts` | Added useControlsStore import, calculateNetScoreFromLinks export |
| `src/App.tsx` | Added useEffect and runMigrationIfNeeded import |
