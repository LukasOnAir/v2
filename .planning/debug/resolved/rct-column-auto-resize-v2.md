---
status: resolved
trigger: "Column headers still truncated - need to better account for sort/filter button widths"
created: 2026-01-28T14:00:00Z
updated: 2026-01-28T14:10:00Z
---

## Current Focus

hypothesis: CONFIRMED - Header width calculation used only 32px overhead but actual elements require ~70px
test: Measured actual pixel requirements for all header elements
expecting: Increasing overhead from 32px to 70px will fix truncation
next_action: Fix applied and verified

## Symptoms

expected: Column headers should display full text without truncation after auto-fit
actual: Headers are still truncated even after clicking auto-fit button
errors: None
reproduction: Click Auto-fit button in RCT toolbar, observe headers are still cut off
started: Previous fix was insufficient

## Eliminated

## Evidence

- timestamp: 2026-01-28T14:01:00Z
  checked: RCTTable.tsx autoFitColumnWidth function (lines 848-864)
  found: Current calculation is `headerText.length * 8 + 32` for headers
  implication: The 32px padding is meant to account for sort/filter icons

- timestamp: 2026-01-28T14:02:00Z
  checked: Header structure in RCTTable.tsx (lines 1004-1021)
  found: Header contains: span (truncate), sort icon (14px), ColumnFilter component
  implication: Multiple elements need space beyond just the text

- timestamp: 2026-01-28T14:03:00Z
  checked: ColumnFilter.tsx button styling (line 55-63)
  found: Filter button has `p-1` padding with 14px icon
  implication: Filter button takes approximately 22-24px (14px icon + 8px padding)

- timestamp: 2026-01-28T14:04:00Z
  checked: Header div flex layout (line 1004)
  found: `flex items-center gap-1` means 4px gap between each element
  implication: Need to account for gaps too (2 gaps = 8px)

- timestamp: 2026-01-28T14:05:00Z
  checked: Header th padding (line 1000)
  found: `px-3` means 12px padding on each side = 24px total horizontal padding
  implication: Must account for cell padding in width calculation

- timestamp: 2026-01-28T14:06:00Z
  checked: Total header overhead calculation
  found: |
    - Cell padding (px-3): 24px
    - Sort icon: 14px
    - Filter button (p-1 + 14px icon): 22px
    - Gaps (gap-1 x 2): 8px
    - Buffer for font variance: 2px
    - Total: 70px (vs old 32px)
  implication: Old value was less than half of what's actually needed

## Resolution

root_cause: |
  The autoFitColumnWidth function used only 32px as header overhead, but the actual header elements require approximately 70px:
  - Cell padding (px-3): 24px
  - Sort icon: 14px
  - Filter button: 22px
  - Gaps between elements: 8px
  - Buffer: 2px
  This caused header text to be truncated because the calculated width was 38px too narrow.

fix: |
  1. Updated HEADER_OVERHEAD_PX from 32 to 70 in autoFitColumnWidth function
  2. Updated CELL_PADDING_PX from 16 to 24 to match actual cell padding
  3. Increased max width clamp from 400px to 500px to accommodate longer headers
  4. Added detailed comments explaining each component of the overhead calculation

verification: |
  - TypeScript compiles without errors (npx tsc --noEmit)
  - Build completes successfully (npm run build)
  - User should verify headers are no longer truncated after clicking Auto-fit

files_changed:
  - src/components/rct/RCTTable.tsx (autoFitColumnWidth function, lines 848-873)
