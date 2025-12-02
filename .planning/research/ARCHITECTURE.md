# Architecture Research

**Domain:** Enterprise Risk Management (ERM) Web Application
**Researched:** 2026-01-19
**Confidence:** HIGH

## System Overview

```
+-------------------------------------------------------------------------+
|                          PRESENTATION LAYER                              |
+-------------------------------------------------------------------------+
|  +-----------------+  +-----------------+  +-----------------+           |
|  | Risk Taxonomy   |  | Process Taxonomy|  | Risk-Process    |           |
|  | Builder         |  | Builder         |  | Matrix (RPM)    |           |
|  +--------+--------+  +--------+--------+  +--------+--------+           |
|           |                    |                    |                    |
|  +-----------------+  +-----------------+                                |
|  | Risk Control    |  | Shared UI       |                                |
|  | Table (RCT)     |  | Components      |                                |
|  +--------+--------+  +-----------------+                                |
+-----------+--------------------+--------------------+--------------------+
            |                    |                    |
+-----------v--------------------v--------------------v--------------------+
|                          STATE LAYER (Zustand)                           |
+-------------------------------------------------------------------------+
|  +-------------+  +-------------+  +-------------+  +-------------+      |
|  | riskTaxonomy|  | processTax. |  | rctStore    |  | uiStore     |      |
|  | Store       |  | Store       |  |             |  |             |      |
|  +------+------+  +------+------+  +------+------+  +-------------+      |
|         |                |                |                              |
+---------+----------------+----------------+------------------------------+
          |                |                |
+---------v----------------v----------------v------------------------------+
|                       DERIVED DATA LAYER                                 |
+-------------------------------------------------------------------------+
|  +------------------------------------------------------------------+   |
|  | Selectors & Computed Values                                       |   |
|  | - RCT Generation (Risk x Process leaf nodes)                      |   |
|  | - RPM Aggregation (Average scores per cell)                       |   |
|  | - Hierarchy Path Resolution                                       |   |
|  +------------------------------------------------------------------+   |
+-------------------------------------------------------------------------+
          |
+---------v----------------------------------------------------------------+
|                      PERSISTENCE LAYER                                   |
+-------------------------------------------------------------------------+
|  +------------------------------------------------------------------+   |
|  | LocalStorage Middleware (Zustand persist)                         |   |
|  | - Automatic sync on state change                                  |   |
|  | - Cross-tab synchronization via storage events                    |   |
|  +------------------------------------------------------------------+   |
+-------------------------------------------------------------------------+
```

## Component Responsibilities

| Component | Responsibility | Typical Implementation |
|-----------|----------------|------------------------|
| Risk Taxonomy Builder | Create/edit/delete hierarchical risk categories up to 5 levels | Tree component with CRUD operations, drag-drop reordering |
| Process Taxonomy Builder | Create/edit/delete hierarchical process categories up to 5 levels | Shared tree component, separate data store |
| Risk Control Table (RCT) | Display and score all risk-process combinations from leaf nodes | Data table with inline editing, computed from taxonomy data |
| Risk-Process Matrix (RPM) | Visualize aggregated risk scores in heatmap format | Heatmap grid with click-through to RCT rows |
| State Stores | Manage normalized entity data and UI state | Zustand slices with persistence middleware |
| Selectors | Compute derived data (RCT rows, RPM aggregates) | Memoized selector functions |

## Recommended Project Structure

```
src/
+-- components/           # Shared UI components
|   +-- tree/             # Reusable tree components
|   |   +-- TreeNode.tsx
|   |   +-- TreeView.tsx
|   |   +-- TreeControls.tsx
|   +-- table/            # Table components for RCT
|   |   +-- DataTable.tsx
|   |   +-- EditableCell.tsx
|   +-- matrix/           # Heatmap visualization
|   |   +-- HeatmapCell.tsx
|   |   +-- HeatmapGrid.tsx
|   |   +-- ColorScale.tsx
|   +-- ui/               # Generic UI (buttons, modals, etc.)
|
+-- features/             # Feature modules (vertical slices)
|   +-- risk-taxonomy/
|   |   +-- RiskTaxonomyPage.tsx
|   |   +-- useRiskTaxonomy.ts
|   +-- process-taxonomy/
|   |   +-- ProcessTaxonomyPage.tsx
|   |   +-- useProcessTaxonomy.ts
|   +-- rct/
|   |   +-- RCTPage.tsx
|   |   +-- useRCT.ts
|   +-- rpm/
|   |   +-- RPMPage.tsx
|   |   +-- useRPM.ts
|
+-- stores/               # Zustand state management
|   +-- riskTaxonomyStore.ts
|   +-- processTaxonomyStore.ts
|   +-- rctStore.ts
|   +-- uiStore.ts
|   +-- index.ts          # Store composition
|
+-- selectors/            # Derived data computations
|   +-- rctSelectors.ts   # Generate RCT rows from taxonomies
|   +-- rpmSelectors.ts   # Aggregate RCT data for heatmap
|   +-- taxonomySelectors.ts
|
+-- types/                # TypeScript interfaces
|   +-- taxonomy.ts       # TaxonomyNode, TaxonomyTree
|   +-- rct.ts            # RCTRow, RiskScore
|   +-- rpm.ts            # RPMCell, AggregateScore
|
+-- utils/                # Utility functions
|   +-- tree.ts           # Tree traversal, path resolution
|   +-- scoring.ts        # Score calculations, averaging
|   +-- persistence.ts    # LocalStorage utilities
|
+-- App.tsx
+-- main.tsx
```

### Structure Rationale

- **components/:** Reusable, presentational components organized by UI pattern (tree, table, matrix). These are agnostic to business logic.
- **features/:** Vertical slices containing page components and feature-specific hooks. Each feature owns its page layout and orchestrates components.
- **stores/:** Zustand stores separated by domain. Keeps state logic isolated and testable.
- **selectors/:** Derived data computations separated from stores. Critical for RCT generation and RPM aggregation.
- **types/:** Centralized TypeScript definitions prevent circular dependencies and ensure consistency.

## Architectural Patterns

### Pattern 1: Normalized State with ID References

**What:** Store hierarchical data in flat structures using ID references instead of nested objects.

**When to use:** Any hierarchical or relational data (taxonomies, RCT rows with references).

**Trade-offs:**
- Pro: Simpler updates, no deep cloning, single source of truth
- Pro: Efficient lookups by ID
- Con: Requires denormalization for display (via selectors)

**Example:**
```typescript
// AVOID: Nested structure
interface NestedTaxonomy {
  id: string;
  name: string;
  children: NestedTaxonomy[]; // Nested - hard to update
}

// PREFER: Normalized structure
interface TaxonomyNode {
  id: string;
  name: string;
  parentId: string | null;
  childIds: string[];
  level: number; // 1-5
  order: number; // For sibling ordering
}

interface TaxonomyStore {
  nodes: Record<string, TaxonomyNode>; // Flat lookup by ID
  rootIds: string[]; // Entry points
}
```

### Pattern 2: Computed RCT Generation

**What:** Auto-generate Risk Control Table rows from leaf-node combinations of Risk and Process taxonomies.

**When to use:** When RCT rows are defined by the cross-product of two taxonomies.

**Trade-offs:**
- Pro: RCT always reflects current taxonomy state
- Pro: No manual row creation/deletion when taxonomies change
- Con: Must handle RCT data persistence separately from row structure

**Example:**
```typescript
// Selector to generate RCT rows
function generateRCTRows(
  riskNodes: Record<string, TaxonomyNode>,
  processNodes: Record<string, TaxonomyNode>,
  scores: Record<string, RCTScore> // keyed by "riskId:processId"
): RCTRow[] {
  const riskLeaves = getLeafNodes(riskNodes);
  const processLeaves = getLeafNodes(processNodes);

  return riskLeaves.flatMap(risk =>
    processLeaves.map(process => ({
      id: `${risk.id}:${process.id}`,
      riskId: risk.id,
      riskPath: getNodePath(risk, riskNodes), // "Category > Sub > Leaf"
      processId: process.id,
      processPath: getNodePath(process, processNodes),
      score: scores[`${risk.id}:${process.id}`] || defaultScore,
    }))
  );
}
```

### Pattern 3: Aggregation Selectors for RPM

**What:** Compute Risk-Process Matrix values by aggregating RCT scores up the taxonomy hierarchy.

**When to use:** Visualizing summarized data at higher hierarchy levels.

**Trade-offs:**
- Pro: Real-time updates when RCT scores change
- Pro: Drill-down capability (click cell to see contributing RCT rows)
- Con: Computation cost for large datasets (mitigate with memoization)

**Example:**
```typescript
// Aggregate scores for a risk-process cell at any level
function aggregateRPMCell(
  riskNodeId: string,
  processNodeId: string,
  rctScores: Record<string, RCTScore>,
  riskNodes: Record<string, TaxonomyNode>,
  processNodes: Record<string, TaxonomyNode>
): AggregateScore {
  // Get all descendant leaf nodes
  const riskLeafIds = getDescendantLeafIds(riskNodeId, riskNodes);
  const processLeafIds = getDescendantLeafIds(processNodeId, processNodes);

  // Collect all RCT scores for combinations
  const scores = riskLeafIds.flatMap(rId =>
    processLeafIds.map(pId => rctScores[`${rId}:${pId}`])
  ).filter(Boolean);

  return {
    average: calculateAverage(scores),
    count: scores.length,
    max: Math.max(...scores.map(s => s.inherentRisk)),
    min: Math.min(...scores.map(s => s.inherentRisk)),
  };
}
```

### Pattern 4: Zustand Persist Middleware

**What:** Automatic state persistence to LocalStorage with Zustand's built-in middleware.

**When to use:** Client-only applications requiring data persistence across sessions.

**Trade-offs:**
- Pro: Zero-config persistence, automatic sync
- Pro: Selective persistence (choose which state slices to persist)
- Con: LocalStorage limit (~5MB), must handle quota exceeded
- Con: Synchronous API can block on large writes

**Example:**
```typescript
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

interface RiskTaxonomyState {
  nodes: Record<string, TaxonomyNode>;
  rootIds: string[];
  addNode: (node: TaxonomyNode) => void;
  // ... other actions
}

const useRiskTaxonomyStore = create<RiskTaxonomyState>()(
  persist(
    (set, get) => ({
      nodes: {},
      rootIds: [],
      addNode: (node) => set((state) => ({
        nodes: { ...state.nodes, [node.id]: node },
        rootIds: node.parentId ? state.rootIds : [...state.rootIds, node.id],
      })),
    }),
    {
      name: 'risk-taxonomy-storage',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        nodes: state.nodes,
        rootIds: state.rootIds
      }), // Only persist data, not functions
    }
  )
);
```

## Data Flow

### Taxonomy Creation Flow

```
User adds node in Tree UI
         |
         v
TreeNode.onAdd() called
         |
         v
Feature hook dispatches store action
         |
         v
Zustand store updates normalized state
         |
         v
Persist middleware saves to LocalStorage
         |
         v
RCT selector recomputes (if leaf node added)
         |
         v
RCT view re-renders with new row(s)
```

### RCT Scoring Flow

```
User edits score in RCT table
         |
         v
EditableCell.onChange()
         |
         v
RCT store updates score for risk:process key
         |
         v
Persist middleware saves scores
         |
         v
RPM selector recomputes affected cells
         |
         v
Heatmap updates color for affected cells
```

### RPM Drill-Down Flow

```
User clicks cell in RPM heatmap
         |
         v
Get riskNodeId + processNodeId from cell
         |
         v
Navigate to RCT with filter params
         |
         v
RCT page shows filtered rows
         | (rows where risk is descendant of riskNodeId
         |  AND process is descendant of processNodeId)
```

### Key Data Flows

1. **Taxonomy -> RCT:** Taxonomies define structure; RCT rows are auto-generated from leaf node combinations. Adding/removing taxonomy nodes triggers RCT regeneration.

2. **RCT -> RPM:** RCT contains the actual scores; RPM aggregates them. Changing any RCT score triggers recalculation of all affected RPM cells up the hierarchy.

3. **RPM -> RCT (navigation):** Clicking an RPM cell filters the RCT view to show contributing rows. This is a navigation/filter operation, not a data flow.

## Scaling Considerations

| Scale | Architecture Adjustments |
|-------|--------------------------|
| Demo (<100 nodes) | Current architecture is ideal. LocalStorage sufficient. No optimization needed. |
| Medium (100-1000 nodes) | Add memoization to selectors. Consider virtualized tree/table rendering. |
| Large (1000+ nodes) | Move to IndexedDB. Implement worker-based computation. Paginate RCT table. |

### Scaling Priorities

1. **First bottleneck: RCT row count.** With 50 risk leaves x 50 process leaves = 2,500 rows. Use virtualized table (react-window or tanstack-virtual) if >100 rows visible.

2. **Second bottleneck: RPM aggregation.** Recomputing aggregates on every score change. Memoize aggressively; consider incremental updates (only recalc affected cells).

3. **Third bottleneck: LocalStorage size.** ~5MB limit. For Holland Casino demo, unlikely to hit this. For production, migrate to IndexedDB with Zustand persist adapter.

## Anti-Patterns

### Anti-Pattern 1: Storing Nested Tree Structure in State

**What people do:** Store children directly inside parent nodes as nested arrays.

**Why it's wrong:** Updating a deeply nested node requires cloning the entire path from root. Leads to complex reducer logic and potential bugs.

**Do this instead:** Use normalized state with ID references. Store flat map of nodes, use parentId/childIds for relationships.

### Anti-Pattern 2: Storing Computed RCT Rows in State

**What people do:** Persist the generated RCT row structure alongside taxonomy data.

**Why it's wrong:** Creates synchronization problems. If taxonomy changes but RCT isn't regenerated, data becomes inconsistent. Doubles storage requirements.

**Do this instead:** Store only the scores (keyed by "riskId:processId"). Generate row structure on-demand via selectors.

### Anti-Pattern 3: Recomputing Entire RPM on Any Change

**What people do:** Recalculate all RPM cells when any RCT score changes.

**Why it's wrong:** O(n*m) computation where n and m are taxonomy sizes. Causes UI lag on score updates.

**Do this instead:** Track which cells are affected by a score change (based on ancestor IDs) and only recompute those. Use memoization for stable cells.

### Anti-Pattern 4: Prop Drilling Tree State

**What people do:** Pass taxonomy state through multiple component layers.

**Why it's wrong:** Makes components tightly coupled, harder to refactor, causes unnecessary re-renders.

**Do this instead:** Components subscribe directly to Zustand store using selectors. Only subscribe to the data each component needs.

### Anti-Pattern 5: Synchronous LocalStorage on Every Keystroke

**What people do:** Persist to LocalStorage on every input character when editing.

**Why it's wrong:** LocalStorage is synchronous and blocks the main thread. Causes input lag, especially on slower devices.

**Do this instead:** Debounce persistence (300-500ms delay) or persist only on blur/commit. Zustand persist middleware handles this reasonably by default, but verify.

## Integration Points

### External Services

| Service | Integration Pattern | Notes |
|---------|---------------------|-------|
| None (client-only) | N/A | Demo uses LocalStorage only. Future: API layer would sit between stores and backend. |

### Internal Boundaries

| Boundary | Communication | Notes |
|----------|---------------|-------|
| Taxonomy Builders <-> Stores | Direct store subscription | Each builder subscribes to its own store slice |
| Stores <-> RCT Selectors | Selector reads multiple stores | RCT selector combines risk + process + scores |
| RCT Selectors <-> RPM Selectors | RPM reads RCT output | RPM aggregates RCT scores |
| Stores <-> LocalStorage | Zustand persist middleware | Automatic, transparent to components |
| RPM <-> RCT Views | React Router navigation | URL params filter RCT rows |

## Build Order Implications

Based on the architecture and data dependencies:

### Phase 1: Foundation (Must Build First)
1. **Types and utilities** - Core interfaces (TaxonomyNode, RCTScore), tree utilities
2. **Zustand store setup** - Base store structure with persistence
3. **Basic tree component** - Render/expand/collapse (no CRUD yet)

### Phase 2: Taxonomy Builders
1. **Risk Taxonomy full implementation** - CRUD, drag-drop, 5-level enforcement
2. **Process Taxonomy** - Reuse tree component, separate store

### Phase 3: RCT (Depends on Taxonomies)
1. **RCT selectors** - Generate rows from leaf nodes
2. **RCT table component** - Display rows, inline scoring
3. **Score persistence** - Store score data separately

### Phase 4: RPM (Depends on RCT)
1. **RPM aggregation selectors** - Calculate averages per cell
2. **Heatmap component** - Color-coded grid visualization
3. **Drill-down navigation** - Click to filtered RCT view

### Rationale for Order
- Types must exist before stores
- Stores must exist before components can consume them
- Taxonomies must exist before RCT can generate rows
- RCT must exist before RPM can aggregate scores
- Each phase is independently demoable

## Sources

**ERM/GRC Architecture:**
- [COSO ERM Framework](https://www.coso.org/erm-framework)
- [Centraleyes: Best ERM Software 2025](https://www.centraleyes.com/best-erm-software/)
- [AuditBoard: ERM Fundamentals](https://auditboard.com/blog/enterprise-risk-management)
- [MetricStream: GRC Framework](https://www.metricstream.com/whitepapers/GRC-framework.htm)
- [AWS: What is GRC](https://aws.amazon.com/what-is/grc/)

**Risk Control Matrix:**
- [Hyperproof: Risk Control Matrix](https://hyperproof.io/resource/risk-control-matrix-grc-program/)
- [SolveXia: RCM Implementation](https://www.solvexia.com/blog/risk-control-matrix-implement-for-success)
- [V-Comply: Risk Control Matrix Guide](https://www.v-comply.com/blog/designing-implementing-risk-control-matrix/)

**React State Management:**
- [React State Management 2025](https://www.developerway.com/posts/react-state-management-2025)
- [Makers' Den: State Management Trends 2025](https://makersden.io/blog/react-state-management-in-2025)
- [Redux: Normalizing State Shape](https://redux.js.org/usage/structuring-reducers/normalizing-state-shape)
- [React.dev: Choosing State Structure](https://react.dev/learn/choosing-the-state-structure)
- [Zustand GitHub](https://github.com/pmndrs/zustand)

**React Tree Components:**
- [React Arborist](https://github.com/brimdata/react-arborist)
- [PrimeReact Tree](https://primereact.org/tree/)
- [React Aria Drag-Drop Hierarchy](https://medium.com/@mathis.garberg/building-an-intuitive-drag-and-drop-hierarchy-with-react-aria-cd2f58894dc1)

**Visualization:**
- [Syncfusion React HeatMap](https://www.syncfusion.com/react-components/react-heatmap-chart)
- [MUI X Heatmap](https://mui.com/x/react-charts/heatmap/)
- [MetricStream: Risk Heat Map](https://www.metricstream.com/learn/risk-heat-map.html)

**LocalStorage Patterns:**
- [Josh Comeau: Persisting React State](https://www.joshwcomeau.com/react/persisting-react-state-in-localstorage/)
- [Yeti: useSyncExternalStore for Browser Data](https://www.yeti.co/blog/managing-persistent-browser-data-with-usesyncexternalstore)

---
*Architecture research for: RiskGuard ERM - Holland Casino Demo*
*Researched: 2026-01-19*
