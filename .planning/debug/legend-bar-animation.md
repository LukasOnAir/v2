---
status: diagnosed
trigger: "Diagnose how to add legend bar reveal animation - top-to-bottom progress bar slide down"
created: 2026-01-27T10:00:00Z
updated: 2026-01-27T10:00:00Z
---

## Current Focus

hypothesis: Legend currently renders statically without animation coordination
test: Analyzed SunburstLegend.tsx, SunburstChart.tsx, and sunburstStore.ts
expecting: Find how legend renders and how to coordinate with animationComplete
next_action: Return structured diagnosis

## Symptoms

expected: Legend gradient bar animates top-to-bottom like progress bar sliding down, after sunburst opens
actual: Legend renders statically without any animation
errors: N/A (feature addition, not bug)
reproduction: Load sunburst page, observe legend appears instantly without animation
started: Always been this way (enhancement request)

## Evidence

- timestamp: 2026-01-27T10:00:00Z
  checked: SunburstLegend.tsx rendering
  found: |
    - Legend renders a gradient div (lines 112-116, vertical mode)
    - No animation, no use of motion/react or animationComplete
    - Gradient bar is a simple div with className "w-5 h-24" (or h-20 compact)
    - Background gradient applied via inline style
  implication: Need to add animation wrapper around gradient bar div

- timestamp: 2026-01-27T10:00:00Z
  checked: SunburstChart.tsx animation coordination
  found: |
    - animationComplete state from store (line 58-59)
    - setAnimationComplete(true) called when opening animation ends (line 130)
    - motion/react already imported and used (line 6)
    - Center circle and text use motion.* with animationComplete-based animate props
    - Example pattern at lines 512-524:
      initial={{ scale: 0.8, opacity: 0 }}
      animate={{ scale: animationComplete ? 1 : 0.8, opacity: animationComplete ? 1 : 0 }}
  implication: Pattern exists - legend can subscribe to animationComplete from store

- timestamp: 2026-01-27T10:00:00Z
  checked: sunburstStore.ts animation state
  found: |
    - animationComplete: boolean (line 39)
    - setAnimationComplete action (line 55)
    - State is transient (not persisted) - resets to false on page reload
  implication: Legend can import useSunburstStore and read animationComplete

- timestamp: 2026-01-27T10:00:00Z
  checked: SunburstPage.tsx legend usage
  found: |
    - Legend rendered inside SunburstChart container (line 36)
    - Uses compact mode
    - Already imports useSunburstStore (line 8)
  implication: Page already has store access, can pass animationComplete as prop or legend can read directly

## Resolution

root_cause: |
  SunburstLegend component has no animation implementation. It renders the gradient bar
  as a static div without any coordination with the sunburst opening animation sequence.

  The animationComplete state exists in sunburstStore and is already used by SunburstChart
  for center circle/text reveals, but SunburstLegend does not consume this state.

fix: |
  To implement top-to-bottom reveal animation on the gradient bar:

  1. Import motion from 'motion/react' in SunburstLegend.tsx
  2. Import useSunburstStore to access animationComplete state
  3. Wrap gradient bar div in a container with overflow-hidden
  4. Use motion.div for the gradient bar with clipPath or height animation

  Approach A (clipPath - cleaner):
  ```tsx
  <motion.div
    className="w-5 h-24 rounded"
    style={{ background: gradient }}
    initial={{ clipPath: 'inset(100% 0 0 0)' }}
    animate={{
      clipPath: animationComplete ? 'inset(0% 0 0 0)' : 'inset(100% 0 0 0)'
    }}
    transition={{ duration: 0.5, delay: 0.3, ease: 'easeOut' }}
  />
  ```

  Approach B (scaleY with transform-origin top):
  ```tsx
  <motion.div
    className="w-5 h-24 rounded origin-top"
    style={{ background: gradient }}
    initial={{ scaleY: 0 }}
    animate={{ scaleY: animationComplete ? 1 : 0 }}
    transition={{ duration: 0.5, delay: 0.3, ease: 'easeOut' }}
  />
  ```

  Note: clipPath approach (A) creates true top-to-bottom reveal.
  scaleY approach (B) creates expanding effect from top.

verification: N/A (diagnosis only)
files_changed: []
