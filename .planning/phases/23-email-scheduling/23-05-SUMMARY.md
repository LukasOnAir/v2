---
phase: 23-email-scheduling
plan: 05
subsystem: notifications
tags: [react-hooks, zustand, notifications, edge-functions, supabase, frontend-integration]

# Dependency graph
requires:
  - phase: 23-02
    provides: send-notification Edge Function for email delivery
  - phase: 23-04
    provides: Email preferences checking in send-notification
provides:
  - useSendNotification hook for React components
  - Approval store notification integration for approval workflows
  - Control panel notification on tester assignment
  - Complete EMAIL-05, EMAIL-06, EMAIL-07 frontend integration
affects: [approval-workflow, control-testing, user-experience]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - Non-React notification utility for Zustand stores
    - Fire-and-forget notification pattern
    - Hook-based Edge Function calling

key-files:
  created:
    - src/hooks/useSendNotification.ts
  modified:
    - src/stores/approvalStore.ts
    - src/components/controls/ControlDetailPanel.tsx

key-decisions:
  - "Fire-and-forget pattern: Notifications never block user interactions"
  - "Utility function for Zustand: Direct fetch calls for non-React context"
  - "Manager query: Fetch all active managers from profiles for approval-request"
  - "Conditional notification: Only send test-assigned when assigning new tester"

patterns-established:
  - "Pattern: useSendNotification hook for React components calling Edge Functions"
  - "Pattern: sendApprovalNotification utility for Zustand stores"
  - "Pattern: Fire-and-forget with .then().catch() for non-blocking notifications"

# Metrics
duration: 6min
completed: 2026-01-25
---

# Phase 23 Plan 05: Frontend Notification Wiring Summary

**useSendNotification hook and approval store integration for triggering EMAIL-05, EMAIL-06, EMAIL-07 notifications on approval workflows and tester assignments**

## Performance

- **Duration:** 6 min
- **Started:** 2026-01-25T12:00:00Z
- **Completed:** 2026-01-25T12:06:00Z
- **Tasks:** 3
- **Files modified:** 3

## Accomplishments
- Created useSendNotification hook for React components to call send-notification Edge Function
- Wired approval store to notify Managers on pending change submission (EMAIL-05)
- Wired approval store to notify submitter on approval/rejection (EMAIL-06)
- Wired ControlDetailPanel to notify tester on assignment (EMAIL-07)
- All notifications use fire-and-forget pattern (non-blocking)

## Task Commits

Each task was committed atomically:

1. **Task 1: Create useSendNotification Hook** - `d0e0474` (feat)
2. **Task 2: Wire Approval Store to Send Notifications** - `f5bc5ec` (feat)
3. **Task 3: Wire Control Detail Panel for Tester Assignment** - `736c798` (feat)

## Files Created/Modified
- `src/hooks/useSendNotification.ts` - Hook for React components to call send-notification Edge Function
- `src/stores/approvalStore.ts` - Added notification triggers on createPendingChange, approveChange, rejectChange
- `src/components/controls/ControlDetailPanel.tsx` - Added notification trigger on tester assignment

## Integration Points

### EMAIL-05: Approval Request Notifications
**Trigger:** `createPendingChange` in approvalStore
**Recipients:** All active Managers in tenant
**Data:** entityType, entityName, changeType, submitterName

### EMAIL-06: Approval Result Notifications
**Trigger:** `approveChange` or `rejectChange` in approvalStore
**Recipient:** Original change submitter
**Data:** entityName, result (approved/rejected), reviewerName, rejectionReason (if rejected)

### EMAIL-07: Test Assignment Notifications
**Trigger:** Tester assignment in ControlDetailPanel
**Recipient:** Newly assigned tester
**Data:** controlName, dueDate
**Condition:** Only triggers when assigning (not clearing) to a different tester

## Error Handling Approach

All notification calls use **fire-and-forget pattern**:

1. **useSendNotification hook:** Returns `{ success, emailSent, error }` without throwing
2. **approvalStore:** Uses `sendApprovalNotification` utility that:
   - Gets session, returns early if no session
   - Uses `fetch(...).catch()` to avoid blocking
   - Logs errors to console but doesn't throw
3. **ControlDetailPanel:** Calls `sendNotification()` without await

This ensures notification failures never interrupt the user's primary action.

## How to Test Each Notification Type

### approval-request (EMAIL-05)
1. Login as Risk Manager or Control Owner
2. Enable approval workflow (Settings > Approval)
3. Make a change to a control that requires approval
4. Managers should receive email notification

### approval-result (EMAIL-06)
1. Login as Manager
2. Navigate to pending changes
3. Approve or reject a pending change
4. Original submitter should receive email with result

### test-assigned (EMAIL-07)
1. Login as Risk Manager
2. Open a control's detail panel
3. Assign a tester from the dropdown
4. The assigned tester should receive email notification

## Decisions Made
- Fire-and-forget pattern ensures UX is never blocked by notification failures
- Utility function approach for Zustand (can't use React hooks in stores)
- Query profiles table for Manager IDs on each pending change (ensures fresh data)
- Conditional notification for tester assignment prevents duplicate notifications

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None - plan executed smoothly.

## User Setup Required
None - uses existing send-notification Edge Function from 23-02.

## Next Phase Readiness
- All EMAIL-* notification types now fully integrated
- Phase 23 (Email & Scheduling) now complete with all 5 plans
- Ready for Phase 24 (SPF/DKIM/DMARC Configuration) for production email deliverability

---
*Phase: 23-email-scheduling*
*Completed: 2026-01-25*
