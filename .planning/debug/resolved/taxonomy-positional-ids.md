---
status: resolved
trigger: "Fix taxonomy positional IDs - L1 shows '0.1', '0.2' instead of '1', '2'"
created: 2026-01-27T11:00:00Z
updated: 2026-01-27T11:02:00Z
---

## Current Focus

hypothesis: CONFIRMED - computePositionalId was iterating one level too far, including the tree's virtual root
test: Changed while condition from `while (current)` to `while (current && current.parent)`
expecting: Root items show "1", "2", "3" and children show "1.1", "1.2", etc.
next_action: Archive session - fix verified

## Symptoms

expected: L1 root items show "1", "2", "3"; L2 children show "1.1", "1.2", "2.1"
actual: L1 root items show "0.1", "0.2", "0.3" instead of "1", "2", "3"
errors: None (visual bug)
reproduction: View taxonomy tree, observe root level positional IDs
started: Just added computePositionalId function

## Eliminated

(none yet)

## Evidence

- timestamp: 2026-01-27T11:01:00Z
  checked: computePositionalId function in TaxonomyNode.tsx (lines 15-27)
  found: |
    The while loop condition is `while (current)` and it walks up via `current = current.parent`.
    For root-level nodes in react-arborist, node.parent is NOT null - it's the tree's virtual root node.
    The virtual root has childIndex of -1, so `childIndex + 1 = 0` gets prepended.
    The loop stops when current.parent is null (only true for the virtual root itself).
  implication: The loop includes one extra iteration for the tree's virtual root, adding "0." prefix

## Resolution

root_cause: The while loop condition `while (current)` continued iterating until current was null. In react-arborist, root-level nodes have a parent that is the tree's virtual root (with childIndex = -1). The loop included this virtual root, adding `(-1 + 1) = 0` to the positions array, resulting in "0.1", "0.2", etc.

fix: Changed the while condition from `while (current)` to `while (current && current.parent)`. This stops the loop when we reach the tree's virtual root (whose parent is null), ensuring only real nodes contribute to the positional ID.

verification: TypeScript compiles without errors. The logic is correct - for a root-level node with childIndex=0, the loop runs once (adding "1"), then current.parent is the virtual root which has parent=null, so the loop exits. Result: "1" instead of "0.1".

files_changed:
- src/components/taxonomy/TaxonomyNode.tsx
