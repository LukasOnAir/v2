# Phase 32: RCT L4/L5 Taxonomy Display - Research

**Researched:** 2026-01-28
**Domain:** React data transformation, taxonomy hierarchy traversal
**Confidence:** HIGH

## Summary

This phase addresses a bug where L4 and L5 taxonomy levels are not displaying in RCT columns. Research of the codebase reveals there are **two separate implementations** of `getHierarchyPath` that handle hierarchy traversal differently:

1. **RCTTable.tsx** (lines 216-257): Uses tree-based traversal with `getAncestryPath` and `computePositionalId` - this is the live denormalization for authenticated mode
2. **rctGenerator.ts** (lines 27-53): Uses string parsing of `hierarchicalId` with `findByHierarchicalId` - this is used for demo mode row generation

The RCTTable.tsx implementation appears structurally sound for L4/L5, iterating up to 5 levels. The bug is likely in one of these areas:
- The `getAncestryPath` function not returning full depth for L4/L5 items
- The `findTaxonomyById` not finding deep nested items
- The loop condition `i < ancestryPath.length && i < 5` correctly handles up to 5 levels

**Primary recommendation:** Debug the `getAncestryPath` and `findTaxonomyById` functions with L4/L5 test data to identify where the hierarchy chain breaks. The implementation logic is correct, so the issue is likely data-related or a subtle traversal bug.

## Standard Stack

No additional libraries needed - this is a bugfix using existing codebase patterns.

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| React | 18.x | UI framework | Already in use |
| TanStack Table | 8.x | Table with columns | Already in use |
| nanoid | 5.x | ID generation | Already in use |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| N/A | - | - | - |

**Installation:**
```bash
# No new dependencies required
```

## Architecture Patterns

### Existing Code Structure (Two Implementations)

```
src/
├── components/rct/RCTTable.tsx    # getHierarchyPath (tree-based) - used in authenticated mode
│   ├── findTaxonomyById()         # Recursive tree search by UUID
│   ├── buildParentMap()           # Map<itemId, parentItem | null>
│   ├── getAncestryPath()          # Returns [root, ..., leaf] path
│   ├── computePositionalId()      # "1.2.3" style ID from position
│   ├── getHierarchyPath()         # Builds L1-L5 Id/Name pairs
│   └── denormalizeRCTRow()        # Converts RCTRowData to RCTRow
│
└── utils/rctGenerator.ts          # getHierarchyPath (string-based) - used in demo mode
    ├── findByHierarchicalId()     # Recursive search by hierarchicalId string
    ├── getHierarchyPath()         # Parses "1.2.3.4.5" to find ancestors
    └── generateRCTRows()          # Creates RCTRow[] from leaf cross-product
```

### Pattern 1: Tree-Based Hierarchy Path (RCTTable.tsx)
**What:** Traverse parent pointers from leaf to root, then reverse to get root-to-leaf path
**When to use:** When you have parent_id references and need full ancestry
**Example:**
```typescript
// Source: RCTTable.tsx lines 196-210
function getAncestryPath(
  item: TaxonomyItem,
  parentMap: Map<string, TaxonomyItem | null>
): TaxonomyItem[] {
  const path: TaxonomyItem[] = [item]
  let current = parentMap.get(item.id)

  while (current) {
    path.push(current)
    current = parentMap.get(current.id)
  }

  return path.reverse() // Now ordered from root to leaf
}
```

### Pattern 2: String-Based Hierarchy Path (rctGenerator.ts)
**What:** Parse hierarchicalId ("1.2.3.4.5") and look up each prefix
**When to use:** When hierarchicalId reliably reflects tree position
**Example:**
```typescript
// Source: rctGenerator.ts lines 27-53
function getHierarchyPath(leafItem: TaxonomyItem, allItems: TaxonomyItem[]) {
  const parts = leafItem.hierarchicalId.split('.')
  const result = { l1Id: '', l1Name: '', /* ... */ l5Id: '', l5Name: '' }

  for (let level = 0; level < parts.length; level++) {
    const partialId = parts.slice(0, level + 1).join('.')
    const item = findByHierarchicalId(allItems, partialId)
    if (item) {
      const key = `l${level + 1}` as 'l1' | 'l2' | 'l3' | 'l4' | 'l5'
      result[`${key}Id`] = item.hierarchicalId
      result[`${key}Name`] = item.name
    }
  }
  return result
}
```

### Anti-Patterns to Avoid
- **Duplicating hierarchy logic:** Both implementations should use the same approach for consistency
- **Assuming hierarchicalId format:** Database trigger generates hierarchicalId; don't assume format
- **Not validating deep levels exist:** Always check that L4/L5 items are actually in the tree

## Don't Hand-Roll

This is a bugfix phase - no new functionality to hand-roll.

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Hierarchy traversal | New traversal algorithm | Existing `getAncestryPath` pattern | Already proven for L1-L3 |

## Common Pitfalls

### Pitfall 1: findTaxonomyById Only Searches Nested Children
**What goes wrong:** If the taxonomy tree is not fully built (e.g., L4/L5 nodes missing from children arrays), `findTaxonomyById` returns null
**Why it happens:** The `buildTree` function in `useTaxonomy.ts` (lines 10-36) builds parent-child relationships, but relies on `parent_id` being set correctly
**How to avoid:** Verify that L4/L5 nodes have correct `parent_id` values in the database and appear in the tree structure
**Warning signs:** L4/L5 columns show empty strings while L1-L3 display correctly

### Pitfall 2: ancestryPath Has Correct Length But Wrong Indexing
**What goes wrong:** The loop `for (let i = 0; i < ancestryPath.length && i < 5; i++)` correctly limits to 5 levels, but the result uses `l${level}` where level = i + 1, potentially off-by-one issues
**Why it happens:** Index 0 maps to L1, index 4 maps to L5 - ensure no confusion
**How to avoid:** Verify that a 5-level deep item produces ancestryPath.length === 5
**Warning signs:** L4 shows L5 data or vice versa

### Pitfall 3: Demo Mode vs Authenticated Mode Use Different Paths
**What goes wrong:** Demo mode works but authenticated mode doesn't (or vice versa)
**Why it happens:** Two separate `getHierarchyPath` implementations in different files
**How to avoid:** Test both modes with L4/L5 data; consider consolidating to one implementation
**Warning signs:** One mode displays L4/L5, the other doesn't

### Pitfall 4: Seed Data L4/L5 Nodes Not Properly Linked
**What goes wrong:** Database has L4/L5 nodes but they're not linked to RCT rows
**Why it happens:** `generateRCTRows` uses `getLeafItems` which finds childless nodes - if L4 has children (L5), only L5 becomes a leaf
**How to avoid:** Verify that L5 nodes are indeed leaves (no children) and L4 nodes have children
**Warning signs:** L4/L5 risks/processes don't appear in RCT at all

## Code Examples

### Example 1: Current RCTTable Denormalization (Authenticated Mode)
```typescript
// Source: RCTTable.tsx lines 262-318
function denormalizeRCTRow(
  dbRow: RCTRowData,
  risks: TaxonomyItem[],
  processes: TaxonomyItem[],
  riskParentMap?: Map<string, TaxonomyItem | null>,
  processParentMap?: Map<string, TaxonomyItem | null>
): RCTRow {
  const riskPath = getHierarchyPath(risks, dbRow.riskId, riskParentMap)
  const processPath = getHierarchyPath(processes, dbRow.processId, processParentMap)

  return {
    id: dbRow.id,
    // Risk hierarchy - L4/L5 should be populated here
    riskL4Id: riskPath.l4Id,
    riskL4Name: riskPath.l4Name,
    riskL5Id: riskPath.l5Id,
    riskL5Name: riskPath.l5Name,
    // ... other fields
  }
}
```

### Example 2: Demo Mode Row Generation
```typescript
// Source: rctGenerator.ts lines 80-133
for (const risk of leafRisks) {
  const riskPath = getHierarchyPath(risk, risks)  // Different implementation!

  for (const process of leafProcesses) {
    const processPath = getHierarchyPath(process, processes)

    rows.push({
      // ...
      riskL4Id: riskPath.l4Id,    // Should be populated for L4/L5 leaves
      riskL4Name: riskPath.l4Name,
      riskL5Id: riskPath.l5Id,
      riskL5Name: riskPath.l5Name,
      // ...
    })
  }
}
```

### Example 3: L4/L5 Seed Data Structure
```sql
-- From 29-01-risk-taxonomy.sql lines 208-218
-- L4 under Industry Specific
INSERT INTO public.taxonomy_nodes (tenant_id, type, parent_id, name, description, sort_order)
VALUES (v_tenant_id, 'risk', l3_industry_specific, 'License Requirements', '...', 1)
RETURNING id INTO l4_license_requirements;

-- L5 under License Requirements
INSERT INTO public.taxonomy_nodes (tenant_id, type, parent_id, name, description, sort_order) VALUES
  (v_tenant_id, 'risk', l4_license_requirements, 'Annual Renewal', '...', 1),
  (v_tenant_id, 'risk', l4_license_requirements, 'Continuing Education', '...', 2);
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Parse hierarchicalId string | Tree traversal with parentMap | Phase 26.1-04 | More reliable for any depth |
| Single getHierarchyPath | Two implementations (RCTTable + rctGenerator) | Phase 26.1-04 | Potential inconsistency |

**Current state:**
- RCTTable.tsx uses tree-based traversal (preferred)
- rctGenerator.ts uses string parsing (legacy demo mode)
- Both should produce same results for same data

## Investigation Plan

To identify the root cause, the planner should include investigation tasks:

### 1. Verify L4/L5 Data Exists in Tree
```typescript
// Add debug logging in RCTTable.tsx useMemo for rows
console.log('risks tree depth:', getMaxDepth(risks))
console.log('processes tree depth:', getMaxDepth(processes))

function getMaxDepth(items: TaxonomyItem[], depth = 1): number {
  let maxDepth = depth
  for (const item of items) {
    if (item.children?.length) {
      maxDepth = Math.max(maxDepth, getMaxDepth(item.children, depth + 1))
    }
  }
  return maxDepth
}
```

### 2. Check findTaxonomyById for L4/L5 Items
```typescript
// In getHierarchyPath, log the found item
const item = findTaxonomyById(items, itemId)
console.log('Found item for', itemId, ':', item?.name, 'depth:', item ? getItemDepth(item, items) : 'N/A')
```

### 3. Verify ancestryPath Length for L5 Items
```typescript
// In getHierarchyPath, log ancestry
const ancestryPath = getAncestryPath(item, pMap)
console.log('ancestryPath for', item.name, ':', ancestryPath.map(i => i.name))
// Should show ['L1Name', 'L2Name', 'L3Name', 'L4Name', 'L5Name'] for L5 items
```

## Root Cause Hypothesis

Based on code analysis, the most likely root cause is:

**Hypothesis 1: RCT rows reference L3/L4 leaf items, not L4/L5**
- The seed data creates L5 as deepest leaves
- `getLeafItems` finds L5 nodes correctly
- But if RCT was generated before L4/L5 were added, existing rows point to L3 items
- **Test:** Check `riskId` values in `rct_rows` table - do they match L5 node UUIDs?

**Hypothesis 2: buildTree fails to nest L4/L5 properly**
- `buildTree` in useTaxonomy.ts builds children arrays
- If parent_id is null or wrong for L4/L5 nodes, they become root items (not nested)
- **Test:** Log the full tree structure after buildTree completes

**Hypothesis 3: Column visibility hides L4/L5 by default**
- RCT uses `columnVisibility` from rctStore
- L4/L5 columns might be hidden by default
- **Test:** Check initial `columnVisibility` state in rctStore.ts

## Open Questions

1. **Is this bug in demo mode, authenticated mode, or both?**
   - Need to test both to identify scope
   - Recommendation: Test demo mode first (simpler), then authenticated

2. **Were L4/L5 nodes added after RCT rows were generated?**
   - If so, existing riskId/processId values point to old L3 leaves
   - Recommendation: Regenerate RCT to refresh leaf mappings

3. **Are L4/L5 columns visible in the UI?**
   - Column visibility might hide them
   - Recommendation: Check columnVisibility default state

## Sources

### Primary (HIGH confidence)
- RCTTable.tsx lines 129-318 - Tree-based hierarchy traversal implementation
- rctGenerator.ts lines 27-133 - String-based hierarchy traversal implementation
- useTaxonomy.ts lines 10-36 - buildTree function that creates nested structure
- 29-01-risk-taxonomy.sql - L4/L5 seed data structure

### Secondary (MEDIUM confidence)
- rctStore.ts - columnVisibility default state (need to verify)
- useRCTRows.ts - Database row structure (verified, no L4/L5 columns - denormalized client-side)

### Tertiary (LOW confidence)
- None - all sources are codebase files

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - No new dependencies, pure bugfix
- Architecture: HIGH - Two clear implementations identified
- Pitfalls: HIGH - Based on actual code analysis

**Research date:** 2026-01-28
**Valid until:** 2026-02-28 (bugfix, code unlikely to change before fix)
