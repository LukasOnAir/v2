---
status: resolved
trigger: "Fix risk-process matrix - IDs show '1' everywhere, risk names not visible"
created: 2026-01-27T10:00:00Z
updated: 2026-01-27T10:10:00Z
---

## Current Focus

hypothesis: CONFIRMED - MatrixGrid uses broken hierarchical_id field directly, needs computePositionalId approach
test: Apply RCTTable fix pattern (buildParentMap, getAncestryPath, computePositionalId)
expecting: IDs will show proper positional values and names will display
next_action: Apply fix to MatrixGrid.tsx

## Symptoms

expected: Matrix shows hierarchical IDs like "1", "1.2", "1.2.3" and risk/process names
actual: IDs only show "1" everywhere, risk names not visible
errors: None reported
reproduction: View risk-process matrix component
started: Unknown - likely after data model changes

## Eliminated

## Evidence

- timestamp: 2026-01-27T10:01:00Z
  checked: MatrixGrid.tsx lines 270-278 and 295-299
  found: Component uses `risk.hierarchicalId` and `process.hierarchicalId` directly in display
  implication: Same bug as RCTTable - hierarchical_id field in DB is broken, needs computed positional ID

- timestamp: 2026-01-27T10:02:00Z
  checked: MatrixGrid.tsx column headers (line 278) vs row headers (line 298)
  found: Column headers show only `{risk.hierarchicalId}`, row headers show `{process.hierarchicalId}: {process.name}`
  implication: Risk side missing name display entirely (only ID shown), process side has name but ID is broken

- timestamp: 2026-01-27T10:03:00Z
  checked: RCTTable.tsx fix pattern (lines 145-257)
  found: Uses buildParentMap, getAncestryPath, computePositionalId for tree-based positional IDs
  implication: Same functions can be used in MatrixGrid to compute correct IDs

## Resolution

root_cause: MatrixGrid directly uses item.hierarchicalId field (which contains broken "1" values) instead of computing positional IDs from tree structure. Risk column headers also don't display names.
fix: Added buildParentMap, getAncestryPath, computePositionalId functions (same pattern as RCTTable fix). Created memoized positional ID maps for risks and processes. Updated column headers to show "{positionalId}: {name}" for both risks and processes.
verification: TypeScript compiles successfully with npx tsc --noEmit
files_changed:
  - src/components/matrix/MatrixGrid.tsx
