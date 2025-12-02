# Phase 2: Taxonomy Builders - Context

**Gathered:** 2026-01-19
**Status:** Ready for planning

<domain>
## Phase Boundary

Build hierarchical Risk and Process taxonomy builders with up to 5 levels. Users can create, edit, delete, and reorder items. Each item has auto-generated hierarchical ID, name, and optional description. Visual tree structure with expand/collapse. Changes persist to LocalStorage.

</domain>

<decisions>
## Implementation Decisions

### Tree interaction
- Add items via inline quick-add: click + next to parent, type name directly, press Enter
- Edit name via double-click inline editing
- Edit description via click on description text (also inline)
- Delete via hover-revealed trash/X icon
- Full drag-and-drop support: reorder within level AND reparent to different parent

### Visual hierarchy
- Indentation with vertical/horizontal connector lines showing parent-child relationships
- Expand/collapse arrows (chevron or triangle) on each branch with children
- Color-coded levels: subtle color shift or left border color per depth level
- Default state on load: fully expanded (all levels visible)

### Taxonomy layout
- Risk and Process taxonomies shown via tabs (tab bar to switch between them)
- Header toolbar above each tree with title ("Risk Taxonomy" / "Process Taxonomy") and actions (expand all, collapse all)
- "Add root item" button at both top AND bottom of tree for convenience
- Search/filter input to find items in large taxonomies (filters/highlights matching items)

### Item fields
- Each item displays: ID + Name + Description (all three visible in tree)
- Show/hide toggles for IDs and descriptions: Claude's discretion on placement (toolbar or settings dropdown)
- Description is optional (can skip, show placeholder when empty)

### Claude's Discretion
- Exact placement of show/hide toggles for ID/description
- Connector line styling (solid, dashed, color)
- Search behavior (filter vs highlight vs both)
- Level color palette
- Animation timing for expand/collapse
- Empty state messaging

</decisions>

<specifics>
## Specific Ideas

- Demo context: user will build taxonomies live during Holland Casino presentation
- Quick keyboard workflow important: type, Enter, type next item
- Auto-generated IDs format: 1, 1.1, 1.1.1, etc. (hierarchical numbering)
- Up to 5 levels deep supported

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 02-taxonomy-builders*
*Context gathered: 2026-01-19*
