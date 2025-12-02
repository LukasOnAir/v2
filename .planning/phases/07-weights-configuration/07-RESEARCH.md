# Phase 7: Weights Configuration - Research

**Researched:** 2026-01-21
**Domain:** Weight configuration UI, Zustand store architecture, aggregation calculations
**Confidence:** HIGH

## Summary

Phase 7 adds user-configurable weights for taxonomy-level aggregation affecting both Matrix and Sunburst visualizations. The existing codebase already has substantial infrastructure for weights: `matrixStore.ts` defines `AggregationWeights` interface and `DEFAULT_WEIGHTS`, `aggregation.ts` has `calculateWeightedAverage()` function, and `useSunburstData.ts` consumes weights from the matrix store.

The core work is creating UI for weight configuration within the Taxonomy page (per the CONTEXT.md decision), extending the weight model to support per-node overrides (in addition to per-level defaults), and ensuring weights are persisted separately for Risk and Process taxonomies.

**Primary recommendation:** Extend the existing `taxonomyStore` to include weight configuration per taxonomy type (risk/process), add a `WeightBadge` component to `TaxonomyNode`, and create inline click-to-edit interaction for weight modification.

## Standard Stack

The established libraries/tools for this domain:

### Core (Already in Project)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| zustand | ^5.0.10 | State management with persist middleware | Already used for all stores |
| immer | ^11.1.3 | Immutable state updates | Already used with Zustand |
| react-arborist | ^3.4.3 | Tree visualization | Already used for taxonomy trees |
| tailwindcss | ^4.1.18 | Styling | Already used throughout |
| clsx | ^2.1.1 | Conditional className composition | Already used throughout |
| lucide-react | ^0.562.0 | Icons | Already used throughout |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| @radix-ui/react-popover | ^1.1.15 | Popover UI (if needed for level weights) | Already available |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Custom inline edit | react-easy-edit | Overkill; simple number input is sufficient |
| Separate weights page | Inline in taxonomy | CONTEXT.md specifies inline in taxonomy page |

**Installation:** No new packages required. All dependencies already in project.

## Architecture Patterns

### Recommended Data Structure

```typescript
// Weight configuration per taxonomy
interface TaxonomyWeights {
  /** Per-level default weights */
  levelDefaults: AggregationWeights
  /** Per-node weight overrides (nodeId -> weight) */
  nodeOverrides: Record<string, number>
}

// Extended taxonomy store state
interface TaxonomyState {
  risks: TaxonomyItem[]
  processes: TaxonomyItem[]
  riskWeights: TaxonomyWeights
  processWeights: TaxonomyWeights
  // Actions
  setRisks: (items: TaxonomyItem[]) => void
  setProcesses: (items: TaxonomyItem[]) => void
  setLevelWeight: (type: 'risk' | 'process', level: 1|2|3|4|5, weight: number) => void
  setNodeWeight: (type: 'risk' | 'process', nodeId: string, weight: number | null) => void
  getEffectiveWeight: (type: 'risk' | 'process', nodeId: string, level: number) => number
}
```

### Recommended Project Structure
```
src/
├── stores/
│   └── taxonomyStore.ts     # Extend with weight configuration
├── components/taxonomy/
│   ├── TaxonomyNode.tsx     # Add WeightBadge integration
│   └── WeightBadge.tsx      # NEW: Click-to-edit weight badge
├── utils/
│   └── aggregation.ts       # Update to use new weight source
```

### Pattern 1: Click-to-Edit Weight Badge

**What:** Inline editable badge component showing weight value, switches to input on click
**When to use:** For both level-default weights and per-node override weights

```tsx
// WeightBadge component pattern
interface WeightBadgeProps {
  value: number
  isOverride: boolean  // Visual distinction from level default
  onChange: (value: number) => void
  onClear?: () => void  // Only for overrides
  disabled?: boolean
}

function WeightBadge({ value, isOverride, onChange, onClear, disabled }: WeightBadgeProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [localValue, setLocalValue] = useState(value.toString())
  const inputRef = useRef<HTMLInputElement>(null)

  // Focus input when entering edit mode
  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus()
      inputRef.current.select()
    }
  }, [isEditing])

  const handleSave = () => {
    const parsed = parseFloat(localValue)
    if (!isNaN(parsed) && parsed >= 0.1 && parsed <= 5.0) {
      // Round to 1 decimal place
      onChange(Math.round(parsed * 10) / 10)
    } else {
      // Reset to original value if invalid
      setLocalValue(value.toString())
    }
    setIsEditing(false)
  }

  if (isEditing) {
    return (
      <input
        ref={inputRef}
        type="number"
        step="0.1"
        min="0.1"
        max="5.0"
        value={localValue}
        onChange={(e) => setLocalValue(e.target.value)}
        onBlur={handleSave}
        onKeyDown={(e) => {
          e.stopPropagation()  // Prevent tree navigation
          if (e.key === 'Enter') handleSave()
          if (e.key === 'Escape') {
            setLocalValue(value.toString())
            setIsEditing(false)
          }
        }}
        onClick={(e) => e.stopPropagation()}
        className="w-12 px-1 py-0.5 text-xs text-center rounded bg-surface-overlay border border-accent-500 focus:outline-none"
      />
    )
  }

  return (
    <span
      onClick={(e) => {
        e.stopPropagation()
        if (!disabled) setIsEditing(true)
      }}
      className={clsx(
        'px-1.5 py-0.5 text-xs rounded cursor-pointer transition-colors',
        isOverride
          ? 'bg-accent-500/30 text-accent-300 border border-accent-500/50'  // Custom override visual
          : 'bg-surface-overlay text-text-muted border border-transparent hover:border-surface-border',
        disabled && 'cursor-not-allowed opacity-50'
      )}
      title={isOverride ? 'Custom weight (click to edit, right-click to clear)' : 'Level default weight (click to edit)'}
    >
      {value.toFixed(1)}x
    </span>
  )
}
```

### Pattern 2: Effective Weight Resolution

**What:** Function to resolve the effective weight for a node (override > level default)
**When to use:** When calculating aggregations

```typescript
// In taxonomyStore or as utility
function getEffectiveWeight(
  weights: TaxonomyWeights,
  nodeId: string,
  level: number
): number {
  // Check for node-specific override first
  if (nodeId in weights.nodeOverrides) {
    return weights.nodeOverrides[nodeId]
  }

  // Fall back to level default
  const levelKey = `l${level}` as keyof AggregationWeights
  return weights.levelDefaults[levelKey]
}
```

### Pattern 3: Weight Store Integration

**What:** Extend taxonomyStore with weight configuration
**When to use:** Single source of truth for weights, persisted separately per taxonomy type

```typescript
// taxonomyStore.ts extension
export const useTaxonomyStore = create<TaxonomyState>()(
  persist(
    immer((set, get) => ({
      risks: [],
      processes: [],
      riskWeights: {
        levelDefaults: { l1: 1, l2: 1, l3: 1, l4: 1, l5: 1 },
        nodeOverrides: {},
      },
      processWeights: {
        levelDefaults: { l1: 1, l2: 1, l3: 1, l4: 1, l5: 1 },
        nodeOverrides: {},
      },

      setLevelWeight: (type, level, weight) =>
        set((state) => {
          const weightsKey = type === 'risk' ? 'riskWeights' : 'processWeights'
          const levelKey = `l${level}` as keyof AggregationWeights
          state[weightsKey].levelDefaults[levelKey] = weight
        }),

      setNodeWeight: (type, nodeId, weight) =>
        set((state) => {
          const weightsKey = type === 'risk' ? 'riskWeights' : 'processWeights'
          if (weight === null) {
            delete state[weightsKey].nodeOverrides[nodeId]
          } else {
            state[weightsKey].nodeOverrides[nodeId] = weight
          }
        }),

      getEffectiveWeight: (type, nodeId, level) => {
        const state = get()
        const weights = type === 'risk' ? state.riskWeights : state.processWeights
        if (nodeId in weights.nodeOverrides) {
          return weights.nodeOverrides[nodeId]
        }
        const levelKey = `l${level}` as keyof AggregationWeights
        return weights.levelDefaults[levelKey]
      },

      // ... existing setRisks, setProcesses
    })),
    {
      name: 'riskguard-taxonomy',
      storage: createJSONStorage(() => localStorage),
      // Persist weights alongside taxonomy data
    }
  )
)
```

### Anti-Patterns to Avoid
- **Storing weights in TaxonomyItem:** Would complicate tree manipulation and serialization. Keep weights separate.
- **Global weights for both taxonomies:** User expects Risk and Process to have independent weight configurations per CONTEXT.md.
- **Using matrixStore for weights:** Weights should move to taxonomyStore since they're taxonomy-specific. Update Matrix and Sunburst to consume from taxonomy store.

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Input validation | Custom regex parsing | HTML5 input type="number" with min/max/step | Browser handles validation, accessibility |
| Click-outside handling | Manual event listeners | onBlur event on input | Simpler, handles all cases |
| Decimal formatting | Manual string manipulation | Number.toFixed(1) | Standard, handles rounding |
| Persistence | Manual localStorage calls | Zustand persist middleware | Already configured, handles rehydration |

**Key insight:** The project already has patterns for inline editing (see `TaxonomyNode.tsx` description editing, `EditableCell.tsx`). Follow these existing patterns rather than introducing new paradigms.

## Common Pitfalls

### Pitfall 1: Weight Changes Not Propagating to Matrix/Sunburst
**What goes wrong:** User changes weights but Matrix/Sunburst don't update
**Why it happens:** Components subscribe to matrixStore.weights instead of new source
**How to avoid:**
1. Move weight source of truth to taxonomyStore
2. Update useSunburstData hook to read from taxonomyStore
3. Update MatrixGrid to read from taxonomyStore
4. Ensure all weight consumers use the new source
**Warning signs:** Changing weights in Taxonomy page doesn't change colors in Matrix

### Pitfall 2: Event Propagation Breaking Tree Interactions
**What goes wrong:** Clicking weight badge triggers tree node expand/collapse
**Why it happens:** Click events bubble up to parent tree node
**How to avoid:** Always call `e.stopPropagation()` on weight badge click handlers
**Warning signs:** Tree expands/collapses when user tries to edit weight

### Pitfall 3: Invalid Weight Values Persisted
**What goes wrong:** User enters 0, negative, or very large weight values
**Why it happens:** Insufficient input validation
**How to avoid:**
1. Use HTML5 input with min="0.1" max="5.0" step="0.1"
2. Validate on blur before saving
3. Clamp values to valid range
**Warning signs:** Weights outside 0.1-5.0 range in localStorage

### Pitfall 4: Orphaned Node Overrides
**What goes wrong:** Node overrides persist for deleted nodes
**Why it happens:** Weight overrides keyed by nodeId remain after node deletion
**How to avoid:** Clean up nodeOverrides when taxonomy items are deleted
**Warning signs:** nodeOverrides object grows indefinitely, contains non-existent IDs

### Pitfall 5: Level Calculation Off-By-One
**What goes wrong:** Weights applied to wrong level
**Why it happens:** react-arborist uses 0-indexed levels, weights use 1-indexed (L1-L5)
**How to avoid:** Always add 1 when converting from node.level to weight level
**Warning signs:** L1 items get L2 weights, etc.

## Code Examples

Verified patterns from existing codebase:

### Existing Inline Edit Pattern (from TaxonomyNode.tsx)
```tsx
// Description inline edit - follow this pattern for weights
const [isEditingDescription, setIsEditingDescription] = useState(false)
const [localDescription, setLocalDescription] = useState(node.data.description)

// Focus input when entering edit mode
useEffect(() => {
  if (isEditingDescription && descriptionInputRef.current) {
    descriptionInputRef.current.focus()
    descriptionInputRef.current.select()
  }
}, [isEditingDescription])

// Handle keyboard events - CRITICAL: stopPropagation
const handleKeyDown = (e: React.KeyboardEvent) => {
  e.stopPropagation()  // Prevent tree navigation
  if (e.key === 'Enter') handleSubmit()
  if (e.key === 'Escape') handleCancel()
}
```

### Existing Weight Usage (from aggregation.ts)
```typescript
// Current weight resolution - extend this pattern
function getWeightForLevel(weights: AggregationWeights, level: number): number {
  switch (level) {
    case 1: return weights.l1
    case 2: return weights.l2
    case 3: return weights.l3
    case 4: return weights.l4
    case 5: return weights.l5
    default: return 1
  }
}
```

### Existing Zustand Persist Partialize (from sunburstStore.ts)
```typescript
// Pattern for persisting subset of state
persist(
  immer((set) => ({ /* state and actions */ })),
  {
    name: 'riskguard-taxonomy',
    storage: createJSONStorage(() => localStorage),
    partialize: (state) => ({
      // Include weights in persisted state
      risks: state.risks,
      processes: state.processes,
      riskWeights: state.riskWeights,
      processWeights: state.processWeights,
    }),
  }
)
```

### Existing Node Level Access (from TaxonomyNode.tsx)
```tsx
// Level is 0-indexed in react-arborist
const levelIndex = Math.min(node.level, LEVEL_COLORS.length - 1)
// For weights, convert: weightLevel = node.level + 1 (1-5)
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Global weights in matrixStore | Per-taxonomy weights in taxonomyStore | This phase | Weights tied to taxonomy they affect |
| Level-only weights | Level + node override | This phase | Finer control over specific nodes |

**Deprecated/outdated:**
- `matrixStore.weights`: Will be removed in favor of taxonomyStore weights
- `matrixStore.setWeights()`: Replace with `taxonomyStore.setLevelWeight()` and `setNodeWeight()`

## Open Questions

Things that couldn't be fully resolved:

1. **Clear Override Mechanism**
   - What we know: Users need to be able to clear a node override to revert to level default
   - What's unclear: Best UX - right-click context menu, separate clear button, or null value indicator?
   - Recommendation: Add small "x" icon next to weight badge when override exists; clicking clears override

2. **Level-Wide Weight UI Location**
   - What we know: Each taxonomy tab manages its own weights
   - What's unclear: Where to place controls for editing level defaults (L1-L5 weights)
   - Recommendation: Add collapsible "Weight Defaults" section in TaxonomyToolbar or above tree

3. **Backwards Compatibility with matrixStore.weights**
   - What we know: Matrix and Sunburst currently read from matrixStore.weights
   - What's unclear: Migration strategy - update consumers immediately or maintain both sources temporarily?
   - Recommendation: Update all consumers to read from taxonomyStore in this phase; deprecate matrixStore.weights

## Sources

### Primary (HIGH confidence)
- Existing codebase files:
  - `src/stores/taxonomyStore.ts` - Current store structure
  - `src/stores/matrixStore.ts` - Current weight storage
  - `src/utils/aggregation.ts` - Weight usage pattern
  - `src/components/taxonomy/TaxonomyNode.tsx` - Inline edit pattern
  - `src/components/sunburst/useSunburstData.ts` - Weight consumption
- [Zustand persist middleware docs](https://zustand.docs.pmnd.rs/middlewares/persist) - partialize pattern

### Secondary (MEDIUM confidence)
- [React inline edit patterns](https://www.emgoto.com/react-inline-edit/) - Click-to-edit UX patterns

### Tertiary (LOW confidence)
- None - all findings verified against existing codebase

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - No new dependencies, using existing project patterns
- Architecture: HIGH - Extending existing stores and components with proven patterns
- Pitfalls: HIGH - Based on existing codebase analysis and react-arborist experience

**Research date:** 2026-01-21
**Valid until:** Indefinite (internal architecture research)
