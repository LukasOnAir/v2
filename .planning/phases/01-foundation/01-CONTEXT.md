# Phase 1: Foundation - Context

**Gathered:** 2026-01-19
**Status:** Ready for planning

<domain>
## Phase Boundary

Project scaffolding with dark theme UI, navigation structure between Taxonomy/RCT/Matrix views, and LocalStorage persistence layer. This phase delivers the shell that all features will live in.

</domain>

<decisions>
## Implementation Decisions

### Navigation layout
- Left sidebar for primary navigation (Taxonomies, RCT, Matrix views)
- Auto-collapse behavior: full labels on large screens, icon-only on smaller screens
- Single "Taxonomies" nav item (shows both Risk and Process taxonomies in one view)
- Top header bar with app title "RiskGuard ERM" and role picker dropdown
- All views clickable from sidebar, even if prerequisites not met (shows dependency message)

### Dark theme specifics
- Very dark background (#0a0a0a to #121212 range)
- Warm amber accent color (#f59e0b / Tailwind amber-500)
- Minimal accent usage: amber only on primary action buttons, rest stays neutral grays
- Cards/panels styling: Claude's discretion on elevated surface vs bordered approach

### View placeholders
- Empty taxonomy state: minimal text like "No risks yet. Click + to add one."
- RCT when taxonomies not built: dependency message with link to Taxonomy view
- Matrix when RCT empty: same dependency pattern linking to RCT
- No grayed-out nav items — user can navigate anywhere and see appropriate empty/dependency state

### Animations & feel
- Snappy and minimal philosophy (150-200ms transitions)
- Page transitions: instant swap, no animation between views
- Hover states: color change + subtle scale (1.02x) on buttons/interactives
- Loading states: skeleton screens for async data loading

### Claude's Discretion
- Card/panel styling (elevated surface vs bordered)
- Exact gray values for text hierarchy
- Icon choices for sidebar items
- Skeleton screen design details
- Exact spacing and typography scale

</decisions>

<specifics>
## Specific Ideas

- Holland Casino branding: professional, sleek, not overly flashy
- Amber accent should feel sophisticated (golden) not aggressive (neon orange)
- Demo context: needs to look polished when building taxonomies live

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 01-foundation*
*Context gathered: 2026-01-19*
