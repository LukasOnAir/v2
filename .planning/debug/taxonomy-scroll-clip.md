---
status: diagnosed
trigger: "When taxonomy tree has many items and scrollbar appears: 1. Last item description clipped 2. Scrollbar white doesn't fit dark theme"
created: 2026-01-19T00:00:00Z
updated: 2026-01-19T00:00:00Z
symptoms_prefilled: true
goal: find_root_cause_only
---

## Current Focus

hypothesis: investigating scroll container and styling
test: read relevant files to understand layout
expecting: find overflow/height issue and missing scrollbar styles
next_action: read TaxonomyTree.tsx, TaxonomyPage.tsx, and CSS files

## Symptoms

expected: Last item fully visible with description; scrollbar styled for dark theme
actual: Last item description clipped; scrollbar is white (default browser style)
errors: none (visual issue)
reproduction: Open taxonomy page with many items so scrollbar appears
started: unknown

## Eliminated

## Evidence

- timestamp: 2026-01-19T00:01:00Z
  checked: TaxonomyTree.tsx - Tree component configuration
  found: rowHeight=72 (fixed), Tree uses react-arborist which virtualizes rows
  implication: react-arborist uses virtualization - content outside viewport not rendered

- timestamp: 2026-01-19T00:02:00Z
  checked: TaxonomyNode.tsx - node layout
  found: Descriptions can wrap with whitespace-pre-wrap, but row height is FIXED at 72px
  implication: Multi-line descriptions may exceed rowHeight causing clipping

- timestamp: 2026-01-19T00:03:00Z
  checked: TaxonomyPage.tsx - container styling
  found: Line 86: overflow-hidden on container, Tree inside div with p-4 padding
  implication: Padding adds 16px top+bottom, but content doesn't account for this - last item may clip against bottom

- timestamp: 2026-01-19T00:04:00Z
  checked: src/index.css - scrollbar styling
  found: NO scrollbar styles defined. Only base theme colors and custom properties
  implication: Browser default scrollbar (white/light) used instead of dark theme

## Resolution

root_cause: |
  TWO ISSUES:
  1. CLIPPING: The tree container has p-4 (padding: 16px) but react-arborist calculates scroll
     area based only on height prop. The bottom padding causes last row to be clipped because
     the virtualized list doesn't account for container padding. React-arborist renders items
     within a fixed height area, and the p-4 padding on the wrapper div pushes content down
     but the scroll container inside doesn't extend to show the last item fully.

  2. SCROLLBAR: src/index.css has no scrollbar styling. Browser defaults to light/white scrollbar
     which doesn't fit the dark theme. Need to add custom scrollbar styles using webkit and
     standard CSS properties.

fix: |
  1. For clipping: Add pb-4 to tree container OR adjust height calculation to account for padding
     OR use a different approach - add overflow-y-auto on the tree wrapper with custom scrollbar

  2. For scrollbar: Add dark scrollbar styles to src/index.css:
     - ::-webkit-scrollbar for width
     - ::-webkit-scrollbar-track for dark background
     - ::-webkit-scrollbar-thumb for lighter thumb
     - scrollbar-color for Firefox

verification:
files_changed: []
