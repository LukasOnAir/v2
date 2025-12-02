# Phase 8: Remediation & Issue Tracking - Research

**Researched:** 2026-01-21
**Domain:** Remediation planning, issue tracking, action item management in ERM/GRC
**Confidence:** HIGH

## Summary

Phase 8 implements remediation and issue tracking functionality per requirements REM-01, REM-02, and REM-03. This builds directly on Phase 5's control testing infrastructure - when a control test fails or is partially effective, a remediation plan can be created to address the deficiency. The phase introduces a new data model (RemediationPlan) linked to control tests, status workflow tracking, and a dashboard for visibility into overdue/upcoming remediation items.

The existing codebase has `ControlTest` records with `result` (pass/fail/partial) and `findings`/`recommendations` fields that serve as natural triggers for remediation. The UI pattern will extend the existing ControlPanel slide-out to include a remediation section, and a new dashboard page will provide an organization-wide view of remediation status.

For a demo application, the remediation workflow should be simple: issue creation linked to test findings, assignment to an owner, deadline setting, status tracking (open/in-progress/resolved), and action item management. Priority is derived from the associated risk's gross score, avoiding duplicate configuration.

**Primary recommendation:** Create a `RemediationPlan` type linked to `controlTestId` with owner, deadline, status, and action items array. Extend rctStore with remediation actions. Add a collapsible remediation section to ControlPanel for creating/viewing remediation linked to test findings. Create a new `/remediation` dashboard page showing summary statistics, overdue items, and upcoming deadlines.

## Standard Stack

The established libraries/tools for this domain:

### Core (Already in Project)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| date-fns | ^4.1.0 | Date arithmetic, deadline calculations | Already used for test scheduling |
| @radix-ui/react-dialog | ^1.1.15 | Slide-out panels | Already used for ControlPanel |
| @tanstack/react-table | ^8.21.3 | Table display for dashboard | Already used for RCT |
| Zustand + Immer | ^5.0.10 | State management | Already used for rctStore |
| lucide-react | ^0.562.0 | Icons | Already used throughout |
| react-router | ^7.12.0 | Routing for dashboard page | Already configured |

### No New Libraries Needed
This phase builds entirely on existing infrastructure. No new dependencies required.

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Inline remediation in ControlPanel | Separate RemediationPanel component | Separate panel adds navigation complexity; inline keeps workflow context |
| Array of action items | Separate ActionItem store | Separate store adds complexity; nested array in RemediationPlan keeps data localized |
| Kanban-style board | Table/list view | Kanban requires additional drag-drop complexity; table aligns with existing RCT patterns |
| Full task management | Simple status tracking | Full task system (Jira-like) is overkill for demo; simple status workflow suffices |

**Installation:**
```bash
# No new packages needed
```

## Architecture Patterns

### Recommended Project Structure
```
src/
  types/
    rct.ts                       # Extend with RemediationPlan, ActionItem types
  stores/
    rctStore.ts                  # Extend with remediation actions
  components/
    rct/
      ControlPanel.tsx           # Add remediation section
      RemediationSection.tsx     # NEW: Remediation UI within ControlPanel
      RemediationForm.tsx        # NEW: Create/edit remediation plan form
    remediation/
      RemediationDashboard.tsx   # NEW: Dashboard page content
      RemediationSummary.tsx     # NEW: Summary statistics widget
      RemediationTable.tsx       # NEW: Table of all remediation items
      OverdueWidget.tsx          # NEW: Overdue items widget
      UpcomingWidget.tsx         # NEW: Upcoming deadlines widget
  pages/
    RemediationPage.tsx          # NEW: Dashboard page route
  utils/
    testScheduling.ts            # Extend with remediation date helpers
```

### Pattern 1: RemediationPlan Type
**What:** Data structure for a remediation plan linked to control test finding
**When to use:** Every time a deficiency needs tracking
**Example:**
```typescript
// Source: GRC remediation tracking patterns + Oracle incident status model
export type RemediationStatus = 'open' | 'in-progress' | 'resolved' | 'closed'

export interface ActionItem {
  id: string
  description: string
  completed: boolean
  completedDate?: string           // ISO date when marked complete
}

export interface RemediationPlan {
  id: string
  controlTestId: string            // Link to triggering test finding
  controlId: string                // Link to control (for context)
  rowId: string                    // Link to RCT row (for risk context)
  title: string                    // Short description of issue
  description?: string             // Detailed description
  owner: string                    // Person responsible
  deadline: string                 // ISO date string (yyyy-MM-dd)
  status: RemediationStatus
  priority: 'critical' | 'high' | 'medium' | 'low' // Derived from risk score
  actionItems: ActionItem[]
  createdDate: string              // When remediation was created
  resolvedDate?: string            // When status changed to resolved
  closedDate?: string              // When status changed to closed
  notes?: string                   // Additional notes/updates
}
```

### Pattern 2: Priority Derivation from Risk Score
**What:** Calculate remediation priority from associated risk's gross score
**When to use:** When creating remediation plan
**Example:**
```typescript
// Source: GRC best practices - priority based on risk severity
export function derivePriority(grossScore: number | null): RemediationPlan['priority'] {
  if (grossScore === null) return 'medium'
  if (grossScore >= 20) return 'critical'   // 20-25
  if (grossScore >= 12) return 'high'       // 12-19
  if (grossScore >= 6) return 'medium'      // 6-11
  return 'low'                               // 1-5
}
```

### Pattern 3: Status Workflow
**What:** Valid status transitions for remediation lifecycle
**When to use:** When updating remediation status
**Example:**
```typescript
// Source: Oracle incident status, ServiceNow workflows
// Status flow: open -> in-progress -> resolved -> closed
// Allows re-opening: resolved -> open (if issue recurs)

export const REMEDIATION_STATUSES: {
  value: RemediationStatus
  label: string
  color: string
  allowedTransitions: RemediationStatus[]
}[] = [
  {
    value: 'open',
    label: 'Open',
    color: 'text-blue-400',
    allowedTransitions: ['in-progress', 'closed']
  },
  {
    value: 'in-progress',
    label: 'In Progress',
    color: 'text-amber-400',
    allowedTransitions: ['resolved', 'open', 'closed']
  },
  {
    value: 'resolved',
    label: 'Resolved',
    color: 'text-green-400',
    allowedTransitions: ['closed', 'open'] // Can re-open if issue recurs
  },
  {
    value: 'closed',
    label: 'Closed',
    color: 'text-text-muted',
    allowedTransitions: ['open'] // Can re-open in exceptional cases
  },
]
```

### Pattern 4: Store Extension for Remediation
**What:** Add remediation state and actions to rctStore
**When to use:** Managing remediation data
**Example:**
```typescript
// Source: Existing rctStore patterns
interface RCTState {
  // ... existing state
  remediationPlans: RemediationPlan[]

  // Remediation actions
  createRemediationPlan: (plan: Omit<RemediationPlan, 'id' | 'createdDate'>) => string
  updateRemediationPlan: (planId: string, updates: Partial<RemediationPlan>) => void
  updateRemediationStatus: (planId: string, status: RemediationStatus) => void
  addActionItem: (planId: string, description: string) => void
  toggleActionItem: (planId: string, actionItemId: string) => void
  removeActionItem: (planId: string, actionItemId: string) => void
  deleteRemediationPlan: (planId: string) => void

  // Queries
  getRemediationForTest: (controlTestId: string) => RemediationPlan | undefined
  getRemediationForControl: (controlId: string) => RemediationPlan[]
  getOverdueRemediations: () => RemediationPlan[]
  getUpcomingRemediations: (days: number) => RemediationPlan[]
}
```

### Pattern 5: Dashboard Summary Calculations
**What:** Computed statistics for dashboard widgets
**When to use:** Rendering dashboard components
**Example:**
```typescript
// Source: Project management dashboard patterns
export function useRemediationSummary() {
  const remediationPlans = useRCTStore(state => state.remediationPlans)

  return useMemo(() => {
    const today = startOfDay(new Date())

    const byStatus = {
      open: remediationPlans.filter(p => p.status === 'open').length,
      'in-progress': remediationPlans.filter(p => p.status === 'in-progress').length,
      resolved: remediationPlans.filter(p => p.status === 'resolved').length,
      closed: remediationPlans.filter(p => p.status === 'closed').length,
    }

    const overdue = remediationPlans.filter(p =>
      p.status !== 'closed' &&
      p.status !== 'resolved' &&
      isBefore(parseISO(p.deadline), today)
    )

    const upcoming = remediationPlans.filter(p =>
      p.status !== 'closed' &&
      p.status !== 'resolved' &&
      isAfter(parseISO(p.deadline), today) &&
      isBefore(parseISO(p.deadline), addDays(today, 7))
    )

    const byPriority = {
      critical: remediationPlans.filter(p => p.priority === 'critical' && p.status !== 'closed').length,
      high: remediationPlans.filter(p => p.priority === 'high' && p.status !== 'closed').length,
      medium: remediationPlans.filter(p => p.priority === 'medium' && p.status !== 'closed').length,
      low: remediationPlans.filter(p => p.priority === 'low' && p.status !== 'closed').length,
    }

    return {
      total: remediationPlans.length,
      active: byStatus.open + byStatus['in-progress'],
      byStatus,
      overdue,
      upcoming,
      byPriority,
    }
  }, [remediationPlans])
}
```

### Pattern 6: Linking Test Findings to Remediation
**What:** Create remediation from failed/partial test
**When to use:** After recording a control test with deficiency
**Example:**
```typescript
// Source: GRC remediation workflow patterns
function handleCreateRemediation(test: ControlTest, row: RCTRow) {
  const priority = derivePriority(row.grossScore)

  createRemediationPlan({
    controlTestId: test.id,
    controlId: test.controlId,
    rowId: test.rowId,
    title: `Remediate: ${test.findings?.substring(0, 50) || 'Control deficiency'}`,
    description: test.findings,
    owner: '',  // User enters
    deadline: format(addDays(new Date(), 30), 'yyyy-MM-dd'), // Default 30 days
    status: 'open',
    priority,
    actionItems: test.recommendations
      ? [{ id: nanoid(), description: test.recommendations, completed: false }]
      : [],
  })
}
```

### Anti-Patterns to Avoid
- **Separate remediation store:** Keep remediation data in rctStore for data locality and simpler cascade delete when controls are removed
- **Complex workflow engine:** Simple status enum with manual transitions suffices; no need for state machine library
- **Duplicating risk data:** Reference rowId for risk context; don't copy gross scores (they may change)
- **Over-engineering action items:** Simple completed checkbox is enough; no need for sub-statuses or percentages
- **Mandatory fields everywhere:** Keep description, notes optional; reduce friction for quick issue capture
- **Auto-closing resolved items:** Keep resolved separate from closed; resolved means fix applied, closed means verified

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Deadline calculations | Custom date math | date-fns addDays, isBefore, isAfter | Already in project, handles edge cases |
| Date formatting | toLocaleDateString | date-fns format | Consistent formatting across app |
| Overdue detection | Manual date comparison | date-fns isBefore with startOfDay | Timezone-safe comparison |
| Table sorting/filtering | Custom implementation | @tanstack/react-table | Already used in RCT, handles all cases |
| Modal/panel UI | Custom modal | Radix Dialog | Already used for ControlPanel |
| Unique IDs | Math.random | nanoid | Already used for controls |

**Key insight:** This phase is primarily about data modeling and UI workflow, not new technical capabilities. Leverage existing patterns and libraries from Phases 3-5.

## Common Pitfalls

### Pitfall 1: Orphaned Remediation Plans
**What goes wrong:** Remediation plans reference deleted controls or tests
**Why it happens:** Cascade delete not implemented when removing controls/tests
**How to avoid:**
1. Add cascade delete in removeControl action (already removes tests)
2. Also remove remediation plans when controlId or controlTestId becomes invalid
3. Filter out orphaned plans in getters as defensive measure
**Warning signs:** Dashboard shows remediation for controls that don't exist

### Pitfall 2: Deadline Timezone Issues
**What goes wrong:** Item shows overdue at end of day, or not overdue at start
**Why it happens:** Comparing dates at timestamp level instead of day level
**How to avoid:**
1. Use startOfDay for all deadline comparisons
2. Store deadlines as date strings (yyyy-MM-dd), not full timestamps
3. Compare at day boundary, not exact moment
**Warning signs:** Overdue status flickers, varies by user timezone

### Pitfall 3: Stale Dashboard Data
**What goes wrong:** Dashboard doesn't update when remediation status changes
**Why it happens:** Not subscribing to relevant store slices
**How to avoid:**
1. Use proper Zustand selectors that trigger re-render
2. Compute derived data with useMemo keyed on source array
3. Test: change status in panel, verify dashboard updates immediately
**Warning signs:** Have to refresh page to see updated counts

### Pitfall 4: Priority Desync
**What goes wrong:** Priority doesn't reflect current risk score after risk is re-assessed
**Why it happens:** Priority captured at creation time, never updated
**How to avoid:**
1. Option A: Compute priority dynamically from current row.grossScore
2. Option B: Store priority but add note it reflects score at time of creation
3. Recommendation: Compute dynamically (Option A) - simpler, always accurate
**Warning signs:** Critical priority on low-risk items after re-assessment

### Pitfall 5: Action Item Completion Without Status Change
**What goes wrong:** All action items complete but status stays "in-progress"
**Why it happens:** No automatic promotion from in-progress to resolved
**How to avoid:**
1. Don't auto-promote (too opinionated, user may have more items to add)
2. Show visual hint when all items complete: "All items complete - update status?"
3. Require explicit status change from user
**Warning signs:** User confusion about why status didn't change

### Pitfall 6: Missing Context in Dashboard
**What goes wrong:** Dashboard shows remediation items but user can't understand context
**Why it happens:** Only showing remediation data, not linked control/risk info
**How to avoid:**
1. Include control description in table rows
2. Include risk name (from row) for context
3. Make rows clickable to navigate to ControlPanel
**Warning signs:** User has to manually search for which control/risk an item relates to

## Code Examples

Verified patterns from official sources and existing codebase:

### RemediationSection Component (in ControlPanel)
```typescript
// Source: Existing ControlTestSection pattern
function RemediationSection({ rowId, control, tests }: Props) {
  const [isExpanded, setIsExpanded] = useState(false)
  const [showForm, setShowForm] = useState(false)

  const { remediationPlans } = useRCTStore()
  const { canEditControlDefinitions } = usePermissions()

  // Get remediation plans linked to this control's tests
  const controlRemediations = useMemo(() =>
    remediationPlans.filter(p => p.controlId === control.id),
    [remediationPlans, control.id]
  )

  // Find tests that could trigger remediation (fail or partial)
  const deficientTests = tests.filter(t =>
    t.result === 'fail' || t.result === 'partial'
  )

  return (
    <div className="mt-3 pt-3 border-t border-surface-border">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex items-center gap-2 w-full text-left"
      >
        {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
        <ClipboardList size={16} className="text-text-muted" />
        <span className="text-sm font-medium text-text-primary">Remediation</span>
        {controlRemediations.length > 0 && (
          <span className="text-xs text-text-muted">
            ({controlRemediations.filter(r => r.status !== 'closed').length} active)
          </span>
        )}
      </button>

      {isExpanded && (
        <div className="mt-3 space-y-4 pl-6">
          {/* Existing remediation plans */}
          {/* Create new remediation from deficient test */}
          {/* ... */}
        </div>
      )}
    </div>
  )
}
```

### Overdue Items Widget
```typescript
// Source: Project management dashboard patterns
function OverdueWidget() {
  const { overdue } = useRemediationSummary()
  const rows = useRCTStore(state => state.rows)

  if (overdue.length === 0) {
    return (
      <div className="p-4 bg-surface-elevated rounded-lg border border-surface-border">
        <h3 className="text-sm font-medium text-text-muted mb-2">Overdue Items</h3>
        <p className="text-sm text-green-400">No overdue items</p>
      </div>
    )
  }

  return (
    <div className="p-4 bg-surface-elevated rounded-lg border border-red-500/30">
      <h3 className="text-sm font-medium text-red-400 mb-3">
        Overdue Items ({overdue.length})
      </h3>
      <div className="space-y-2 max-h-[300px] overflow-auto">
        {overdue.map(item => {
          const row = rows.find(r => r.id === item.rowId)
          const daysOverdue = differenceInDays(new Date(), parseISO(item.deadline))

          return (
            <div
              key={item.id}
              className="p-2 bg-surface-overlay rounded border border-surface-border"
            >
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <p className="text-sm text-text-primary font-medium">
                    {item.title}
                  </p>
                  <p className="text-xs text-text-muted mt-0.5">
                    {row?.riskName} - {item.owner || 'No owner'}
                  </p>
                </div>
                <span className="text-xs text-red-400 font-medium">
                  {daysOverdue}d overdue
                </span>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
```

### Status Badge Component
```typescript
// Source: Existing HeatmapCell pattern for visual indicators
const STATUS_STYLES: Record<RemediationStatus, string> = {
  'open': 'bg-blue-500/20 text-blue-400',
  'in-progress': 'bg-amber-500/20 text-amber-400',
  'resolved': 'bg-green-500/20 text-green-400',
  'closed': 'bg-surface-overlay text-text-muted',
}

function StatusBadge({ status }: { status: RemediationStatus }) {
  const config = REMEDIATION_STATUSES.find(s => s.value === status)

  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${STATUS_STYLES[status]}`}>
      {config?.label || status}
    </span>
  )
}
```

### Priority Badge Component
```typescript
// Source: GRC prioritization patterns
const PRIORITY_STYLES: Record<RemediationPlan['priority'], string> = {
  'critical': 'bg-red-500/20 text-red-400',
  'high': 'bg-orange-500/20 text-orange-400',
  'medium': 'bg-amber-500/20 text-amber-400',
  'low': 'bg-green-500/20 text-green-400',
}

function PriorityBadge({ priority }: { priority: RemediationPlan['priority'] }) {
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium capitalize ${PRIORITY_STYLES[priority]}`}>
      {priority}
    </span>
  )
}
```

### Action Items Checklist
```typescript
// Source: Task management patterns
function ActionItemsList({ planId, items, readonly }: Props) {
  const { toggleActionItem, removeActionItem, addActionItem } = useRCTStore()
  const [newItem, setNewItem] = useState('')

  const completedCount = items.filter(i => i.completed).length

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="text-xs text-text-muted">
          Action Items ({completedCount}/{items.length})
        </label>
        {completedCount === items.length && items.length > 0 && (
          <span className="text-xs text-green-400">All complete</span>
        )}
      </div>

      <div className="space-y-1">
        {items.map(item => (
          <div key={item.id} className="flex items-start gap-2 group">
            <input
              type="checkbox"
              checked={item.completed}
              onChange={() => !readonly && toggleActionItem(planId, item.id)}
              disabled={readonly}
              className="mt-1 accent-accent-500"
            />
            <span className={clsx(
              'text-sm flex-1',
              item.completed ? 'text-text-muted line-through' : 'text-text-primary'
            )}>
              {item.description}
            </span>
            {!readonly && (
              <button
                onClick={() => removeActionItem(planId, item.id)}
                className="opacity-0 group-hover:opacity-100 p-1 text-text-muted hover:text-red-400 transition-all"
              >
                <X size={14} />
              </button>
            )}
          </div>
        ))}
      </div>

      {!readonly && (
        <div className="flex gap-2">
          <input
            type="text"
            value={newItem}
            onChange={(e) => setNewItem(e.target.value)}
            placeholder="Add action item..."
            className="flex-1 px-2 py-1 text-sm bg-surface-overlay border border-surface-border rounded"
            onKeyDown={(e) => {
              if (e.key === 'Enter' && newItem.trim()) {
                addActionItem(planId, newItem.trim())
                setNewItem('')
              }
            }}
          />
          <button
            onClick={() => {
              if (newItem.trim()) {
                addActionItem(planId, newItem.trim())
                setNewItem('')
              }
            }}
            disabled={!newItem.trim()}
            className="px-2 py-1 text-sm text-accent-400 hover:text-accent-300 disabled:opacity-50"
          >
            Add
          </button>
        </div>
      )}
    </div>
  )
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Spreadsheet issue tracking | Integrated GRC platforms | 2020+ | Real-time visibility, audit trail |
| Email-based assignments | In-app owner assignment | 2018+ | Accountability, no lost threads |
| Manual deadline tracking | Automated overdue alerts | 2019+ | Proactive remediation |
| Separate issue management | Linked to control testing | 2020+ | Full context, traceability |
| Static priority | Risk-based priority | 2021+ | Dynamic, accurate prioritization |

**Deprecated/outdated:**
- **Separate issue tracking system:** Modern GRC integrates issue management with control testing
- **Email notifications:** For a demo, visual dashboard is more effective than notifications
- **Complex approval workflows:** Multi-step approval adds friction; single owner model suffices for demo

## Open Questions

Things that couldn't be fully resolved:

1. **Dashboard placement in navigation**
   - What we know: Need a new page for remediation dashboard
   - What's unclear: Should it be top-level nav item or sub-item?
   - Recommendation: Add as top-level nav item with Clipboard/ListChecks icon; importance warrants visibility

2. **Remediation without test finding**
   - What we know: Main use case is remediation from failed/partial tests
   - What's unclear: Should users create standalone remediation not linked to test?
   - Recommendation: Support both - linked to test (prefilled) or standalone (manual entry)

3. **Action item granularity**
   - What we know: Simple completed checkbox is minimum viable
   - What's unclear: Whether users need due dates per action item
   - Recommendation: Start with simple boolean; add per-item dates if feedback requires

4. **Remediation history/audit**
   - What we know: GRC best practices require change history
   - What's unclear: Level of detail needed for demo
   - Recommendation: Defer full audit trail to Phase 9; track createdDate, resolvedDate, closedDate for now

5. **Role permissions for remediation**
   - What we know: Both roles can view; unclear who can create/edit
   - Recommendation: Risk Manager can create/edit/delete; Control Owner can view and add action items to plans assigned to them (consistent with test recording permissions)

## Sources

### Primary (HIGH confidence)
- Existing codebase: ControlTestSection.tsx, rctStore.ts, types/rct.ts patterns
- [date-fns documentation](https://date-fns.org/) - isBefore, isAfter, addDays, differenceInDays
- [Oracle Risk Management - Incident Status](https://docs.oracle.com/en/cloud/saas/risk-management-and-compliance/25d/faacm/incident-status-and-state.html) - Status workflow model

### Secondary (MEDIUM confidence)
- [TrustCloud Controls Remediation Guide](https://community.trustcloud.ai/docs/grc-launchpad/grc-101/risk-management/a-step-by-step-guide-to-controls-remediation-planning/) - GRC remediation best practices
- [Monday.com Risk Management Software](https://monday.com/blog/project-management/risk-management-software/) - Dashboard patterns
- [ProjectManagement.com Risk Status Discussion](https://www.projectmanagement.com/discussion-topic/28632/What-are-all-Various-Risk-Status-in-Project-) - Status definitions
- [Atlassian Issue Statuses](https://support.atlassian.com/jira-cloud-administration/docs/what-are-issue-statuses-priorities-and-resolutions/) - Status/priority patterns

### Tertiary (LOW confidence)
- [shadcn/ui Kanban Component](https://www.shadcn.io/components/data/kanban) - UI pattern reference (not used, but validated table approach is simpler)
- WebSearch results for GRC remediation - general patterns

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - No new libraries, builds on existing infrastructure
- Architecture: HIGH - Extends established patterns from Phases 3-5
- Data model: HIGH - Based on Oracle GRC and industry standards
- UI patterns: HIGH - Follows existing ControlPanel/ControlTestSection patterns
- Pitfalls: MEDIUM - Based on known patterns but demo-specific edge cases may emerge

**Research date:** 2026-01-21
**Valid until:** 2026-02-21 (30 days - stable domain, no library changes)
