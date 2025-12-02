# Phase 6: Risk Sunburst Visualization - Research

**Researched:** 2026-01-21
**Domain:** Interactive hierarchical data visualization (sunburst charts)
**Confidence:** HIGH

## Summary

This research investigates how to implement an interactive sunburst visualization for hierarchical risk data. The sunburst chart will display risk scores aggregated through a Risk or Process taxonomy hierarchy, with the center showing enterprise-level risk and rings expanding outward through L1-L5 levels.

**Key findings:**
- D3.js with `d3-hierarchy` partition layout is the standard approach for sunburst charts
- Nivo's `@nivo/sunburst` provides a React-friendly wrapper but lacks built-in zoom-to-center functionality
- For the required zoom behavior (clicked segment becomes center), a custom D3-based implementation using the Observable "Zoomable Sunburst" pattern is recommended
- Export to PNG/SVG can be achieved with `save-svg-as-png` library
- The existing `heatmapColors.ts` utility can be directly reused for consistent coloring

**Primary recommendation:** Build a custom React component using D3.js directly (`d3-hierarchy` + `d3-shape` for arc generation) following the Observable Zoomable Sunburst pattern. This provides full control over zoom animations, breadcrumb navigation, and integration with existing codebase patterns.

## Standard Stack

The established libraries/tools for this domain:

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| d3-hierarchy | ^3.1.2 | Hierarchical data layout (partition) | Official D3 module, battle-tested for sunburst |
| d3-shape | ^3.2.0 | Arc path generation | Standard for radial visualizations |
| d3-interpolate | ^3.0.1 | Smooth zoom transitions | Required for arc tweening |
| d3-scale | ^4.0.2 | Scale functions for layout | Standard D3 scaling utilities |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| save-svg-as-png | ^1.4.17 | Export SVG to PNG/dataURI | For PNG export functionality |
| file-saver | ^2.0.5 | Trigger file downloads | Already installed, use for export |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Custom D3 | @nivo/sunburst | Nivo lacks zoom-to-center; drill-down requires data swap, no smooth animation |
| Custom D3 | sunburst-chart npm | Opinionated, harder to customize colors/aggregation |
| Custom D3 | visx | Lower-level than needed, similar effort to raw D3 |
| save-svg-as-png | html2canvas | html2canvas has SVG rendering issues; save-svg-as-png is purpose-built |

**Installation:**
```bash
npm install d3-hierarchy d3-shape d3-interpolate d3-scale save-svg-as-png
npm install -D @types/d3-hierarchy @types/d3-shape @types/d3-interpolate @types/d3-scale
```

## Architecture Patterns

### Recommended Project Structure
```
src/
├── components/
│   └── sunburst/
│       ├── index.ts                    # Barrel export
│       ├── SunburstChart.tsx           # Main chart component
│       ├── SunburstControls.tsx        # Level toggles, export, view controls
│       ├── SunburstBreadcrumb.tsx      # Navigation breadcrumb trail
│       ├── SunburstTooltip.tsx         # Hover tooltip
│       ├── SunburstLegend.tsx          # Color scale legend for export
│       └── useSunburstData.ts          # Data transformation hook
├── stores/
│   └── sunburstStore.ts                # Zustand store for sunburst state
├── utils/
│   └── sunburstExport.ts               # SVG/PNG export utilities
└── pages/
    └── SunburstPage.tsx                # Page wrapper
```

### Pattern 1: D3 Zoomable Sunburst with React
**What:** Hybrid approach where D3 handles layout calculation and transitions, React handles rendering and state
**When to use:** When you need smooth zoom animations and full control over interactivity
**Example:**
```typescript
// Source: https://observablehq.com/@d3/zoomable-sunburst (adapted for React)
import { hierarchy, partition, HierarchyRectangularNode } from 'd3-hierarchy'
import { arc, Arc } from 'd3-shape'
import { interpolate } from 'd3-interpolate'

interface SunburstNode {
  id: string
  name: string
  hierarchicalId: string
  value: number  // Aggregated score
  children?: SunburstNode[]
}

// Create partition layout
const partitionLayout = partition<SunburstNode>()
  .size([2 * Math.PI, radius])

// Arc generator
const arcGenerator = arc<HierarchyRectangularNode<SunburstNode>>()
  .startAngle(d => d.x0)
  .endAngle(d => d.x1)
  .padAngle(d => Math.min((d.x1 - d.x0) / 2, 0.005))
  .padRadius(radius / 2)
  .innerRadius(d => d.y0)
  .outerRadius(d => d.y1 - 1)

// Zoom animation (store target positions, tween to them)
function handleClick(clickedNode: HierarchyRectangularNode<SunburstNode>) {
  // Calculate new positions relative to clicked node
  root.each(d => {
    d.target = {
      x0: Math.max(0, Math.min(1, (d.x0 - clickedNode.x0) / (clickedNode.x1 - clickedNode.x0))) * 2 * Math.PI,
      x1: Math.max(0, Math.min(1, (d.x1 - clickedNode.x0) / (clickedNode.x1 - clickedNode.x0))) * 2 * Math.PI,
      y0: Math.max(0, d.y0 - clickedNode.depth),
      y1: Math.max(0, d.y1 - clickedNode.depth)
    }
  })
  // Animate with requestAnimationFrame or React Spring
}
```

### Pattern 2: Data Transformation Hook
**What:** Custom hook that transforms taxonomy + RCT data into sunburst-ready hierarchy
**When to use:** Keep data transformation logic separate from rendering
**Example:**
```typescript
// Source: Custom implementation based on existing aggregation.ts patterns
import { useMemo } from 'react'
import { useTaxonomyStore } from '@/stores/taxonomyStore'
import { useRCTStore } from '@/stores/rctStore'
import { hierarchy } from 'd3-hierarchy'

interface SunburstData {
  id: string
  name: string
  hierarchicalId: string
  value: number | null  // Aggregated score
  children?: SunburstData[]
}

export function useSunburstData(
  taxonomyType: 'risk' | 'process',
  scoreType: 'gross' | 'net',
  aggregationMode: 'weighted' | 'max',
  weights: AggregationWeights
) {
  const taxonomy = useTaxonomyStore(s =>
    taxonomyType === 'risk' ? s.risks : s.processes
  )
  const rows = useRCTStore(s => s.rows)

  return useMemo(() => {
    // Transform taxonomy to sunburst format with aggregated scores
    function transformNode(node: TaxonomyItem): SunburstData {
      const children = node.children?.map(transformNode)

      // Calculate aggregated score for this node
      const score = calculateNodeScore(
        node,
        rows,
        taxonomyType,
        scoreType,
        aggregationMode,
        weights
      )

      return {
        id: node.id,
        name: node.name,
        hierarchicalId: node.hierarchicalId,
        value: score,
        children: children?.length ? children : undefined
      }
    }

    // Create root node representing "enterprise"
    const rootData: SunburstData = {
      id: 'root',
      name: 'Enterprise Risk',
      hierarchicalId: '',
      value: null,  // Will be computed from children
      children: taxonomy.map(transformNode)
    }

    // Use d3.hierarchy with custom value accessor for weighted aggregation
    return hierarchy(rootData)
      .eachAfter(node => {
        if (node.children) {
          // Aggregate from children based on mode
          if (aggregationMode === 'max') {
            node.data.value = Math.max(...node.children.map(c => c.data.value ?? 0))
          } else {
            // Weighted average
            const values = node.children.map(c => c.data.value).filter(v => v !== null)
            node.data.value = values.length
              ? values.reduce((a, b) => a + b, 0) / values.length
              : null
          }
        }
      })
  }, [taxonomy, rows, taxonomyType, scoreType, aggregationMode, weights])
}
```

### Pattern 3: Zustand Store for Sunburst State
**What:** Dedicated store for sunburst-specific UI state
**When to use:** Manage zoom state, visible levels, and view settings
**Example:**
```typescript
// Source: Following existing matrixStore.ts pattern
import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import { immer } from 'zustand/middleware/immer'

interface SunburstState {
  // View settings
  taxonomyType: 'risk' | 'process'
  scoreType: 'gross' | 'net'
  aggregationMode: 'weighted' | 'max'

  // Level visibility
  visibleLevels: { l1: boolean; l2: boolean; l3: boolean; l4: boolean; l5: boolean }

  // Zoom state (path from root to current center)
  zoomPath: string[]  // Array of node IDs

  // Hide no-data segments
  hideNoData: boolean

  // Actions
  setTaxonomyType: (type: 'risk' | 'process') => void
  setScoreType: (type: 'gross' | 'net') => void
  setAggregationMode: (mode: 'weighted' | 'max') => void
  toggleLevel: (level: 'l1' | 'l2' | 'l3' | 'l4' | 'l5') => void
  zoomTo: (nodeId: string) => void
  zoomOut: () => void
  resetZoom: () => void
}
```

### Anti-Patterns to Avoid
- **Re-rendering entire chart on hover:** Use CSS for hover effects, not React state
- **Storing D3 nodes in React state:** Store only IDs, compute nodes from data
- **Animating with React re-renders:** Use D3 transitions or CSS animations for smooth 60fps
- **Inline SVG path calculations:** Pre-compute arc paths, update only on data change

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Hierarchical data layout | Custom tree traversal | d3-hierarchy partition() | Handles edge cases, tested |
| Arc path generation | SVG path strings | d3-shape arc() | Proper padding, curves |
| Smooth zoom transitions | requestAnimationFrame loops | d3-interpolate | Easing, arc interpolation |
| SVG to PNG conversion | Canvas drawing | save-svg-as-png | CSS preservation, cross-browser |
| Color interpolation | Linear RGB mixing | Existing heatmapColors.ts | Already tested, consistent |

**Key insight:** D3's partition layout handles the complex math of subdividing circular space. The arc generator handles SVG path syntax including padding. Don't attempt to calculate these manually.

## Common Pitfalls

### Pitfall 1: Arc Flicker During Zoom
**What goes wrong:** Arcs disappear or flicker during zoom transitions
**Why it happens:** D3 arc interpolation doesn't work well with default tweens
**How to avoid:** Use `attrTween` with custom arc interpolation that interpolates x0, x1, y0, y1 values, then generates new arc path
**Warning signs:** Arcs jumping to final position, paths becoming NaN

### Pitfall 2: Center Text Overlapping Arcs
**What goes wrong:** Enterprise score text in center gets clipped or overlaps inner ring
**Why it happens:** Inner radius of first ring set too small
**How to avoid:** Set minimum innerRadius for L1 ring (e.g., radius * 0.15), render center as separate circle
**Warning signs:** Text barely visible, cramped center area

### Pitfall 3: Color Inheritance Breaking on Zoom
**What goes wrong:** After zooming, colors no longer match parent hierarchy
**Why it happens:** Nivo's inheritColorFromParent doesn't work with data replacement
**How to avoid:** Assign colors based on L1 ancestor ID, store in data, not computed
**Warning signs:** Colors randomizing on zoom, losing visual hierarchy

### Pitfall 4: PNG Export Missing Styles
**What goes wrong:** Exported PNG has wrong colors or missing elements
**Why it happens:** CSS-in-JS styles not captured, external stylesheets not inlined
**How to avoid:** Use inline styles on SVG elements, pass `backgroundColor` option to save-svg-as-png
**Warning signs:** White/transparent backgrounds, wrong fonts

### Pitfall 5: Performance with Deep Hierarchies
**What goes wrong:** Sluggish rendering with 100+ nodes
**Why it happens:** Too many SVG path elements, excessive re-renders
**How to avoid:** Use visibility filtering (only render 2-3 levels at a time like Observable pattern), memoize arc paths
**Warning signs:** Dropped frames on hover, slow initial render

### Pitfall 6: Weighted Average vs Sum Confusion
**What goes wrong:** Sunburst segment sizes don't match scores
**Why it happens:** D3's `.sum()` adds values, but we want weighted averages
**How to avoid:** Use `.eachAfter()` for custom bottom-up aggregation, NOT `.sum()`
**Warning signs:** Parent segments smaller than children, incorrect enterprise score

## Code Examples

Verified patterns from official sources:

### Arc Visibility Filter (Observable Pattern)
```typescript
// Source: https://observablehq.com/@d3/zoomable-sunburst
// Only render arcs within 2-3 levels of current zoom center
function arcVisible(d: HierarchyRectangularNode<SunburstNode>): boolean {
  return d.y1 <= 3 && d.y0 >= 1 && d.x1 > d.x0
}

function labelVisible(d: HierarchyRectangularNode<SunburstNode>): boolean {
  return d.y1 <= 3 && d.y0 >= 1 && (d.x1 - d.x0) > 0.03
}
```

### Export SVG to PNG
```typescript
// Source: https://www.npmjs.com/package/save-svg-as-png
import { saveSvgAsPng, svgAsPngUri } from 'save-svg-as-png'

export async function exportSunburstPng(
  svgElement: SVGSVGElement,
  filename: string,
  options?: { scale?: number; backgroundColor?: string }
) {
  await saveSvgAsPng(svgElement, filename, {
    scale: options?.scale ?? 2,  // 2x for retina
    backgroundColor: options?.backgroundColor ?? '#1e293b',  // Match app bg
    encoderOptions: 0.9
  })
}

// For SVG download
export function exportSunburstSvg(svgElement: SVGSVGElement, filename: string) {
  const serializer = new XMLSerializer()
  const svgString = serializer.serializeToString(svgElement)
  const blob = new Blob([svgString], { type: 'image/svg+xml' })
  saveAs(blob, filename)  // Using file-saver
}
```

### Reuse Existing Heatmap Colors
```typescript
// Source: Existing src/utils/heatmapColors.ts
import { getHeatmapColor, getContrastingText } from '@/utils/heatmapColors'

// Apply to arc fill
function getArcColor(node: HierarchyRectangularNode<SunburstNode>): string {
  if (node.data.value === null) {
    return '#4a5568'  // Gray for no-data
  }
  return getHeatmapColor(node.data.value)
}

// Apply to arc label
function getLabelColor(node: HierarchyRectangularNode<SunburstNode>): string {
  const bgColor = getArcColor(node)
  return getContrastingText(bgColor)
}
```

### Breadcrumb Navigation Component
```typescript
// Source: Custom pattern based on context requirements
interface BreadcrumbProps {
  path: Array<{ id: string; name: string; hierarchicalId: string }>
  onNavigate: (nodeId: string) => void
}

export function SunburstBreadcrumb({ path, onNavigate }: BreadcrumbProps) {
  return (
    <nav className="flex items-center gap-1 text-sm">
      <button
        onClick={() => onNavigate('root')}
        className="text-text-secondary hover:text-text-primary"
      >
        All
      </button>
      {path.map((node, i) => (
        <Fragment key={node.id}>
          <span className="text-text-muted">&gt;</span>
          <button
            onClick={() => onNavigate(node.id)}
            className={cn(
              i === path.length - 1
                ? 'text-text-primary font-medium'
                : 'text-text-secondary hover:text-text-primary'
            )}
          >
            {node.hierarchicalId || node.name}
          </button>
        </Fragment>
      ))}
    </nav>
  )
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Full SVG re-render | CSS transitions + D3 tweens | D3 v4+ (2016) | 60fps animations |
| Canvas fallback | SVG with visibility filtering | Modern browsers | Simpler code, accessibility |
| Nivo for all charts | Nivo for simple, D3 for complex | 2023+ | Better zoom support |

**Deprecated/outdated:**
- D3 v3 sunburst examples (pre-2016): Use D3 v7 patterns instead
- Flash-based visualizations: Obviously obsolete
- `toDataURL` for export: Use `save-svg-as-png` for CSS preservation

## Integration Points with Existing Code

### Stores to Use
| Store | What to Use | How |
|-------|-------------|-----|
| `taxonomyStore` | `risks` and `processes` arrays | Source of hierarchy structure |
| `rctStore` | `rows` array | Source of scores to aggregate |
| `matrixStore` | `weights` | Reuse for weighted aggregation |

### Utilities to Reuse
| Utility | Function | Purpose |
|---------|----------|---------|
| `heatmapColors.ts` | `getHeatmapColor()` | Consistent score colors |
| `heatmapColors.ts` | `getContrastingText()` | Label readability |
| `aggregation.ts` | `matchesHierarchy()` | Filter RCT rows by taxonomy node |
| `aggregation.ts` | `getDeepestLevel()` | Weight selection |

### Types to Extend
```typescript
// Extend existing TaxonomyItem for sunburst
interface SunburstNode extends TaxonomyItem {
  value: number | null  // Aggregated score
  level: number         // Depth in hierarchy (1-5)
}
```

### Navigation Integration
- Right-click "View in RCT" should use React Router to navigate to `/rct?risk={hierarchicalId}` or similar
- URL should reflect current zoom state for shareable links

## Open Questions

Things that couldn't be fully resolved:

1. **Animation Library Choice**
   - What we know: D3 transitions work, React Spring could work
   - What's unclear: Best way to interrupt/chain zoom animations in React
   - Recommendation: Start with CSS transitions for simple states, add D3 tween if needed

2. **Mobile Touch Interactions**
   - What we know: Click/tap works for zoom
   - What's unclear: Pinch-to-zoom expectations, touch hover equivalent
   - Recommendation: Disable pinch zoom, use tap for drill-down, long-press for tooltip

3. **Very Large Taxonomies (500+ nodes)**
   - What we know: Observable pattern renders only 2-3 levels
   - What's unclear: Exact performance characteristics with this codebase
   - Recommendation: Implement visibility filtering first, profile if issues arise

## Sources

### Primary (HIGH confidence)
- [D3 Zoomable Sunburst - Observable](https://observablehq.com/@d3/zoomable-sunburst) - Zoom implementation pattern
- [d3-hierarchy Documentation](https://d3js.org/d3-hierarchy) - API reference for partition, hierarchy
- [save-svg-as-png npm](https://www.npmjs.com/package/save-svg-as-png) - Export API

### Secondary (MEDIUM confidence)
- [React + D3 Sunburst Chart - DEV](https://dev.to/andrewchmr/react-d3-sunburst-chart-3cpd) - React integration patterns
- [Nivo Sunburst Documentation](https://nivo.rocks/sunburst/) - Alternative library reference
- [Best React Chart Libraries 2025 - LogRocket](https://blog.logrocket.com/best-react-chart-libraries-2025/) - Library comparison

### Tertiary (LOW confidence, verified against primary)
- [GitHub nivo drill-down demo](https://github.com/plouc/nivo/commit/b058f7b7a9750ce923e59b03bd6413391d6fa72f) - Nivo-specific patterns
- [CodeSandbox nivo/sunburst examples](https://codesandbox.io/examples/package/@nivo/sunburst) - Working examples

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - D3 is definitive for this use case
- Architecture: HIGH - Patterns well-established in D3 ecosystem
- Pitfalls: MEDIUM - Based on common issues reported in forums/issues
- Export: HIGH - save-svg-as-png is purpose-built and well-documented

**Research date:** 2026-01-21
**Valid until:** 2026-02-21 (stable domain, 30 days)
