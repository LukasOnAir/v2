# Phase 20: Control Tester Interface - Research

**Researched:** 2026-01-24
**Domain:** Role-Based Access Control, Restricted Views, Control Testing
**Confidence:** HIGH

## Summary

This phase implements a new "Control Tester" role - a first-line worker with a highly restricted view showing only their assigned controls. The research focuses on extending the existing role-based permissions system, introducing control assignment, creating a dedicated simplified interface, and integrating with the established test recording flow.

The existing codebase provides an excellent foundation: `usePermissions` hook for role gating, `uiStore` for role state, existing test recording via `ControlTestSection` and `ControlTestForm`, and a clear pattern for page layouts. The primary challenge is introducing the concept of "control assignment" (which control belongs to which tester) since this doesn't exist yet.

**Primary recommendation:** Add `control-tester` to the `AppRole` type, extend `usePermissions` with tester-specific permissions, add `assignedTesterId` field to the Control interface, and create a dedicated `/tester` route with a `TesterDashboardPage` that filters controls by the current user's ID.

## Standard Stack

The phase uses existing libraries - no new dependencies required.

### Core (Already in Project)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| React | 18.x | UI framework | Already in use |
| Zustand | 4.x + immer | State management | Already in use for all stores |
| react-router | 7.x | Routing | Already in use for navigation |
| date-fns | 3.x | Date operations | Already used for test scheduling |
| Lucide React | - | Icons | Already used throughout app |

### Supporting (Already in Project)
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| clsx | - | Conditional classes | Already used for styling |
| Radix UI | - | Accessible primitives | Already used for dialogs, dropdowns |
| Sonner | - | Toast notifications | Already used for feedback |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Simple `assignedTesterId` field | Separate assignment store | Over-engineering for demo scope - field on Control is simpler |
| New TesterLayout component | Role-filtered existing Layout | Dedicated layout gives cleaner UX, worth the additional component |
| Hardcoded tester ID | Auth-based user ID | Demo doesn't have real auth, use dropdown selector pattern |

**Installation:** No new packages needed.

## Architecture Patterns

### Recommended Project Structure
```
src/
├── types/
│   └── rct.ts                  # Add assignedTesterId to Control interface
├── stores/
│   └── uiStore.ts              # Extend AppRole union type
├── hooks/
│   └── usePermissions.ts       # Add tester-specific permissions
├── components/
│   ├── layout/
│   │   ├── Header.tsx          # Add Control Tester to role selector
│   │   ├── Sidebar.tsx         # Conditionally render based on role
│   │   └── TesterLayout.tsx    # NEW: Simplified layout for testers
│   └── tester/
│       ├── TesterControlCard.tsx   # NEW: Control card with test actions
│       ├── TesterScheduleList.tsx  # NEW: Upcoming tests list
│       └── index.ts                # Barrel export
├── pages/
│   └── TesterDashboardPage.tsx # NEW: Main tester interface
└── App.tsx                     # Add /tester route with TesterLayout
```

### Pattern 1: Extending the Role Type
**What:** Add 'control-tester' to the existing AppRole union type
**When to use:** When introducing a new role to the existing hierarchy
**Example:**
```typescript
// src/stores/uiStore.ts
// Source: Existing codebase pattern

/** Available roles in the application */
export type AppRole = 'manager' | 'risk-manager' | 'control-owner' | 'control-tester'
```

### Pattern 2: Pessimistic Permission Handling
**What:** Deny access by default, only show elements when permission explicitly granted
**When to use:** For restricted role views like Control Tester
**Example:**
```typescript
// src/hooks/usePermissions.ts
// Pattern from: https://marmelab.com/react-admin/AuthRBAC.html

export function usePermissions() {
  const role = useUIStore((state) => state.selectedRole)
  const isControlTester = role === 'control-tester'

  return {
    // ... existing permissions ...

    // Control Tester: most restrictive role
    isControlTester,
    canViewTaxonomies: !isControlTester,        // Tester cannot see taxonomies
    canViewMatrix: !isControlTester,            // Tester cannot see matrix
    canViewAnalytics: !isControlTester,         // Tester cannot see analytics
    canViewAssignedControlsOnly: isControlTester, // Flag for filtered views
    canRecordTestResults: true,                 // All roles including tester
  }
}
```

### Pattern 3: Role-Specific Routing
**What:** Different route/layout structure for different roles
**When to use:** When a role needs fundamentally different navigation/UI
**Example:**
```typescript
// src/App.tsx
// Source: Existing routing pattern + role-based adaptation

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="login" element={<LoginPage />} />
        <Route element={<ProtectedRoute />}>
          {/* Main app for Manager, Risk Manager, Control Owner */}
          <Route element={<Layout />}>
            <Route index element={<Navigate to="/taxonomy" replace />} />
            {/* ... existing routes ... */}
          </Route>

          {/* Simplified interface for Control Tester */}
          <Route element={<TesterLayout />}>
            <Route path="tester" element={<TesterDashboardPage />} />
          </Route>
        </Route>
      </Routes>
    </BrowserRouter>
  )
}
```

### Pattern 4: Control Assignment via Field
**What:** Simple `assignedTesterId` field on Control interface
**When to use:** For demo-scope assignment without complex user management
**Example:**
```typescript
// src/types/rct.ts
// Source: Existing Control interface extension pattern

export interface Control {
  id: string
  name: string
  // ... existing fields ...

  // Tester assignment
  assignedTesterId: string | null  // null = unassigned
}
```

### Pattern 5: Filtered Data Hooks
**What:** Custom hook that returns only data relevant to the current user/role
**When to use:** When a role should only see a subset of data
**Example:**
```typescript
// src/hooks/useTesterControls.ts (NEW)

export function useTesterControls() {
  const testerId = useUIStore((state) => state.currentTesterId)
  const { controls, controlLinks } = useControlsStore()

  // Filter to only assigned controls
  const assignedControls = useMemo(() =>
    controls.filter(c => c.assignedTesterId === testerId),
    [controls, testerId]
  )

  // Get overdue, due soon, etc.
  const overdueControls = useMemo(() =>
    assignedControls.filter(c => isTestOverdue(c.nextTestDate)),
    [assignedControls]
  )

  return { assignedControls, overdueControls, ... }
}
```

### Anti-Patterns to Avoid
- **Prop drilling role everywhere:** Use the existing `usePermissions` hook pattern
- **Duplicating test recording logic:** Reuse `ControlTestForm` component
- **Creating parallel data structures:** Filter existing data, don't duplicate
- **Hardcoding tester IDs:** Use configurable selector in UI for demo flexibility

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Role-based conditional rendering | Custom role checks | `usePermissions` hook | Centralized, consistent |
| Test recording form | New form component | `ControlTestForm` | Already handles all fields |
| Date calculations | Manual date math | `date-fns` utilities | `isTestOverdue`, `formatTestDate` exist |
| Toast notifications | Alert/modal | `sonner` toast | Already configured with dark theme |
| Dialog/modal UI | Custom dialog | Radix `Dialog` | Already used throughout app |
| Route protection | Custom guards | `ProtectedRoute` | Already handles auth redirect |

**Key insight:** The existing codebase has mature patterns for permissions, testing, and UI. The main work is filtering/restricting rather than building new functionality.

## Common Pitfalls

### Pitfall 1: Forgetting to Filter Navigation
**What goes wrong:** Tester sees full sidebar with taxonomy, matrix, analytics links
**Why it happens:** Only filtering page content, not navigation
**How to avoid:** Conditionally render sidebar items based on `usePermissions`
**Warning signs:** Tester can navigate to pages they shouldn't access

### Pitfall 2: Tight Coupling Tester ID to Auth
**What goes wrong:** Tester assignment requires real authentication system
**Why it happens:** Overengineering for demo scope
**How to avoid:** Use same pattern as role - dropdown selector for demo
**Warning signs:** Complex auth flows for a demo feature

### Pitfall 3: Breaking Existing Test Recording
**What goes wrong:** Changes to ControlTestForm break other roles
**Why it happens:** Modifying shared component for tester-specific needs
**How to avoid:** Reuse component as-is, wrap if additional context needed
**Warning signs:** Risk Manager/Control Owner can't record tests

### Pitfall 4: Not Updating Control Type
**What goes wrong:** `assignedTesterId` field added but not persisted
**Why it happens:** Forgetting to update store migration or default values
**How to avoid:** Add field with `null` default, update store actions
**Warning signs:** Assignments lost on refresh

### Pitfall 5: Inconsistent Role Hierarchy
**What goes wrong:** Control Tester accidentally inherits permissions
**Why it happens:** Copy-paste from `isRiskManager` inheritance pattern
**How to avoid:** Control Tester should NOT inherit from anyone - most restrictive
**Warning signs:** Tester can edit control definitions

## Code Examples

Verified patterns from existing codebase:

### Extending AppRole Type
```typescript
// src/stores/uiStore.ts
// Source: Existing codebase

export type AppRole = 'manager' | 'risk-manager' | 'control-owner' | 'control-tester'
```

### Updated usePermissions Hook
```typescript
// src/hooks/usePermissions.ts
// Source: Existing codebase pattern

export function usePermissions() {
  const role = useUIStore((state) => state.selectedRole)
  const isManager = role === 'manager'
  const isRiskManager = role === 'risk-manager' || isManager
  const isControlOwner = role === 'control-owner'
  const isControlTester = role === 'control-tester'

  return {
    // Existing permissions unchanged...
    canEditGrossScores: isRiskManager,
    canEditNetScores: isRiskManager,
    canEditControlDefinitions: isRiskManager,
    canEditControlAssessments: isRiskManager,
    canEditTaxonomies: isRiskManager,
    canManageCustomColumns: isRiskManager,
    canEditCustomColumnValues: isRiskManager,
    canViewAll: !isControlTester,  // Tester has restricted view
    canSubmitChangeRequests: isControlOwner,  // Tester cannot submit change requests
    canRecordTestResults: true,  // All roles including tester
    canEditTestSchedule: isRiskManager,
    canViewTestHistory: true,
    canApproveChanges: isManager,
    canRejectChanges: isManager,
    canToggleFourEye: isManager,
    canRegenerateRCT: isManager,

    // New tester-specific permissions
    isControlTester,
    canViewTaxonomies: !isControlTester,
    canViewRCT: !isControlTester,
    canViewControls: !isControlTester,  // Controls Hub (full)
    canViewMatrix: !isControlTester,
    canViewSunburst: !isControlTester,
    canViewRemediation: !isControlTester,
    canViewTickets: !isControlTester,
    canViewAudit: !isControlTester,
    canViewApproval: isManager,  // Already restricted
    canViewAnalytics: !isControlTester,
    canViewKnowledgeBase: !isControlTester,

    // Utility
    role,
    isManager,
    isRiskManager,
    isControlOwner,
  }
}
```

### Conditional Sidebar Rendering
```typescript
// src/components/layout/Sidebar.tsx
// Source: Existing codebase pattern

const navItems = [
  { to: '/taxonomy', icon: Folders, label: 'Taxonomies', permission: 'canViewTaxonomies' },
  { to: '/rct', icon: Table, label: 'Risk Control Table', permission: 'canViewRCT' },
  // ... etc
]

export function Sidebar() {
  const permissions = usePermissions()

  return (
    <aside>
      <nav>
        <ul>
          {navItems
            .filter(item => !item.permission || permissions[item.permission])
            .map(item => (
              <li key={item.to}>
                <NavLink to={item.to}>...</NavLink>
              </li>
            ))}
        </ul>
      </nav>
    </aside>
  )
}
```

### TesterDashboardPage Structure
```typescript
// src/pages/TesterDashboardPage.tsx
// Source: Pattern from existing ControlsPage

export function TesterDashboardPage() {
  const controls = useControlsStore(state => state.controls)
  const currentTesterId = useUIStore(state => state.currentTesterId)

  // Filter to assigned controls only
  const assignedControls = useMemo(() =>
    controls.filter(c => c.assignedTesterId === currentTesterId),
    [controls, currentTesterId]
  )

  const overdueControls = useMemo(() =>
    assignedControls.filter(c => isTestOverdue(c.nextTestDate)),
    [assignedControls]
  )

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="p-6 border-b border-surface-border">
        <h1 className="text-xl font-semibold text-text-primary">My Controls</h1>
        <p className="text-sm text-text-secondary">
          {assignedControls.length} assigned | {overdueControls.length} overdue
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-3 gap-4 p-6">
        <StatCard title="Assigned" value={assignedControls.length} />
        <StatCard title="Due Soon" value={dueSoonCount} variant="warning" />
        <StatCard title="Overdue" value={overdueControls.length} variant="danger" />
      </div>

      {/* Controls List */}
      <div className="flex-1 overflow-auto p-6">
        {assignedControls.map(control => (
          <TesterControlCard key={control.id} control={control} />
        ))}
      </div>
    </div>
  )
}
```

### TesterLayout Component
```typescript
// src/components/layout/TesterLayout.tsx
// Source: Existing Layout pattern, simplified

export function TesterLayout() {
  return (
    <div className="h-screen flex flex-col bg-surface-base">
      <TesterHeader />  {/* Simplified header for testers */}
      <main className="flex-1 overflow-auto">
        <Outlet />
      </main>
    </div>
  )
}
```

### Header Role Selector Update
```typescript
// src/components/layout/Header.tsx
// Source: Existing codebase

<select
  value={selectedRole}
  onChange={(e) => setSelectedRole(e.target.value as AppRole)}
  className="..."
>
  <option value="manager">Manager</option>
  <option value="risk-manager">Risk Manager</option>
  <option value="control-owner">Control Owner</option>
  <option value="control-tester">Control Tester</option>  {/* NEW */}
</select>
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Prop-drilling permissions | Custom hooks (usePermissions) | Standard | Cleaner code, centralized logic |
| Hardcoded role checks | Union type + switch | Standard | Type safety, exhaustive checks |
| Separate pages per role | Conditional rendering | Standard | Less code duplication |

**Current best practice:**
- Pessimistic permission handling (deny by default)
- Centralized permission hook
- Role-based route filtering (not just content hiding)
- Type-safe role definitions with TypeScript unions

## Open Questions

Things that couldn't be fully resolved:

1. **How to identify "current tester" in demo mode?**
   - What we know: No real auth system, using role selector dropdown
   - What's unclear: Should there be a separate "tester ID" dropdown or use a fixed demo ID?
   - Recommendation: Add `currentTesterId` to uiStore with a simple dropdown selector, defaulting to "tester-1" for demo

2. **Should Control Tester see test history from other testers?**
   - What we know: Test records include `testerName` field
   - What's unclear: Should tester see full history or only their own tests?
   - Recommendation: Show full history (read-only) since tests are on the control, not personal

3. **What happens when tester selects a role with no assigned controls?**
   - What we know: Controls have `assignedTesterId`, could be null
   - What's unclear: Empty state UX
   - Recommendation: Show friendly empty state with "No controls assigned. Contact your Risk Manager."

## Sources

### Primary (HIGH confidence)
- Existing codebase: `src/hooks/usePermissions.ts` - role permission patterns
- Existing codebase: `src/stores/uiStore.ts` - role state management
- Existing codebase: `src/components/rct/ControlTestSection.tsx` - test recording flow
- Existing codebase: `src/components/layout/Sidebar.tsx` - navigation patterns

### Secondary (MEDIUM confidence)
- [React-admin RBAC Documentation](https://marmelab.com/react-admin/AuthRBAC.html) - Pessimistic permission handling pattern
- [Implementing RBAC in React](https://www.permit.io/blog/implementing-react-rbac-authorization) - Role hierarchy patterns
- [Cerbos RBAC Guide](https://www.cerbos.dev/blog/how-to-use-react-js-for-secure-role-based-access-control) - Conditional rendering patterns

### Tertiary (LOW confidence)
- General React RBAC patterns from web search - verified against existing codebase patterns

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - Using existing libraries, no new dependencies
- Architecture: HIGH - Follows established codebase patterns
- Pitfalls: HIGH - Based on codebase analysis and common RBAC issues

**Research date:** 2026-01-24
**Valid until:** 30 days (stable patterns, demo-scope feature)
