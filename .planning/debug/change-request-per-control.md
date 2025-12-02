---
status: diagnosed
trigger: "Change request button should be per control, not a general button"
created: 2026-01-19T12:00:00Z
updated: 2026-01-19T12:01:00Z
symptoms_prefilled: true
goal: find_root_cause_only
---

## Current Focus

hypothesis: CONFIRMED - Button is at panel footer level, not inside control cards
test: Examined ControlPanel.tsx structure
expecting: Button outside control loop
next_action: Report root cause

## Symptoms

expected: Each control in ControlPanel should have its own "Request Change" button tied to that specific control
actual: There is a general "Request Change" button visible, but not per-control
errors: N/A (UX issue, not error)
reproduction: Open ControlPanel, observe button placement
started: Current implementation

## Eliminated

## Evidence

- timestamp: 2026-01-19T12:00:30Z
  checked: ControlPanel.tsx lines 265-308
  found: Change request button is in panel footer section (lines 265-308), outside the controls list iteration (lines 168-262)
  implication: Button submits request for the entire ROW, not specific control

- timestamp: 2026-01-19T12:00:45Z
  checked: handleSubmitChangeRequest function (lines 74-79)
  found: Calls addChangeRequest(row.id, message) - only passes rowId, never controlId
  implication: Even though store supports controlId parameter, it's never passed

- timestamp: 2026-01-19T12:00:55Z
  checked: rctStore.ts addChangeRequest signature (line 52)
  found: addChangeRequest: (rowId: string, message: string, controlId?: string) => void
  implication: Store already supports per-control requests (controlId is optional param)

- timestamp: 2026-01-19T12:01:00Z
  checked: rct.ts ChangeRequest interface (lines 33-38)
  found: controlId?: string field already exists in ChangeRequest type
  implication: Data model is ready, only UI needs changes

## Resolution

root_cause: The "Request Change" button is placed at panel-level (lines 265-308 in ControlPanel.tsx) instead of inside each control card. The button triggers handleSubmitChangeRequest() which calls addChangeRequest(row.id, message) without passing the optional controlId parameter. The backend (store + types) already supports per-control change requests via the optional controlId field.

fix: Move the change request UI into each control card (inside the row.controls.map loop at lines 169-260). Track which control's request form is open using state like `activeChangeRequestControlId: string | null`. Pass the control.id to addChangeRequest when submitting.

verification:
files_changed: []
