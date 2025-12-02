---
status: testing
phase: 22-authorization-user-management
source: [22-01-SUMMARY.md, 22-02-SUMMARY.md, 22-03-SUMMARY.md, 22-04-SUMMARY.md, 22-05-SUMMARY.md]
started: 2026-01-24T18:45:00Z
updated: 2026-01-24T19:30:00Z
---

## Current Test

number: 2
name: User Management Page Access
expected: |
  Navigate to /users as Director. Page shows list of users in your tenant and pending invitations.
awaiting: user response (paused)

## Tests

### 1. Role-Based Navigation (Director)
expected: Log in as a Director. The sidebar should show "User Management" link. Other roles should NOT see this link.
result: pass

### 2. User Management Page Access
expected: Navigate to /users as Director. Page shows list of users in your tenant and pending invitations. Non-Directors trying to access /users should be redirected.
result: [pending]

### 3. Invite User Dialog
expected: On User Management page, click "Invite User". Dialog opens with email field and role dropdown (Manager, Risk Manager, Control Owner, Control Tester - NOT Director). Submit sends invitation.
result: [pending]

### 4. Invitation Email Received
expected: After inviting a user, they receive an email with a join link. The email includes the assigned role and organization name.
result: [pending]

### 5. Accept Invitation Flow
expected: Click the invitation link from email. Lands on /accept-invite page showing role and email. Set password, submit creates account and logs you in.
result: [pending]

### 6. Deactivate User
expected: On User Management page, click deactivate button on another user (not yourself). User's status changes to "Inactive". They can no longer log in.
result: [pending]

### 7. Reactivate User
expected: On User Management page, click reactivate button on a deactivated user. User's status changes to "Active". They can log in again.
result: [pending]

### 8. Cannot Self-Deactivate
expected: On User Management page, there should be no deactivate button on your own row, OR the button should be disabled. You cannot deactivate yourself.
result: [pending]

### 9. Profile Page Access
expected: Click the user icon in the header. Navigates to /profile page showing your name, email (read-only), and role (read-only).
result: [pending]

### 10. Update Profile Name
expected: On Profile page, edit your name and save. Name updates successfully with confirmation message.
result: [pending]

### 11. Update Password
expected: On Profile page, enter new password (min 8 characters) and confirm. Password updates successfully. Can log in with new password.
result: [pending]

### 12. Invitation Expiry (7 days)
expected: An invitation that is more than 7 days old should not be accepted. Attempting to use an expired link shows an error.
result: [pending]

## Summary

total: 12
passed: 1
issues: 0
pending: 11
skipped: 0

## Gaps

[none yet]
