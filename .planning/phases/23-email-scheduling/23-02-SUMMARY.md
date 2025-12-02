---
phase: 23-email-scheduling
plan: 02
subsystem: api
tags: [edge-functions, resend, email, notifications, supabase, deno]

# Dependency graph
requires:
  - phase: 22-authorization
    provides: JWT authentication patterns, profile lookups
  - phase: 23-01
    provides: Resend email infrastructure and patterns
provides:
  - send-notification Edge Function for triggered business events
  - Email templates for approval-request, approval-result, test-assigned
  - Type-based notification routing pattern
affects: [approval-workflow, control-testing, frontend-integration]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - Type-discriminated notification payloads
    - Admin API for recipient email lookup
    - Graceful email degradation when API key missing

key-files:
  created:
    - supabase/functions/send-notification/index.ts
  modified:
    - supabase/config.toml

key-decisions:
  - "Return 200 with emailSent: false when recipient not found (graceful handling)"
  - "Lookup recipient email via auth.admin.getUserById (not profiles table)"
  - "Consistent template styling matching invitation emails (orange CTA)"

patterns-established:
  - "Pattern: Type-based notification routing with discriminated union"
  - "Pattern: Graceful degradation when email service not configured"

# Metrics
duration: 5min
completed: 2026-01-25
---

# Phase 23 Plan 02: Triggered Business Notifications Summary

**Send-notification Edge Function with type-based routing for approval requests, approval results, and test assignments via Resend API**

## Performance

- **Duration:** 5 min
- **Started:** 2026-01-25T10:47:35Z
- **Completed:** 2026-01-25T10:52:35Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments
- Created send-notification Edge Function handling three notification types
- JWT authentication for caller verification
- Recipient email lookup via Supabase admin API
- Consistent email templates matching existing invitation styling
- Deployed function to production (version 1, ACTIVE)

## Task Commits

Each task was committed atomically:

1. **Task 1: Create send-notification Edge Function** - `1ba18d1` (feat)
2. **Task 2: Configure and Deploy send-notification** - Config already in place from concurrent 23-01 execution

**Note:** Configuration was committed as part of 23-01 plan which updated config.toml for multiple functions.

## Files Created/Modified
- `supabase/functions/send-notification/index.ts` - Triggered notification handler with three notification types
- `supabase/config.toml` - Added [functions.send-notification] section

## API Reference

### Endpoint
```
POST https://[project-ref].supabase.co/functions/v1/send-notification
```

### Headers
```
Authorization: Bearer [user-jwt]
Content-Type: application/json
```

### Request Payload
```typescript
interface NotificationRequest {
  type: 'approval-request' | 'approval-result' | 'test-assigned'
  recipientId: string  // User ID to send to
  data: {
    // For approval-request:
    entityType?: string
    entityName?: string
    changeType?: string
    submitterName?: string
    // For approval-result:
    result?: 'approved' | 'rejected'
    reviewerName?: string
    rejectionReason?: string
    // For test-assigned:
    controlName?: string
    dueDate?: string  // ISO date string
  }
}
```

### Response
```typescript
{
  success: boolean
  type: string
  recipientId: string
  emailSent: boolean
  emailError?: string
}
```

## Frontend Integration Guide

The frontend should call this function when:

1. **EMAIL-05 - Approval Request**: When creating a pending change
   ```typescript
   await supabase.functions.invoke('send-notification', {
     body: {
       type: 'approval-request',
       recipientId: managerId,
       data: {
         entityType: 'control',
         entityName: control.name,
         changeType: 'update',
         submitterName: currentUser.fullName
       }
     }
   })
   ```

2. **EMAIL-06 - Approval Result**: When approving/rejecting a change
   ```typescript
   await supabase.functions.invoke('send-notification', {
     body: {
       type: 'approval-result',
       recipientId: submitterId,
       data: {
         entityName: change.entityName,
         result: 'approved', // or 'rejected'
         reviewerName: currentUser.fullName,
         rejectionReason: reason // if rejected
       }
     }
   })
   ```

3. **EMAIL-07 - Test Assigned**: When assigning a tester to a control
   ```typescript
   await supabase.functions.invoke('send-notification', {
     body: {
       type: 'test-assigned',
       recipientId: testerId,
       data: {
         controlName: control.name,
         dueDate: control.nextTestDate
       }
     }
   })
   ```

## Environment Variables Required

| Variable | Description | Required |
|----------|-------------|----------|
| RESEND_API_KEY | Resend API key for email delivery | Optional (graceful degradation) |
| EMAIL_FROM | Sender email address | Optional (defaults to onboarding@resend.dev) |
| APP_URL | Application URL for email links | Optional (defaults to localhost:5173) |

## Decisions Made
- Return 200 with emailSent: false when recipient not found (graceful, non-blocking)
- Use auth.admin.getUserById for email lookup (profiles don't store email)
- Match existing invitation email template styling (orange CTA button, Arial font)

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
- Config.toml section was already committed by concurrent 23-01 plan execution
- No impact - function deployed correctly with existing configuration

## Next Phase Readiness
- Send-notification function ready for frontend integration
- Frontend approval workflow can now trigger EMAIL-05, EMAIL-06
- Control assignment flow can trigger EMAIL-07
- Scheduled reminders (SCHED-01, SCHED-02, SCHED-03) to be implemented in subsequent plans

---
*Phase: 23-email-scheduling*
*Completed: 2026-01-25*
