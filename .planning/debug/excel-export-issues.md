---
status: diagnosed
trigger: "Excel export has two problems: 1. Matrix sheet only shows rows/columns with filled net risk values, not all elements 2. Taxonomy sheets show UUIDs instead of hierarchical IDs"
created: 2026-01-19T10:00:00Z
updated: 2026-01-19T10:05:00Z
symptoms_prefilled: true
goal: find_root_cause_only
---

## Current Focus

hypothesis: CONFIRMED - Two separate bugs found
test: Code analysis complete
expecting: N/A - root cause confirmed
next_action: Report findings

## Symptoms

expected:
  1. Matrix sheet shows ALL elements as rows/columns regardless of net risk values
  2. Taxonomy sheets show hierarchical IDs like "1.2.3"
actual:
  1. Matrix only shows rows/columns with filled net risk values
  2. Taxonomy shows UUIDs like "69534640-ce54-452c-b5a6-9599815802d2"
errors: None (functional bug, not error)
reproduction: Export to Excel and examine matrix + taxonomy sheets
started: Unknown - user reported

## Eliminated

## Evidence

- timestamp: 2026-01-19T10:02:00Z
  checked: excelExport.ts lines 229-231 - matrix building logic
  found: |
    Matrix rows/columns are derived from rctRows, not taxonomies:
    ```typescript
    const riskL1s = [...new Set(rctRows.map(r => r.riskL1Name))].filter(Boolean)
    const processL1s = [...new Set(rctRows.map(r => r.processL1Name))].filter(Boolean)
    ```
    This only extracts L1 names that EXIST in RCT data. If a Risk L1 or Process L1
    has no RCT entries, it won't appear in the matrix at all.
  implication: Matrix should derive L1 lists from the taxonomy arrays (risks, processes) not rctRows

- timestamp: 2026-01-19T10:03:00Z
  checked: excelExport.ts lines 62-92 - flattenTaxonomy function
  found: |
    Function uses item.id (UUID) for the ID column:
    ```typescript
    result.push({
      id: item.id,  // <-- This is the UUID
      name: item.name,
      ...
    })
    ```
  implication: Should use item.hierarchicalId instead of item.id

- timestamp: 2026-01-19T10:04:00Z
  checked: types/taxonomy.ts - TaxonomyItem interface
  found: |
    TaxonomyItem has TWO id fields:
    - id: string (UUID for internal reference)
    - hierarchicalId: string (Display ID like "1.2.3")
  implication: Confirms flattenTaxonomy uses wrong field

## Resolution

root_cause: |
  ISSUE 1 (Matrix incomplete): Lines 230-231 derive matrix rows/columns from rctRows
  using Set extraction. This means only L1 categories that have at least one RCT entry
  appear in the matrix. The function receives the full taxonomy arrays (risks, processes)
  but ignores them for matrix building.

  ISSUE 2 (UUIDs in taxonomy): Lines 79 and 87 in flattenTaxonomy use item.id (UUID)
  instead of item.hierarchicalId for both the id field and parentId field.

fix: |
  ISSUE 1 FIX (lines 229-231):
  Replace:
    const riskL1s = [...new Set(rctRows.map(r => r.riskL1Name))].filter(Boolean)
    const processL1s = [...new Set(rctRows.map(r => r.processL1Name))].filter(Boolean)
  With:
    const riskL1s = risks.map(r => r.name)
    const processL1s = processes.map(p => p.name)
  This uses the taxonomy L1 items directly (top-level items passed to the function).

  ISSUE 2 FIX (lines 79 and 87):
  Change:
    id: item.id,
    parentId,
  To:
    id: item.hierarchicalId,
    parentId: parentHierarchicalId,
  And update the recursive call to pass parent's hierarchicalId.

verification:
files_changed: []
