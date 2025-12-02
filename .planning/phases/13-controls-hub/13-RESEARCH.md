# Phase 13: Controls Hub - Research

**Researched:** 2026-01-22
**Domain:** Data architecture, React state management, UI components
**Confidence:** HIGH

## Summary

The Controls Hub phase requires transforming how controls are stored and managed in the application. Currently, controls are embedded directly within RCT rows (`RCTRow.controls: Control[]`), creating a one-to-many relationship where each control belongs to exactly one risk-process combination. The goal is to enable many-to-many relationships where a single control can be linked to multiple RCT rows.

This research analyzed the current codebase architecture, Zustand store patterns, and existing "hub" implementations (RemediationDashboard) to determine the optimal approach. The recommended architecture creates a separate `controls` array in the store with cross-reference linking, preserving backward compatibility while enabling the new functionality.

**Primary recommendation:** Create a `controlsStore.ts` with a flat `Control[]` array (controls become first-class entities with unique IDs), link to RCT rows via a `controlLinks` junction table pattern, and propagate changes via store subscriptions.

## Standard Stack

The established libraries/tools for this domain:

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| zustand | 5.0.10 | State management | Already used throughout app, supports middleware |
| immer | 11.1.3 | Immutable updates | Already integrated with Zustand stores |
| nanoid | (bundled) | ID generation | Already used for entity IDs |
| @tanstack/react-table | 8.21.3 | Data tables | Already used for RCT and Remediation tables |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| @radix-ui/react-dialog | 1.1.15 | Modal dialogs | Link control dialog, control detail panel |
| @radix-ui/react-popover | 1.1.15 | Popovers | Filter dropdowns, quick actions |
| lucide-react | 0.562.0 | Icons | UI icons |
| fuse.js | 7.1.0 | Fuzzy search | Search controls by name/description |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Separate controlsStore | Extend rctStore | Separation cleaner but adds cross-store coordination |
| Junction table pattern | Embed control IDs in rows | Junction table more flexible for queries |
| Store subscription for propagation | Manual propagation calls | Subscription more reliable, less error-prone |

**Installation:**
No new dependencies required - all needed libraries already in package.json.

## Architecture Patterns

### Current Architecture (Embedded Controls)

```
RCTRow
├── id: string
├── riskName, processName, etc.
├── controls: Control[]           <-- Controls embedded here
│   ├── Control { id, name, ... }
│   └── Control { id, name, ... }
└── netScore (derived from controls)
```

**Problems with current approach:**
1. Controls cannot be shared across rows
2. Duplicated control data when same control applies to multiple risks
3. Changes to a "shared" control require manual updates to all copies
4. No single view of all controls in the system

### Recommended Architecture (First-Class Controls)

```
controlsStore
├── controls: Control[]              <-- All controls (first-class entities)
├── controlLinks: ControlLink[]      <-- Junction table for many-to-many
│   └── { controlId, rowId, netProbability?, netImpact?, netScore? }
└── actions: addControl, linkControl, unlinkControl, updateControl, etc.

rctStore (modified)
├── rows: RCTRow[]
│   └── RCTRow
│       └── controls: Control[]      <-- DEPRECATED, kept for migration
│       └── linkedControlIds: string[] <-- NEW: references to controls
└── netScore (derived from linked controls)
```

### Recommended Project Structure
```
src/
├── stores/
│   ├── rctStore.ts           # Modified: add linkedControlIds, compute netScore from links
│   ├── controlsStore.ts      # NEW: controls as first-class entities
│   └── auditStore.ts         # Unchanged
├── pages/
│   ├── ControlsPage.tsx      # NEW: Controls Hub page
│   └── RCTPage.tsx           # Unchanged
├── components/
│   ├── controls/             # NEW: Controls Hub components
│   │   ├── ControlsTable.tsx
│   │   ├── ControlDetailPanel.tsx
│   │   ├── ControlLinkDialog.tsx
│   │   ├── ControlFilters.tsx
│   │   └── index.ts
│   └── rct/
│       ├── ControlPanel.tsx  # Modified: show linked controls, allow linking
│       └── ...
└── types/
    └── rct.ts               # Modified: add ControlLink interface
```

### Pattern 1: Junction Table Pattern for Many-to-Many

**What:** Store relationships in a separate array rather than embedding references
**When to use:** When entities have many-to-many relationships with additional link-specific data

```typescript
// Types
interface ControlLink {
  id: string                    // Unique link ID
  controlId: string             // Reference to Control
  rowId: string                 // Reference to RCTRow
  // Per-link overrides (optional - for row-specific scoring)
  netProbability?: number | null
  netImpact?: number | null
  netScore?: number | null      // Computed from above if present
}

// Store structure
interface ControlsState {
  controls: Control[]
  controlLinks: ControlLink[]

  // Control CRUD
  addControl: (control: Omit<Control, 'id'>) => string
  updateControl: (controlId: string, updates: Partial<Control>) => void
  removeControl: (controlId: string) => void

  // Linking
  linkControl: (controlId: string, rowId: string) => string
  unlinkControl: (linkId: string) => void
  updateLink: (linkId: string, updates: Partial<ControlLink>) => void

  // Queries
  getControlsForRow: (rowId: string) => Control[]
  getRowsForControl: (controlId: string) => string[]
  getLinksForControl: (controlId: string) => ControlLink[]
}
```

### Pattern 2: Computed Selectors for Derived Data

**What:** Use Zustand selectors to compute derived values
**When to use:** When data in one store depends on data in another

```typescript
// In a component or hook
function useRowNetScore(rowId: string) {
  const links = useControlsStore(state =>
    state.controlLinks.filter(l => l.rowId === rowId)
  )
  const controls = useControlsStore(state => state.controls)

  return useMemo(() => {
    const linkedControls = links.map(link => {
      const control = controls.find(c => c.id === link.controlId)
      // Use link-specific scores if present, otherwise control's scores
      const netScore = link.netScore ?? control?.netScore
      return netScore
    }).filter((s): s is number => s !== null)

    return linkedControls.length > 0 ? Math.min(...linkedControls) : null
  }, [links, controls])
}
```

### Pattern 3: Migration Pattern (Backward Compatibility)

**What:** Support both old and new data structures during transition
**When to use:** When changing data models with existing persisted data

```typescript
// Migration function run on app load
function migrateEmbeddedControlsToStore(
  rows: RCTRow[],
  existingControls: Control[]
): { controls: Control[], links: ControlLink[] } {
  const controls: Control[] = [...existingControls]
  const links: ControlLink[] = []
  const seenControlIds = new Set(existingControls.map(c => c.id))

  for (const row of rows) {
    for (const embeddedControl of row.controls) {
      // If control doesn't exist in store, add it
      if (!seenControlIds.has(embeddedControl.id)) {
        controls.push(embeddedControl)
        seenControlIds.add(embeddedControl.id)
      }

      // Create link
      links.push({
        id: nanoid(),
        controlId: embeddedControl.id,
        rowId: row.id,
        // Preserve row-specific scores in the link
        netProbability: embeddedControl.netProbability,
        netImpact: embeddedControl.netImpact,
        netScore: embeddedControl.netScore,
      })
    }
  }

  return { controls, links }
}
```

### Anti-Patterns to Avoid
- **Dual-source-of-truth:** Don't keep controls in both the old embedded array AND the new store. Pick one canonical location.
- **Synchronous cross-store updates:** Don't call `rctStore.updateRow()` from within `controlsStore.updateControl()`. Use subscriptions or effects.
- **ID collision:** When migrating embedded controls, don't regenerate IDs. Preserve them to maintain test history references.

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Table with sorting/filtering | Custom table logic | @tanstack/react-table | Already used, handles all edge cases |
| Fuzzy text search | Simple includes() | fuse.js | Better UX, handles typos, already installed |
| Modal dialogs | Custom portal/overlay | @radix-ui/react-dialog | Accessibility, focus trap, already used |
| ID generation | Math.random() or Date.now() | nanoid | Collision-resistant, short IDs |
| Deep equality checks | Manual comparison | Zustand's shallow/deep selectors | Built-in optimization |

**Key insight:** The existing codebase has robust patterns for tables (RemediationTable), panels (ControlPanel), and stores (rctStore). Follow these patterns rather than inventing new ones.

## Common Pitfalls

### Pitfall 1: Breaking Existing Test History
**What goes wrong:** Control tests (`ControlTest`) reference `controlId`. If controls are deleted or IDs change, test history becomes orphaned.
**Why it happens:** Migration regenerates IDs or duplicate detection incorrectly merges controls.
**How to avoid:**
1. Never regenerate existing control IDs during migration
2. Keep `controlId` stable across the migration
3. When removing a control, cascade-delete or archive associated tests
**Warning signs:** Test history showing 0 tests for controls that previously had tests.

### Pitfall 2: Circular Store Dependencies
**What goes wrong:** `controlsStore` imports `rctStore` which imports `controlsStore`, causing initialization errors.
**Why it happens:** Trying to keep stores in sync by directly calling each other.
**How to avoid:**
1. Use unidirectional data flow: controlsStore is the source of truth for controls
2. rctStore reads from controlsStore via selectors, doesn't write to it
3. Use subscriptions or effects for synchronization, not direct store calls
**Warning signs:** "Cannot access X before initialization" errors, infinite loops.

### Pitfall 3: Stale Closures in Subscriptions
**What goes wrong:** Control updates don't propagate because subscription callbacks capture stale state.
**Why it happens:** Zustand subscriptions with closures over store state.
**How to avoid:**
1. Always use `getState()` inside subscription callbacks
2. Or use the `subscribeWithSelector` middleware pattern
**Warning signs:** Changes visible in DevTools but not in UI.

### Pitfall 4: Performance with Large Control Sets
**What goes wrong:** Controls page becomes slow with 100+ controls and many links.
**Why it happens:** Re-rendering entire table on any control change, no virtualization.
**How to avoid:**
1. Use @tanstack/react-virtual for the controls table (like RCTTable)
2. Use stable selectors with useMemo
3. Avoid selecting entire `controls` array when only one control needed
**Warning signs:** Laggy typing in search, slow filter response.

### Pitfall 5: Migration Running Multiple Times
**What goes wrong:** Duplicate controls and links created on every app reload.
**Why it happens:** Migration runs unconditionally or migration state not persisted.
**How to avoid:**
1. Add a `migrationVersion` field to store
2. Only run migration when version is less than current
3. Clear `row.controls` after migration to prevent re-running
**Warning signs:** Controls count doubling on refresh.

## Code Examples

Verified patterns from existing codebase:

### Creating a New Store (Pattern from rctStore)
```typescript
// Source: src/stores/rctStore.ts - adapted for controlsStore
import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import { immer } from 'zustand/middleware/immer'
import { nanoid } from 'nanoid'
import type { Control, ControlLink } from '@/types/rct'
import { useAuditStore } from '@/stores/auditStore'
import { useUIStore } from '@/stores/uiStore'

interface ControlsState {
  controls: Control[]
  controlLinks: ControlLink[]
  migrationVersion: number

  // Actions...
}

export const useControlsStore = create<ControlsState>()(
  persist(
    immer((set, get) => ({
      controls: [],
      controlLinks: [],
      migrationVersion: 0,

      addControl: (control) => {
        const id = nanoid()
        set((state) => {
          state.controls.push({ ...control, id })
        })

        // Audit logging
        useAuditStore.getState().addEntry({
          timestamp: new Date().toISOString(),
          entityType: 'control',
          entityId: id,
          entityName: control.name,
          changeType: 'create',
          fieldChanges: [
            { field: 'name', oldValue: null, newValue: control.name },
          ],
          user: useUIStore.getState().selectedRole,
        })

        return id
      },

      // ... more actions
    })),
    {
      name: 'riskguard-controls',
      storage: createJSONStorage(() => localStorage),
    }
  )
)
```

### Table Component Pattern (from RemediationTable)
```typescript
// Source: src/components/remediation/RemediationTable.tsx - pattern for ControlsTable
import { useMemo, useState } from 'react'
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  flexRender,
  type SortingState,
  type ColumnDef,
} from '@tanstack/react-table'
import { useControlsStore } from '@/stores/controlsStore'
import { useRCTStore } from '@/stores/rctStore'

export function ControlsTable() {
  const controls = useControlsStore((state) => state.controls)
  const controlLinks = useControlsStore((state) => state.controlLinks)
  const rows = useRCTStore((state) => state.rows)
  const [sorting, setSorting] = useState<SortingState>([])

  // Enrich controls with linked row count
  const data = useMemo(() => {
    return controls.map((control) => {
      const links = controlLinks.filter((l) => l.controlId === control.id)
      const linkedRows = links.map((l) => rows.find((r) => r.id === l.rowId)).filter(Boolean)
      return {
        ...control,
        linkCount: links.length,
        linkedRisks: [...new Set(linkedRows.map((r) => r?.riskName))],
      }
    })
  }, [controls, controlLinks, rows])

  const columns = useMemo<ColumnDef<typeof data[0]>[]>(
    () => [
      { accessorKey: 'name', header: 'Control Name' },
      { accessorKey: 'controlType', header: 'Type' },
      {
        accessorKey: 'linkCount',
        header: 'Linked Risks',
        cell: ({ getValue }) => getValue<number>() || 0,
      },
      // ... more columns
    ],
    []
  )

  const table = useReactTable({
    data,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
  })

  // Render table...
}
```

### Slide-Out Panel Pattern (from ControlPanel)
```typescript
// Source: src/components/rct/ControlPanel.tsx - pattern for ControlDetailPanel
import * as Dialog from '@radix-ui/react-dialog'
import { X } from 'lucide-react'

interface ControlDetailPanelProps {
  isOpen: boolean
  onClose: () => void
  controlId: string | null
}

export function ControlDetailPanel({ isOpen, onClose, controlId }: ControlDetailPanelProps) {
  const control = useControlsStore(
    (state) => state.controls.find((c) => c.id === controlId) ?? null
  )
  const links = useControlsStore(
    (state) => state.controlLinks.filter((l) => l.controlId === controlId)
  )

  if (!control) return null

  return (
    <Dialog.Root open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/60 z-40" />
        <Dialog.Content className="fixed right-0 top-0 h-full w-[500px] bg-surface-elevated border-l border-surface-border shadow-xl z-50 flex flex-col overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-surface-border">
            <Dialog.Title className="text-lg font-semibold text-text-primary">
              {control.name}
            </Dialog.Title>
            <Dialog.Close asChild>
              <button className="p-2 rounded-lg hover:bg-surface-overlay transition-colors">
                <X size={20} className="text-text-secondary" />
              </button>
            </Dialog.Close>
          </div>

          {/* Content - show linked risks, allow editing */}
          <div className="flex-1 overflow-auto p-4">
            {/* Control details */}
            {/* Linked risks list */}
            {/* Link/unlink controls */}
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Embedded controls in rows | First-class control entities | Phase 13 | Enables control reuse |
| Per-row control editing | Central controls management | Phase 13 | Single source of truth |
| Manual propagation | Store subscriptions | Phase 13 | Automatic sync |

**Deprecated/outdated after Phase 13:**
- `RCTRow.controls[]` - Will be emptied after migration, kept for backward compatibility
- Direct `addControl(rowId, control)` - Replaced with `addControl()` + `linkControl()`

## Data Model Changes

### New Types (add to src/types/rct.ts)

```typescript
/**
 * ControlLink - Links a control to an RCT row (many-to-many junction)
 * Allows one control to cover multiple risk-process combinations
 */
export interface ControlLink {
  id: string
  controlId: string
  rowId: string
  // Optional per-link score overrides (row-specific effectiveness)
  netProbability?: number | null
  netImpact?: number | null
  netScore?: number | null
  createdAt: string  // ISO date
}
```

### Modified Control Interface (optional enhancements)

```typescript
export interface Control {
  id: string
  name: string
  description?: string
  controlType: ControlType | null
  // Global scores (can be overridden per-link)
  netProbability: number | null
  netImpact: number | null
  netScore: number | null
  comment?: string
  testFrequency: TestFrequency | null
  nextTestDate: string | null
  lastTestDate: string | null
  testProcedure?: string
  // NEW: metadata
  createdAt?: string  // ISO date
  updatedAt?: string  // ISO date
}
```

## Migration Strategy

### Phase 1: Create controlsStore (non-breaking)
1. Create `src/stores/controlsStore.ts` with empty `controls[]` and `controlLinks[]`
2. Add `migrationVersion: 0` to track migration state
3. No changes to existing functionality

### Phase 2: Migration Function
1. On app load, check if `migrationVersion < 1`
2. Extract all unique controls from `rctStore.rows[].controls`
3. Create `controlLinks` for each row-control relationship
4. Populate `controlsStore.controls` and `controlsStore.controlLinks`
5. Set `migrationVersion = 1`
6. Keep `row.controls` populated for now (dual-write period)

### Phase 3: Update Components to Read from controlsStore
1. Modify `ControlPanel` to read controls via `getControlsForRow()`
2. Modify net score calculation to use links
3. Both old and new paths work during transition

### Phase 4: Update Write Paths
1. New controls created in `controlsStore`
2. Links created instead of embedding
3. Old `row.controls` still updated for compatibility

### Phase 5: Remove Legacy Support
1. Stop populating `row.controls`
2. Remove dual-write logic
3. Clean up migration code (keep version check)

## Files to Modify

### New Files
| File | Purpose |
|------|---------|
| `src/stores/controlsStore.ts` | New store for controls and links |
| `src/pages/ControlsPage.tsx` | Controls Hub page |
| `src/components/controls/ControlsTable.tsx` | Main controls table |
| `src/components/controls/ControlDetailPanel.tsx` | Slide-out panel for control details |
| `src/components/controls/ControlLinkDialog.tsx` | Dialog for linking control to rows |
| `src/components/controls/ControlFilters.tsx` | Filter/search controls |
| `src/components/controls/index.ts` | Barrel export |

### Modified Files
| File | Changes |
|------|---------|
| `src/types/rct.ts` | Add `ControlLink` interface |
| `src/App.tsx` | Add `/controls` route |
| `src/components/layout/Sidebar.tsx` | Add Controls nav item |
| `src/components/rct/ControlPanel.tsx` | Read from controlsStore, add link/unlink UI |
| `src/stores/rctStore.ts` | Net score reads from controlsStore, deprecate direct control methods |

## Open Questions

Things that couldn't be fully resolved:

1. **Per-link vs global net scores**
   - What we know: Links can have their own scores, controls have default scores
   - What's unclear: Should the UI show link-specific scores or always defer to control?
   - Recommendation: Default to control score, allow override in ControlPanel for specific rows

2. **Control ownership when unlinking**
   - What we know: A control can be linked to many rows
   - What's unclear: What happens when the last link is removed? Delete control or keep orphaned?
   - Recommendation: Keep orphaned controls (show in Controls Hub), add "unused" filter

3. **Audit trail scope**
   - What we know: Current audit logs control changes per-row
   - What's unclear: Should link/unlink actions be audited? How to attribute changes?
   - Recommendation: Log link/unlink as separate audit entries, keep existing per-control logging

## Sources

### Primary (HIGH confidence)
- `src/stores/rctStore.ts` - Current store architecture, control management patterns
- `src/components/rct/ControlPanel.tsx` - Current control editing UI
- `src/types/rct.ts` - Current type definitions
- `src/components/remediation/RemediationTable.tsx` - Table pattern with TanStack Table
- `src/components/remediation/RemediationDashboard.tsx` - Hub page layout pattern

### Secondary (MEDIUM confidence)
- Zustand documentation for store subscriptions and middleware
- TanStack Table documentation for table patterns

### Tertiary (LOW confidence)
- None - all research based on existing codebase patterns

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - All libraries already in use
- Architecture: HIGH - Based on existing codebase patterns
- Migration: MEDIUM - Tested patterns but app-specific edge cases possible
- Pitfalls: MEDIUM - Based on common patterns, not app-tested

**Research date:** 2026-01-22
**Valid until:** 60 days (stable architecture, no external dependencies)
