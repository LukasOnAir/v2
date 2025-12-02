---
phase: 13-controls-hub
plan: 01
status: complete
completed_at: 2026-01-22
---

## Summary

Created the ControlLink type and controlsStore foundation for the Controls Hub feature.

## What Was Built

### 1. ControlLink Interface (`src/types/rct.ts`)
- Added `ControlLink` interface as a many-to-many junction table
- Fields: `id`, `controlId`, `rowId`, optional score overrides (`netProbability`, `netImpact`, `netScore`), `createdAt`
- Enables one control to link to multiple RCT rows

### 2. Updated EntityType (`src/types/audit.ts`)
- Added `'controlLink'` to EntityType union for audit logging

### 3. controlsStore (`src/stores/controlsStore.ts`)
Full Zustand store with:

**State:**
- `controls: Control[]` - First-class control entities
- `controlLinks: ControlLink[]` - Junction table for many-to-many
- `migrationVersion: number` - Tracks migration state

**Control CRUD:**
- `addControl()` - Creates control with nanoid, logs to audit
- `updateControl()` - Updates with field-level audit tracking
- `removeControl()` - Removes control and all its links
- `getControlById()` - Query by ID

**Link CRUD:**
- `linkControl()` - Creates control-row link
- `unlinkControl()` - Removes link by ID
- `unlinkControlFromRow()` - Removes link by control+row pair
- `updateLink()` - Updates link scores

**Query Methods:**
- `getControlsForRow()` - All controls linked to a row
- `getLinksForRow()` - All links for a row
- `getLinksForControl()` - All links for a control
- `getRowIdsForControl()` - All row IDs using a control

**Migration Support:**
- `setMigrationVersion()` - Mark migration state
- `importControls()` - Bulk import controls and links

**Storage:** Persisted to `localStorage` key `riskguard-controls`

## Verification

- TypeScript compiles with `npx tsc --noEmit` - no errors
- Store exports `useControlsStore` hook
- All CRUD operations include audit logging
- Score recalculation on probability/impact changes

## Files Modified

| File | Change |
|------|--------|
| `src/types/rct.ts` | Added ControlLink interface |
| `src/types/audit.ts` | Added 'controlLink' to EntityType |
| `src/stores/controlsStore.ts` | Created new store |
