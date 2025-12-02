# Phase 10: Analytics & Reporting - Research

**Researched:** 2026-01-21
**Domain:** Data visualization, statistical sampling, risk trend analysis
**Confidence:** HIGH

## Summary

This phase implements three main capabilities: (1) trend charts showing control test results and risk score changes over time, (2) a statistical sampling calculator for control testing guidance, and (3) aggregation reports by business unit/risk category.

The project already has D3.js installed for the Sunburst visualization, but for standard charts (line, bar, area), **Recharts** is the recommended addition. Recharts wraps D3 in React components, provides TypeScript support out-of-the-box, and integrates naturally with the existing codebase patterns.

For statistical sampling, the AICPA/IIA standard sampling tables should be implemented as lookup functions - no external library needed. The formulas are well-established and straightforward to implement in TypeScript.

**Primary recommendation:** Add Recharts for trend charts; implement sampling calculator as pure utility functions using standard audit sampling tables.

## Standard Stack

The established libraries/tools for this domain:

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| recharts | ^2.15 | React charting (line, bar, area) | Built on D3, React-native, TypeScript types included, 24.8K GitHub stars |
| date-fns | 4.1.0 (existing) | Date manipulation for time series | Already in project |
| d3-scale | 4.0.2 (existing) | Scale functions for axes | Already in project |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| d3-time | ^3.1.0 | Time intervals for axis formatting | When need custom time axis labels |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Recharts | Raw D3 | Full control but much more code; Recharts already uses D3 internally |
| Recharts | Victory | Similar capability but larger bundle; Recharts more popular |
| Recharts | visx (Airbnb) | Lower level, more flexible, but requires more setup |

**Installation:**
```bash
npm install recharts
```

Note: `react-is` is typically needed as peer dependency. Check if already satisfied by existing React 19 installation.

## Architecture Patterns

### Recommended Project Structure
```
src/
├── components/
│   └── analytics/
│       ├── index.ts                    # Barrel export
│       ├── AnalyticsDashboard.tsx      # Main dashboard layout
│       ├── TrendChartSection.tsx       # Wrapper for trend charts
│       ├── ControlTestTrendChart.tsx   # Line chart for test results
│       ├── RiskScoreTrendChart.tsx     # Line chart for risk scores
│       ├── SamplingCalculator.tsx      # Sampling guidance UI
│       ├── SamplingResults.tsx         # Display recommended sample sizes
│       ├── AggregationReport.tsx       # Scores by category/unit
│       └── AggregationTable.tsx        # Data table for aggregations
├── hooks/
│   └── useAnalyticsData.ts             # Data transformation hooks
├── utils/
│   └── samplingCalculator.ts           # Pure sampling calculation functions
└── pages/
    └── AnalyticsPage.tsx               # Route handler (follows existing pattern)
```

### Pattern 1: Data Transformation Hook for Trend Data
**What:** Hook that transforms audit entries and control tests into time-series data points
**When to use:** When preparing data for trend charts
**Example:**
```typescript
// Source: Project pattern from useAuditLog.ts and useSunburstData.ts
interface TrendDataPoint {
  date: string       // ISO date or formatted string
  timestamp: number  // For XAxis type="number"
  value: number
  label?: string
}

function useControlTestTrends(
  controlId?: string,
  dateRange?: { start: Date; end: Date }
): TrendDataPoint[] {
  const controlTests = useRCTStore((state) => state.controlTests)

  return useMemo(() => {
    let tests = controlTests
    if (controlId) tests = tests.filter(t => t.controlId === controlId)
    if (dateRange) {
      tests = tests.filter(t => {
        const date = new Date(t.testDate)
        return date >= dateRange.start && date <= dateRange.end
      })
    }
    // Transform to chart data format
    return tests.map(t => ({
      date: t.testDate,
      timestamp: new Date(t.testDate).getTime(),
      value: t.effectiveness ?? (t.result === 'pass' ? 5 : t.result === 'partial' ? 3 : 1),
      label: t.result
    })).sort((a, b) => a.timestamp - b.timestamp)
  }, [controlTests, controlId, dateRange])
}
```

### Pattern 2: Recharts Line Chart with Dark Theme
**What:** Configuring Recharts for the existing dark theme
**When to use:** All chart components
**Example:**
```typescript
// Source: Recharts documentation, adapted for project theme
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'

const CHART_COLORS = {
  primary: 'rgb(251, 191, 36)',    // amber-400 (accent)
  secondary: 'rgb(34, 197, 94)',   // green-500
  grid: '#27272a',                  // surface-border
  text: '#a1a1aa',                  // text-secondary
  background: '#121212'             // surface-elevated
}

function ControlTestTrendChart({ data }: { data: TrendDataPoint[] }) {
  return (
    <ResponsiveContainer width="100%" height={300}>
      <LineChart data={data}>
        <CartesianGrid strokeDasharray="3 3" stroke={CHART_COLORS.grid} />
        <XAxis
          dataKey="date"
          stroke={CHART_COLORS.text}
          tick={{ fill: CHART_COLORS.text, fontSize: 12 }}
        />
        <YAxis
          domain={[1, 5]}
          stroke={CHART_COLORS.text}
          tick={{ fill: CHART_COLORS.text, fontSize: 12 }}
        />
        <Tooltip
          contentStyle={{
            backgroundColor: CHART_COLORS.background,
            border: `1px solid ${CHART_COLORS.grid}`,
            borderRadius: 8
          }}
        />
        <Line
          type="monotone"
          dataKey="value"
          stroke={CHART_COLORS.primary}
          strokeWidth={2}
          dot={{ fill: CHART_COLORS.primary, r: 4 }}
        />
      </LineChart>
    </ResponsiveContainer>
  )
}
```

### Pattern 3: Statistical Sampling Calculator
**What:** Pure function implementing AICPA/IIA sampling tables
**When to use:** When determining sample sizes for control testing
**Example:**
```typescript
// Source: AICPA Audit Sampling Guide, IIA Attribute Sampling Plans
interface SamplingInput {
  populationSize: number
  confidenceLevel: 90 | 95
  tolerableDeviationRate: 5 | 10
  expectedDeviationRate: 0 | 1 | 2
}

interface SamplingResult {
  recommendedSampleSize: number
  methodology: string
  notes: string[]
}

// AICPA-aligned sample size table (zero expected deviations)
const SAMPLE_SIZE_TABLE: Record<string, number> = {
  '90-10-0': 23,   // 90% conf, 10% tolerable, 0% expected
  '90-5-0': 46,
  '95-10-0': 29,
  '95-5-0': 59,
  '95-10-1': 46,   // With 1% expected deviation
  '95-5-1': 93,
}

function calculateSampleSize(input: SamplingInput): SamplingResult {
  const key = `${input.confidenceLevel}-${input.tolerableDeviationRate}-${input.expectedDeviationRate}`
  let baseSize = SAMPLE_SIZE_TABLE[key] ?? 25

  // Finite population correction for small populations
  if (input.populationSize < 250) {
    const adjustedSize = Math.ceil(
      (baseSize * input.populationSize) / (baseSize + input.populationSize - 1)
    )
    return {
      recommendedSampleSize: Math.max(adjustedSize, Math.min(input.populationSize, 2)),
      methodology: 'Finite population correction applied',
      notes: [`Population size ${input.populationSize} is below threshold for standard table`]
    }
  }

  return {
    recommendedSampleSize: baseSize,
    methodology: 'AICPA attribute sampling table',
    notes: []
  }
}
```

### Anti-Patterns to Avoid
- **Hand-rolling chart components with raw SVG:** Use Recharts - it handles responsive sizing, tooltips, animations
- **Storing calculated trend data in state:** Derive it in hooks using useMemo from source data
- **Complex sampling formulas:** Use lookup tables based on AICPA/IIA guidance; audit standards expect specific sample sizes

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Line/area charts | Custom SVG paths | Recharts `<LineChart>`, `<AreaChart>` | Responsive sizing, tooltips, accessibility |
| Date axis formatting | Custom formatting | Recharts XAxis with date-fns format | Automatic interval detection |
| Hover tooltips | Custom mouse tracking | Recharts `<Tooltip>` | Handles edge cases, positioning |
| Sample size calculation | Complex statistical formulas | Lookup table from audit standards | Industry-standard, auditor-expected values |
| Data aggregation by category | Complex reduce/groupBy | Extend existing aggregation.ts | Consistent with Matrix/Sunburst patterns |

**Key insight:** Recharts deliberately abstracts away D3's complexity for common chart types. The project already uses D3 directly for the Sunburst (which is custom), but standard charts should use the higher-level abstraction.

## Common Pitfalls

### Pitfall 1: Time Series XAxis Configuration
**What goes wrong:** Recharts spaces data points evenly by default, ignoring actual timestamps
**Why it happens:** Default XAxis treats each data point as a category
**How to avoid:** Set `type="number"` on XAxis and use timestamp as dataKey; set domain to `[dataMin, dataMax]`
**Warning signs:** Data points appear evenly spaced despite irregular timestamps

### Pitfall 2: Responsive Container Without Height
**What goes wrong:** Chart renders with zero height or overflows container
**Why it happens:** ResponsiveContainer needs explicit height or parent with defined height
**How to avoid:** Either set `height={number}` on ResponsiveContainer or ensure parent has explicit height/min-height
**Warning signs:** Empty chart area, console warnings about dimensions

### Pitfall 3: Audit Data Volume Performance
**What goes wrong:** Slow rendering when audit store has thousands of entries
**Why it happens:** Re-computing aggregations on every render
**How to avoid:**
  - Use useMemo with proper dependencies
  - Limit date ranges for trend charts (default to last 90 days)
  - Consider pagination for aggregation tables
**Warning signs:** Sluggish UI when navigating to Analytics page

### Pitfall 4: Control Test Data Sparsity
**What goes wrong:** Trend charts appear empty or have few data points
**Why it happens:** Control tests may only run monthly/quarterly; new deployments have no history
**How to avoid:**
  - Show appropriate empty states
  - Allow date range adjustment
  - Consider showing expected test dates alongside actual
**Warning signs:** Empty charts in demo, confusion about "no data"

### Pitfall 5: Sample Size Misinterpretation
**What goes wrong:** Users treat sample calculator as definitive rather than guidance
**Why it happens:** Statistical sampling requires professional judgment beyond the formula
**How to avoid:**
  - Include methodology documentation in UI
  - Add notes explaining assumptions
  - Label as "guidance" not "requirement"
**Warning signs:** Audit findings about improper sampling methodology

## Code Examples

Verified patterns from official sources:

### Recharts Line Chart Basic Structure
```typescript
// Source: https://github.com/recharts/recharts README
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'

<ResponsiveContainer width="100%" height={300}>
  <LineChart data={data}>
    <CartesianGrid strokeDasharray="3 3" />
    <XAxis dataKey="date" />
    <YAxis />
    <Tooltip />
    <Line type="monotone" dataKey="value" stroke="#f59e0b" />
  </LineChart>
</ResponsiveContainer>
```

### Recharts Time Series XAxis Configuration
```typescript
// Source: https://github.com/recharts/recharts/issues/956, verified pattern
<XAxis
  dataKey="timestamp"
  type="number"
  domain={['dataMin', 'dataMax']}
  tickFormatter={(timestamp) => format(new Date(timestamp), 'MMM d')}
/>
```

### Custom Tooltip Matching Project Theme
```typescript
// Source: Recharts customization guide, adapted for project
import type { TooltipProps } from 'recharts'

function CustomTooltip({ active, payload, label }: TooltipProps<number, string>) {
  if (!active || !payload?.length) return null

  return (
    <div className="bg-surface-elevated border border-surface-border rounded-lg p-3 shadow-lg">
      <p className="text-text-secondary text-sm">{label}</p>
      {payload.map((entry, i) => (
        <p key={i} className="text-text-primary font-medium">
          {entry.name}: {entry.value}
        </p>
      ))}
    </div>
  )
}

// Usage: <Tooltip content={<CustomTooltip />} />
```

### Risk Score History from Audit Entries
```typescript
// Source: Project pattern from useAuditLog.ts
function useRiskScoreHistory(rowId: string): TrendDataPoint[] {
  const entries = useAuditStore((state) => state.entries)

  return useMemo(() => {
    // Filter to grossScore/netScore changes for this row
    return entries
      .filter(e =>
        e.entityType === 'rctRow' &&
        e.entityId === rowId &&
        e.fieldChanges.some(fc => ['grossScore', 'netScore'].includes(fc.field))
      )
      .map(e => {
        const scoreChange = e.fieldChanges.find(fc =>
          ['grossScore', 'netScore'].includes(fc.field)
        )
        return {
          date: e.timestamp,
          timestamp: new Date(e.timestamp).getTime(),
          value: scoreChange?.newValue as number ?? 0,
          label: scoreChange?.field
        }
      })
      .sort((a, b) => a.timestamp - b.timestamp)
  }, [entries, rowId])
}
```

### Aggregation by Risk Category
```typescript
// Source: Project pattern from aggregation.ts
interface CategoryAggregation {
  categoryId: string
  categoryName: string
  avgGrossScore: number | null
  avgNetScore: number | null
  rowCount: number
  controlCount: number
}

function aggregateByRiskL1(rows: RCTRow[]): CategoryAggregation[] {
  const groups = new Map<string, RCTRow[]>()

  for (const row of rows) {
    const key = row.riskL1Id
    if (!groups.has(key)) groups.set(key, [])
    groups.get(key)!.push(row)
  }

  return Array.from(groups.entries()).map(([id, groupRows]) => {
    const validGross = groupRows.filter(r => r.grossScore !== null)
    const validNet = groupRows.filter(r => r.netScore !== null)

    return {
      categoryId: id,
      categoryName: groupRows[0]?.riskL1Name ?? 'Unknown',
      avgGrossScore: validGross.length
        ? validGross.reduce((sum, r) => sum + (r.grossScore ?? 0), 0) / validGross.length
        : null,
      avgNetScore: validNet.length
        ? validNet.reduce((sum, r) => sum + (r.netScore ?? 0), 0) / validNet.length
        : null,
      rowCount: groupRows.length,
      controlCount: groupRows.reduce((sum, r) => sum + r.controls.length, 0)
    }
  })
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| D3 direct DOM manipulation | D3 for calculations, React for rendering | 2019+ | Better React integration |
| Chart.js | Recharts/Victory for React apps | 2020+ | React-native components |
| Complex sampling formulas | Lookup tables per AICPA guidance | N/A | Alignment with audit standards |

**Deprecated/outdated:**
- react-d3 (unmaintained, use recharts)
- react-chartjs-2 (works but not React-native design)
- Manual SVG chart construction for standard charts

## Open Questions

Things that couldn't be fully resolved:

1. **Test Result Trend Aggregation Method**
   - What we know: Control tests have result (pass/fail/partial) and optional effectiveness (1-5)
   - What's unclear: Should trends show pass rate %, average effectiveness, or both?
   - Recommendation: Show both - line for effectiveness, bar for pass/fail distribution

2. **Risk Score History Granularity**
   - What we know: Audit entries capture before/after values
   - What's unclear: Should we show every change or aggregate by day/week?
   - Recommendation: Aggregate by day (latest value) to prevent cluttered charts

3. **Sampling Calculator UX Placement**
   - What we know: Success criteria requires sampling guidance for testing methodology
   - What's unclear: Should this be a standalone page, modal, or section?
   - Recommendation: Section in Analytics dashboard; also accessible from ControlPanel when scheduling tests

## Sources

### Primary (HIGH confidence)
- [Recharts GitHub](https://github.com/recharts/recharts) - Installation, API, component structure
- Existing project code (rctStore.ts, auditStore.ts, aggregation.ts) - Data structures, patterns
- Project index.css - Theme colors and CSS variables

### Secondary (MEDIUM confidence)
- [AICPA Audit Sampling Guide](https://www.aicpa-cima.com/cpe-learning/publication/audit-sampling-audit-guide) - Sampling table values
- [IIA Attribute Sampling Plans](https://iaonline.theiia.org/attribute-sampling-plans) - Sample size methodology
- [Recharts Customization Guide](https://recharts.github.io/en-US/guide/customize/) - Dark theme patterns

### Tertiary (LOW confidence)
- WebSearch results for ERM reporting patterns - General industry practices
- Various blog posts on React charting - Implementation patterns

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - Recharts well-established, existing D3 usage confirms approach
- Architecture: HIGH - Follows existing project patterns exactly
- Pitfalls: MEDIUM - Based on documentation and common issues, not project-specific testing
- Sampling: MEDIUM - Based on AICPA/IIA guidance, specific table values from multiple sources

**Research date:** 2026-01-21
**Valid until:** 2026-02-21 (30 days - stable domain)
