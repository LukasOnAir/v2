---
status: investigating
trigger: "Investigate React hooks error on Sunburst page - rendered more hooks than during the previous render"
created: 2026-01-27T10:00:00Z
updated: 2026-01-27T10:30:00Z
symptoms_prefilled: true
goal: find_root_cause_only
---

## Current Focus

hypothesis: The error may be caused by React StrictMode double-rendering OR a race condition in data loading rather than actual hook violation in sunburst files
test: Need to reproduce the error and check browser console for exact component stack trace
expecting: Identify which component has the mismatched hook count
next_action: User needs to reproduce the error and provide full stack trace

## Symptoms

expected: Sunburst page renders normally
actual: "rendered more hooks than during the previous render" error
errors: React hooks error - hooks count mismatch between renders
reproduction: Navigate to Sunburst page
started: After Phase 27 changes

## Eliminated

- hypothesis: SunburstPage.tsx has conditional hooks
  evidence: All hooks (useRef x2, useState, useSunburstStore, useSunburstData, useEffect) called unconditionally at top level before any JSX
  timestamp: 2026-01-27T10:00:00Z

- hypothesis: SunburstChart.tsx has conditional hooks
  evidence: All 20+ hooks called at top of forwardRef component (lines 39-84). Early return at line 495 is AFTER all hooks. useMemo/useCallback calls are all at top level.
  timestamp: 2026-01-27T10:05:00Z

- hypothesis: SunburstLegend.tsx has early return before hooks
  evidence: useSunburstStore hook at line 48 is called BEFORE early return at lines 54-59. Hook is always called regardless of which branch is taken.
  timestamp: 2026-01-27T10:10:00Z

- hypothesis: useSunburstData.ts has conditional hooks
  evidence: All 11 hooks (useIsDemoMode, useSunburstStore, useTaxonomyStore, useRCTStore, useControlsStore x2, useTaxonomy x2, useRCTRows, useControls, useControlLinks, useMemo x2) called unconditionally at top level
  timestamp: 2026-01-27T10:15:00Z

- hypothesis: SunburstControls.tsx has conditional hooks
  evidence: Both hooks (useSunburstStore, useState) called at top level (lines 17-32)
  timestamp: 2026-01-27T10:20:00Z

- hypothesis: SunburstTooltip.tsx has conditional hooks
  evidence: Both hooks (useState line 40, useEffect line 43) called BEFORE early return at line 70
  timestamp: 2026-01-27T10:25:00Z

- hypothesis: SunburstBreadcrumb.tsx has conditional hooks
  evidence: Component has NO hooks - only receives props and renders JSX
  timestamp: 2026-01-27T10:26:00Z

## Evidence

- timestamp: 2026-01-27T10:00:00Z
  checked: SunburstPage.tsx hook ordering
  found: Hooks at lines 15-19, 23. All before JSX return at line 42.
  implication: SunburstPage.tsx is NOT the source

- timestamp: 2026-01-27T10:05:00Z
  checked: SunburstChart.tsx hook ordering
  found: forwardRef component with hooks at lines 39-84 (useNavigate, useRef, useImperativeHandle, useSunburstStore, useSunburstData, useState x3, useRef x2, useMemo x8, useCallback x10, useEffect x2). Early return at 495 is after all hooks.
  implication: SunburstChart.tsx is NOT the source

- timestamp: 2026-01-27T10:10:00Z
  checked: SunburstLegend.tsx hook ordering
  found: Single hook (useSunburstStore) at line 48. Early return at lines 54-59 is AFTER the hook. This is correct React pattern.
  implication: SunburstLegend.tsx is NOT the source

- timestamp: 2026-01-27T10:15:00Z
  checked: useSunburstData.ts hook ordering
  found: 13 hooks total (lines 566-602). All called unconditionally at top of function. No early returns before hooks.
  implication: useSunburstData.ts is NOT the source

- timestamp: 2026-01-27T10:20:00Z
  checked: sunburstStore.ts
  found: Standard zustand store with persist middleware. No hooks defined inside store.
  implication: Store is NOT the source

- timestamp: 2026-01-27T10:25:00Z
  checked: Git history for Phase 27 changes
  found: Commit 288d1ad added useSunburstStore to SunburstLegend. Hook is correctly placed at line 48, before any conditional returns.
  implication: Phase 27 changes follow correct patterns

- timestamp: 2026-01-27T10:28:00Z
  checked: Layout/routing components (Layout.tsx, ProtectedRoute.tsx)
  found: All hooks at top level. No conditional hook calls.
  implication: App shell components are NOT the source

## Resolution

root_cause: UNABLE TO IDENTIFY - After exhaustive review of all sunburst files, no hooks violations found

Potential alternative causes to investigate:
1. React StrictMode causing double-mounting
2. Error in a different component in the render tree (not sunburst-specific)
3. React Query or Zustand internal behavior during hydration
4. Browser extension interfering with React

fix:
verification:
files_changed: []
