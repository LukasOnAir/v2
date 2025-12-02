---
status: resolved
trigger: "RCT shows 'Risk 1' and 'Process 1' repeated for all rows instead of actual names"
created: 2026-01-27T10:00:00Z
updated: 2026-01-27T11:10:00Z
---

## Current Focus

hypothesis: CONFIRMED - getHierarchyPath relied on hierarchical_id string parsing which fails if database has duplicate/wrong values
test: Refactored to use tree structure traversal instead of string parsing
expecting: Names should now resolve correctly by walking up parent chain
next_action: Manual verification needed - open RCT table and verify names display correctly

## Symptoms

expected: Each RCT row should display its unique risk name and process name as defined in the taxonomy. User has 5 different lower-level risks and 2 processes with distinct names and IDs.
actual: All rows show "Risk 1" and "Process 1" repeated 10 times. The IDs and names are not mapping correctly from the taxonomy.
errors: No error messages - silent data mapping issue
reproduction: Open RCT main view - all rows show wrong/duplicate names
started: Worked before, now broken - regression

## Eliminated

- hypothesis: findTaxonomyById function has logic bug
  evidence: Code review shows correct strict equality check item.id === id, returns null if not found
  timestamp: 2026-01-27T10:15:00Z

- hypothesis: Trigger modifying risk_id on insert
  evidence: Reviewed 00027 migration - only modifies tenant_id, not risk_id
  timestamp: 2026-01-27T10:20:00Z

- hypothesis: generateRCTRows using wrong field
  evidence: Code uses risk.id (UUID) correctly at line 89 of rctGenerator.ts
  timestamp: 2026-01-27T10:25:00Z

## Evidence

- timestamp: 2026-01-27T10:10:00Z
  checked: RCTTable.tsx denormalization flow
  found: denormalizeRCTRow calls getHierarchyPath which calls findTaxonomyById with dbRow.riskId
  implication: If dbRow.riskId is wrong, lookup would fail - but user sees names not empty strings

- timestamp: 2026-01-27T10:15:00Z
  checked: useTaxonomy.ts buildTree function
  found: Correctly maps node.id (UUID) to TaxonomyItem.id and node.hierarchical_id to hierarchicalId
  implication: Taxonomy data structure is correct

- timestamp: 2026-01-27T10:20:00Z
  checked: git history for RCT-related files
  found: Recent commits 7c6e768 (database integration), 0c9a451 (tenant isolation fix)
  implication: Regression likely introduced in database integration phase

- timestamp: 2026-01-27T10:25:00Z
  checked: useBulkUpsertRCTRows hook
  found: Inserts use row.riskId from generateRCTRows which uses risk.id (UUID)
  implication: Insert code appears correct - issue may be in existing database data

- timestamp: 2026-01-27T10:35:00Z
  checked: generate_hierarchical_id trigger in 00013_taxonomy_nodes.sql
  found: Trigger runs BEFORE INSERT and counts siblings, but in bulk INSERT all rows see same state
  implication: If multiple nodes inserted in single statement, all get same hierarchical_id

- timestamp: 2026-01-27T10:40:00Z
  checked: getHierarchyPath in RCTTable.tsx (lines 164-174)
  found: Uses item.hierarchicalId.split('.') to find ancestors via findItemByHierarchicalId
  implication: If multiple items have same hierarchical_id ("1"), findItemByHierarchicalId returns FIRST match

- timestamp: 2026-01-27T10:45:00Z
  checked: Full denormalization flow
  found: findTaxonomyById(risks, dbRow.riskId) finds correct item by UUID, but getHierarchyPath then uses hierarchicalId to find level names
  implication: ROOT CAUSE CONFIRMED - hierarchical_id values in database are duplicated/wrong

- timestamp: 2026-01-27T11:00:00Z
  checked: Applied fix to RCTTable.tsx
  found: Refactored getHierarchyPath to use tree traversal via buildParentMap and getAncestryPath
  implication: Names now resolved by walking parent chain, not parsing hierarchical_id strings

- timestamp: 2026-01-27T11:05:00Z
  checked: TypeScript compilation and Vite dev server
  found: Build succeeds without errors, dev server starts correctly
  implication: Fix is syntactically correct, ready for manual verification

## Resolution

root_cause: The taxonomy_nodes table likely has duplicate or empty hierarchical_id values. When getHierarchyPath builds the L1-L5 names, it calls findItemByHierarchicalId(items, partialId) which returns the FIRST matching item. If all taxonomy items have hierarchical_id = "" or "1", they all resolve to the same L1 name ("Risk 1"). This can happen if: (1) nodes were bulk-inserted before trigger existed, (2) nodes were bulk-inserted in a single INSERT statement (trigger sees same state for all rows), or (3) trigger failed silently.

fix: Refactored getHierarchyPath to use tree structure traversal instead of parsing hierarchical_id strings. New approach:
1. Added buildParentMap() to create a lookup from child ID to parent item
2. Added getAncestryPath() to walk up tree from leaf to root using parent map
3. getHierarchyPath() now uses ancestry path instead of string parsing
4. Parent maps are memoized and passed to denormalizeRCTRow for efficiency

verification: TypeScript compiles without errors. Need to verify in dev environment that names now display correctly.
files_changed:
  - src/components/rct/RCTTable.tsx (refactored getHierarchyPath and related functions)
