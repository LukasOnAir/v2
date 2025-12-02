---
status: resolved
trigger: "RCT page doesn't apply filters from URL params when navigating from matrix"
created: 2026-01-19T10:00:00Z
updated: 2026-01-19T10:15:00Z
---

## Current Focus

hypothesis: RCTTable.tsx does not read URL search params at all
test: Search for useSearchParams in RCTTable.tsx
expecting: No usage found - confirms root cause
next_action: Document root cause and fix

## Symptoms

expected: When clicking "Jump to RCT" from matrix expanded view, RCT page should read URL search params (riskFilter, processFilter) and apply them as initial filters
actual: Navigation happens (page jumps) but filters are not applied - table shows all rows unfiltered
errors: None
reproduction: Click matrix cell -> Click "Jump to RCT" button -> Observe RCT page loads without filters applied
started: Feature was never implemented (partial implementation)

## Eliminated

(none - root cause found on first hypothesis)

## Evidence

- timestamp: 2026-01-19T10:05:00Z
  checked: MatrixExpandedView.tsx handleJumpToRCT function (lines 23-31)
  found: Correctly constructs URL with riskFilter and processFilter using createSearchParams
  implication: Navigation side is working correctly

- timestamp: 2026-01-19T10:10:00Z
  checked: RCTTable.tsx for URL param reading (full file review)
  found: No useSearchParams import or usage. columnFilters state initialized as empty array with useState<ColumnFiltersState>([]) on line 132
  implication: ROOT CAUSE - RCTTable never reads URL params to initialize filters

## Resolution

root_cause: RCTTable.tsx does not read URL search params. The filter state is initialized as an empty array (line 132) and never populated from URL params. The MatrixExpandedView correctly constructs the URL with riskFilter and processFilter params, but RCTTable has no code to read these params and apply them to columnFilters state.

fix: Add useSearchParams hook to RCTTable.tsx and use a useEffect to read riskFilter/processFilter params on mount and apply them to columnFilters state.

verification: Not yet verified (diagnosis only mode)

files_changed:
- src/components/rct/RCTTable.tsx (needs modification)
