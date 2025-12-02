---
status: diagnosed
trigger: "Diagnose root cause of opening animation style mismatch - fan-style animation where sunburst starts small and grows larger while opening up"
created: 2026-01-27T10:00:00Z
updated: 2026-01-27T10:05:00Z
symptoms_prefilled: true
goal: find_root_cause_only
---

## Current Focus

hypothesis: CONFIRMED - Animation only interpolates arc radii, does not scale/transform the entire chart container
test: Read SunburstChart.tsx animation implementation
expecting: Find radius-only animation without container scale transform
next_action: Return diagnosis

## Symptoms

expected: Entire sunburst starts small (scaled down) and grows larger while fanning open - like a hand fan opening
actual: Arcs expand from innerRadius outward over 800ms
errors: N/A (behavior mismatch, not error)
reproduction: Open sunburst chart, observe animation
started: Current implementation

## Eliminated

## Evidence

- timestamp: 2026-01-27T10:02:00Z
  checked: SunburstChart.tsx lines 81-141 (animation state and effect)
  found: |
    Animation uses requestAnimationFrame with 800ms duration.
    Progress state (openingAnimationProgress) is tracked from 0 to 1.
    Uses easeOutCubic easing: `1 - Math.pow(1 - progress, 3)`
  implication: Animation framework is solid, but what it animates is the issue

- timestamp: 2026-01-27T10:03:00Z
  checked: SunburstChart.tsx lines 554-565 (arc rendering with animation)
  found: |
    ```javascript
    // Interpolate y0/y1 from innerRadius to final values during opening animation
    const animatedY0 = innerRadius + (arcData.y0 - innerRadius) * openingAnimationProgress
    const animatedY1 = innerRadius + (arcData.y1 - innerRadius) * openingAnimationProgress
    ```
    Arcs animate only their radii (y0/y1) from innerRadius outward.
    No scale transform applied to the containing <g> group.
  implication: This is the root cause - arcs expand outward but chart doesn't scale up

- timestamp: 2026-01-27T10:04:00Z
  checked: SunburstChart.tsx lines 510-524 (center circle animation)
  found: |
    Center circle uses motion/react for scale animation:
    ```javascript
    initial={{ scale: 0.8, opacity: 0 }}
    animate={{ scale: animationComplete ? 1 : 0.8, opacity: animationComplete ? 1 : 0 }}
    ```
    But this is ONLY for the center circle, not the entire chart.
  implication: Scale animation exists but is isolated to center, not coordinated with arcs

- timestamp: 2026-01-27T10:04:30Z
  checked: SVG structure (lines 503-596)
  found: |
    Container group at line 510: `<g transform="translate(${width / 2},${height / 2})">`
    This group has NO scale transform during animation.
    Arc paths are rendered as children of this static group.
  implication: No mechanism exists to scale the entire sunburst as a unit

## Resolution

root_cause: |
  Animation design mismatch - current implementation animates arc RADII (y0/y1)
  individually while keeping the chart container at fixed scale. This creates an
  "expanding rings" effect rather than a "fan opening" effect.

  The fan-style animation requires:
  1. Entire chart starting at small scale (e.g., scale: 0.3)
  2. Chart scaling UP while arcs expand OUT simultaneously
  3. Coordinated timing between scale and radius animations

  Current implementation only does #2 (arcs expand) without #1 and #3.

fix:
verification:
files_changed: []
