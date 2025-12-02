---
status: resolved
trigger: "Multi-select linking only adds one item instead of all selected items"
created: 2026-01-28T10:00:00Z
updated: 2026-01-28T10:06:00Z
---

## Current Focus

hypothesis: CONFIRMED - Stale closure in handleBulkAddEntities causes only last item to be added
test: Fix applied - batch all entities into single setLinkedEntities call
expecting: Selecting 2+ items and clicking Link should add all selected items
next_action: Complete - fix verified (TypeScript compiles, logic correct)

## Symptoms

expected: When multiple items are selected via checkboxes and "Link" is pressed, all selected items should be added to linked items. After linking, those items should no longer appear in the available items list.
actual: Only one item gets added when multiple checkboxes are selected and link is pressed
errors: None reported
reproduction: Select 2+ items via checkboxes, click the link button - only one item gets linked
started: Never worked - newly implemented functionality

## Eliminated

## Evidence

- timestamp: 2026-01-28T10:00:00Z
  checked: File structure for tickets components
  found: TicketForm.tsx contains checkbox/selected items logic per grep
  implication: This is likely the main file to investigate

- timestamp: 2026-01-28T10:02:00Z
  checked: handleBulkAddEntities function (lines 344-350) and handleAddEntity (lines 323-330)
  found: |
    handleBulkAddEntities loops through selected entities and calls handleAddEntity for each.
    handleAddEntity does: setLinkedEntities([...linkedEntities, { entityType, entityId, entityName }])
    Each call references the SAME linkedEntities value from render time (stale closure).
    React batches state updates, so only the last iteration's state persists.
  implication: ROOT CAUSE CONFIRMED - classic React stale closure bug in loop with setState

## Resolution

root_cause: Stale closure bug - handleBulkAddEntities calls handleAddEntity multiple times in a loop, but each setLinkedEntities call references the same stale linkedEntities array from render time. React batches these updates, so only the last item gets added (each call overwrites the previous with base state + 1 item).
fix: Refactored handleBulkAddEntities to batch all selected entities into a single setLinkedEntities call using spread operator, instead of calling handleAddEntity in a loop
verification: TypeScript compiles without errors. Logic verified - single setLinkedEntities call with spread operator adds all items at once instead of loop with stale closure.
files_changed:
  - src/components/tickets/TicketForm.tsx
