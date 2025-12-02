---
status: resolved
trigger: "Ticket form doesn't show validation messages when required fields are empty"
created: 2026-01-27T10:00:00Z
updated: 2026-01-27T10:02:00Z
---

## Current Focus

hypothesis: CONFIRMED - Form validation silently returns without showing error messages
test: Found validation check at line 173-175 that returns early without feedback
expecting: N/A - root cause confirmed
next_action: COMPLETE - fix applied and verified

## Symptoms

expected: When required fields (marked with *) are not filled in, a message should appear reminding the user to fill those fields
actual: Nothing happens when the submit button is clicked with empty required fields - no feedback shown
errors: None visible (possibly console errors)
reproduction: Go to tickets dashboard, try to create a ticket without filling required fields, click submit
started: Feature request / missing functionality

## Eliminated

## Evidence

- timestamp: 2026-01-27T10:01:00Z
  checked: TicketForm.tsx handleSubmit function (lines 170-277)
  found: |
    Line 173-175: Silent validation check
    ```
    if (!title.trim() || !owner.trim() || !deadline) {
      return
    }
    ```
    This returns early without any visual feedback to the user.
  implication: Root cause found - validation exists but no error messages are shown

- timestamp: 2026-01-27T10:01:00Z
  checked: Form inputs for required fields (lines 406-498)
  found: |
    Three required fields marked with asterisk (*):
    1. Title (line 408) - has `required` attribute
    2. Owner (line 475) - has `required` attribute
    3. Deadline (line 489) - has `required` attribute
    However, HTML5 `required` validation is bypassed because:
    - Submit button (line 718-726) has `type="submit"` but ALSO has `onClick={handleSubmit}`
    - The onClick triggers before form validation can run
  implication: Both custom validation (silent) and HTML5 validation (bypassed) fail to provide feedback

- timestamp: 2026-01-27T10:02:00Z
  checked: TypeScript compilation
  found: npx tsc --noEmit completed without errors
  implication: Fix is syntactically correct and type-safe

## Resolution

root_cause: |
  handleSubmit (line 170) validates required fields but returns silently without displaying error messages.
  The validation check `if (!title.trim() || !owner.trim() || !deadline) { return }` provides no user feedback.
  Additionally, HTML5 form validation is bypassed because the submit button uses onClick which fires before native form submission.
fix: |
  Added validation error state and inline error messages:
  1. Added `validationErrors` state to track errors for title, owner, deadline fields
  2. Modified handleSubmit to build error object and set state before returning
  3. Added red border styling to inputs with errors (border-red-500)
  4. Added error message paragraphs below each required field (text-red-400)
  5. Clear individual field errors when user starts typing in that field
  6. Reset all validation errors on form mount/reset
verification: TypeScript compilation passes (npx tsc --noEmit)
files_changed:
  - src/components/tickets/TicketForm.tsx
