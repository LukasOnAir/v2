# Phase 37: RCT Search and Sort - Research

**Researched:** 2026-01-28
**Domain:** TanStack React Table v8, search/sort UX patterns
**Confidence:** HIGH

## Summary

The RCT (Risk Control Table) already uses TanStack React Table v8 with column filtering (`getFilteredRowModel`), column resizing, and virtualization. Adding global search and column sorting requires minimal new dependencies - the codebase already has the patterns established in other components.

The recommended approach is:
1. Add `getSortedRowModel` to the existing table instance (already used in ControlsTable, RemediationTable)
2. Add TanStack Table's built-in global filter with a custom filter function that searches across text columns
3. Reuse the existing search input pattern from ControlFilters/TicketFilters
4. Reuse the existing sort indicator pattern from RemediationTable (ArrowUpDown/ArrowUp/ArrowDown icons)

**Primary recommendation:** Leverage TanStack Table's native global filtering and sorting features with established codebase patterns - no new libraries needed.

## Standard Stack

The established libraries/tools for this domain:

### Core (Already Installed)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| @tanstack/react-table | 8.21.3 | Table state, filtering, sorting | Already the table library for RCT |
| lucide-react | 0.562.0 | Icons (Search, X, ArrowUpDown, etc.) | Already the icon library |
| clsx | 2.1.1 | Conditional class names | Already used throughout |

### Available but Not Needed
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| fuse.js | 7.1.0 | Fuzzy search | Only if fuzzy search is explicitly needed; TanStack's built-in `includesString` filter is sufficient for basic text matching |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| TanStack global filter | Fuse.js | Fuse.js adds fuzzy matching but TanStack's `includesString` is sufficient for "search matches text" requirement |
| TanStack sorting | Custom sort | No benefit - TanStack sorting is well-tested, handles edge cases |

**Installation:** No new packages needed.

## Architecture Patterns

### Current RCTTable Structure (Before Changes)
```
src/components/rct/
├── RCTTable.tsx         # Main table (MODIFY: add sorting + global filter)
├── RCTToolbar.tsx       # Toolbar (MODIFY: add search input)
├── ColumnFilter.tsx     # Per-column multi-select filter (KEEP)
└── ...
```

### State Flow After Changes
```
RCTToolbar
  └── Search input (controlled by globalFilter state)
       └── onChange → table.setGlobalFilter(value)

RCTTable
  └── useReactTable({
        state: { globalFilter, sorting, columnFilters, ... },
        getSortedRowModel: getSortedRowModel(),
        globalFilterFn: customTextSearchFn,
        ...
      })
```

### Pattern 1: Adding Global Filter to Existing Table
**What:** TanStack Table v8 supports a `globalFilter` state that filters across all columns using a `globalFilterFn`.
**When to use:** When you need to search across multiple columns with a single input.
**Example:**
```typescript
// Source: https://tanstack.com/table/v8/docs/guide/global-filtering
const [globalFilter, setGlobalFilter] = useState('')

const table = useReactTable({
  data: rows,
  columns,
  state: {
    globalFilter,
    columnFilters,
    // ... existing state
  },
  onGlobalFilterChange: setGlobalFilter,
  globalFilterFn: 'includesString', // or custom function
  getCoreRowModel: getCoreRowModel(),
  getFilteredRowModel: getFilteredRowModel(), // Already present in RCT
  getSortedRowModel: getSortedRowModel(),     // ADD THIS
  // ... rest of options
})
```

### Pattern 2: Custom Global Filter Function
**What:** Define which columns to search and how to match.
**When to use:** When you need to search specific columns (not all) or use custom matching logic.
**Example:**
```typescript
// Source: TanStack Table filterFns pattern + existing multiSelectFilter in RCTTable
import type { FilterFn } from '@tanstack/react-table'

// Search across all text columns (risk names, process names, custom text values)
const globalTextFilter: FilterFn<RCTRow> = (row, columnId, filterValue) => {
  const search = String(filterValue).toLowerCase().trim()
  if (!search) return true

  // Define text columns to search
  const searchableColumns = [
    'riskL1Name', 'riskL2Name', 'riskL3Name', 'riskL4Name', 'riskL5Name', 'riskName',
    'processL1Name', 'processL2Name', 'processL3Name', 'processL4Name', 'processL5Name', 'processName',
    // Custom text columns are handled via customValues
  ]

  // Check each searchable column
  for (const col of searchableColumns) {
    const value = String(row.getValue(col) ?? '').toLowerCase()
    if (value.includes(search)) return true
  }

  // Also search custom text values
  const customValues = row.original.customValues
  for (const key of Object.keys(customValues)) {
    const val = customValues[key]
    if (typeof val === 'string' && val.toLowerCase().includes(search)) {
      return true
    }
  }

  return false
}
```

### Pattern 3: Clickable Sortable Column Headers (Existing Pattern)
**What:** Make column headers clickable to toggle sort direction.
**When to use:** Every sortable column header.
**Example:**
```typescript
// Source: src/components/remediation/RemediationTable.tsx lines 500-520
<th
  key={header.id}
  className="px-3 py-2 text-left text-sm font-medium text-text-secondary cursor-pointer hover:bg-surface-border/50"
  onClick={header.column.getToggleSortingHandler()}
>
  <div className="flex items-center gap-1">
    <span className="truncate flex-1">
      {flexRender(header.column.columnDef.header, header.getContext())}
    </span>
    {/* Sort indicator */}
    {header.column.getIsSorted() === 'asc' ? (
      <ArrowUp size={14} />
    ) : header.column.getIsSorted() === 'desc' ? (
      <ArrowDown size={14} />
    ) : (
      <ArrowUpDown size={14} className="opacity-50" />
    )}
    {/* Existing filter button */}
    {header.column.getCanFilter() && (
      <ColumnFilter column={header.column} />
    )}
  </div>
</th>
```

### Pattern 4: Search Input in Toolbar (Existing Pattern)
**What:** Search input with icon, clear button, and controlled state.
**When to use:** Top of table/toolbar for global search.
**Example:**
```typescript
// Source: src/components/tickets/TicketFilters.tsx lines 62-77
// Adapted for RCT toolbar
<div className="relative flex-1 min-w-[200px] max-w-sm">
  <Search
    size={18}
    className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted"
  />
  <input
    type="text"
    value={globalFilter ?? ''}
    onChange={(e) => table.setGlobalFilter(e.target.value)}
    placeholder="Search risks and processes..."
    className="w-full pl-10 pr-4 py-2 bg-surface-base border border-surface-border rounded-lg text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-accent-500"
  />
  {globalFilter && (
    <button
      onClick={() => table.setGlobalFilter('')}
      className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-primary"
    >
      <X size={16} />
    </button>
  )}
</div>
```

### Anti-Patterns to Avoid
- **Don't use Fuse.js if simple substring matching is sufficient:** The success criteria says "search matches across all text columns" - substring matching (`includes()`) is enough. Fuse.js adds complexity (fuzzy scoring, ranking) that may confuse users who type exact text and don't see exact matches first.
- **Don't store sort state in rctStore:** TanStack Table manages sort state internally. Only persist columnWidths (already done) and columnVisibility. Sorting should reset on page load - it's navigational, not preference.
- **Don't implement custom sorting logic:** TanStack Table handles all sorting (string, numeric, null handling) correctly. Just enable it.

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Global text search | Custom filtering loop | TanStack globalFilterFn | Integrates with existing column filters, handles edge cases |
| Column sorting | Custom sort + state | TanStack getSortedRowModel | Handles type-aware sorting (strings, numbers, dates), null values, multi-sort |
| Sort indicators | Custom icon logic | getIsSorted() + ArrowUpDown/ArrowUp/ArrowDown | Already used in RemediationTable, ControlsTable |
| Debounced search | setTimeout logic | Simple controlled input | RCT uses virtualization (10ms render) - debouncing adds UX delay |

**Key insight:** TanStack Table is designed for exactly this use case. The RCT already uses getFilteredRowModel - adding getSortedRowModel and globalFilter requires ~20 lines of changes, not a rewrite.

## Common Pitfalls

### Pitfall 1: Breaking Virtualization with Sort
**What goes wrong:** Adding sorting might recalculate virtualizer incorrectly if row heights change.
**Why it happens:** Virtualizer assumes stable row ordering.
**How to avoid:** The RCT already uses fixed row heights (`estimateSize: () => 56`). Sorting changes row order, not height - virtualization works correctly.
**Warning signs:** Rows jumping or blank spaces after sorting.

### Pitfall 2: Global Filter + Column Filter Conflict
**What goes wrong:** User expects global search to work independently but it combines with column filters.
**Why it happens:** TanStack applies filters in sequence: column filters first, then global filter.
**How to avoid:** This is actually desired behavior (success criteria #6: "Search and sort can be combined"). Document that both filters apply together.
**Warning signs:** Users confused why search "doesn't find" a row that's filtered out by column filter.

### Pitfall 3: Sorting Custom Columns Incorrectly
**What goes wrong:** Custom formula columns sort as strings, not numbers.
**Why it happens:** TanStack infers sort type from accessorFn return value.
**How to avoid:** Custom columns already use accessorFn that returns correct types. Formula columns may need explicit `sortingFn: 'alphanumeric'` or custom sortingFn.
**Warning signs:** "10" sorts before "2" instead of after.

### Pitfall 4: Search Input Causing Re-renders on Every Keystroke
**What goes wrong:** Entire table re-renders on each character typed.
**Why it happens:** globalFilter state change triggers table re-render.
**How to avoid:** TanStack Table is optimized for this. With virtualization, only visible rows re-render. Not a real problem.
**Warning signs:** Laggy typing in search box. If this happens, add 150ms debounce.

## Code Examples

Verified patterns from official sources and existing codebase:

### Complete Table Configuration
```typescript
// Source: Combination of existing RCTTable.tsx + TanStack docs
import {
  useReactTable,
  getCoreRowModel,
  getFilteredRowModel,
  getSortedRowModel,           // ADD
  getFacetedRowModel,
  getFacetedUniqueValues,
  type SortingState,           // ADD
  // ... existing imports
} from '@tanstack/react-table'

// In RCTTable component:
const [sorting, setSorting] = useState<SortingState>([])
const [globalFilter, setGlobalFilter] = useState('')

const table = useReactTable({
  data: rows,
  columns,
  state: {
    columnVisibility,
    columnFilters,
    sorting,        // ADD
    globalFilter,   // ADD
  },
  filterFns: {
    multiSelect: multiSelectFilter,
  },
  globalFilterFn: 'includesString', // ADD (or custom function)
  enableColumnResizing: true,
  columnResizeMode: 'onChange',
  onColumnVisibilityChange: setColumnVisibility,
  onColumnFiltersChange: setColumnFilters,
  onSortingChange: setSorting,           // ADD
  onGlobalFilterChange: setGlobalFilter, // ADD
  getCoreRowModel: getCoreRowModel(),
  getFilteredRowModel: getFilteredRowModel(),
  getSortedRowModel: getSortedRowModel(), // ADD
  getFacetedRowModel: getFacetedRowModel(),
  getFacetedUniqueValues: getFacetedUniqueValues(),
})
```

### Search Input Component for Toolbar
```typescript
// Source: Pattern from TicketFilters.tsx, adapted
interface RCTSearchInputProps {
  value: string
  onChange: (value: string) => void
}

function RCTSearchInput({ value, onChange }: RCTSearchInputProps) {
  return (
    <div className="relative flex-1 min-w-[200px] max-w-sm">
      <Search
        size={18}
        className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted"
      />
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Search risks and processes..."
        className="w-full pl-10 pr-8 py-2 bg-surface-base border border-surface-border rounded-lg text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-accent-500"
      />
      {value && (
        <button
          onClick={() => onChange('')}
          className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-text-muted hover:text-text-primary transition-colors"
          aria-label="Clear search"
        >
          <X size={16} />
        </button>
      )}
    </div>
  )
}
```

### Sort Indicator in Header
```typescript
// Source: RemediationTable.tsx pattern
import { ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react'

// In header render:
<th
  key={header.id}
  className="px-3 py-2 text-left text-sm font-medium text-text-secondary border-b border-surface-border bg-surface-elevated group relative flex-shrink-0 cursor-pointer hover:bg-surface-overlay/50"
  style={{ width: headerWidth, minWidth: headerWidth }}
  onClick={header.column.getToggleSortingHandler()}
>
  <div className="flex items-center gap-1">
    <span className="truncate flex-1">
      {flexRender(header.column.columnDef.header, header.getContext())}
    </span>
    {/* Sort indicator */}
    {header.column.getCanSort() && (
      header.column.getIsSorted() === 'asc' ? (
        <ArrowUp size={14} className="text-accent-500" />
      ) : header.column.getIsSorted() === 'desc' ? (
        <ArrowDown size={14} className="text-accent-500" />
      ) : (
        <ArrowUpDown size={14} className="opacity-40 group-hover:opacity-70" />
      )
    )}
    {/* Existing filter button */}
    {header.column.getCanFilter() && (
      <ColumnFilter column={header.column} />
    )}
  </div>
  {/* Existing resize handle */}
  <ResizeHandle ... />
</th>
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Fuse.js for all search | TanStack globalFilter for exact/substring | TanStack v8 (2022) | Simpler, integrated |
| Custom sort state | TanStack SortingState | TanStack v8 (2022) | Type-safe, handles nulls |
| Manual re-render on sort | getSortedRowModel() | TanStack v8 (2022) | Optimized memoization |

**Deprecated/outdated:**
- React Table v7 `useFilters`, `useSortBy` hooks - replaced by v8's modular design
- Manual `Array.sort()` calls - TanStack handles edge cases better

## Open Questions

Things that couldn't be fully resolved:

1. **Should global search persist across page reloads?**
   - What we know: Column visibility and column widths persist in rctStore
   - What's unclear: Whether users expect search to persist (probably not - it's navigational)
   - Recommendation: Don't persist globalFilter; reset on page load (like sorting)

2. **Should sort state persist?**
   - What we know: Other tables (ControlsTable, RemediationTable) don't persist sort
   - What's unclear: RCT is the "main" table - might users expect persistence?
   - Recommendation: Don't persist initially; easy to add later if users request

3. **Multi-column sort?**
   - What we know: TanStack supports shift+click for multi-sort
   - What's unclear: Whether RCT users need this
   - Recommendation: Enable it by default (it's free) but don't document prominently

## Sources

### Primary (HIGH confidence)
- [TanStack Table v8 Sorting Guide](https://tanstack.com/table/v8/docs/guide/sorting) - verified getSortedRowModel pattern
- [TanStack Table v8 Global Filtering Guide](https://tanstack.com/table/v8/docs/guide/global-filtering) - verified globalFilterFn pattern
- src/components/rct/RCTTable.tsx - current implementation (lines 859-877)
- src/components/remediation/RemediationTable.tsx - sorting pattern (lines 159, 320, 500-520)
- src/components/controls/ControlFilters.tsx - search pattern (lines 62-77)
- src/components/tickets/TicketFilters.tsx - search input styling (lines 62-77)

### Secondary (MEDIUM confidence)
- [TanStack Table v8 Global Filtering API](https://tanstack.com/table/v8/docs/api/features/global-filtering) - API reference

### Tertiary (LOW confidence)
- None - all patterns verified against existing codebase

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - no new dependencies, all patterns exist in codebase
- Architecture: HIGH - direct extension of existing RCTTable
- Pitfalls: HIGH - verified against TanStack docs and existing implementations

**Research date:** 2026-01-28
**Valid until:** 2026-03-28 (60 days - TanStack Table v8 is stable)
