---
phase: 19-mock-data-loader
plan: 01
subsystem: data-management
tags: [mock-data, demo, zustand, stores]
depends_on:
  requires: [11, 12, 13, 14, 15, 16]
  provides: [mock-data-generator, bulk-store-setters]
  affects: [19-02]
tech-stack:
  added: []
  patterns: [factory-functions, store-getState-pattern]
key-files:
  created:
    - src/utils/mockDataLoader.ts
  modified:
    - src/stores/rctStore.ts
    - src/stores/ticketsStore.ts
    - src/stores/collaborationStore.ts
    - src/stores/approvalStore.ts
    - src/stores/auditStore.ts
decisions:
  - id: mock-data-casino-theme
    choice: Casino-themed content
    reason: Realistic demo data for gambling industry context
  - id: deterministic-randomness
    choice: Index-based distribution instead of Math.random
    reason: Consistent demo data across reloads
  - id: store-getstate-pattern
    choice: Use store.getState() for all store access
    reason: Non-React context requires direct store access
metrics:
  duration: 7 min
  completed: 2026-01-24
---

# Phase 19 Plan 01: Mock Data Generator Summary

Mock data generation module that populates all application stores with comprehensive casino-themed demo data.

## What Was Built

### Mock Data Generator (`src/utils/mockDataLoader.ts`)
- **986 lines** of factory functions and data generation logic
- Single entry point: `loadMockData()` function
- Populates all 7 Zustand stores in correct dependency order

### Generated Content
| Data Type | Count | Description |
|-----------|-------|-------------|
| Risk Taxonomy | 25+ items | 5-level hierarchy (Operational, Financial, Compliance) |
| Process Taxonomy | 20+ items | 5-level hierarchy (Gaming Floor, Cage, Security, Marketing) |
| RCT Rows | Cartesian product | All leaf risk x leaf process combinations |
| Controls | 16 | Varied types (Preventative, Detective, Automated, etc.) |
| Control Links | 30+ | Some controls linked to multiple rows |
| Control Tests | 30+ | Mix of pass/fail/partial over 6 months |
| Remediation Plans | 8 | Various statuses and priorities |
| Tickets | 12 | Across all Kanban columns |
| Comments | 15+ | Threaded on controls and RCT rows |
| KB Articles | 6 | Testing procedures, policies, templates |
| Pending Changes | 3 | For approval queue demonstration |
| Audit Entries | 20+ | Activity spanning 30 days |

### Store Bulk Setters Added
| Store | New Methods |
|-------|-------------|
| rctStore | `setControlTests()`, `setRemediationPlans()` |
| ticketsStore | `setTickets()`, `setTicketEntityLinks()` |
| collaborationStore | `setComments()`, `setKnowledgeBaseEntries()` |
| approvalStore | `setPendingChanges()` |
| auditStore | `setEntries()` |

## Key Implementation Details

### Score Distribution
- ~30% high risk (gross 15-25)
- ~40% medium risk (gross 6-14)
- ~30% low risk (gross 1-5)
- Deterministic based on index for consistency

### Control Features Demonstrated
- Overdue tests (nextTestDate in past)
- Multi-row linking (controls covering multiple risks)
- Varied test frequencies (monthly, quarterly, annually)
- Net score calculations (1-3 range for mitigation)

### Four-Eye Approval Demo
- Pending control update (score change)
- Pending risk rename
- globalEnabled set to true automatically

## Verification Results

| Check | Result |
|-------|--------|
| TypeScript compilation | Pass |
| loadMockData export | Confirmed |
| All store imports | Confirmed |
| Line count (min 300) | 986 lines |
| All bulk setters added | 7 methods across 5 stores |

## Commits

| Hash | Message |
|------|---------|
| 5a79cfa | feat(19-01): create mock data generator module |
| e460d08 | feat(19-01): add bulk setter methods to stores |

## Deviations from Plan

None - plan executed exactly as written.

## Next Phase Readiness

Plan 19-02 can proceed to add the Header button that triggers `loadMockData()`. All data generation logic is complete and tested via TypeScript compilation.
