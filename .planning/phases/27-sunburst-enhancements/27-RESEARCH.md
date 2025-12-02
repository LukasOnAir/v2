# Phase 27: Sunburst Enhancements - Research

**Researched:** 2026-01-27
**Domain:** D3.js sunburst visualization, React animation, Framer Motion/Motion
**Confidence:** HIGH

## Summary

This phase enhances the existing D3-based sunburst visualization with six key improvements: dynamic radius sizing based on visible levels, L1 gap closure for hidden nodes, opening animation, dynamic center text, repositioned legend, and sequenced score bar animation.

The current implementation in `SunburstChart.tsx` uses D3's `partition` layout with a fixed radius of `Math.min(width, height) / 2`. The project already has the `motion` library (Framer Motion v12) installed and in use throughout the codebase (see `VerifyEmailPage.tsx`, `LoginPage.tsx` for patterns). The sunburst chart renders arcs via React JSX with D3 arc generators.

**Primary recommendation:** Use a combination of D3 layout recalculation for dynamic sizing/gap closure AND Framer Motion for entrance animations, keeping the current React+D3 rendering pattern.

## Standard Stack

The established libraries/tools for this domain:

### Core (Already Installed)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| d3-hierarchy | ^3.1.2 | Partition layout for sunburst | Standard for hierarchical data visualization |
| d3-shape | ^3.2.0 | Arc generator | Creates SVG path data for arcs |
| d3-interpolate | ^3.0.1 | Animation interpolation | Required for attrTween animations |
| motion | ^12.29.0 | React animation | Project's established animation library |

### Supporting (Already Installed)
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| zustand | ^5.0.10 | State management | Already stores sunburst settings, add animation state |
| clsx | ^2.1.1 | Conditional CSS classes | Layout classes for legend positioning |

### No New Dependencies Required
All required functionality can be achieved with existing libraries.

## Architecture Patterns

### Current SunburstChart.tsx Structure
```
src/components/sunburst/
├── SunburstChart.tsx       # Main chart - needs animation, dynamic sizing
├── SunburstControls.tsx    # Toolbar controls - no changes needed
├── SunburstLegend.tsx      # Legend component - needs repositioning
├── SunburstBreadcrumb.tsx  # Navigation - no changes needed
├── SunburstTooltip.tsx     # Hover tooltip - no changes needed
├── useSunburstData.ts      # Data transformation hook - no changes needed
└── index.ts                # Barrel export
```

### Pattern 1: Dynamic Radius Based on Visible Levels
**What:** Recalculate partition size based on max visible depth, not fixed max depth
**When to use:** When user unchecks levels (e.g., shows only L1-L3)
**Current code (line 90):**
```typescript
const partitionLayout = partition<SunburstNode>().size([2 * Math.PI, radius])
```
**New approach:**
```typescript
// Calculate max visible depth from visibleLevels
const maxVisibleDepth = useMemo(() => {
  const levels = ['l1', 'l2', 'l3', 'l4', 'l5'] as const
  let max = 0
  for (let i = 0; i < levels.length; i++) {
    if (visibleLevels[levels[i]]) max = i + 1
  }
  return max
}, [visibleLevels])

// Adjust partition to use dynamic depth-based sizing
const ringWidth = (radius - innerRadius) / maxVisibleDepth
```
The arc generator's `y0` and `y1` values should be scaled relative to visible depths.

### Pattern 2: L1 Gap Closure for Hidden Nodes
**What:** Redistribute arc angles when L1 nodes are hidden (hideNoData enabled)
**When to use:** Only at L1 level, to close wedge gaps
**Current behavior:** Partition layout assigns fixed angles; hiding nodes leaves gaps
**New approach:**
1. Filter data BEFORE partition layout for L1 empty nodes
2. Create pre-filtered hierarchy that excludes empty L1 nodes
3. Partition calculates angles for remaining nodes only
```typescript
// In useSunburstData.ts - filter L1 children with no data
const filterEmptyL1Nodes = (root: SunburstNode): SunburstNode => {
  if (!hideNoData) return root
  return {
    ...root,
    children: root.children?.filter(child => {
      // L1 node - check if it or any descendant has data
      return hasDescendantWithData(child)
    })
  }
}
```

### Pattern 3: Opening Animation with D3 Tween
**What:** Arcs expand from center outward on initial render
**Implementation approach:** Use D3's `attrTween` pattern OR Framer Motion
**Option A - D3 Tween (matches existing D3 code):**
```typescript
// Store initial collapsed state, animate to final state
const [isInitialRender, setIsInitialRender] = useState(true)
const animationProgress = useRef(0)

useEffect(() => {
  if (isInitialRender && partitionedRoot) {
    const duration = 800
    const start = performance.now()

    const animate = (now: number) => {
      const elapsed = now - start
      animationProgress.current = Math.min(elapsed / duration, 1)
      // Use easing: easeOutCubic
      forceUpdate()
      if (elapsed < duration) requestAnimationFrame(animate)
      else setIsInitialRender(false)
    }
    requestAnimationFrame(animate)
  }
}, [partitionedRoot])

// In arc rendering, interpolate from collapsed to expanded
const animatedArcData = {
  x0: arcData.x0,
  x1: arcData.x1,
  y0: innerRadius, // Start from center
  y1: innerRadius + (arcData.y1 - innerRadius) * animationProgress.current
}
```

**Option B - Framer Motion (matches project patterns):**
```typescript
import { motion } from 'motion/react'

// Wrap each arc path in motion.path
<motion.path
  d={pathData}
  fill={color}
  initial={{ pathLength: 0, opacity: 0 }}
  animate={{ pathLength: 1, opacity: 1 }}
  transition={{ duration: 0.8, delay: node.depth * 0.1, ease: 'easeOut' }}
/>
```
Note: `pathLength` animation works for stroke-based paths. For filled arcs, use scale/transform:
```typescript
<motion.path
  d={pathData}
  fill={color}
  initial={{ scale: 0.8, opacity: 0 }}
  animate={{ scale: 1, opacity: 1 }}
  transition={{ duration: 0.6, delay: node.depth * 0.08 }}
  style={{ transformOrigin: 'center center' }}
/>
```

**Recommendation:** Use D3-based approach with `requestAnimationFrame` for arc animation (interpolating radius from innerRadius to full). This integrates cleanly with the existing D3 arc generator pattern and avoids Framer Motion SVG path limitations.

### Pattern 4: Center Text from Aggregation Setting
**What:** Replace "Enterprise Risk" with "AVG" or "MAX" based on `aggregationMode`
**Current code (line 457-465):**
```typescript
<tspan x="0" dy="-0.5em" className="text-sm font-medium">
  {centerLabel.name.length > 15
    ? centerLabel.name.substring(0, 15) + '...'
    : centerLabel.name}
</tspan>
```
**New approach:**
```typescript
// Get center label based on aggregation mode
const getCenterLabelText = () => {
  if (currentCenterId) {
    // Zoomed in - show node name (current behavior)
    return centerLabel.name.length > 15
      ? centerLabel.name.substring(0, 15) + '...'
      : centerLabel.name
  }
  // Root view - show aggregation indicator
  return aggregationMode === 'max' ? 'MAX' : 'AVG'
}
```
The store already has `aggregationMode` available.

### Pattern 5: Legend Inside Sunburst Box
**What:** Move legend from separate sidebar to overlay inside sunburst container
**Current layout (SunburstPage.tsx lines 31-40):**
```tsx
<div className="flex-1 flex gap-6 items-start mt-4">
  <div className="flex-1 flex justify-center items-center bg-surface-elevated rounded-lg p-4">
    <SunburstChart ref={svgRef} width={600} height={600} />
  </div>
  <div className="w-48">
    <SunburstLegend viewMode={viewMode} maxDelta={maxDelta} />
  </div>
</div>
```
**New approach:**
```tsx
<div className="flex-1 flex justify-center items-center bg-surface-elevated rounded-lg p-4">
  {/* Container with relative positioning */}
  <div className="relative">
    <SunburstChart ref={svgRef} width={600} height={600} />
    {/* Legend absolutely positioned in top-right */}
    <div className="absolute top-2 right-2">
      <SunburstLegend viewMode={viewMode} maxDelta={maxDelta} />
    </div>
  </div>
</div>
```
Remove the separate sidebar container entirely.

### Pattern 6: Score Bar Reveal Animation
**What:** Score bar and text animate downward after sunburst opening animation completes
**Implementation:** Use Framer Motion with delay matching sunburst animation duration
**Note:** This requires identifying what "score bar" refers to. Based on context, this likely means the center score display or a potential new component.

If referring to center text:
```typescript
<motion.g
  initial={{ opacity: 0, y: -20 }}
  animate={{ opacity: 1, y: 0 }}
  transition={{ delay: 0.9, duration: 0.4 }} // After sunburst animation
>
  {/* Center circle and text */}
</motion.g>
```

### Anti-Patterns to Avoid
- **Creating new SVG for each animation frame:** Use attrTween or CSS transforms, not DOM recreation
- **Animating D3 paths with Framer Motion pathLength:** Only works for stroke-based paths, not filled arcs
- **Modifying partition layout on every render:** Memoize partition calculations

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Arc interpolation | Custom bezier math | d3-interpolate | Handles polar coordinates correctly |
| Animation timing | setTimeout chains | requestAnimationFrame OR Framer Motion | Smooth 60fps, automatic cleanup |
| Easing functions | Custom easing math | d3-ease or motion's built-in | Battle-tested, performance optimized |
| SVG path generation | String concatenation | d3-shape arc generator | Handles edge cases, padding, precision |

**Key insight:** D3's arc generator and interpolation already handle the complex geometry. Focus on orchestrating state changes, not recalculating curves.

## Common Pitfalls

### Pitfall 1: Partition Layout Caching
**What goes wrong:** Changing `visibleLevels` or `hideNoData` doesn't update arc positions because partition is memoized on wrong dependencies
**Why it happens:** `useMemo` dependency array missing state variables
**How to avoid:** Include all state that affects layout in partition's dependency array
**Warning signs:** Toggling levels doesn't resize the sunburst until data changes

### Pitfall 2: Animation State Cleanup
**What goes wrong:** Memory leaks or stale animations when component unmounts during animation
**Why it happens:** `requestAnimationFrame` ID not cleaned up in useEffect cleanup
**How to avoid:**
```typescript
useEffect(() => {
  let frameId: number
  const animate = () => { frameId = requestAnimationFrame(animate) }
  animate()
  return () => cancelAnimationFrame(frameId) // Critical cleanup
}, [])
```
**Warning signs:** Console warnings about state updates on unmounted components

### Pitfall 3: Transform Origin for SVG Elements
**What goes wrong:** Scale animations rotate around wrong point (top-left instead of center)
**Why it happens:** SVG transform-origin defaults differ from HTML
**How to avoid:** Set `style={{ transformOrigin: 'center center' }}` or use `transform-box: fill-box`
**Warning signs:** Arcs scale from corner instead of center

### Pitfall 4: Legend Z-Index
**What goes wrong:** Legend gets clipped by SVG or obscured by other elements
**Why it happens:** SVG creates new stacking context
**How to avoid:** Place legend OUTSIDE the SVG element but inside positioned container
**Warning signs:** Legend disappears or clips at edges

### Pitfall 5: Level Toggle Sequence
**What goes wrong:** Disabling L2 but keeping L3 enabled creates visual gaps
**Why it happens:** Not enforcing level hierarchy (can't show L3 without L2)
**How to avoid:** Auto-disable child levels when parent is disabled
**Warning signs:** Orphaned arcs floating without parent rings

## Code Examples

Verified patterns from the existing codebase:

### Framer Motion Animation Pattern (from VerifyEmailPage.tsx)
```typescript
// Source: src/pages/VerifyEmailPage.tsx lines 8-42
import { motion } from 'motion/react'

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.2,
    },
  },
}

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.4, ease: 'easeOut' },
  },
}

// Usage:
<motion.div variants={containerVariants} initial="hidden" animate="visible">
  <motion.div variants={itemVariants}>Content</motion.div>
</motion.div>
```

### D3 Arc Generator Pattern (from SunburstChart.tsx)
```typescript
// Source: src/components/sunburst/SunburstChart.tsx lines 109-118
const arcGenerator = useMemo(() => {
  return d3Arc<HierarchyRectangularNode<SunburstNode>>()
    .startAngle((d) => d.x0)
    .endAngle((d) => d.x1)
    .padAngle((d) => Math.min((d.x1 - d.x0) / 2, 0.005))
    .padRadius(radius / 2)
    .innerRadius((d) => d.y0)
    .outerRadius((d) => Math.max(d.y0, d.y1 - 1))
}, [radius])
```

### D3 Arc Tween Pattern (from Observable reference)
```typescript
// Source: https://observablehq.com/@d3/zoomable-sunburst
path.transition(t)
  .tween("data", d => {
    const i = d3.interpolate(d.current, d.target);
    return t => d.current = i(t);
  })
  .attrTween("d", d => () => arc(d.current));
```

### Store Pattern (from sunburstStore.ts)
```typescript
// Source: src/stores/sunburstStore.ts
// Can add animation state here if needed
interface SunburstState {
  // Existing...
  animationComplete: boolean
  setAnimationComplete: (complete: boolean) => void
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| D3 DOM manipulation | React render + D3 math | Project standard | Clean separation of concerns |
| framer-motion | motion/react | Rebrand 2024 | Same API, new import path |
| CSS animations for SVG | Framer Motion/D3 tween | Industry practice | Better control, cross-browser |

**Deprecated/outdated:**
- Direct D3 DOM selection (`d3.select().attr()`) - this project uses React for rendering, D3 only for calculations
- Importing from `framer-motion` - project uses `motion/react`

## Open Questions

Things that couldn't be fully resolved:

1. **"Score bar" component**
   - What we know: User mentions "bar and text" revealing after sunburst animation
   - What's unclear: Is this a new component or the center text area?
   - Recommendation: Assume it refers to the center score display; clarify with user during planning if needed

2. **Animation performance with many nodes**
   - What we know: Individual path animations may be expensive with 100+ nodes
   - What's unclear: Exact performance threshold on target devices
   - Recommendation: Use CSS transforms where possible; batch animations by depth level

3. **Mobile/responsive behavior**
   - What we know: Current width/height are fixed at 600px
   - What's unclear: Whether this phase should address responsiveness
   - Recommendation: Keep fixed size for this phase; responsiveness is a separate concern

## Sources

### Primary (HIGH confidence)
- Current codebase: `src/components/sunburst/SunburstChart.tsx` - Current implementation
- Current codebase: `src/pages/VerifyEmailPage.tsx` - Motion animation patterns
- Current codebase: `package.json` - Confirms motion ^12.29.0 installed

### Secondary (MEDIUM confidence)
- [Observable D3 Zoomable Sunburst](https://observablehq.com/@d3/zoomable-sunburst) - Official D3 arc animation patterns
- [D3 Sunburst Tutorial Part 3](https://gist.github.com/GerardoFurtado/7c30efbc20232abda294cd71a959c79d) - attrTween implementation

### Tertiary (LOW confidence)
- [Motion.dev SVG Animation Docs](https://motion.dev/docs/react-svg-animation) - General patterns (could not fetch full content)
- [Framer Motion SVG Paths Blog](https://blog.noelcserepy.com/how-to-animate-svg-paths-with-framer-motion) - Community tutorials

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - All libraries already installed and in use
- Architecture: HIGH - Patterns derived from existing codebase
- Pitfalls: MEDIUM - Based on general D3/React integration experience
- Animation approach: HIGH - Motion patterns verified in existing pages

**Research date:** 2026-01-27
**Valid until:** 60 days (stable libraries, no expected breaking changes)
