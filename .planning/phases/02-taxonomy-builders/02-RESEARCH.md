# Phase 2: Taxonomy Builders - Research

**Researched:** 2026-01-19
**Domain:** React tree components, drag-and-drop, hierarchical state management
**Confidence:** HIGH

## Summary

This phase requires building hierarchical Risk and Process taxonomy editors with up to 5 levels. The research investigated tree component libraries, drag-and-drop solutions, inline editing patterns, hierarchical ID generation, Zustand nested state management, and accessibility requirements.

**Key finding:** `react-arborist` is the recommended library. It provides virtualization, drag-and-drop (including reparenting), inline editing, keyboard navigation, and ARIA support out of the box. This eliminates the need to build custom tree rendering, focus management, or drag-drop logic.

**Primary recommendation:** Use `react-arborist` for the tree UI component with Zustand + Immer middleware for persistent state management. Generate hierarchical IDs using a materialized path algorithm that recalculates on structure changes.

## Standard Stack

The established libraries/tools for this domain:

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| react-arborist | ^3.4.2 | Tree UI component | Full-featured: virtualization, drag-drop with reparent, inline edit, keyboard nav, ARIA |
| zustand | ^5.0.10 | State management | Already in project, works well with immer for nested updates |
| immer | ^10.x | Immutable nested updates | Recommended by Zustand docs for deeply nested tree state |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| lucide-react | ^0.562.0 | Icons | Already in project - use for chevrons, add/delete buttons |
| clsx | ^2.1.1 | Conditional classes | Already in project - tree node styling |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| react-arborist | dnd-kit-sortable-tree | Less features (no built-in inline edit, no virtualization, more manual setup) |
| react-arborist | Custom recursive component | Massive effort: must build drag-drop, keyboard nav, virtualization, ARIA from scratch |
| react-arborist | @tanstack/react-virtual + custom | Virtualization only; still need drag-drop, edit, keyboard nav |
| immer middleware | Spread operators | Verbose, error-prone for 5-level deep updates |

**Installation:**
```bash
npm install react-arborist immer
```

Note: react-arborist has no peer dependencies beyond React.

## Architecture Patterns

### Recommended Project Structure
```
src/
├── components/
│   └── taxonomy/
│       ├── TaxonomyTree.tsx          # Tree wrapper with react-arborist
│       ├── TaxonomyNode.tsx          # Custom node renderer
│       ├── TaxonomyToolbar.tsx       # Expand/collapse all, search, toggles
│       └── TaxonomyTabs.tsx          # Risk/Process tab switcher
├── stores/
│   └── taxonomyStore.ts              # Zustand store for both taxonomies
├── utils/
│   └── hierarchicalId.ts             # ID generation algorithm
└── pages/
    └── TaxonomyPage.tsx              # Page composition
```

### Pattern 1: React-Arborist Uncontrolled Mode with External State Sync
**What:** Use `initialData` for uncontrolled tree management, sync to Zustand via handlers
**When to use:** When you want react-arborist to manage tree mutations internally but persist to external store

```typescript
// Source: react-arborist documentation
import { Tree, NodeRendererProps } from 'react-arborist';

function TaxonomyTree() {
  const { items, setItems } = useTaxonomyStore();

  return (
    <Tree
      initialData={items}
      onCreate={handleCreate}
      onRename={handleRename}
      onMove={handleMove}
      onDelete={handleDelete}
      width="100%"
      height={600}
      indent={24}
      rowHeight={40}
      openByDefault={true}
    >
      {TaxonomyNode}
    </Tree>
  );
}
```

### Pattern 2: Custom Node Renderer with Inline Editing
**What:** Render tree nodes with ID, name (editable), description (editable), and action buttons
**When to use:** For the custom display requirements (show ID + name + description)

```typescript
// Source: react-arborist API docs
function TaxonomyNode({ node, style, dragHandle }: NodeRendererProps<TaxonomyItem>) {
  return (
    <div style={style} ref={dragHandle} className="flex items-center gap-2">
      {/* Expand/collapse chevron */}
      {!node.isLeaf && (
        <button onClick={() => node.toggle()}>
          {node.isOpen ? <ChevronDown /> : <ChevronRight />}
        </button>
      )}

      {/* Content - switches between edit and display mode */}
      {node.isEditing ? (
        <input
          autoFocus
          defaultValue={node.data.name}
          onBlur={(e) => node.submit(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') node.submit(e.currentTarget.value);
            if (e.key === 'Escape') node.reset();
          }}
        />
      ) : (
        <span onDoubleClick={() => node.edit()}>{node.data.name}</span>
      )}

      {/* Action buttons on hover */}
      <button onClick={() => /* add child */}>+</button>
      <button onClick={() => node.tree.delete(node.id)}>x</button>
    </div>
  );
}
```

### Pattern 3: Hierarchical ID Generation
**What:** Generate IDs like 1, 1.1, 1.1.1 based on tree position
**When to use:** Auto-generate display IDs after any structure change

```typescript
// Materialized path pattern - recalculate on structure change
function generateHierarchicalIds(items: TaxonomyItem[], parentPath = ''): TaxonomyItem[] {
  return items.map((item, index) => {
    const position = index + 1;
    const hierarchicalId = parentPath ? `${parentPath}.${position}` : `${position}`;

    return {
      ...item,
      hierarchicalId,
      children: item.children
        ? generateHierarchicalIds(item.children, hierarchicalId)
        : undefined
    };
  });
}
```

### Pattern 4: Zustand Store with Immer for Tree State
**What:** Store tree data with immer middleware for clean nested updates
**When to use:** Managing the taxonomy state with LocalStorage persistence

```typescript
// Source: Zustand immer middleware docs
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';

interface TaxonomyStore {
  risks: TaxonomyItem[];
  processes: TaxonomyItem[];
  // Actions
  setRisks: (risks: TaxonomyItem[]) => void;
  setProcesses: (processes: TaxonomyItem[]) => void;
}

export const useTaxonomyStore = create<TaxonomyStore>()(
  persist(
    immer((set) => ({
      risks: [],
      processes: [],
      setRisks: (risks) => set((state) => { state.risks = risks; }),
      setProcesses: (processes) => set((state) => { state.processes = processes; }),
    })),
    { name: 'riskguard-taxonomy' }
  )
);
```

### Anti-Patterns to Avoid
- **Recursive rendering without virtualization:** Will cause performance issues with 100+ nodes
- **Storing hierarchical IDs in database as truth:** IDs should be calculated from position, not stored
- **Using controlled mode for complex trees:** react-arborist's uncontrolled mode handles mutations more elegantly
- **Building custom drag-drop with dnd-kit from scratch:** react-arborist already handles tree-specific edge cases (reparenting, drop targets)

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Tree drag-and-drop | Custom dnd-kit implementation | react-arborist built-in | Tree reparenting, drop indicators, nested contexts are complex |
| Tree keyboard navigation | Custom keydown handlers | react-arborist built-in | Arrow key navigation, Home/End, type-ahead are specified by WAI-ARIA |
| Virtualized tree rendering | Custom windowing | react-arborist built-in | Handles variable-depth trees, expand/collapse, scroll position |
| Inline editing with Escape/Enter | Custom contenteditable | react-arborist node.edit()/submit()/reset() | Focus management, blur handling, keyboard events are tricky |
| ARIA tree attributes | Manual aria-expanded, role="treeitem" | react-arborist built-in | Correct aria-level, aria-posinset, aria-setsize for screen readers |
| Deeply nested state updates | Manual spread operators | Immer middleware | 5 levels deep means 5 levels of `...spread`, error-prone |

**Key insight:** react-arborist exists specifically because building accessible, performant tree views is complex. The library handles: virtualization, drag-drop with reparenting, inline renaming, keyboard navigation (WAI-ARIA compliant), focus management, and ARIA attributes.

## Common Pitfalls

### Pitfall 1: Storing Hierarchical IDs as Data
**What goes wrong:** IDs become stale when items are moved or reordered
**Why it happens:** Treating generated IDs (1.1.1) as persistent data instead of derived
**How to avoid:** Recalculate hierarchical IDs after every structure change (move, delete, reorder)
**Warning signs:** IDs don't match visual position, duplicate IDs after move

### Pitfall 2: Using Controlled Mode When Uncontrolled Works
**What goes wrong:** Infinite loops with selection, complex state sync issues
**Why it happens:** react-arborist controlled mode requires careful coordination of selection state
**How to avoid:** Use `initialData` (uncontrolled) with handlers to sync to external store
**Warning signs:** onSelect triggering selectMulti which triggers onSelect

### Pitfall 3: Forgetting to Handle Description Separately from Name
**What goes wrong:** Only name is editable, description edit requires separate UI
**Why it happens:** react-arborist's built-in edit mode is for "renaming" (single field)
**How to avoid:** Implement separate inline edit for description outside react-arborist's edit mode
**Warning signs:** No way to edit description, or awkward modal/popover for description

### Pitfall 4: Deep Nesting Without Immer
**What goes wrong:** Verbose update code, bugs from missing spread operators
**Why it happens:** Updating item at level 5 requires spreading levels 1-4
**How to avoid:** Use Zustand immer middleware - mutate draft directly
**Warning signs:** Code like `{ ...state, risks: { ...state.risks, children: { ... } } }`

### Pitfall 5: Missing Empty State Handling
**What goes wrong:** Blank tree with no guidance for user
**Why it happens:** Focus on building features, not edge cases
**How to avoid:** Design empty state with "Add first risk" call-to-action
**Warning signs:** White space where tree should be, no obvious way to start

### Pitfall 6: Connector Lines with Dynamic Depth
**What goes wrong:** Lines don't connect properly at all levels
**Why it happens:** CSS for connector lines is tricky with variable depth
**How to avoid:** Use left-border approach per level instead of complex connector lines
**Warning signs:** Broken lines, misaligned connectors at deep levels

## Code Examples

Verified patterns from official sources:

### Complete Tree Setup
```typescript
// Source: react-arborist GitHub README
import { Tree, NodeRendererProps } from 'react-arborist';
import { useTaxonomyStore } from '@/stores/taxonomyStore';
import { generateHierarchicalIds } from '@/utils/hierarchicalId';

interface TaxonomyItem {
  id: string;           // UUID for internal reference
  hierarchicalId: string; // "1.2.3" for display
  name: string;
  description: string;
  children?: TaxonomyItem[];
}

export function RiskTaxonomyTree() {
  const { risks, setRisks } = useTaxonomyStore();
  const treeRef = useRef<TreeApi<TaxonomyItem>>(null);

  const handleMove = ({ dragIds, parentId, index }) => {
    // react-arborist provides new tree structure via internal handler
    // we need to regenerate IDs after the move
  };

  const handleCreate = ({ parentId, index, type }) => {
    const newItem: TaxonomyItem = {
      id: crypto.randomUUID(),
      hierarchicalId: '', // Will be recalculated
      name: 'New Risk',
      description: '',
    };
    // Insert at position, recalculate IDs
  };

  return (
    <Tree
      ref={treeRef}
      data={generateHierarchicalIds(risks)}
      onCreate={handleCreate}
      onMove={handleMove}
      onRename={({ id, name }) => { /* update name, regenerate IDs */ }}
      onDelete={({ ids }) => { /* remove items, regenerate IDs */ }}
      openByDefault={true}
      width="100%"
      height={600}
      indent={24}
      rowHeight={48}
      overscanCount={5}
    >
      {TaxonomyNode}
    </Tree>
  );
}
```

### Node Renderer with Level Colors
```typescript
// Source: react-arborist custom node pattern
const LEVEL_COLORS = [
  'border-l-blue-500',
  'border-l-green-500',
  'border-l-yellow-500',
  'border-l-orange-500',
  'border-l-red-500',
];

function TaxonomyNode({ node, style, dragHandle }: NodeRendererProps<TaxonomyItem>) {
  const levelColor = LEVEL_COLORS[node.level] || LEVEL_COLORS[4];

  return (
    <div
      ref={dragHandle}
      style={style}
      className={clsx(
        'flex items-center gap-2 px-2 py-1 border-l-4',
        levelColor,
        node.isSelected && 'bg-blue-100 dark:bg-blue-900',
        node.isFocused && 'ring-2 ring-blue-500'
      )}
    >
      {/* Expand/collapse */}
      {!node.isLeaf && (
        <button
          onClick={() => node.toggle()}
          className="p-1 hover:bg-gray-200 rounded"
        >
          {node.isOpen ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
        </button>
      )}
      {node.isLeaf && <span className="w-6" />}

      {/* ID badge */}
      <span className="text-xs font-mono text-gray-500 min-w-[3rem]">
        {node.data.hierarchicalId}
      </span>

      {/* Name - editable on double click */}
      {node.isEditing ? (
        <input
          autoFocus
          className="flex-1 px-1 border rounded"
          defaultValue={node.data.name}
          onBlur={(e) => node.submit(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') node.submit(e.currentTarget.value);
            if (e.key === 'Escape') node.reset();
          }}
        />
      ) : (
        <span
          className="flex-1 cursor-pointer"
          onDoubleClick={() => node.edit()}
        >
          {node.data.name}
        </span>
      )}

      {/* Description - separate inline edit */}
      <span className="text-sm text-gray-500 truncate max-w-[200px]">
        {node.data.description || 'No description'}
      </span>

      {/* Actions - visible on hover via CSS */}
      <div className="opacity-0 group-hover:opacity-100 flex gap-1">
        <button onClick={() => treeApi.create({ parentId: node.id })}>
          <Plus size={14} />
        </button>
        <button onClick={() => treeApi.delete(node.id)}>
          <Trash size={14} />
        </button>
      </div>
    </div>
  );
}
```

### Hierarchical ID Algorithm
```typescript
// Materialized path pattern for hierarchical numbering
export function generateHierarchicalIds<T extends { children?: T[] }>(
  items: T[],
  parentPath = ''
): (T & { hierarchicalId: string })[] {
  return items.map((item, index) => {
    const position = index + 1;
    const hierarchicalId = parentPath
      ? `${parentPath}.${position}`
      : `${position}`;

    return {
      ...item,
      hierarchicalId,
      children: item.children
        ? generateHierarchicalIds(item.children, hierarchicalId)
        : undefined
    };
  });
}

// Usage: Call after any structure-changing operation
const risksWithIds = generateHierarchicalIds(risks);
```

### Search/Filter Implementation
```typescript
// Source: react-arborist search pattern
const [searchTerm, setSearchTerm] = useState('');

<Tree
  searchTerm={searchTerm}
  searchMatch={(node, term) =>
    node.data.name.toLowerCase().includes(term.toLowerCase()) ||
    node.data.description.toLowerCase().includes(term.toLowerCase())
  }
>
  {/* Nodes that match are highlighted, non-matching are filtered/dimmed */}
</Tree>
```

### Expand All / Collapse All
```typescript
// Source: react-arborist TreeApi
const treeRef = useRef<TreeApi<TaxonomyItem>>(null);

const expandAll = () => treeRef.current?.openAll();
const collapseAll = () => treeRef.current?.closeAll();
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| react-beautiful-dnd | dnd-kit or react-arborist | 2022-2023 | rbd is deprecated, use dnd-kit for custom or react-arborist for trees |
| Custom recursive components | Virtualized tree libraries | 2023+ | Performance at scale requires virtualization |
| Redux for all state | Zustand with immer | 2023+ | Simpler API, smaller bundle, better DX for nested state |
| Manual ARIA attributes | Libraries with built-in a11y | 2024+ | react-arborist handles WAI-ARIA tree pattern |

**Deprecated/outdated:**
- `react-beautiful-dnd`: Maintenance mode, use dnd-kit or react-arborist
- `react-sortable-tree`: Abandoned, use react-arborist
- Complex Redux normalizations for trees: Overkill for client-side taxonomy, Zustand+immer simpler

## Open Questions

Things that couldn't be fully resolved:

1. **Description Inline Edit Approach**
   - What we know: react-arborist's `node.edit()` is for single-field (name) editing only
   - What's unclear: Best pattern for secondary field (description) inline editing
   - Recommendation: Implement separate click-to-edit for description field outside react-arborist's edit mode, or use small inline form that appears on expand

2. **Tab Persistence Between Risk/Process**
   - What we know: User wants tabs to switch between two taxonomies
   - What's unclear: Should expanded state be preserved per taxonomy when switching tabs?
   - Recommendation: Store expanded state per taxonomy in Zustand, restore on tab switch

3. **Quick-Add Keyboard Flow**
   - What we know: User wants "type, Enter, type next" workflow
   - What's unclear: Exact UX - does Enter after adding create sibling or stay on created node?
   - Recommendation: Enter submits edit, focus stays on new node; Tab creates sibling; Shift+Enter creates child

## Sources

### Primary (HIGH confidence)
- [react-arborist GitHub](https://github.com/brimdata/react-arborist) - Full API documentation, handlers, props
- [Zustand updating state docs](https://zustand.docs.pmnd.rs/guides/updating-state) - Nested state patterns
- [Zustand immer middleware](https://zustand.docs.pmnd.rs/integrations/immer-middleware) - Immer integration
- [W3C WAI-ARIA Tree View Pattern](https://www.w3.org/WAI/ARIA/apg/patterns/treeview/) - Keyboard navigation spec

### Secondary (MEDIUM confidence)
- [dnd-kit-sortable-tree](https://github.com/Shaddix/dnd-kit-sortable-tree) - Alternative if react-arborist doesn't fit
- [LogRocket react-arborist tutorial](https://blog.logrocket.com/using-react-arborist-create-tree-components/) - Implementation patterns
- [OpenReplay react-arborist guide](https://blog.openreplay.com/interactive-tree-components-with-react-arborist/) - Code examples

### Tertiary (LOW confidence)
- Blog posts on materialized path pattern - ID generation algorithm concept

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - react-arborist is well-documented, actively maintained (v3.4.2 Feb 2025)
- Architecture: HIGH - Patterns derived from official docs and established tutorials
- Pitfalls: MEDIUM - Based on GitHub issues and community reports
- ID generation: HIGH - Materialized path is well-established algorithm

**Research date:** 2026-01-19
**Valid until:** 2026-02-19 (30 days - stable libraries)
