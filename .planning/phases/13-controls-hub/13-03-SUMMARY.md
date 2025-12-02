---
phase: 13-controls-hub
plan: 03
status: complete
completed_at: 2026-01-22
---

## Summary

Created the Controls Hub page with table, search/filter, and detail panel for managing controls as first-class entities.

## What Was Built

### 1. ControlFilters (`src/components/controls/ControlFilters.tsx`)
- Fuzzy search using Fuse.js (searches name and description)
- Control type dropdown filter
- Clear filters button when filters active
- Callbacks to parent for filtered results

### 2. ControlsTable (`src/components/controls/ControlsTable.tsx`)
- TanStack React Table implementation
- Enriches controls with link count and risk names
- Columns: Name (clickable), Type, Net Score (heatmap), Linked Risks count, Risk Names
- Sortable columns with chevron indicators
- Empty state message when no controls

### 3. ControlDetailPanel (`src/components/controls/ControlDetailPanel.tsx`)
- Radix Dialog slide-out panel from right
- Editable fields: Name, Description, Type (permission-gated)
- Score dropdowns: Net Probability, Net Impact (permission-gated)
- Computed Net Score display with heatmap colors
- Linked Risks section with unlink buttons
- "Link to Risk" dialog to link control to unlinked rows
- Uses existing ScoreDropdown and HeatmapCell components

### 4. ControlsPage (`src/pages/ControlsPage.tsx`)
- Header with Shield icon and control count
- "Add Control" button (Risk Manager only)
- Integrates ControlFilters and ControlsTable
- Detail panel opens on control click

### 5. Barrel Export (`src/components/controls/index.ts`)
- Exports all control components for clean imports

### 6. Routing & Navigation
- Added `/controls` route in `App.tsx`
- Added "Controls" nav item in Sidebar (Shield icon, after RCT)

## Verification

- TypeScript compiles with `npx tsc --noEmit` - no errors
- All components export correctly through barrel
- Route `/controls` accessible
- Sidebar shows Controls navigation item

## Files Created/Modified

| File | Change |
|------|--------|
| `src/components/controls/ControlFilters.tsx` | Created - search and type filter |
| `src/components/controls/ControlsTable.tsx` | Created - TanStack table with link counts |
| `src/components/controls/ControlDetailPanel.tsx` | Created - slide-out detail panel |
| `src/components/controls/index.ts` | Created - barrel export |
| `src/pages/ControlsPage.tsx` | Created - main page component |
| `src/App.tsx` | Added ControlsPage import and route |
| `src/components/layout/Sidebar.tsx` | Added Shield icon and Controls nav item |
