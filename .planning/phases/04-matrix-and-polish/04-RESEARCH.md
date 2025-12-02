# Phase 4: Matrix and Polish - Research

**Researched:** 2026-01-19
**Domain:** Risk-Process Matrix visualization, Excel export, role-based UI
**Confidence:** HIGH

## Summary

Phase 4 requires building a Risk-Process Matrix with bidirectional scrolling, sticky headers, weighted aggregation, expandable drill-down cells, Excel export, and role-based access control. The existing codebase uses TanStack Table with Virtual for the RCT, Radix UI for overlays/dialogs, and Zustand for state management.

The matrix grid should use CSS position sticky for both row and column headers, with careful z-index layering. Aggregation calculations must use weighted averages computed from child RCT rows grouped by risk/process hierarchy. ExcelJS is the recommended library for multi-sheet styled Excel export with browser support. Role-based access is already partially implemented via uiStore and can be extended with conditional rendering patterns.

**Primary recommendation:** Build the matrix as a custom CSS Grid component with position sticky headers, reuse existing HeatmapCell for color interpolation, implement weighted aggregation in a dedicated utility, use ExcelJS for export, and extend the existing role state for permission-based UI toggling.

## Standard Stack

The established libraries/tools for this domain:

### Core (Already in Project)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| TanStack Table | ^8.21.3 | Table state management | Already used for RCT, consistent patterns |
| TanStack Virtual | ^3.13.18 | Row virtualization | Already used for RCT performance |
| Radix UI Popover | ^1.1.15 | Expandable cell overlays | Already used for comments, accessible |
| Radix UI Dialog | ^1.1.15 | Slide-out panels | Already used for ControlPanel |
| Zustand | ^5.0.10 | State management | Already used for rctStore, uiStore |
| Tailwind CSS | ^4.1.18 | Styling | Already configured with dark mode |

### New for Phase 4
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| ExcelJS | ^4.4.0 | Excel export with styling | Multi-sheet workbook with colored cells |
| file-saver | ^2.0.5 | Browser file download | Trigger download from ExcelJS buffer |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| ExcelJS | SheetJS (xlsx) | SheetJS has security vulnerabilities in older versions; ExcelJS has better styling API |
| Custom CSS Grid | AG Grid | AG Grid is overkill for fixed matrix layout; custom gives full control |
| Radix Popover | Custom portal | Radix handles accessibility and click-outside automatically |

**Installation:**
```bash
npm install exceljs file-saver
npm install -D @types/file-saver
```

## Architecture Patterns

### Recommended Project Structure
```
src/
  components/
    matrix/
      MatrixGrid.tsx        # Main matrix grid component
      MatrixCell.tsx        # Individual cell with color and drill-down
      MatrixHeader.tsx      # Sticky row/column headers
      MatrixExpandedView.tsx # Expanded cell mini-table
      MatrixToolbar.tsx     # Zoom, export, settings controls
  utils/
    aggregation.ts          # Weighted average calculations
    excelExport.ts          # ExcelJS workbook generation
  stores/
    matrixStore.ts          # Matrix-specific state (zoom, weights, expanded cell)
```

### Pattern 1: CSS Grid with Position Sticky
**What:** Matrix layout using CSS Grid with sticky headers on both axes
**When to use:** Fixed matrix with both horizontal and vertical scrolling
**Example:**
```css
/* Source: https://css-tricks.com/a-table-with-both-a-sticky-header-and-a-sticky-first-column/ */
.matrix-container {
  overflow: auto;
  max-height: calc(100vh - 200px);
}

.matrix-grid {
  display: grid;
  grid-template-columns: 200px repeat(var(--col-count), 60px);
  grid-template-rows: 60px repeat(var(--row-count), 60px);
}

/* Column headers (risks) - stick to top */
.matrix-col-header {
  position: sticky;
  top: 0;
  z-index: 2;
  background: var(--surface-elevated);
}

/* Row headers (processes) - stick to left */
.matrix-row-header {
  position: sticky;
  left: 0;
  z-index: 2;
  background: var(--surface-elevated);
}

/* Corner cell - highest z-index */
.matrix-corner {
  position: sticky;
  top: 0;
  left: 0;
  z-index: 3;
  background: var(--surface-elevated);
}

/* Data cells */
.matrix-cell {
  z-index: 1;
}
```

### Pattern 2: Weighted Aggregation Calculation
**What:** Calculate weighted average scores from child RCT rows
**When to use:** Rolling up leaf-level scores to higher hierarchy levels
**Example:**
```typescript
// Source: Pattern derived from AG Grid aggregation concepts
interface AggregationWeights {
  l1: number  // Level 1 weight
  l2: number  // Level 2 weight
  l3: number  // Level 3 weight
  l4: number  // Level 4 weight
  l5: number  // Level 5 weight
}

const DEFAULT_WEIGHTS: AggregationWeights = {
  l1: 1, l2: 1, l3: 1, l4: 1, l5: 1
}

function calculateWeightedAverage(
  rows: RCTRow[],
  riskId: string,
  processId: string,
  weights: AggregationWeights
): number | null {
  // Filter rows matching risk and process hierarchy
  const matchingRows = rows.filter(row =>
    matchesHierarchy(row, 'risk', riskId) &&
    matchesHierarchy(row, 'process', processId)
  )

  if (matchingRows.length === 0) return null

  const validRows = matchingRows.filter(r => r.grossScore !== null)
  if (validRows.length === 0) return null

  // Get weight based on deepest level
  const getWeight = (row: RCTRow) => {
    if (row.riskL5Id) return weights.l5
    if (row.riskL4Id) return weights.l4
    if (row.riskL3Id) return weights.l3
    if (row.riskL2Id) return weights.l2
    return weights.l1
  }

  const totalWeight = validRows.reduce((sum, row) => sum + getWeight(row), 0)
  const weightedSum = validRows.reduce((sum, row) =>
    sum + (row.grossScore! * getWeight(row)), 0
  )

  return Math.round(weightedSum / totalWeight * 10) / 10
}
```

### Pattern 3: Expandable Cell with Radix Popover
**What:** Click a matrix cell to show mini-table of related RCT rows
**When to use:** Drill-down from aggregated view to detail rows
**Example:**
```tsx
// Source: Existing CommentButton pattern in RCTTable.tsx + Radix Popover docs
function MatrixCell({ riskId, processId, score }: Props) {
  const [isExpanded, setIsExpanded] = useState(false)
  const relatedRows = useRCTStore(state =>
    state.rows.filter(r =>
      matchesHierarchy(r, 'risk', riskId) &&
      matchesHierarchy(r, 'process', processId)
    )
  )

  return (
    <Popover.Root open={isExpanded} onOpenChange={setIsExpanded}>
      <Popover.Trigger asChild>
        <button className="matrix-cell">
          <HeatmapCell score={score} />
        </button>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content className="expanded-view" sideOffset={5}>
          <MatrixExpandedView
            rows={relatedRows}
            onJumpToRCT={() => {/* navigate with filters */}}
          />
          <Popover.Arrow />
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  )
}
```

### Pattern 4: ExcelJS Multi-Sheet Export
**What:** Export RCT data, Matrix summary, and Taxonomies to separate Excel sheets
**When to use:** User triggers export with option for filtered or all data
**Example:**
```typescript
// Source: ExcelJS GitHub documentation
import ExcelJS from 'exceljs'
import { saveAs } from 'file-saver'

async function exportToExcel(
  rctRows: RCTRow[],
  matrixData: MatrixCellData[][],
  risks: TaxonomyItem[],
  processes: TaxonomyItem[],
  exportAll: boolean
) {
  const workbook = new ExcelJS.Workbook()
  workbook.creator = 'RiskGuard ERM'
  workbook.created = new Date()

  // Sheet 1: RCT Data
  const rctSheet = workbook.addWorksheet('Risk Control Table')
  rctSheet.columns = [
    { header: 'Risk L1', key: 'riskL1Name', width: 20 },
    { header: 'Process L1', key: 'processL1Name', width: 20 },
    { header: 'Gross Score', key: 'grossScore', width: 12 },
    { header: 'Net Score', key: 'netScore', width: 12 },
    // ... more columns
  ]
  rctSheet.addRows(rctRows)

  // Style header row
  rctSheet.getRow(1).eachCell(cell => {
    cell.font = { bold: true }
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF1E293B' }
    }
    cell.font = { color: { argb: 'FFFAFAFA' }, bold: true }
  })

  // Sheet 2: Matrix Summary
  const matrixSheet = workbook.addWorksheet('Risk-Process Matrix')
  // Build matrix with colored cells...

  // Sheet 3: Risk Taxonomy
  const riskSheet = workbook.addWorksheet('Risk Taxonomy')
  // Flatten and add taxonomy data...

  // Sheet 4: Process Taxonomy
  const processSheet = workbook.addWorksheet('Process Taxonomy')
  // Flatten and add taxonomy data...

  // Export
  const buffer = await workbook.xlsx.writeBuffer()
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  })
  saveAs(blob, `RiskGuard_Export_${new Date().toISOString().slice(0,10)}.xlsx`)
}
```

### Pattern 5: Role-Based Conditional Rendering
**What:** Show/hide UI elements based on current role
**When to use:** Control Owner has restricted edit access vs Risk Manager
**Example:**
```tsx
// Source: Existing uiStore pattern + RBAC best practices
// Already in uiStore.ts:
// selectedRole: 'risk-manager' | 'control-owner'

// Permission helper
function usePermissions() {
  const role = useUIStore(state => state.selectedRole)
  return {
    canEditControls: role === 'risk-manager',
    canEditControlAssessments: true, // Both roles
    canEditRiskDefinitions: role === 'risk-manager',
    canViewAll: role === 'risk-manager',
    canRequestChanges: role === 'control-owner',
  }
}

// Usage in component
function ControlPanel() {
  const { canEditControls, canRequestChanges } = usePermissions()

  return (
    <>
      {canEditControls && (
        <button onClick={handleDelete}>Delete Control</button>
      )}
      {canRequestChanges && (
        <CommentThread type="change-request" />
      )}
    </>
  )
}
```

### Anti-Patterns to Avoid
- **Building custom sticky header logic in JavaScript:** Use CSS position: sticky; it's well-supported and performant
- **Calculating aggregation on every render:** Memoize aggregation calculations with useMemo or store derived state
- **Putting all matrix state in rctStore:** Create dedicated matrixStore for matrix-specific UI state (zoom, weights, expanded cells)
- **Using SheetJS without checking version:** Older versions have security vulnerabilities; ExcelJS is safer choice
- **Frontend-only role checks:** While this is a demo without backend, note that real RBAC must be enforced server-side

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Excel file generation | Custom XML/zip builder | ExcelJS | Excel format is complex; ExcelJS handles styling, formulas, multiple sheets |
| File download in browser | Manual blob/URL creation | file-saver | Handles browser inconsistencies, proper MIME types |
| Click-outside detection | document.addEventListener | Radix Popover | Accessible, handles focus, portal positioning |
| Color interpolation | Custom RGB math | Existing getHeatmapColor() | Already implemented and tested in heatmapColors.ts |
| Sticky positioning | JavaScript scroll listeners | CSS position: sticky | Native browser support, GPU-accelerated |
| Overlay positioning | Manual coordinate calculation | Radix Popover/Portal | Handles viewport boundaries, scroll, z-index |

**Key insight:** The codebase already has robust patterns for overlays (Radix), color interpolation (heatmapColors.ts), and state management (Zustand stores). Reuse these instead of building parallel systems.

## Common Pitfalls

### Pitfall 1: Sticky Headers Not Working in CSS Grid
**What goes wrong:** Headers don't stick when using display: grid
**Why it happens:** Grid items have align-items: stretch by default, which breaks sticky
**How to avoid:** Set align-self: start on sticky elements, or use separate grid containers
**Warning signs:** Headers scroll with content instead of staying fixed

### Pitfall 2: Z-Index Layer Conflicts with Popovers
**What goes wrong:** Expanded cell popover appears behind headers or other cells
**Why it happens:** Sticky headers have z-index, popover portal z-index must be higher
**How to avoid:** Use Radix Portal (renders at document root) with z-index: 50+
**Warning signs:** Popover content is clipped or obscured

### Pitfall 3: Aggregation Recalculates on Every Render
**What goes wrong:** Matrix becomes sluggish with many RCT rows
**Why it happens:** Computing weighted averages for every cell on each render
**How to avoid:**
1. Memoize aggregation with useMemo keyed on rows and hierarchy IDs
2. Pre-compute aggregation map when rows change, store in matrixStore
**Warning signs:** Lag when scrolling matrix, React DevTools shows excessive re-renders

### Pitfall 4: Excel Export Memory Issues with Large Datasets
**What goes wrong:** Browser tab crashes or freezes during export
**Why it happens:** ExcelJS builds entire workbook in memory before writing buffer
**How to avoid:**
1. Show progress indicator during export
2. Limit row count with warning for very large exports (>10,000 rows)
3. Use web worker for export if needed (ExcelJS supports it)
**Warning signs:** Export button hangs, memory usage spikes in DevTools

### Pitfall 5: Popover Inside Scrollable Container Positioning
**What goes wrong:** Expanded cell popover drifts when scrolling matrix
**Why it happens:** Popover is positioned relative to viewport, not scroll container
**How to avoid:** Use Radix Popover with collision detection and avoidCollisions prop
**Warning signs:** Popover moves away from trigger cell during scroll

### Pitfall 6: Role State Not Persisting Correctly
**What goes wrong:** Role resets to default after refresh
**Why it happens:** uiStore already uses persist middleware - not an issue in current code
**How to avoid:** Verify role state is included in persist storage (already is)
**Warning signs:** Role dropdown resets to "Risk Manager" on page reload

## Code Examples

Verified patterns from official sources and existing codebase:

### Matrix Store Structure
```typescript
// Source: Pattern from existing rctStore.ts
interface MatrixState {
  // Display settings
  zoomLevel: number  // 1 = normal, 0.5 = zoomed out, 2 = zoomed in
  showNumbers: boolean  // Show score numbers in cells

  // Weights for aggregation
  weights: AggregationWeights

  // Expanded cell state
  expandedCell: { riskId: string; processId: string } | null
  expandedViewColumns: string[]  // Which columns to show in mini-table

  // Actions
  setZoomLevel: (level: number) => void
  setWeights: (weights: Partial<AggregationWeights>) => void
  setExpandedCell: (cell: { riskId: string; processId: string } | null) => void
  setExpandedViewColumns: (columns: string[]) => void
}
```

### Hierarchy Matching Utility
```typescript
// Source: Pattern from existing rctGenerator.ts
function matchesHierarchy(
  row: RCTRow,
  type: 'risk' | 'process',
  hierarchyId: string
): boolean {
  const prefix = type === 'risk' ? 'risk' : 'process'

  // Check each level
  const levels = ['L1', 'L2', 'L3', 'L4', 'L5'] as const
  for (const level of levels) {
    const rowId = row[`${prefix}${level}Id` as keyof RCTRow] as string
    if (rowId === hierarchyId) return true
  }

  return false
}
```

### Adaptive Display Based on Zoom
```typescript
// Source: Decision from CONTEXT.md
function MatrixCell({ score, zoomLevel }: Props) {
  const showNumber = zoomLevel >= 1  // Threshold for showing numbers

  const bgColor = getHeatmapColor(score)
  const textColor = getContrastingText(bgColor)

  return (
    <div
      className="matrix-cell"
      style={{
        backgroundColor: bgColor,
        width: `${60 * zoomLevel}px`,
        height: `${60 * zoomLevel}px`,
      }}
    >
      {showNumber && score !== null && (
        <span style={{ color: textColor }}>{score.toFixed(1)}</span>
      )}
    </div>
  )
}
```

### Navigate to RCT with Filters
```typescript
// Source: React Router pattern
import { useNavigate, createSearchParams } from 'react-router'

function jumpToRCT(riskId: string, processId: string) {
  const navigate = useNavigate()

  // Build filter params
  const params = createSearchParams({
    riskFilter: riskId,
    processFilter: processId,
  })

  navigate(`/rct?${params.toString()}`)
}
```

### Comment Thread for Change Requests (Control Owner)
```typescript
// Source: Existing CommentButton pattern in RCTTable.tsx
interface ChangeRequest {
  id: string
  rowId: string
  authorRole: 'control-owner' | 'risk-manager'
  message: string
  timestamp: Date
  status: 'pending' | 'approved' | 'rejected'
}

// Store in rctStore or dedicated changeRequestStore
interface ChangeRequestState {
  requests: ChangeRequest[]
  addRequest: (rowId: string, message: string) => void
  resolveRequest: (requestId: string, status: 'approved' | 'rejected') => void
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| react-window for virtualization | TanStack Virtual | 2023-2024 | More flexible, better maintained |
| xlsx (SheetJS) for export | ExcelJS preferred | 2024-2025 | Security vulnerabilities in xlsx |
| JavaScript scroll listeners for sticky | CSS position: sticky | 2020+ | Better performance, native support |
| Custom modal/overlay logic | Radix UI primitives | 2022+ | Accessibility built-in, focus management |

**Deprecated/outdated:**
- **xlsx versions before 0.19.3:** Known prototype pollution and DoS vulnerabilities
- **Table-based sticky headers on `<thead>`:** Does not work reliably; apply sticky to `<th>` cells instead

## Open Questions

Things that couldn't be fully resolved:

1. **Optimal zoom threshold for number display**
   - What we know: User wants adaptive display (number + color when zoomed in, color only when zoomed out)
   - What's unclear: Exact zoom level threshold that feels right
   - Recommendation: Default to 1.0 (normal), allow user to adjust; numbers hidden below 0.75x

2. **Weight editing UI placement**
   - What we know: User decided weight editing is "hidden by default"
   - What's unclear: Best location when user opts to configure (settings panel vs inline)
   - Recommendation: Place in settings panel (gear icon in matrix toolbar) to keep main UI clean

3. **Matrix performance with large hierarchies**
   - What we know: TanStack Virtual handles row virtualization well
   - What's unclear: Whether matrix grid needs virtualization for column headers too (many risk categories)
   - Recommendation: Start without column virtualization; add if needed for >50 columns

## Sources

### Primary (HIGH confidence)
- ExcelJS GitHub README - workbook creation, styling, buffer export
- Radix UI Popover documentation - overlay patterns, click outside handling
- CSS-Tricks sticky header articles - z-index layering for dual-axis sticky
- Existing codebase: RCTTable.tsx, HeatmapCell.tsx, heatmapColors.ts, rctStore.ts

### Secondary (MEDIUM confidence)
- TanStack Virtual introduction docs - virtualizer API concepts
- AG Grid aggregation documentation - weighted average patterns (concept, not code)
- npm trends comparison - ExcelJS vs xlsx popularity and maintenance

### Tertiary (LOW confidence)
- WebSearch results for zoom/transform with scroll position - requires validation
- Community GitHub discussions on Radix nesting issues - edge cases, may not apply

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - Libraries already in project or well-documented
- Architecture: HIGH - Patterns derived from existing codebase + verified docs
- Pitfalls: MEDIUM - Based on known CSS/React patterns, some from community reports
- Export: HIGH - ExcelJS API verified from official documentation

**Research date:** 2026-01-19
**Valid until:** 2026-02-19 (30 days - stable libraries, no major versions expected)
