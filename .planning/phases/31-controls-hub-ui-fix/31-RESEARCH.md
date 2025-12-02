# Phase 31: Controls Hub UI Fix - Research

**Researched:** 2026-01-27
**Domain:** React Query data fetching, dual-source pattern, Controls/Remediation UI
**Confidence:** HIGH

## Summary

This research investigates why controls and remediation plans are not displaying in the UI when users are authenticated, despite data existing in the database. The investigation covers the ControlPanel (side panel from RCT), ControlsPage/ControlDetailPanel (Controls Hub), and RemediationDashboard (Remediation page).

**Key findings:**
1. The dual-source pattern (demo vs authenticated) is correctly implemented in ControlPanel and ControlsPage
2. React Query hooks for `useControls`, `useControlLinks`, and `useRemediationPlans` are correctly fetching data
3. **Root cause identified**: The RemediationDashboard and RemediationTable components ONLY use `useRCTStore` (Zustand store) - they never call the database hooks for authenticated users
4. The ControlPanel correctly switches between demo/auth sources, so the issue may be a query timing or data shape mismatch

**Primary recommendation:** Add dual-source pattern to RemediationDashboard/RemediationTable, and verify that ControlPanel receives non-empty `dbControls`/`dbControlLinks` data.

## Bug Analysis

### Components Affected

| Component | Location | Data Source | Issue |
|-----------|----------|-------------|-------|
| ControlPanel | src/components/rct/ControlPanel.tsx | Dual (demo: store, auth: hooks) | May work - needs verification |
| ControlsPage | src/pages/ControlsPage.tsx | Dual (demo: store, auth: hooks) | May work - needs verification |
| ControlDetailPanel | src/components/controls/ControlDetailPanel.tsx | Dual (demo: store, auth: hooks) | May work - needs verification |
| RemediationDashboard | src/components/remediation/RemediationDashboard.tsx | **Store only** | **BROKEN** |
| RemediationTable | src/components/remediation/RemediationTable.tsx | **Store only** | **BROKEN** |
| RemediationSection | src/components/rct/RemediationSection.tsx | **Store only** | **BROKEN** |

### Root Cause Analysis

**Issue 1: RemediationDashboard has no database integration**

```typescript
// RemediationTable.tsx lines 67-75
const remediationPlans = useRCTStore((state) => state.remediationPlans)
const rows = useRCTStore((state) => state.rows)
const updateRemediationStatus = useRCTStore((state) => state.updateRemediationStatus)
// ... all Zustand, no useRemediationPlans() hook!
```

The remediation components were never updated to use the dual-source pattern. They only read from the Zustand store, which is empty for authenticated users (localStorage is not persisted when authenticated per decision [26-07]).

**Issue 2: RemediationSection also uses store only**

```typescript
// RemediationSection.tsx lines 43-50
const {
  remediationPlans,
  updateRemediationStatus,
  toggleActionItem,
  // ... all from useRCTStore
} = useRCTStore()
```

This component appears inside ControlPanel when viewing controls for an RCT row, but it reads remediation plans from the Zustand store instead of the database.

**Issue 3: Query data shape verification needed**

The `useControls` and `useControlLinks` hooks may be returning data correctly, but the bug context states "data exists in database...but not shown". This suggests either:
- The queries are running but returning empty (RLS issue)
- The queries are running but data shape doesn't match what UI expects
- The queries aren't enabled/running at the right time

### Data Flow Analysis

**Expected flow for ControlPanel (authenticated mode):**
```
1. User clicks RCT cell Controls button
2. ControlPanel opens with row prop
3. useControls() fetches from database
4. useControlLinks() fetches from database
5. isDemoMode = false (session exists)
6. controls = dbControls || []
7. controlLinks = dbControlLinks || []
8. linkedControls computed from controlLinks.filter(l => l.rowId === row.id)
9. Controls displayed
```

**Actual issue points to check:**
- Step 3-4: Are queries enabled? Do they return data?
- Step 5: Is isDemoMode correctly returning false?
- Step 6-7: Is the || [] fallback masking undefined data?
- Step 8: Are the link rowIds matching the row.id format?

### Database ID Format Consideration

The bug context mentions data was seeded by Phase 29. Let me check the ID format:
- `control_links.rct_row_id` is a foreign key to `rct_rows.id`
- The `toControlLink` transformer maps `rct_row_id` to `rowId`
- The RCT row IDs are constructed as `{riskId}-{processId}` in the seed script

If there's an ID format mismatch between how the seed creates links and how the UI queries them, controls wouldn't display.

## Standard Stack

The codebase already uses the correct stack - no new libraries needed:

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| @tanstack/react-query | ^5 | Server state management | Already used for all DB queries |
| zustand | ^4 | Client state management | Already used for demo mode data |

### Patterns Already Established
- `useIsDemoMode()` hook for auth detection
- Dual-source pattern: `isDemoMode ? storeData : (dbData || [])`
- Transformer functions (`toControl`, `toControlLink`, `toRemediationPlan`)
- Query key pattern: `['entity']`, `['entity', id]`

## Architecture Patterns

### Dual-Source Pattern (Reference Implementation)

From ControlPanel.tsx lines 135-156:

```typescript
// Demo mode check
const isDemoMode = useIsDemoMode()

// Store data (for demo mode)
const storeControls = useControlsStore(state => state.controls)
const storeControlLinks = useControlsStore(state => state.controlLinks)

// Database hooks (for authenticated mode)
const { data: dbControls } = useControls()
const { data: dbControlLinks } = useControlLinks()

// Use appropriate data sources based on auth mode
const controls = isDemoMode ? storeControls : (dbControls || [])
const controlLinks = isDemoMode ? storeControlLinks : (dbControlLinks || [])
```

This pattern MUST be applied to:
- RemediationDashboard
- RemediationTable
- RemediationSection
- Any component accessing remediation data

### Recommended Fix Pattern for RemediationTable

```typescript
// Add at top of component
const isDemoMode = useIsDemoMode()

// Store data (for demo mode)
const storeRemediationPlans = useRCTStore((state) => state.remediationPlans)
const storeRows = useRCTStore((state) => state.rows)

// Database hooks (for authenticated mode)
const { data: dbRemediationPlans } = useRemediationPlans()
const { data: dbRows } = useRCTRows()

// Dual-source selection
const remediationPlans = isDemoMode
  ? storeRemediationPlans
  : (dbRemediationPlans || [])
const rows = isDemoMode ? storeRows : (dbRows || [])
```

### Store Mutations Still Needed for Demo Mode

The store mutation functions (updateRemediationStatus, toggleActionItem, etc.) are ONLY for demo mode. Authenticated mode needs to call the React Query mutations:

```typescript
// Demo mode: use store
const { updateRemediationStatus: storeUpdateStatus } = useRCTStore()

// Auth mode: use mutation hook
const updateStatusMutation = useUpdateRemediationStatus()

// Handler
const handleStatusUpdate = (id: string, status: RemediationStatus) => {
  if (isDemoMode) {
    storeUpdateStatus(id, status)
  } else {
    updateStatusMutation.mutate({ id, status })
  }
}
```

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Auth mode detection | Custom session checks | `useIsDemoMode()` | Already implemented, consistent |
| Data fetching | Direct Supabase calls in components | Existing hooks | Centralized, cached, typed |
| Transformer functions | Inline snake_case mapping | `toControl`, `toRemediationPlan` | Already exist, tested |

## Common Pitfalls

### Pitfall 1: Empty Array Fallback Masking Issues
**What goes wrong:** `(dbData || [])` returns empty array when query hasn't completed yet
**Why it happens:** Query may be loading or error state
**How to avoid:** Check `isLoading` and `error` states before assuming empty data
**Warning signs:** Component renders immediately with no data, then never updates

### Pitfall 2: Store Not Cleared for Auth Mode
**What goes wrong:** Old demo data leaks into authenticated views
**Why it happens:** Zustand store persisted to localStorage
**How to avoid:** Decision [26-07] partializes store to NOT persist when authenticated
**Warning signs:** Demo mode data appearing for logged-in users

### Pitfall 3: ID Format Mismatch
**What goes wrong:** Links exist but don't match because IDs differ
**Why it happens:** Seed script generates IDs differently than app runtime
**How to avoid:** Use consistent ID generation (UUID or constructed)
**Warning signs:** Empty results when filtering by rowId

### Pitfall 4: Mutations Not Wired for Auth Mode
**What goes wrong:** Changes work in demo mode but not authenticated
**Why it happens:** Only store mutations called, not database mutations
**How to avoid:** All handlers need dual-path: `if (isDemoMode) { store } else { mutation }`
**Warning signs:** Optimistic updates that never persist

## Code Examples

### Verifying Data is Fetched (Debug Pattern)

```typescript
// Temporary debug to confirm data flow
const { data: dbControls, isLoading, error } = useControls()

console.log('[ControlPanel Debug]', {
  isDemoMode,
  dbControlsCount: dbControls?.length ?? 'undefined',
  isLoading,
  error,
  storeControlsCount: storeControls.length,
})
```

### Checking Link-to-Row Matching

```typescript
// Debug to verify links match the row
const linksForRow = controlLinks.filter(l => l.rowId === row?.id)
console.log('[ControlPanel Links]', {
  rowId: row?.id,
  totalLinks: controlLinks.length,
  linksForThisRow: linksForRow.length,
  sampleLinkRowIds: controlLinks.slice(0, 3).map(l => l.rowId)
})
```

### RemediationSection Fix Pattern

```typescript
export function RemediationSection({ rowId, control, tests, grossScore }: RemediationSectionProps) {
  const isDemoMode = useIsDemoMode()

  // Store data for demo mode
  const storeRemediationPlans = useRCTStore(s => s.remediationPlans)
  const storeUpdateStatus = useRCTStore(s => s.updateRemediationStatus)

  // Database hooks for authenticated mode
  const { data: dbPlans } = useRemediationForControl(control.id)
  const updateStatusMutation = useUpdateRemediationStatus()

  // Select data source
  const remediationPlans = isDemoMode ? storeRemediationPlans : (dbPlans || [])

  // Filter for this control
  const controlRemediations = useMemo(() => {
    return remediationPlans.filter(p => p.controlId === control.id)
  }, [remediationPlans, control.id])

  // Status update handler with dual-path
  const handleStatusChange = (planId: string, status: RemediationStatus) => {
    if (isDemoMode) {
      storeUpdateStatus(planId, status)
    } else {
      updateStatusMutation.mutate({ id: planId, status })
    }
  }

  // ... rest of component
}
```

## Files Requiring Changes

### Priority 1: Root Cause (Remediation Not Wired)

| File | Change Needed |
|------|---------------|
| src/components/remediation/RemediationTable.tsx | Add dual-source pattern for remediationPlans and rows |
| src/components/remediation/RemediationSummary.tsx | Add dual-source for summary stats |
| src/components/remediation/UpcomingWidget.tsx | Add dual-source for upcoming deadlines |
| src/components/remediation/OverdueWidget.tsx | Add dual-source for overdue items |
| src/components/rct/RemediationSection.tsx | Add dual-source pattern |

### Priority 2: Verification (Controls May Be Working)

| File | Change Needed |
|------|---------------|
| src/components/rct/ControlPanel.tsx | Add debug logging, verify data flow |
| src/pages/ControlsPage.tsx | Verify controls load, check query state |

### Priority 3: Mutations for Auth Mode

| File | Change Needed |
|------|---------------|
| src/components/remediation/RemediationTable.tsx | Wire mutations: updateRemediationStatus, updateRemediationPlan, deleteRemediationPlan, toggleActionItem, addActionItem, removeActionItem |
| src/components/rct/RemediationSection.tsx | Wire mutations for status changes and action items |

## Testing Strategy

### Step 1: Verify Database Has Data
```sql
-- Run in Supabase SQL editor
SELECT COUNT(*) FROM controls WHERE tenant_id = '[demo-tenant-id]';
SELECT COUNT(*) FROM control_links WHERE tenant_id = '[demo-tenant-id]';
SELECT COUNT(*) FROM remediation_plans WHERE tenant_id = '[demo-tenant-id]';
```

### Step 2: Verify Hooks Return Data
Add temporary console.log in hooks to confirm data fetched:
```typescript
// In useControls.ts queryFn
console.log('[useControls] Fetched:', data.length, 'controls')
return data.map(toControl)
```

### Step 3: Verify isDemoMode Detection
```typescript
// In ControlPanel render
console.log('[ControlPanel] isDemoMode:', isDemoMode, 'session:', !!session)
```

### Step 4: Verify ID Matching
```typescript
// After linkedControls computed
console.log('[ControlPanel] row.id:', row?.id)
console.log('[ControlPanel] controlLink.rowIds:', controlLinks.map(l => l.rowId))
```

## Open Questions

1. **Are the controls hooks actually returning data?**
   - Need to verify with console logging or React Query DevTools
   - If empty, investigate RLS policies

2. **Is the row.id format matching control_links.rct_row_id?**
   - Seed script constructs IDs as `{riskId}-{processId}`
   - UI may expect different format

3. **Are the mutations working for authenticated mode?**
   - Remediation definitely broken (store only)
   - Control mutations in ControlPanel look correct

## Sources

### Primary (HIGH confidence)
- Codebase analysis: src/components/rct/ControlPanel.tsx (dual-source reference)
- Codebase analysis: src/components/remediation/RemediationTable.tsx (store-only source)
- Codebase analysis: src/hooks/useControls.ts (query implementation)
- Codebase analysis: src/hooks/useRemediationPlans.ts (query implementation)

### Secondary (MEDIUM confidence)
- STATE.md decision [26-07]: Authenticated users don't persist to localStorage
- STATE.md decision [26.1-02]: ControlPanel dual-source pattern

## Metadata

**Confidence breakdown:**
- Root cause (remediation store-only): HIGH - verified in code
- Control display issue: MEDIUM - code looks correct, needs runtime verification
- Fix pattern: HIGH - established pattern in codebase

**Research date:** 2026-01-27
**Valid until:** N/A (bug fix, not evolving technology)
