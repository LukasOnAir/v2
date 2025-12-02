---
status: diagnosed
trigger: "Diagnose why the last item in the taxonomy tree is STILL being clipped even after we changed p-4 to pt-4 px-4"
created: 2026-01-19T10:00:00Z
updated: 2026-01-19T10:06:00Z
symptoms_prefilled: true
goal: find_root_cause_only
---

## Current Focus

hypothesis: CONFIRMED - CSS padding on wrapper div conflicts with react-arborist's internal scroll container
test: Analyzed container structure and react-arborist props
expecting: Found exact mechanism causing clipping
next_action: Return diagnosis

## Symptoms

expected: Full visibility of all tree items including the last one when scrolling to bottom
actual: Last item is clipped/cut off when scrollbar is visible with many items
errors: None
reproduction: Add multiple items to taxonomy tree until scrollbar appears, scroll to bottom
started: Persists after changing p-4 to pt-4 px-4

## Eliminated

## Evidence

- timestamp: 2026-01-19T10:01:00Z
  checked: TaxonomyPage.tsx line 60, height calculation
  found: treeHeight = window.innerHeight - 280, this is passed to TaxonomyTree
  implication: Fixed pixel calculation, doesn't account for dynamic padding

- timestamp: 2026-01-19T10:02:00Z
  checked: TaxonomyPage.tsx line 88
  found: Tree container div has class "pt-4 px-4" - this adds 16px top padding but NO bottom padding
  implication: Previous fix was correct to remove bottom padding

- timestamp: 2026-01-19T10:03:00Z
  checked: TaxonomyTree.tsx line 250
  found: Tree component receives height prop and uses it directly
  implication: The height passed is the FULL height the tree will try to render

- timestamp: 2026-01-19T10:04:00Z
  checked: react-arborist documentation
  found: Tree component has paddingTop and paddingBottom props that add padding INSIDE the virtualized scroll container
  implication: The pt-4 CSS class in TaxonomyPage adds padding OUTSIDE the tree, but the tree's internal scrolling doesn't know about it

- timestamp: 2026-01-19T10:05:00Z
  checked: TaxonomyTree.tsx Tree component props
  found: No paddingTop or paddingBottom props are set on the Tree component
  implication: The internal scroll container has no padding awareness

## Resolution

root_cause: The tree is placed in a container with pt-4 (16px top padding) but the tree's height calculation doesn't account for this. The container has overflow-hidden, so when the tree renders at full calculated height, the bottom 16px gets clipped. The previous fix removed bottom padding but didn't address the core issue: react-arborist uses its own virtualized scroll container, so padding must be applied INSIDE the tree via paddingTop/paddingBottom props, not on wrapper elements.

fix: Two options:
  OPTION A (Recommended): Remove pt-4 from wrapper div, use react-arborist's paddingTop prop instead
  OPTION B: Subtract 16 from treeHeight calculation to account for the CSS padding

  Specific change for Option A:
  1. In TaxonomyPage.tsx line 88: change 'pt-4 px-4' to 'px-4'
  2. In TaxonomyTree.tsx: add paddingTop={16} prop to Tree component

verification:
files_changed: []
