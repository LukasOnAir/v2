---
status: complete
phase: 31-controls-hub-ui-fix
source: 31-01-SUMMARY.md, 31-02-SUMMARY.md
started: 2026-01-28T09:00:00Z
updated: 2026-01-28T09:10:00Z
---

## Current Test

[testing complete]

## Tests

### 1. Controls Display in Control Panel
expected: When authenticated and clicking a control icon in the RCT, the Control Panel opens showing controls linked to that RCT row. The controls are fetched from the database (not demo data).
result: pass

### 2. Remediation Plans Display in RemediationTable
expected: Navigate to Controls Hub > Remediation tab. Remediation plans from the database are displayed in the table with correct status, priority, and deadline information.
result: pass

### 3. Remediation Summary Statistics
expected: RemediationSummary component shows accurate counts for open, in-progress, resolved, and closed plans based on database data.
result: pass

### 4. Overdue Widget Shows Database Items
expected: OverdueWidget displays overdue remediation items from the database with correct styling and count.
result: pass

### 5. Upcoming Widget Shows Database Items
expected: UpcomingWidget displays upcoming deadline items from the database with correct dates and count.
result: pass

### 6. Control Test History Display
expected: When viewing a control in the Control Panel, the test history section shows recorded tests from the database with tester name, result, and date.
result: pass

### 7. Record Control Test Persists to Database
expected: Using the test recording form in Control Panel, submitting a new test result persists it to the database and appears in the test history immediately.
result: pass

## Summary

total: 7
passed: 7
issues: 0
pending: 0
skipped: 0

## Gaps

[none]
