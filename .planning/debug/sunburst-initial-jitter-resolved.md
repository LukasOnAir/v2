---
status: verifying
trigger: "Sunburst chart jitters/shakes when opened for the first time, but stabilizes after window resize"
created: 2026-01-28T10:00:00Z
updated: 2026-01-28T10:00:00Z
---

## Current Focus

hypothesis: CONFIRMED - Animation starts with default 600x600, ResizeObserver fires and changes dimensions mid-animation, causing geometry recalc and visual jitter
test: Manual verification - open sunburst page and observe animation
expecting: Smooth animation without jitter on first open
next_action: User to verify fix by opening sunburst page multiple times

## Symptoms

expected: Animated entry - chart should animate in with a controlled transition
actual: Chart jitters and shakes on first open, stops jittering after window resize
errors: No console errors
reproduction: Every time - 100% reproducible on first open
started: Recently broke - used to work correctly

## Eliminated

## Evidence

- timestamp: 2026-01-28T10:05:00Z
  checked: SunburstPage.tsx and SunburstChart.tsx
  found: |
    1. SunburstPage uses ResizeObserver to track container size
    2. Initial baseDimensions state is {width: 600, height: 600}
    3. ResizeObserver fires AFTER mount, updating dimensions
    4. SunburstChart receives width/height as props with defaults of 600
    5. SunburstChart animation (openingAnimationProgress) starts when partitionedRoot becomes available
    6. The animation uses requestAnimationFrame for 800ms duration
    7. Scale transform in line 527: `scale(${0.3 + 0.7 * openingAnimationProgress})`
  implication: |
    Race condition: Animation starts immediately when data is available, but container
    dimensions may change mid-animation as ResizeObserver reports actual size.
    The chart could be animating with width=600 then suddenly jump to real dimensions.

- timestamp: 2026-01-28T10:08:00Z
  checked: partitionedRoot useMemo dependency on radius (line 102-109)
  found: |
    CRITICAL: partitionedRoot depends on [hierarchyRoot, radius]
    And radius = Math.min(width, height) / 2 (line 87)

    When dimensions change:
    1. width/height props change (from ResizeObserver)
    2. radius recalculates
    3. partitionedRoot recalculates (new object reference)
    4. BUT useEffect at line 112 checks hasAnimatedRef.current which is already true
    5. So animation doesn't restart, but ALL the arc positions are recalculated

    The animation progress (openingAnimationProgress) stays the same, but the
    arcGenerator at line 157-164 also depends on radius!
  implication: |
    The jitter is caused by: mid-animation dimension change causes ALL geometry
    to recalculate (partitionedRoot, arcGenerator, visibleNodes) while animation
    progress stays constant. This creates a visual "jump" in the chart.

## Resolution

root_cause: |
  Race condition between ResizeObserver and animation start.

  Timeline of bug:
  1. SunburstPage mounts with default baseDimensions {width: 600, height: 600}
  2. SunburstChart receives width=600, height=600
  3. partitionedRoot computes with radius=300
  4. Animation starts (hasAnimatedRef.current = true)
  5. ResizeObserver callback fires with ACTUAL container size (e.g., 500x500)
  6. baseDimensions updates, SunburstChart re-renders with new dimensions
  7. radius recalculates (now 250), all geometry recalculates
  8. Animation is still running but now with different base geometry
  9. Visual jitter as chart "jumps" to new geometry mid-animation

  Why resize fixes it: After resize, dimensions are stable. Animation has already
  completed (hasAnimatedRef.current=true prevents restart), so subsequent renders
  are smooth because no animation is running while geometry changes.

fix: |
  Added dimensionsReady state to track when ResizeObserver has first provided real dimensions.
  Animation now waits for both partitionedRoot AND dimensionsReady before starting.

  Changes:
  1. SunburstPage.tsx: Added dimensionsReady state, set to true in ResizeObserver callback
  2. SunburstPage.tsx: Pass dimensionsReady prop to SunburstChart
  3. SunburstChart.tsx: Added dimensionsReady prop to interface (default true for backward compat)
  4. SunburstChart.tsx: Animation useEffect now checks dimensionsReady before starting

verification: TypeScript compiles without errors. Manual testing required.
files_changed:
  - src/pages/SunburstPage.tsx
  - src/components/sunburst/SunburstChart.tsx
