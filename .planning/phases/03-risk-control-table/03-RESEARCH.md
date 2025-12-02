# Phase 3: Risk Control Table - Research

**Researched:** 2026-01-19
**Domain:** Data tables, filtering, formula parsing, side panels, heatmap visualization
**Confidence:** HIGH

## Summary

Phase 3 requires building a comprehensive Risk Control Table (RCT) that auto-generates rows from taxonomy combinations, provides Excel-like filtering, supports custom formula columns, and manages controls via a side panel. The research investigated table libraries, formula parsing options, UI patterns for side panels, and heatmap color scales.

**Key findings:**
- TanStack Table v8 is the standard for headless, filterable, virtualized tables in React
- `hot-formula-parser` provides Excel-like formula evaluation for custom columns
- shadcn/ui Sheet component provides the side panel pattern for control management
- Simple RGB interpolation achieves risk heatmap coloring without external dependencies

**Primary recommendation:** Use TanStack Table with faceted filtering for Excel-like column filters, TanStack Virtual for performance with large datasets, hot-formula-parser for formula columns, and a custom Sheet-style side panel for control management.

## Standard Stack

The established libraries/tools for this domain:

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| @tanstack/react-table | ^8.21.x | Headless table | Industry standard for complex tables; sorting, filtering, visibility, grouping built-in |
| @tanstack/react-virtual | ^3.x | Row virtualization | Official companion to TanStack Table; handles 1000+ rows smoothly |
| hot-formula-parser | ^4.2.x | Formula evaluation | Excel-compatible IF/SUM/AVG; event-driven cell references; MIT license |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| @radix-ui/react-dialog | ^1.x | Sheet/panel base | Side panel foundation with focus trapping, portal rendering |
| @dnd-kit/core | ^6.x | Column reordering | If drag-to-reorder columns is needed (optional for MVP) |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| TanStack Table | AG Grid | Full-featured but heavy (1MB+), enterprise license for advanced features |
| TanStack Table | Material React Table | Pre-built UI, but harder to style for dark theme |
| hot-formula-parser | HyperFormula | More functions but GPLv3 or paid license; larger bundle (291KB) |
| hot-formula-parser | fast-formula-parser | 3x faster but 81KB gzipped; overkill for simple formulas |
| Custom Sheet | Ant Design Drawer | Full component lib dependency; harder to theme |

**Installation:**
```bash
npm install @tanstack/react-table @tanstack/react-virtual hot-formula-parser @radix-ui/react-dialog
```

## Architecture Patterns

### Recommended Project Structure
```
src/
├── components/
│   └── rct/
│       ├── RCTTable.tsx           # Main table with TanStack Table
│       ├── RCTToolbar.tsx         # Column visibility, add column, filters
│       ├── RCTRow.tsx             # Row renderer with score inputs
│       ├── ScoreSelector.tsx      # Visual 1-5 scale selector
│       ├── HeatmapCell.tsx        # Color-coded risk score cell
│       ├── ColumnFilter.tsx       # Excel-like filter dropdown
│       └── ControlPanel.tsx       # Side panel for control management
├── stores/
│   └── rctStore.ts                # RCT rows, column config, filters
├── utils/
│   ├── rctGenerator.ts            # Cartesian product row generation
│   ├── formulaEngine.ts           # Formula parser wrapper
│   └── heatmapColors.ts           # Color interpolation utilities
└── types/
    └── rct.ts                     # RCT row, control, column types
```

### Pattern 1: TanStack Table with Faceted Filtering
**What:** Excel-like column filters using faceted unique values
**When to use:** For the main RCT table with filtering requirements

```typescript
// Source: TanStack Table faceted filtering docs
import {
  useReactTable,
  getCoreRowModel,
  getFilteredRowModel,
  getFacetedRowModel,
  getFacetedUniqueValues,
  ColumnFiltersState,
} from '@tanstack/react-table';

function RCTTable({ data }: { data: RCTRow[] }) {
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);

  const table = useReactTable({
    data,
    columns,
    state: { columnFilters },
    onColumnFiltersChange: setColumnFilters,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getFacetedRowModel: getFacetedRowModel(),
    getFacetedUniqueValues: getFacetedUniqueValues(),
  });

  return (/* table rendering */);
}
```

### Pattern 2: Column Filter Dropdown with Checkboxes
**What:** Multi-select filter UI using faceted unique values
**When to use:** For each filterable column header

```typescript
// Source: TanStack Table faceted example pattern
function ColumnFilter({ column }: { column: Column<RCTRow> }) {
  const columnFilterValue = column.getFilterValue() as string[] | undefined;
  const facetedUniqueValues = column.getFacetedUniqueValues();

  // Get ALL unique values (not just from filtered rows)
  const allUniqueValues = useMemo(() =>
    Array.from(facetedUniqueValues.keys()).sort(),
    [facetedUniqueValues]
  );

  const toggleValue = (value: string) => {
    const current = columnFilterValue ?? [];
    const updated = current.includes(value)
      ? current.filter(v => v !== value)
      : [...current, value];
    column.setFilterValue(updated.length ? updated : undefined);
  };

  return (
    <div className="p-2 bg-surface-elevated rounded shadow-lg">
      <button onClick={() => column.setFilterValue(undefined)}>
        Clear
      </button>
      {allUniqueValues.map(value => (
        <label key={value} className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={columnFilterValue?.includes(value) ?? false}
            onChange={() => toggleValue(value)}
          />
          {value}
        </label>
      ))}
    </div>
  );
}
```

### Pattern 3: Column Visibility Toggle
**What:** Show/hide columns via toolbar controls
**When to use:** For the column visibility feature

```typescript
// Source: TanStack Table column visibility docs
function ColumnVisibilityMenu({ table }: { table: Table<RCTRow> }) {
  return (
    <div className="p-2">
      {table.getAllLeafColumns().map(column => (
        <label key={column.id} className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={column.getIsVisible()}
            onChange={column.getToggleVisibilityHandler()}
          />
          {column.id}
        </label>
      ))}
    </div>
  );
}
```

### Pattern 4: Virtualized Table for Performance
**What:** Only render visible rows for large datasets
**When to use:** When RCT has 100+ rows

```typescript
// Source: TanStack Table + Virtual integration docs
import { useVirtualizer } from '@tanstack/react-virtual';

function VirtualizedRCTTable({ table }: { table: Table<RCTRow> }) {
  const parentRef = useRef<HTMLDivElement>(null);
  const { rows } = table.getRowModel();

  const virtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 48, // Row height in pixels
    overscan: 10,
  });

  return (
    <div ref={parentRef} className="h-[600px] overflow-auto">
      <table>
        <tbody style={{ height: `${virtualizer.getTotalSize()}px` }}>
          {virtualizer.getVirtualItems().map(virtualRow => {
            const row = rows[virtualRow.index];
            return (
              <tr
                key={row.id}
                style={{
                  height: `${virtualRow.size}px`,
                  transform: `translateY(${virtualRow.start}px)`,
                  position: 'absolute',
                  width: '100%',
                }}
              >
                {row.getVisibleCells().map(cell => (
                  <td key={cell.id}>
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </td>
                ))}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
```

### Pattern 5: Formula Parser Integration
**What:** Evaluate Excel-like formulas for custom columns
**When to use:** For formula-type custom columns

```typescript
// Source: hot-formula-parser npm docs
import { Parser } from 'hot-formula-parser';

function createFormulaEngine(row: RCTRow, columns: CustomColumn[]) {
  const parser = new Parser();

  // Map column names to values
  parser.on('callVariable', (name: string, done: (value: any) => void) => {
    const column = columns.find(c => c.name.replace(/\s/g, '_') === name);
    if (column) {
      done(row.customValues[column.id] ?? 0);
    } else if (name === 'Gross_Score') {
      done(row.grossScore);
    } else if (name === 'Risk_Appetite') {
      done(row.riskAppetite);
    } else {
      done(0);
    }
  });

  return parser;
}

// Usage
const parser = createFormulaEngine(row, customColumns);
const result = parser.parse('IF(Gross_Score>15,"High","Low")');
// result = { error: null, result: "High" }
```

### Pattern 6: Heatmap Color Interpolation
**What:** Map risk scores (1-25) to green-yellow-orange-red gradient
**When to use:** For risk score cells

```typescript
// Source: React color interpolation pattern
const HEATMAP_STOPS = [
  { score: 1, color: [34, 197, 94] },    // Green-500
  { score: 6, color: [234, 179, 8] },    // Yellow-500
  { score: 12, color: [249, 115, 22] },  // Orange-500
  { score: 25, color: [239, 68, 68] },   // Red-500
];

function getHeatmapColor(score: number): string {
  // Find surrounding stops
  let lower = HEATMAP_STOPS[0];
  let upper = HEATMAP_STOPS[HEATMAP_STOPS.length - 1];

  for (let i = 0; i < HEATMAP_STOPS.length - 1; i++) {
    if (score >= HEATMAP_STOPS[i].score && score <= HEATMAP_STOPS[i + 1].score) {
      lower = HEATMAP_STOPS[i];
      upper = HEATMAP_STOPS[i + 1];
      break;
    }
  }

  // Interpolate
  const ratio = (score - lower.score) / (upper.score - lower.score);
  const r = Math.round(lower.color[0] + ratio * (upper.color[0] - lower.color[0]));
  const g = Math.round(lower.color[1] + ratio * (upper.color[1] - lower.color[1]));
  const b = Math.round(lower.color[2] + ratio * (upper.color[2] - lower.color[2]));

  return `rgb(${r}, ${g}, ${b})`;
}

function getContrastingText(backgroundColor: string): string {
  // Parse RGB from string
  const match = backgroundColor.match(/\d+/g);
  if (!match) return 'white';
  const [r, g, b] = match.map(Number);
  // Luminance formula
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.5 ? '#1e293b' : '#f8fafc'; // slate-800 or slate-50
}
```

### Pattern 7: Side Panel for Control Management
**What:** Slide-out panel for managing controls per RCT row
**When to use:** When user clicks "Add Controls" button

```typescript
// Source: shadcn/ui Sheet pattern (Radix Dialog based)
import * as Dialog from '@radix-ui/react-dialog';

interface ControlPanelProps {
  isOpen: boolean;
  onClose: () => void;
  row: RCTRow;
}

function ControlPanel({ isOpen, onClose, row }: ControlPanelProps) {
  return (
    <Dialog.Root open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/50" />
        <Dialog.Content className="fixed right-0 top-0 h-full w-[480px] bg-surface-primary p-6 shadow-xl">
          <Dialog.Title className="text-xl font-semibold text-text-primary">
            Controls for {row.riskName}
          </Dialog.Title>
          <Dialog.Description className="text-text-secondary mt-2">
            Add and manage controls to mitigate this risk.
          </Dialog.Description>

          {/* Control list and form */}
          <div className="mt-6 space-y-4">
            {row.controls.map(control => (
              <ControlCard key={control.id} control={control} />
            ))}
            <AddControlForm rowId={row.id} />
          </div>

          <Dialog.Close asChild>
            <button className="absolute top-4 right-4">
              <X size={20} />
            </button>
          </Dialog.Close>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
```

### Anti-Patterns to Avoid
- **Re-rendering entire table on filter change:** Use TanStack Table's optimized row models
- **Storing filtered data separately:** Let TanStack Table manage derived filtered state
- **Computing heatmap colors in render:** Memoize color calculations
- **Using innerHTML for formula results:** Always sanitize/type-check parser output
- **Fetching unique values on every filter change:** Use getFacetedUniqueValues memoization

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Table sorting/filtering | Custom array operations | TanStack Table row models | Handles multi-sort, multi-filter, pagination composition |
| Unique filter values | `[...new Set(data.map())]` | `getFacetedUniqueValues()` | Memoized, handles updates efficiently |
| Excel formula parsing | Regex string manipulation | hot-formula-parser | Handles operator precedence, nested functions, cell refs |
| Large table performance | CSS tricks | TanStack Virtual | Only renders visible rows, handles scroll position |
| Focus trapping in panel | Manual keydown handlers | Radix Dialog | WAI-ARIA compliant, handles edge cases |
| Column visibility state | Manual boolean map | TanStack Table columnVisibility | Integrated with column API, toggle helpers |

**Key insight:** TanStack Table is "headless" - it handles all the complex state management (filtering, sorting, grouping, pagination) while you control rendering. Don't duplicate its logic.

## Common Pitfalls

### Pitfall 1: Cartesian Product Memory with Large Taxonomies
**What goes wrong:** 100 risks x 100 processes = 10,000 rows generated at once
**Why it happens:** Generating all combinations eagerly without considering scale
**How to avoid:** Generate rows lazily or paginate; virtualize the table; warn users about large combinations
**Warning signs:** Browser freezing when taxonomies grow

### Pitfall 2: Stale Filter Values After Data Changes
**What goes wrong:** Filter dropdown shows old values after taxonomy sync
**Why it happens:** Memoizing unique values without taxonomy dependency
**How to avoid:** Include data in memoization dependencies; re-calculate on taxonomy change
**Warning signs:** Filters showing "undefined" or missing new items

### Pitfall 3: Formula Parser Injection
**What goes wrong:** Malicious formula strings execute unexpected code
**Why it happens:** Trusting user-provided formula strings
**How to avoid:** Validate formula syntax before evaluation; limit available functions; sanitize output
**Warning signs:** Error messages revealing internal implementation

### Pitfall 4: Heatmap Colors Not Accessible
**What goes wrong:** Color-blind users can't distinguish risk levels
**Why it happens:** Relying only on red-green color coding
**How to avoid:** Also show numeric score; use patterns or icons as secondary indicator
**Warning signs:** User feedback about indistinguishable colors

### Pitfall 5: Side Panel Losing State on Close
**What goes wrong:** Control form data lost when panel accidentally closed
**Why it happens:** Unmounting panel component destroys form state
**How to avoid:** Store draft control in Zustand; confirm discard if unsaved changes
**Warning signs:** User complaints about lost work

### Pitfall 6: Column Order Not Persisting
**What goes wrong:** Custom column order resets on page reload
**Why it happens:** Only persisting row data, not table configuration
**How to avoid:** Persist columnOrder state in Zustand/localStorage alongside data
**Warning signs:** Users repeatedly reordering columns

## Code Examples

Verified patterns from official sources:

### RCT Row Data Model
```typescript
// Complete type definitions for RCT
interface RCTRow {
  id: string;                    // UUID
  // Risk hierarchy (from taxonomy)
  riskId: string;                // UUID of lowest-level risk
  riskL1Id: string;
  riskL1Name: string;
  riskL2Id?: string;
  riskL2Name?: string;
  riskL3Id?: string;
  riskL3Name?: string;
  riskL4Id?: string;
  riskL4Name?: string;
  riskL5Id?: string;
  riskL5Name?: string;
  riskName: string;              // Lowest level name
  riskDescription: string;
  // Process hierarchy (from taxonomy)
  processId: string;             // UUID of lowest-level process
  processL1Id: string;
  processL1Name: string;
  processL2Id?: string;
  processL2Name?: string;
  processL3Id?: string;
  processL3Name?: string;
  processL4Id?: string;
  processL4Name?: string;
  processL5Id?: string;
  processL5Name?: string;
  processName: string;           // Lowest level name
  processDescription: string;
  // Scoring
  grossProbability: number | null;  // 1-5
  grossImpact: number | null;       // 1-5
  grossScore: number | null;        // Calculated: probability * impact
  riskAppetite: number;             // Default: 9
  withinAppetite: number | null;    // Calculated: appetite - grossScore
  // Controls
  controls: Control[];
  hasControls: boolean;             // Derived: controls.length > 0
  netScore: number | null;          // From controls (lowest or average)
  // Custom columns
  customValues: Record<string, string | number | Date | null>;
}

interface Control {
  id: string;
  description: string;
  netProbability: number | null;    // 1-5
  netImpact: number | null;         // 1-5
  netScore: number | null;          // Calculated
}

interface CustomColumn {
  id: string;
  name: string;
  type: 'text' | 'number' | 'dropdown' | 'date' | 'formula';
  options?: string[];               // For dropdown type
  formula?: string;                 // For formula type
  width?: number;
}
```

### Row Generation from Taxonomies
```typescript
// Source: Cartesian product pattern
import { nanoid } from 'nanoid';

function getLeafItems(items: TaxonomyItem[]): TaxonomyItem[] {
  const leaves: TaxonomyItem[] = [];

  function traverse(item: TaxonomyItem) {
    if (!item.children?.length) {
      leaves.push(item);
    } else {
      item.children.forEach(traverse);
    }
  }

  items.forEach(traverse);
  return leaves;
}

function getHierarchyPath(
  item: TaxonomyItem,
  allItems: TaxonomyItem[]
): { l1?: TaxonomyItem; l2?: TaxonomyItem; l3?: TaxonomyItem; l4?: TaxonomyItem; l5?: TaxonomyItem } {
  // Walk up the tree to find ancestors at each level
  // Implementation depends on how parent references are stored
}

function generateRCTRows(
  risks: TaxonomyItem[],
  processes: TaxonomyItem[]
): RCTRow[] {
  const leafRisks = getLeafItems(risks);
  const leafProcesses = getLeafItems(processes);
  const rows: RCTRow[] = [];

  for (const risk of leafRisks) {
    const riskPath = getHierarchyPath(risk, risks);

    for (const process of leafProcesses) {
      const processPath = getHierarchyPath(process, processes);

      rows.push({
        id: nanoid(),
        riskId: risk.id,
        riskL1Id: riskPath.l1?.hierarchicalId ?? '',
        riskL1Name: riskPath.l1?.name ?? '',
        // ... fill all levels
        riskName: risk.name,
        riskDescription: risk.description,
        processId: process.id,
        processL1Id: processPath.l1?.hierarchicalId ?? '',
        processL1Name: processPath.l1?.name ?? '',
        // ... fill all levels
        processName: process.name,
        processDescription: process.description,
        grossProbability: null,
        grossImpact: null,
        grossScore: null,
        riskAppetite: 9,
        withinAppetite: null,
        controls: [],
        hasControls: false,
        netScore: null,
        customValues: {},
      });
    }
  }

  return rows;
}
```

### Score Selector Component
```typescript
// Visual 1-5 scale selector
interface ScoreSelectorProps {
  value: number | null;
  onChange: (value: number) => void;
  labels: string[];  // e.g., ['Rare', 'Unlikely', 'Possible', 'Likely', 'Almost Certain']
}

function ScoreSelector({ value, onChange, labels }: ScoreSelectorProps) {
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map(score => (
        <button
          key={score}
          onClick={() => onChange(score)}
          className={clsx(
            'w-8 h-8 rounded text-sm font-medium transition-colors',
            value === score
              ? 'bg-accent-500 text-white'
              : 'bg-surface-secondary text-text-secondary hover:bg-surface-tertiary'
          )}
          title={labels[score - 1]}
        >
          {score}
        </button>
      ))}
    </div>
  );
}
```

### Zustand Store for RCT
```typescript
// Source: Zustand with immer pattern from Phase 1/2
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';

interface RCTState {
  rows: RCTRow[];
  customColumns: CustomColumn[];
  columnVisibility: Record<string, boolean>;
  columnOrder: string[];
  // Actions
  setRows: (rows: RCTRow[]) => void;
  updateRow: (rowId: string, updates: Partial<RCTRow>) => void;
  addControl: (rowId: string, control: Control) => void;
  removeControl: (rowId: string, controlId: string) => void;
  addCustomColumn: (column: CustomColumn) => void;
  setColumnVisibility: (visibility: Record<string, boolean>) => void;
  setColumnOrder: (order: string[]) => void;
}

export const useRCTStore = create<RCTState>()(
  persist(
    immer((set) => ({
      rows: [],
      customColumns: [],
      columnVisibility: {},
      columnOrder: [],

      setRows: (rows) => set((state) => {
        state.rows = rows;
      }),

      updateRow: (rowId, updates) => set((state) => {
        const row = state.rows.find(r => r.id === rowId);
        if (row) {
          Object.assign(row, updates);
          // Recalculate derived fields
          if (row.grossProbability && row.grossImpact) {
            row.grossScore = row.grossProbability * row.grossImpact;
            row.withinAppetite = row.riskAppetite - row.grossScore;
          }
        }
      }),

      addControl: (rowId, control) => set((state) => {
        const row = state.rows.find(r => r.id === rowId);
        if (row) {
          row.controls.push(control);
          row.hasControls = true;
          // Recalculate net score (using lowest net score from controls)
          const validScores = row.controls
            .map(c => c.netScore)
            .filter((s): s is number => s !== null);
          row.netScore = validScores.length ? Math.min(...validScores) : null;
        }
      }),

      removeControl: (rowId, controlId) => set((state) => {
        const row = state.rows.find(r => r.id === rowId);
        if (row) {
          row.controls = row.controls.filter(c => c.id !== controlId);
          row.hasControls = row.controls.length > 0;
          // Recalculate net score
          const validScores = row.controls
            .map(c => c.netScore)
            .filter((s): s is number => s !== null);
          row.netScore = validScores.length ? Math.min(...validScores) : null;
        }
      }),

      addCustomColumn: (column) => set((state) => {
        state.customColumns.push(column);
        state.columnVisibility[column.id] = true;
        state.columnOrder.push(column.id);
      }),

      setColumnVisibility: (visibility) => set((state) => {
        state.columnVisibility = visibility;
      }),

      setColumnOrder: (order) => set((state) => {
        state.columnOrder = order;
      }),
    })),
    {
      name: 'riskguard-rct',
    }
  )
);
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| react-table v7 (class-based) | TanStack Table v8 (hooks) | 2022 | Headless design, better TypeScript, smaller bundle |
| Custom filter logic | getFacetedUniqueValues | 2023 | Built-in memoization, proper derivation |
| react-window | TanStack Virtual | 2023 | Same author, better API, lighter |
| Full grid libraries | Headless + custom UI | 2024+ | More control over styling, smaller bundles |
| formula.js standalone | hot-formula-parser | 2020+ | Event-driven cell references, better error handling |

**Deprecated/outdated:**
- `react-table` v7: Use TanStack Table v8
- `formula-parser` (non-hot): Archived, use hot-formula-parser
- AG Grid Community for simple tables: Overkill, use TanStack Table

## Open Questions

Things that couldn't be fully resolved:

1. **Net Score Aggregation Strategy**
   - What we know: Multiple controls per row, each with its own net score
   - What's unclear: Display lowest net score, average, or let user choose?
   - Recommendation: Default to lowest (most conservative), allow configuration later

2. **Taxonomy Sync Conflict Resolution**
   - What we know: RCT rows reference taxonomy items by ID
   - What's unclear: What happens to row data when a taxonomy item is deleted?
   - Recommendation: Mark rows as "orphaned" with warning, don't auto-delete (user data loss)

3. **Formula Column Dependencies**
   - What we know: Formulas can reference other columns
   - What's unclear: How to handle circular references or invalid references?
   - Recommendation: hot-formula-parser returns `#REF!` error; display error in cell

4. **Large Dataset Threshold**
   - What we know: Virtualization recommended for 100+ rows
   - What's unclear: Exact threshold where performance degrades
   - Recommendation: Enable virtualization always; overhead is minimal for small tables

## Sources

### Primary (HIGH confidence)
- [TanStack Table v8 Docs](https://tanstack.com/table/v8) - Column filtering, visibility, faceting APIs
- [TanStack Virtual Docs](https://tanstack.com/virtual/latest) - Virtualization integration
- [hot-formula-parser GitHub](https://github.com/handsontable/formula-parser) - Formula evaluation (archived but stable)
- [Radix UI Dialog](https://www.radix-ui.com/primitives/docs/components/dialog) - Side panel foundation

### Secondary (MEDIUM confidence)
- [Material React Table Faceted Example](https://www.material-react-table.com/docs/examples/faceted-values) - Filter UI patterns
- [shadcn/ui Sheet](https://ui.shadcn.com/docs/components/sheet) - Side panel component pattern
- [React Color Interpolation](https://dev.to/lionelmarco/react-color-scale-interpolation-map) - Heatmap color algorithm

### Tertiary (LOW confidence)
- Various blog posts on TanStack Table virtualization patterns
- GitHub discussions on formula parser use cases

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - TanStack Table is established, well-documented
- Architecture: HIGH - Patterns derived from official docs and established patterns
- Formula parsing: MEDIUM - hot-formula-parser is archived but stable and widely used
- Heatmap colors: HIGH - Simple RGB interpolation is well-understood
- Side panel: HIGH - Radix Dialog is production-ready

**Research date:** 2026-01-19
**Valid until:** 2026-02-19 (30 days - stable libraries)
