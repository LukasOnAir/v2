# Phase 5: Control Testing - Research

**Researched:** 2026-01-20
**Domain:** Control Testing scheduling, evidence documentation, effectiveness tracking in ERM
**Confidence:** HIGH

## Summary

Phase 5 implements control testing functionality per v2 backlog requirements (TEST-01, TEST-02, TEST-03) now being pulled into v1. This involves three core capabilities: scheduling recurring control tests (monthly/quarterly/annually), documenting test procedures and evidence, and tracking control effectiveness ratings.

The existing codebase already has controls attached to RCT rows via `Control` interface with `id`, `description`, `controlType`, `netProbability`, `netImpact`, `netScore`, and `comment` fields. Control testing extends this by adding a testing schedule per control and a history of test executions with results. The UI pattern follows the existing ControlPanel slide-out panel using Radix Dialog.

For a demo application using LocalStorage, evidence storage should be limited to text descriptions, URLs/references, and simple metadata rather than full file uploads. File attachments via base64 would bloat LocalStorage (5MB limit) and degrade performance. If file evidence is critical, consider IndexedDB for future enhancement but keep v1 simple.

**Primary recommendation:** Extend the existing Control interface with testing schedule fields (`testFrequency`, `nextTestDate`, `lastTestDate`). Create a separate `ControlTest` type for test executions with results. Use date-fns for date arithmetic (calculating next test dates). Keep UI in existing ControlPanel with expandable test history section. Use simple text-based evidence (notes, URLs, procedure descriptions) rather than file uploads.

## Standard Stack

The established libraries/tools for this domain:

### Core (Already in Project)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Radix UI Dialog | ^1.1.15 | ControlPanel slide-out panel | Already used, consistent pattern |
| Zustand + Immer | ^5.0.10 | State management | Already used for rctStore, extend for test history |
| Tailwind CSS | ^4.1.18 | Styling | Already configured with dark mode |
| lucide-react | ^0.562.0 | Icons | Already used throughout app |

### New for Phase 5
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| date-fns | ^4.1.0 | Date arithmetic and formatting | Calculate next test dates, format display dates |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| date-fns | rrule | rrule is more powerful for complex recurrence (iCalendar RRULE) but overkill for simple monthly/quarterly/annual cycles |
| date-fns | dayjs | dayjs is smaller but date-fns has better TypeScript support and is more feature-complete |
| Text evidence | File upload + IndexedDB | File storage adds complexity, bloats storage, out of scope for demo |
| Native date input | react-day-picker | Native HTML date input is already used in RCT custom columns, maintains consistency |

**Installation:**
```bash
npm install date-fns
```

## Architecture Patterns

### Recommended Project Structure
```
src/
  components/
    rct/
      ControlPanel.tsx          # Extend with testing section
      ControlTestSection.tsx    # New: Test schedule + history UI
      ControlTestForm.tsx       # New: Record test result form
  types/
    rct.ts                      # Extend Control, add ControlTest type
  stores/
    rctStore.ts                 # Extend with test-related actions
  utils/
    testScheduling.ts           # New: Calculate next test dates
```

### Pattern 1: Control Interface Extension
**What:** Add testing schedule fields to existing Control interface
**When to use:** Every control that can be tested
**Example:**
```typescript
// Source: ERM control testing best practices + existing Control interface
export type TestFrequency = 'monthly' | 'quarterly' | 'annually' | 'as-needed'

export interface Control {
  id: string
  description: string
  controlType: ControlType | null
  netProbability: number | null
  netImpact: number | null
  netScore: number | null
  comment?: string
  // NEW: Testing schedule
  testFrequency: TestFrequency | null
  nextTestDate: string | null    // ISO date string
  lastTestDate: string | null    // ISO date string
  testProcedure?: string         // How to test this control
}
```

### Pattern 2: Control Test Type
**What:** Record of a single test execution
**When to use:** Each time a control is tested
**Example:**
```typescript
// Source: GRC control testing workflow patterns
export type TestResult = 'pass' | 'fail' | 'partial' | 'not-tested'

export interface ControlTest {
  id: string
  controlId: string
  rowId: string                  // Link to RCT row
  testDate: string               // ISO date string
  result: TestResult
  effectiveness: number | null   // 1-5 scale matching existing scores
  testerName?: string            // Who performed the test
  evidence?: string              // Text description, URLs, notes
  findings?: string              // Observations, issues found
  recommendations?: string       // Follow-up actions needed
}
```

### Pattern 3: Next Test Date Calculation
**What:** Calculate when a control should next be tested based on frequency
**When to use:** After recording a test result or setting schedule
**Example:**
```typescript
// Source: date-fns documentation + ERM scheduling patterns
import { addMonths, addQuarters, addYears, format, parseISO } from 'date-fns'

export function calculateNextTestDate(
  lastTestDate: string,
  frequency: TestFrequency
): string {
  const date = parseISO(lastTestDate)

  switch (frequency) {
    case 'monthly':
      return format(addMonths(date, 1), 'yyyy-MM-dd')
    case 'quarterly':
      return format(addMonths(date, 3), 'yyyy-MM-dd')
    case 'annually':
      return format(addYears(date, 1), 'yyyy-MM-dd')
    case 'as-needed':
      return '' // No automatic scheduling
  }
}

export function isTestOverdue(nextTestDate: string | null): boolean {
  if (!nextTestDate) return false
  return new Date(nextTestDate) < new Date()
}
```

### Pattern 4: Test History in Store
**What:** Store test history alongside existing state
**When to use:** Recording and retrieving test results
**Example:**
```typescript
// Source: Existing rctStore.ts patterns
interface RCTState {
  rows: RCTRow[]
  // ... existing state
  controlTests: ControlTest[]  // NEW: All test records

  // NEW: Test-related actions
  recordControlTest: (test: Omit<ControlTest, 'id'>) => void
  updateControlSchedule: (
    rowId: string,
    controlId: string,
    frequency: TestFrequency,
    procedure?: string
  ) => void
  getTestHistory: (controlId: string) => ControlTest[]
}
```

### Pattern 5: Role-Based Test Permissions
**What:** Control Owner can record test results, Risk Manager can do everything
**When to use:** Determining what UI elements to show
**Example:**
```typescript
// Source: Existing usePermissions.ts pattern
export function usePermissions() {
  const role = useUIStore(state => state.selectedRole)
  return {
    // Existing permissions
    canEditControlDefinitions: role === 'risk-manager',
    canEditNetScores: true,
    canSubmitChangeRequests: role === 'control-owner',
    isRiskManager: role === 'risk-manager',
    // NEW: Test-related permissions
    canRecordTestResults: true,  // Both roles can record tests
    canEditTestSchedule: role === 'risk-manager',  // Only RM sets schedule
    canViewTestHistory: true,  // Both roles can view
  }
}
```

### Anti-Patterns to Avoid
- **Storing files in LocalStorage:** Base64 encoding adds 33% overhead, 5MB limit fills quickly; use text evidence for demo
- **Creating separate test store:** Keep test data with controls in rctStore for data locality and simpler persistence
- **Complex recurrence rules:** RRULE/iCalendar is overkill; simple monthly/quarterly/annually enum suffices for ERM
- **Mandatory test scheduling:** Allow `testFrequency: null` for controls that don't require periodic testing
- **Overcomplicating effectiveness:** Reuse existing 1-5 scale pattern for consistency with probability/impact scores

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Date arithmetic | Custom month/year addition | date-fns addMonths/addYears | Edge cases (month ends, leap years, DST) |
| Date formatting | toLocaleDateString variations | date-fns format | Consistent formatting, timezone handling |
| Date parsing | new Date(string) | date-fns parseISO | Reliable ISO 8601 parsing |
| Overdue calculation | Manual date comparison | date-fns isBefore/isAfter | Clean API, handles edge cases |
| File storage | Base64 in LocalStorage | Text references or IndexedDB (v2) | LocalStorage too small for files |
| Recurrence rules | Custom scheduling logic | Simple enum + date-fns | Complex recurrence not needed for demo |

**Key insight:** The testing schedule requirements (monthly/quarterly/annually) map directly to simple date arithmetic. Don't overcomplicate with calendar libraries or recurrence rule engines. date-fns provides exactly what's needed with minimal bundle impact (~7KB gzipped for tree-shaken imports).

## Common Pitfalls

### Pitfall 1: LocalStorage Quota Exceeded with Evidence Files
**What goes wrong:** App crashes when user uploads test evidence files
**Why it happens:** Base64-encoded files in LocalStorage quickly exceed 5MB limit
**How to avoid:**
1. Store evidence as text descriptions and URL references only
2. If files needed later, use IndexedDB (separate concern, not LocalStorage)
3. Show clear guidance in UI: "Describe evidence or paste links"
**Warning signs:** QuotaExceededError in console, persistence failing silently

### Pitfall 2: Test Dates Out of Sync with Control Updates
**What goes wrong:** Deleted controls leave orphan test records; renamed controls break history
**Why it happens:** Test records reference controlId that no longer exists or changed
**How to avoid:**
1. Keep controlId stable (use nanoid, not description-based ID)
2. Cascade delete test records when control deleted (in rctStore action)
3. Store test records nested or adjacently to controls, not in separate store
**Warning signs:** Test history shows for wrong control, empty history after control edit

### Pitfall 3: Timezone Confusion with Test Dates
**What goes wrong:** Test due "today" shows as overdue or not due depending on timezone
**Why it happens:** Mixing local Date objects with ISO strings without timezone awareness
**How to avoid:**
1. Always store dates as ISO 8601 strings (yyyy-MM-dd)
2. Use date-fns parseISO for reading, format for writing
3. Compare at date level (start of day), not timestamp level
**Warning signs:** Tests flip between overdue/not-overdue, different behavior in different timezones

### Pitfall 4: Cluttered ControlPanel UI
**What goes wrong:** Panel becomes overwhelming with testing fields added to existing control fields
**Why it happens:** Adding test schedule + history + form to already-full panel
**How to avoid:**
1. Use collapsible sections: "Testing Schedule", "Test History"
2. Keep test recording in separate inline form that expands when needed
3. Show most recent test result prominently, full history on expand
**Warning signs:** User has to scroll excessively, fields feel cramped

### Pitfall 5: Missing Default State for Existing Controls
**What goes wrong:** App crashes or shows undefined when loading controls without new test fields
**Why it happens:** Existing persisted controls don't have testFrequency, nextTestDate, etc.
**How to avoid:**
1. Handle undefined/null gracefully in UI (show "Not scheduled")
2. Use optional chaining and nullish coalescing in accessors
3. Migration: Default new fields to null, don't require migration script
**Warning signs:** TypeError accessing undefined property, blank sections for old controls

### Pitfall 6: No Feedback on Test Recording
**What goes wrong:** User records test but isn't sure it saved
**Why it happens:** Silent state update without visual confirmation
**How to avoid:**
1. Show brief toast/notification on successful test record
2. Immediately update "Last Test" display
3. Auto-collapse form after submission with visible result in history
**Warning signs:** User records same test multiple times, confusion about current state

## Code Examples

Verified patterns from official sources and existing codebase:

### Frequency Options UI
```typescript
// Source: ERM scheduling standards + existing ScoreDropdown pattern
const FREQUENCY_OPTIONS: { value: TestFrequency | ''; label: string }[] = [
  { value: '', label: 'Not scheduled' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'quarterly', label: 'Quarterly' },
  { value: 'annually', label: 'Annually' },
  { value: 'as-needed', label: 'As needed' },
]

function FrequencySelect({ value, onChange, disabled }: Props) {
  return (
    <select
      value={value ?? ''}
      onChange={(e) => onChange(e.target.value as TestFrequency || null)}
      disabled={disabled}
      className="w-full px-2 py-1.5 bg-surface-elevated border border-surface-border rounded text-sm text-text-primary focus:outline-none focus:ring-1 focus:ring-accent-500 disabled:opacity-50"
    >
      {FREQUENCY_OPTIONS.map(opt => (
        <option key={opt.value} value={opt.value}>{opt.label}</option>
      ))}
    </select>
  )
}
```

### Test Result Options
```typescript
// Source: GRC industry standards (Pass/Fail/Partial)
const RESULT_OPTIONS: { value: TestResult; label: string; color: string }[] = [
  { value: 'pass', label: 'Pass', color: 'text-green-400' },
  { value: 'fail', label: 'Fail', color: 'text-red-400' },
  { value: 'partial', label: 'Partially Effective', color: 'text-amber-400' },
  { value: 'not-tested', label: 'Not Tested', color: 'text-text-muted' },
]
```

### Store Actions for Testing
```typescript
// Source: Existing rctStore.ts patterns
recordControlTest: (test) => set((state) => {
  const newTest: ControlTest = {
    ...test,
    id: `test-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
  }
  state.controlTests.push(newTest)

  // Update control's lastTestDate and calculate nextTestDate
  const row = state.rows.find(r => r.id === test.rowId)
  if (row) {
    const control = row.controls.find(c => c.id === test.controlId)
    if (control) {
      control.lastTestDate = test.testDate
      if (control.testFrequency && control.testFrequency !== 'as-needed') {
        control.nextTestDate = calculateNextTestDate(test.testDate, control.testFrequency)
      }
    }
  }
}),

updateControlSchedule: (rowId, controlId, frequency, procedure) => set((state) => {
  const row = state.rows.find(r => r.id === rowId)
  if (row) {
    const control = row.controls.find(c => c.id === controlId)
    if (control) {
      control.testFrequency = frequency
      control.testProcedure = procedure
      // If setting schedule and no lastTestDate, set nextTestDate from today
      if (frequency && frequency !== 'as-needed' && !control.lastTestDate) {
        control.nextTestDate = format(new Date(), 'yyyy-MM-dd')
      }
    }
  }
}),
```

### Overdue Badge Component
```typescript
// Source: Existing HeatmapCell pattern for visual indicators
function OverdueBadge({ nextTestDate }: { nextTestDate: string | null }) {
  if (!nextTestDate) return null

  const isOverdue = new Date(nextTestDate) < new Date()
  if (!isOverdue) return null

  return (
    <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-red-500/20 text-red-400">
      Overdue
    </span>
  )
}
```

### Test History List
```typescript
// Source: Existing changeRequest display pattern in ControlPanel
function TestHistory({ tests }: { tests: ControlTest[] }) {
  if (tests.length === 0) {
    return <p className="text-sm text-text-muted">No tests recorded yet.</p>
  }

  const sortedTests = [...tests].sort(
    (a, b) => new Date(b.testDate).getTime() - new Date(a.testDate).getTime()
  )

  return (
    <div className="space-y-2">
      {sortedTests.map(test => (
        <div key={test.id} className="p-3 bg-surface-overlay rounded border border-surface-border">
          <div className="flex items-center justify-between">
            <span className={`font-medium ${RESULT_OPTIONS.find(r => r.value === test.result)?.color}`}>
              {RESULT_OPTIONS.find(r => r.value === test.result)?.label}
            </span>
            <span className="text-xs text-text-muted">
              {format(parseISO(test.testDate), 'MMM d, yyyy')}
            </span>
          </div>
          {test.findings && (
            <p className="text-sm text-text-secondary mt-1">{test.findings}</p>
          )}
        </div>
      ))}
    </div>
  )
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Manual spreadsheet test tracking | Integrated GRC platforms | 2020+ | Real-time visibility, audit trails |
| Annual control testing only | Risk-based frequency (monthly/quarterly/annual) | 2015+ | Better risk coverage, compliance alignment |
| Pass/Fail only ratings | Multiple outcome levels (Pass/Fail/Partial/Not Tested) | 2018+ | More nuanced effectiveness tracking |
| File-based evidence storage | Cloud document links + metadata | 2020+ | Scalability, versioning, access control |
| moment.js for dates | date-fns or dayjs | 2020+ | Smaller bundle, better tree-shaking |

**Deprecated/outdated:**
- **moment.js:** Large bundle size, mutable API; use date-fns instead
- **Binary files in LocalStorage:** Causes performance issues and quota problems; use IndexedDB or external references
- **Single annual testing cycle:** Modern ERM requires risk-based frequency differentiation

## Open Questions

Things that couldn't be fully resolved:

1. **Evidence file uploads for v1 demo**
   - What we know: LocalStorage is too small for files; IndexedDB would work but adds complexity
   - What's unclear: Whether demo stakeholders expect actual file attachments
   - Recommendation: Defer to text-based evidence (descriptions, URLs) for v1; file uploads as v2 enhancement

2. **Test assignment to specific testers**
   - What we know: GRC tools often assign tests to specific users
   - What's unclear: Whether role-based demo needs user assignment
   - Recommendation: Simple optional "testerName" text field; no user management for demo

3. **Effectiveness score vs. Pass/Fail**
   - What we know: Some orgs use Pass/Fail, others use 1-5 effectiveness scale
   - What's unclear: Which Holland Casino prefers
   - Recommendation: Support both - `result` for Pass/Fail/Partial, `effectiveness` for optional 1-5 scale

4. **Batch test recording**
   - What we know: Users may want to record tests for multiple controls at once
   - What's unclear: Whether this is demo-critical
   - Recommendation: Start with single control testing; batch as future enhancement

## Sources

### Primary (HIGH confidence)
- Existing codebase: ControlPanel.tsx, rctStore.ts, types/rct.ts patterns
- [date-fns documentation](https://date-fns.org/) - addMonths, addQuarters, addYears, format, parseISO
- [MDN Storage API](https://developer.mozilla.org/en-US/docs/Web/API/Storage_API/Storage_quotas_and_eviction_criteria) - LocalStorage limits (5MB)

### Secondary (MEDIUM confidence)
- [Diligent controls testing guide](https://www.diligent.com/resources/blog/controls-testing) - Testing frequency, automation patterns
- [AuditBoard SOX testing](https://auditboard.com/blog/sox-testing) - Sample sizes by frequency
- [ServiceNow GRC effectiveness options](https://www.servicenow.com/community/grc-forum/control-effectiveness-options/m-p/2588431) - Pass/Fail/Partial patterns

### Tertiary (LOW confidence)
- WebSearch results for ERM best practices - general patterns, requires validation with specific client
- Various GRC vendor marketing materials - feature comparisons, may be biased

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - date-fns is well-established, existing stack unchanged
- Architecture: HIGH - Extends existing patterns from ControlPanel and rctStore
- Pitfalls: HIGH - Based on known LocalStorage limits and existing codebase patterns
- Domain (ERM testing): MEDIUM - Best practices vary by organization, validated with industry sources

**Research date:** 2026-01-20
**Valid until:** 2026-02-20 (30 days - stable libraries, date-fns v4 current)
