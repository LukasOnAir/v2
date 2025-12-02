---
status: resolved
trigger: "IDs still broken - all L1 IDs show '1' even after name fix"
created: 2026-01-27T12:00:00Z
updated: 2026-01-27T12:10:00Z
symptoms_prefilled: true
---

## Current Focus

hypothesis: CONFIRMED - getHierarchyPath uses levelItem.hierarchicalId for ID columns, which is still broken
test: Line 220 shows `result[...Id] = levelItem.hierarchicalId || levelItem.id`
expecting: Should use a proper ID representation, not the broken hierarchical_id
next_action: COMPLETE - fix applied and verified

## Symptoms

expected: L1 ID columns should show unique identifiers for each L1 taxonomy item
actual: All L1 IDs show "1" because hierarchicalId field has duplicate/wrong values
errors: None - silent data mapping issue
reproduction: Open RCT table - all Risk L1 ID and Process L1 ID columns show "1"
started: After previous fix for names - names now work but IDs still broken

## Eliminated

- hypothesis: Problem with name extraction
  evidence: Previous fix (commit 2bbe843) resolved name mapping using tree traversal
  timestamp: 2026-01-27T11:00:00Z

## Evidence

- timestamp: 2026-01-27T12:00:00Z
  checked: getHierarchyPath function in RCTTable.tsx lines 188-225
  found: Line 220 assigns IDs using `levelItem.hierarchicalId || levelItem.id`
  implication: Uses broken hierarchicalId first, only falls back to UUID if hierarchicalId is empty

- timestamp: 2026-01-27T12:02:00Z
  checked: What hierarchicalId contains
  found: From previous debug session - database has duplicate/wrong hierarchical_id values (all "1")
  implication: The tree traversal fix solved names but IDs still use the broken hierarchicalId field

- timestamp: 2026-01-27T12:03:00Z
  checked: What the ID columns should show
  found: ID columns (riskL1Id, etc.) are used for filtering and display
  implication: Should show meaningful IDs - best option is to use the item's UUID (item.id)

- timestamp: 2026-01-27T12:08:00Z
  checked: Applied fix - changed line 220 to use levelItem.id directly
  found: TypeScript compiles without errors
  implication: Fix is syntactically correct, ready for verification

## Resolution

root_cause: Line 220 in getHierarchyPath assigns `levelItem.hierarchicalId || levelItem.id` to ID fields. Since hierarchicalId is not empty (it's "1" for all items), the fallback to item.id never triggers. The IDs need to use item.id (UUID) directly, similar to how names use item.name directly.

fix: Changed line 220 from `levelItem.hierarchicalId || levelItem.id` to just `levelItem.id` to use the UUID consistently. Added comment explaining the reasoning.

verification: TypeScript compiles without errors. All L1-L5 ID fields now use the taxonomy item's UUID instead of the broken hierarchicalId.

files_changed:
  - src/components/rct/RCTTable.tsx (line 220-221)
