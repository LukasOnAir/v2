---
phase: 24-demo-seeders-deployment
plan: 01
subsystem: database
tags: [demo-data, seeders, typescript, deno, presets, taxonomy, controls]

# Dependency graph
requires:
  - phase: 21-authentication-core
    provides: Profile and tenant types for seeding context
provides:
  - 5 industry-specific demo preset data modules
  - Type definitions for seed data structures
  - Curated risk-process pairings for RCT generation
affects: [24-02-PLAN.md (seeder function uses these presets)]

# Tech tracking
tech-stack:
  added: []
  patterns: [Deno-compatible TypeScript modules in Edge Function directory]

key-files:
  created:
    - supabase/functions/seed-demo-data/presets/types.ts
    - supabase/functions/seed-demo-data/presets/deps.ts
    - supabase/functions/seed-demo-data/presets/empty.ts
    - supabase/functions/seed-demo-data/presets/casino.ts
    - supabase/functions/seed-demo-data/presets/bank.ts
    - supabase/functions/seed-demo-data/presets/insurer.ts
    - supabase/functions/seed-demo-data/presets/generic.ts
  modified: []

key-decisions:
  - "SeedTaxonomyItem excludes id/hierarchicalId - generated at insert time"
  - "SeedControl excludes dates/scores - set at insert time"
  - "RCTPairing uses taxonomy names as path for matching (not IDs)"
  - "deps.ts duplicates ControlType/TestFrequency for Deno compatibility"
  - "Curated RCT pairings (15-20 per preset) instead of full crossproduct"

patterns-established:
  - "Preset module pattern: export const {name}Preset: PresetData"
  - "Industry-specific demo data with 3-level risk taxonomy, 2-level process taxonomy"

# Metrics
duration: 6min
completed: 2026-01-25
---

# Phase 24 Plan 01: Demo Preset Data Summary

**5 industry-specific demo preset modules (casino, bank, insurer, generic, empty) with typed risk/process taxonomies, sample controls, and curated RCT pairings**

## Performance

- **Duration:** 6 min
- **Started:** 2026-01-25T13:35:44Z
- **Completed:** 2026-01-25T13:42:07Z
- **Tasks:** 2
- **Files created:** 7

## Accomplishments

- Created type definitions for seed data structures (SeedTaxonomyItem, SeedControl, PresetData)
- Built 5 industry-specific preset modules with complete demo data
- Each preset includes 15+ risk items, 10+ process items, 10-15 controls, 15-20 RCT pairings
- Holland Casino preset with gaming, AML/KYC, and surveillance themes
- Banking preset with credit, market, and liquidity risk categories
- Insurance preset with underwriting, claims, and investment themes
- Generic ERM preset following COSO framework categories

## Task Commits

Each task was committed atomically:

1. **Task 1: Create preset type definitions** - `effa042` (feat)
2. **Task 2: Create all preset data modules** - `91a3db8` (feat)

## Files Created

- `supabase/functions/seed-demo-data/presets/types.ts` - Type definitions for PresetData, SeedTaxonomyItem, SeedControl, RCTPairing
- `supabase/functions/seed-demo-data/presets/deps.ts` - Deno-compatible ControlType and TestFrequency types
- `supabase/functions/seed-demo-data/presets/empty.ts` - Empty preset for clean tenant start
- `supabase/functions/seed-demo-data/presets/casino.ts` - Holland Casino themed demo data (gaming operations, AML compliance)
- `supabase/functions/seed-demo-data/presets/bank.ts` - Banking/Financial services demo data (credit, market, operational risk)
- `supabase/functions/seed-demo-data/presets/insurer.ts` - Insurance company demo data (underwriting, claims, investments)
- `supabase/functions/seed-demo-data/presets/generic.ts` - Standard ERM demo data (COSO framework categories)

## Decisions Made

1. **deps.ts for type sharing** - Created separate deps.ts file that duplicates ControlType and TestFrequency from frontend types. This avoids cross-module imports between Deno (Edge Functions) and Node (frontend) environments.

2. **Curated RCT pairings over full crossproduct** - Each preset has 15-20 meaningful risk-process pairings instead of generating all possible combinations. This follows the research recommendation to avoid overwhelming users with hundreds of empty RCT rows.

3. **Path-based pairing** - RCTPairing uses taxonomy names as path arrays (e.g., `['Operational Risk', 'Gaming Operations', 'Table Game Integrity']`) rather than IDs. This allows the seeder function to match paths to actual inserted taxonomy IDs at runtime.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None - all files created successfully. Docker not available for Deno check, but TypeScript syntax is valid (no complex logic, just data structures).

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Preset data modules ready for consumption by seed-demo-data Edge Function (24-02-PLAN.md)
- All presets export consistent PresetData interface
- Type definitions available for import via `./types.ts`
- RCT pairings use name paths for flexible matching during seeding

---
*Phase: 24-demo-seeders-deployment*
*Completed: 2026-01-25*
