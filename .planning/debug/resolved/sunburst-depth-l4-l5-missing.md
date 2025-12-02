---
status: resolved
trigger: "In demo tenant, risks are defined up to level 5, but sunburst only shows up to level 3. When L4/L5 levels are checked in visibility options, they don't appear in the chart."
created: 2026-01-28T10:00:00Z
updated: 2026-01-28T10:15:00Z
---

## Current Focus

hypothesis: CONFIRMED - Hardcoded depth limit in isNodeVisible function (line 201: `if (node.depth > 3) return false`)
test: Found the exact line causing the issue
expecting: Removing/adjusting this limit should allow L4/L5 to render
next_action: Fix isNodeVisible to respect visibleLevels instead of hardcoding depth > 3

## Symptoms

expected: When L4/L5 levels are checked in visibility options, they should display in the sunburst chart
actual: Only levels up to L3 are shown in the sunburst, L4/L5 are missing even when selected
errors: None reported
reproduction: View risk sunburst chart in demo tenant
started: Unknown if it ever worked correctly

## Eliminated

## Evidence

- timestamp: 2026-01-28T10:05:00Z
  checked: SunburstChart.tsx isNodeVisible function
  found: Lines 199-201 have hardcoded `if (node.depth > 3) return false` in root view
  implication: This prevents L4/L5 nodes from ever being visible, even when checked in visibleLevels

- timestamp: 2026-01-28T10:05:00Z
  checked: maxVisibleDepth calculation (lines 92-99)
  found: Correctly calculates max visible depth from visibleLevels (l1-l5)
  implication: The visibility toggles properly track up to 5 levels, but isNodeVisible ignores this

- timestamp: 2026-01-28T10:05:00Z
  checked: Zoom visibility logic (lines 186-197)
  found: When zoomed, shows nodes within 3 levels of center (`relativeDepth > 3` check)
  implication: Zoom also has 3-level limit, but relative to center - this is likely intentional for readability

## Resolution

root_cause: Line 191 `if (relativeDepth < 1 || relativeDepth > 3) return false` limits display to 3 levels relative to center. When at root (depth 0), L4 has relativeDepth=4, which fails the >3 check. The else branch at 199-201 is dead code since centerNode is always truthy.
fix: Change the relativeDepth > 3 check to use maxVisibleDepth parameter
verification: TypeScript compiles without errors. Fix changes hardcoded depth limit (3) to use maxVisibleDepth which is calculated from user's visibleLevels settings. When L4/L5 are checked, maxVisibleDepth will be 4 or 5, allowing those levels to display.
files_changed: [src/components/sunburst/SunburstChart.tsx]
