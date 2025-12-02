# Phase 16: Four-Eye Approval - Research

**Researched:** 2026-01-23
**Domain:** Approval Workflow / Maker-Checker Pattern
**Confidence:** HIGH

## Summary

The four-eye principle (maker-checker pattern) is a well-established governance workflow where changes initiated by a "maker" require approval by a "checker" before taking effect. For RiskGuard ERM, this requires:

1. A new "Manager" role with elevated permissions above Risk Manager
2. A pending changes system that stores proposed modifications without immediately applying them
3. Side-by-side diff display for reviewing current vs. proposed values
4. An approval queue for bulk processing with optional rejection reasons
5. Integration with the existing audit trail for compliance tracking

The implementation follows standard patterns in the current codebase: Zustand store with immer middleware for state management, new TypeScript types for approval entities, Radix UI primitives for dialogs/interactions, and TailwindCSS for styling.

**Primary recommendation:** Create a dedicated `approvalStore.ts` that manages pending changes, approval settings, and notification state, with approval-aware wrapper functions for existing store actions.

## Standard Stack

The established libraries/tools for this domain:

### Core (Already in Project)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| zustand | ^5.0.10 | State management | Already used throughout; handles approval state seamlessly |
| immer | ^11.1.3 | Immutable updates | Already integrated; simplifies nested pending change updates |
| nanoid | (in zustand) | ID generation | Consistent with existing entity IDs |
| @radix-ui/react-dialog | ^1.1.15 | Modal dialogs | Approval queue modal, side-by-side comparison |
| @radix-ui/react-alert-dialog | ^1.1.15 | Confirmation dialogs | Approve/reject confirmations |
| @tanstack/react-table | ^8.21.3 | Data tables | Approval queue display with sorting/filtering |
| date-fns | ^4.1.0 | Date formatting | Timestamps, relative time display |
| lucide-react | ^0.562.0 | Icons | Check, X, Clock, AlertTriangle for status indicators |

### Supporting (May Add)
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| deep-object-diff | ^1.1.9 | Object diff | Already in project; use for computing field changes |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Custom diff | react-diff-viewer | Overkill for field-level comparison; custom is simpler |
| Zustand middleware | Separate approval layer | Middleware adds complexity; explicit wrapper functions cleaner |

**Installation:**
No new dependencies required. All needed libraries already present in package.json.

## Architecture Patterns

### Recommended Project Structure
```
src/
├── types/
│   └── approval.ts              # PendingChange, ApprovalSettings, ApprovalStatus types
├── stores/
│   └── approvalStore.ts         # Pending changes, settings, notification counts
├── hooks/
│   ├── usePermissions.ts        # Extended with Manager role permissions
│   └── useApproval.ts           # Hook for approval-aware entity updates
├── components/
│   └── approval/
│       ├── ApprovalQueue.tsx    # Full-page approval queue with table
│       ├── ApprovalQueueRow.tsx # Individual pending change row
│       ├── DiffViewer.tsx       # Side-by-side current vs proposed
│       ├── ApprovalBadge.tsx    # Visual indicator on entities
│       ├── ApprovalSettings.tsx # Global/per-entity toggle UI
│       └── index.ts             # Barrel export
├── pages/
│   └── ApprovalPage.tsx         # Dedicated approval queue page
```

### Pattern 1: Pending Change Entity Model
**What:** Store proposed changes as separate entities referencing originals
**When to use:** When changes must be reviewed before application
**Example:**
```typescript
// Types derived from existing codebase patterns
interface PendingChange {
  id: string                          // nanoid
  entityType: 'control' | 'risk' | 'process'
  entityId: string                    // ID of entity being modified
  entityName: string                  // Captured name for display
  changeType: 'create' | 'update' | 'delete'
  proposedValues: Record<string, unknown>  // New values (full object for create, partial for update)
  currentValues: Record<string, unknown>   // Snapshot of current state
  status: 'pending' | 'approved' | 'rejected'
  submittedBy: string                 // Role who made the change
  submittedAt: string                 // ISO timestamp
  reviewedBy?: string                 // Manager who reviewed
  reviewedAt?: string                 // ISO timestamp
  rejectionReason?: string            // Optional reason text
  version: number                     // For multiple pending versions (increment on re-edit)
}

interface ApprovalSettings {
  globalEnabled: boolean              // Master toggle
  requireForNewControls: boolean      // New control creation requires approval
  entityOverrides: Record<string, boolean>  // Per-entity enable/disable
}
```

### Pattern 2: Approval-Aware Store Actions
**What:** Wrapper functions that route changes through approval when required
**When to use:** For all entity modifications subject to four-eye
**Example:**
```typescript
// In a hook or utility
function useApprovalAwareUpdate() {
  const { selectedRole } = useUIStore()
  const { globalEnabled, entityOverrides } = useApprovalStore()
  const { createPendingChange } = useApprovalStore()
  const { updateControl } = useControlsStore()

  const updateControlWithApproval = (controlId: string, updates: Partial<Control>) => {
    const requiresApproval = globalEnabled || entityOverrides[controlId]

    if (requiresApproval && selectedRole !== 'manager') {
      // Create pending change instead of direct update
      createPendingChange({
        entityType: 'control',
        entityId: controlId,
        changeType: 'update',
        proposedValues: updates,
        submittedBy: selectedRole,
      })
    } else {
      // Direct update (Manager or approval not required)
      updateControl(controlId, updates)
    }
  }

  return { updateControlWithApproval }
}
```

### Pattern 3: Role Extension
**What:** Extend existing role system to include Manager
**When to use:** Adding new permission tier
**Example:**
```typescript
// uiStore.ts - Extended type
type UserRole = 'manager' | 'risk-manager' | 'control-owner'

// usePermissions.ts - Extended permissions
export function usePermissions() {
  const role = useUIStore((state) => state.selectedRole)
  const isManager = role === 'manager'
  const isRiskManager = role === 'risk-manager' || isManager // Manager inherits RM permissions

  return {
    // Existing permissions (Manager inherits all)
    canEditGrossScores: isRiskManager,
    canEditControlDefinitions: isRiskManager,
    // ...other existing...

    // New Manager-only permissions
    canApproveChanges: isManager,
    canRejectChanges: isManager,
    canToggleFourEye: isManager,
    canRegenerateRCT: isManager,  // Moved from all users to Manager only
  }
}
```

### Anti-Patterns to Avoid
- **Duplicating entity data in pending changes:** Store only the diff, not full copies. Reference currentValues for comparison.
- **Modifying original entities for pending state:** Keep pending state in approvalStore, not by adding fields to Control/Risk/Process types.
- **Complex state machines:** Simple status enum (pending/approved/rejected) is sufficient. Avoid XState for this use case.
- **Blocking UI during approval:** Users should see pending indicators but still be able to work on other items.

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Object diffing | Manual field comparison | deep-object-diff (already in project) | Handles nested objects, arrays, edge cases |
| Timestamp formatting | Custom date formatting | date-fns formatDistanceToNow, format | Already used; handles locales, relative time |
| Unique IDs | uuid, Math.random | nanoid (via Zustand pattern) | Consistent with codebase, shorter IDs |
| Modal behavior | Custom portals | Radix Dialog | Accessibility, focus management, portal handling |
| Table sorting/filtering | Custom sort | TanStack Table | Already used for RCT; row selection, bulk actions |

**Key insight:** The codebase already has all necessary utilities. No new dependencies needed.

## Common Pitfalls

### Pitfall 1: Race Conditions on Concurrent Edits
**What goes wrong:** Two Risk Managers edit same control; one's pending change references stale data
**Why it happens:** currentValues snapshot taken at submission time becomes outdated
**How to avoid:**
- Store only proposedValues (the delta)
- Recompute currentValues when displaying comparison
- Add version/timestamp conflict detection on approval
**Warning signs:** Approved change overwrites newer direct Manager edits

### Pitfall 2: Orphaned Pending Changes
**What goes wrong:** Entity deleted while pending change exists; approval crashes or creates invalid state
**Why it happens:** No cleanup hook when entities are deleted
**How to avoid:**
- Add cleanup logic in entity delete actions to auto-reject related pending changes
- Display "Entity deleted" status for orphaned pending changes
**Warning signs:** Errors when viewing approval queue, "not found" on approval

### Pitfall 3: Permission Escalation via Role Switch
**What goes wrong:** User switches to Manager role in demo mode and approves their own changes
**Why it happens:** Demo mode allows free role switching
**How to avoid:**
- In demo mode, this is acceptable (single-user testing)
- For production, role would come from auth system, not UI toggle
- Document that demo mode bypasses maker-checker separation
**Warning signs:** Same user submits and approves (acceptable in demo)

### Pitfall 4: UI State Desync After Approval
**What goes wrong:** Approval queue shows change as pending after Manager approved it
**Why it happens:** Component not subscribed to correct store slice
**How to avoid:**
- Use Zustand selectors properly
- Ensure approval status change triggers re-render in queue
**Warning signs:** Need to refresh page to see approval results

### Pitfall 5: Audit Trail Gaps
**What goes wrong:** Approved changes not logged to audit, or logged twice
**Why it happens:** Audit logging in both pending creation and final application
**How to avoid:**
- Log pending change creation as "proposed" entry
- Log approval/rejection as separate audit entry
- Final application logs normally through existing store actions
**Warning signs:** Audit trail missing "proposed" or "approved" entries

## Code Examples

Verified patterns from existing codebase:

### Store Pattern (from ticketsStore.ts)
```typescript
// Source: src/stores/ticketsStore.ts
export const useApprovalStore = create<ApprovalState>()(
  persist(
    immer((set, get) => ({
      pendingChanges: [],
      settings: {
        globalEnabled: false,
        requireForNewControls: false,
        entityOverrides: {},
      },

      createPendingChange: (change) => {
        const id = nanoid()
        const role = useUIStore.getState().selectedRole

        set((state) => {
          const newChange: PendingChange = {
            ...change,
            id,
            status: 'pending',
            submittedAt: new Date().toISOString(),
            submittedBy: role,
            version: 1,
          }
          state.pendingChanges.push(newChange)
        })

        // Log to audit
        useAuditStore.getState().addEntry({
          timestamp: new Date().toISOString(),
          entityType: change.entityType,
          entityId: change.entityId,
          entityName: change.entityName,
          changeType: 'proposed', // Custom change type for proposals
          fieldChanges: Object.entries(change.proposedValues).map(([field, value]) => ({
            field,
            oldValue: change.currentValues?.[field],
            newValue: value,
          })),
          user: role,
        })

        return id
      },

      approveChange: (pendingId) => {
        const state = get()
        const pending = state.pendingChanges.find(p => p.id === pendingId)
        if (!pending || pending.status !== 'pending') return

        // Apply the change to the actual store
        applyPendingChange(pending)

        // Update pending change status
        set((state) => {
          const idx = state.pendingChanges.findIndex(p => p.id === pendingId)
          if (idx !== -1) {
            state.pendingChanges[idx].status = 'approved'
            state.pendingChanges[idx].reviewedAt = new Date().toISOString()
            state.pendingChanges[idx].reviewedBy = useUIStore.getState().selectedRole
          }
        })
      },
      // ... reject, getPendingCount, etc.
    })),
    {
      name: 'riskguard-approval',
      storage: createJSONStorage(() => localStorage),
    }
  )
)
```

### Permission Check Pattern (from usePermissions.ts)
```typescript
// Source: src/hooks/usePermissions.ts
export function usePermissions() {
  const role = useUIStore((state) => state.selectedRole)
  const isManager = role === 'manager'
  const isRiskManager = role === 'risk-manager' || isManager

  return {
    // Manager inherits all Risk Manager permissions
    canEditGrossScores: isRiskManager,
    canEditNetScores: isRiskManager,
    canEditControlDefinitions: isRiskManager,
    canEditTaxonomies: isRiskManager,

    // Manager-only permissions
    canApproveChanges: isManager,
    canRejectChanges: isManager,
    canToggleFourEye: isManager,
    canRegenerateRCT: isManager,

    // Role checks
    role,
    isManager,
    isRiskManager,
    isControlOwner: role === 'control-owner',
  }
}
```

### Badge Component Pattern (from TicketCard.tsx)
```typescript
// Pattern from existing badge displays
function ApprovalBadge({ status }: { status: 'pending' | 'rejected' }) {
  if (status === 'pending') {
    return (
      <span className="px-1.5 py-0.5 text-xs bg-amber-500/20 text-amber-400 rounded flex items-center gap-1">
        <Clock size={10} />
        Pending
      </span>
    )
  }
  if (status === 'rejected') {
    return (
      <span className="px-1.5 py-0.5 text-xs bg-red-500/20 text-red-400 rounded flex items-center gap-1">
        <X size={10} />
        Rejected
      </span>
    )
  }
  return null
}
```

### Side-by-Side Diff Pattern
```typescript
// Custom component for field-level comparison
interface DiffViewerProps {
  currentValues: Record<string, unknown>
  proposedValues: Record<string, unknown>
  fieldLabels?: Record<string, string>
}

function DiffViewer({ currentValues, proposedValues, fieldLabels = {} }: DiffViewerProps) {
  const changedFields = Object.keys(proposedValues)

  return (
    <div className="grid grid-cols-2 gap-4">
      <div className="text-text-muted text-xs uppercase tracking-wide mb-2">Current</div>
      <div className="text-text-muted text-xs uppercase tracking-wide mb-2">Proposed</div>

      {changedFields.map(field => (
        <React.Fragment key={field}>
          <div className="p-2 bg-red-500/10 rounded border border-red-500/20">
            <div className="text-xs text-text-muted mb-1">{fieldLabels[field] || field}</div>
            <div className="text-sm text-text-primary">{String(currentValues[field] ?? '-')}</div>
          </div>
          <div className="p-2 bg-green-500/10 rounded border border-green-500/20">
            <div className="text-xs text-text-muted mb-1">{fieldLabels[field] || field}</div>
            <div className="text-sm text-text-primary">{String(proposedValues[field])}</div>
          </div>
        </React.Fragment>
      ))}
    </div>
  )
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Redux with sagas | Zustand with immer | 2023-2024 | Simpler, less boilerplate |
| External workflow engines | In-app state with audit trail | Current | No external dependencies |
| Full entity cloning | Delta-only pending storage | Current best practice | Less storage, cleaner diffs |

**Deprecated/outdated:**
- XState for simple approval flows: Overkill unless complex state machine needed
- React Context for approval state: Zustand already in use, better performance

## Open Questions

Things that couldn't be fully resolved:

1. **Notification persistence**
   - What we know: Nav badge + dashboard widget for pending counts
   - What's unclear: Should dismissed notifications persist across sessions?
   - Recommendation: Persist notification dismissal state in localStorage (via Zustand persist)

2. **Bulk approval conflict handling**
   - What we know: Manager can bulk approve multiple items
   - What's unclear: What if one item in batch has a conflict?
   - Recommendation: Skip conflicted items, show summary of what succeeded/failed

3. **History depth for pending versions**
   - What we know: Risk Manager can re-edit, creating versions
   - What's unclear: How many versions to retain? When to prune?
   - Recommendation: Keep last 5 versions per entity, prune on approval

## Sources

### Primary (HIGH confidence)
- Existing codebase analysis: `src/stores/*.ts`, `src/hooks/usePermissions.ts`, `src/types/*.ts`
- Current project package.json: All required dependencies already present

### Secondary (MEDIUM confidence)
- [Maker-Checker Wikipedia](https://en.wikipedia.org/wiki/Maker-checker) - Standard pattern definition
- [Implementation of Maker and Checker Principle](https://www.linkedin.com/pulse/implementation-maker-checker-4-eyes-principle-ajendra-singh) - Implementation guidelines
- [Zustand GitHub](https://github.com/pmndrs/zustand) - State management patterns
- [TanStack Table Docs](https://tanstack.com/table/latest) - Table with row selection for bulk actions

### Tertiary (LOW confidence)
- [react-diff-viewer](https://github.com/praneshr/react-diff-viewer) - Reference only; custom implementation recommended for simplicity

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - All libraries already in project, patterns established
- Architecture: HIGH - Follows existing codebase conventions exactly
- Pitfalls: MEDIUM - Based on general approval workflow experience, not project-specific testing

**Research date:** 2026-01-23
**Valid until:** 60 days (stable requirements, no external API dependencies)
