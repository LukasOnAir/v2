---
status: resolved
trigger: "Fix RCT hierarchical ID display - should be computed positional IDs like 1, 1.1, 1.2.3"
created: 2026-01-27T12:00:00Z
updated: 2026-01-27T12:05:00Z
---

## Current Focus

hypothesis: CONFIRMED - Line 221 uses levelItem.id (UUID) instead of computing positional ID
test: Read RCTTable.tsx getHierarchyPath function
expecting: Find where UUID is used instead of positional ID
next_action: Add computePositionalId function and update getHierarchyPath to use it

## Evidence

- timestamp: 2026-01-27T12:01:00Z
  checked: getHierarchyPath function (lines 188-226)
  found: Line 221 sets level ID to levelItem.id (UUID). Comment on line 220 says "Use item.id (UUID) directly since hierarchicalId may have incorrect values in database"
  implication: Confirms root cause - need to compute positional ID from tree structure instead of using UUID

## Symptoms

expected: IDs should display as positional hierarchical format (1, 1.1, 1.2.3, etc.)
actual: IDs showing UUIDs instead of positional format
errors: none (visual display issue)
reproduction: View any RCT table - ID column shows wrong format
started: After previous fix incorrectly changed to use UUID

## Eliminated

## Evidence

## Resolution

root_cause: Line 248-249 (old) in getHierarchyPath used levelItem.id (UUID) instead of computing positional hierarchical ID from tree structure. Comment explained database hierarchicalId was broken so UUID was used as workaround, but this produced wrong display format.

fix: Added computePositionalId() function that walks ancestry path and computes 1-based position of each item among its siblings, then joins with dots. Updated getHierarchyPath to call computePositionalId for each level instead of using UUID.

verification: TypeScript compiles without errors. Logic verified: for L1 item at position 2 -> "2", for L3 item under 1st L1, 3rd L2 -> "1.3.x"

files_changed:
- src/components/rct/RCTTable.tsx: Added computePositionalId function (lines 165-191), updated getHierarchyPath loop (lines 243-254) to use computed positional IDs
