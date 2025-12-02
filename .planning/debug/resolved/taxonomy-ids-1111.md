---
status: resolved
trigger: "Fix taxonomy items view - IDs show '1 1 1 1' for both process and risk taxonomies"
created: 2026-01-27T10:00:00Z
updated: 2026-01-27T10:05:00Z
---

## Current Focus

hypothesis: CONFIRMED - TaxonomyNode.tsx displays node.data.hierarchicalId directly instead of computing positional IDs from react-arborist tree structure
test: N/A - root cause confirmed and fixed
expecting: N/A
next_action: Archive resolved debug session

## Symptoms

expected: Taxonomy items show proper positional hierarchical IDs like "1", "2", "1.1", "1.2", etc.
actual: IDs show "1 1 1 1" for all items in both process and risk taxonomies
errors: None - displays wrong data
reproduction: View taxonomy items in either process or risk taxonomy view
started: Since hierarchical_id field issue

## Eliminated

## Evidence

- timestamp: 2026-01-27T10:01:00Z
  checked: TaxonomyNode.tsx line 167
  found: Component displays `{node.data.hierarchicalId}` directly instead of computing positional ID
  implication: Same issue as RCTTable/MatrixGrid - needs to compute from tree structure

- timestamp: 2026-01-27T10:01:30Z
  checked: react-arborist NodeApi interface
  found: NodeApi has `parent`, `childIndex` (0-based index among siblings), and `level` properties
  implication: Can walk up tree to compute positional ID like "1.2.3" using childIndex + 1

- timestamp: 2026-01-27T10:04:00Z
  checked: TypeScript compilation after fix
  found: npx tsc --noEmit completed with no errors
  implication: Fix is type-safe and compiles correctly

## Resolution

root_cause: TaxonomyNode.tsx displays node.data.hierarchicalId directly instead of computing positional IDs from the react-arborist tree structure. The hierarchicalId field in the database/store is broken (shows "1" for all items).

fix: Added computePositionalId() helper function that walks up the react-arborist node's parent chain, collecting each node's childIndex (0-based) and converting to 1-based positions. The function joins positions with dots to produce IDs like "1", "1.2", "1.2.3". The component now uses useMemo to compute and display the positional ID instead of node.data.hierarchicalId.

verification: TypeScript compiles without errors. Fix applies same pattern as RCTTable.tsx and MatrixGrid.tsx for consistent positional ID computation across the codebase.

files_changed:
  - src/components/taxonomy/TaxonomyNode.tsx
