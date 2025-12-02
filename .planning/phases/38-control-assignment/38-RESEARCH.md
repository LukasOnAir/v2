# Phase 38: Control Assignment & Hub Parity - Research

**Researched:** 2026-01-28
**Domain:** React components, Supabase RLS, role-based filtering
**Confidence:** HIGH

## Summary

This phase unifies the control assignment experience between RCT ControlPanel and Controls Hub. The research identifies a key bug (control testers not appearing in assignment dropdown in ControlDetailPanel), documents data parity gaps between the two views, and outlines the role-based filtering needed for ROLE-03/04/05 requirements.

The core finding is that the RCT ControlPanel (side panel) has rich functionality for testing, remediation, and comments that Controls Hub's ControlDetailPanel lacks. The assignment dropdown already exists in ControlDetailPanel but uses `useControlTesters()` which correctly filters by role='control-tester'. The issue is likely a data population or query problem.

**Primary recommendation:** Add missing sections to ControlDetailPanel to match ControlPanel, add "Assigned To" column to ControlsTable, and implement role-based query filtering for control testers/owners.

## Standard Stack

This phase uses existing project patterns and components.

### Core Libraries Already In Use
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| @tanstack/react-query | 5.x | Server state management | Already used for all DB hooks |
| @radix-ui/react-dialog | - | Modal dialogs | Already used in both panels |
| Supabase | - | Backend with RLS | Existing auth/data layer |
| Zustand | 4.x | Client state (demo mode) | Existing store pattern |

### Supporting Patterns
| Pattern | Purpose | When to Use |
|---------|---------|-------------|
| useProfiles/useControlTesters | Fetch users by role | Assignment dropdowns |
| isDemoMode dual-source | Demo vs authenticated data | All components with DB access |
| optimistic updates | Instant UI feedback | Control updates |

**No new libraries required** - this phase extends existing components.

## Architecture Analysis

### Current Component Structure

```
Controls Hub Path:
ControlsPage.tsx
  -> ControlsTable.tsx (table view)
  -> ControlDetailPanel.tsx (side panel)

RCT Path:
RCTTable.tsx (or similar)
  -> ControlPanel.tsx (side panel)
     -> ControlTestSection.tsx
     -> RemediationSection.tsx
     -> TicketsSection.tsx
     -> CommentsSection.tsx
```

### Data Parity Gap Analysis

**ControlDetailPanel (Controls Hub) has:**
- Name, Description, Type (editable)
- Net Probability/Impact/Score
- Assigned Tester dropdown (lines 777-822)
- Linked Risks section (with link/unlink)
- Approval workflow (pending changes)

**ControlPanel (RCT) has ALL of the above PLUS:**
- ControlTestSection (testing schedule, test history, record test)
- RemediationSection (remediation plans, action items)
- TicketsSection (linked tickets)
- CommentsSection (control comments)

**Gap:** ControlDetailPanel is missing 4 major sections present in ControlPanel.

### Assignment Dropdown Bug Analysis

**Current implementation in ControlDetailPanel (lines 777-822):**
```typescript
const { data: dbControlTesters } = useControlTesters()
// ...
const controlTesters = isDemoMode ? [] : (dbControlTesters || [])
// ...
{isDemoMode ? (
  <>
    <option value="tester-1">Tester 1</option>
    <option value="tester-2">Tester 2</option>
    <option value="tester-3">Tester 3</option>
  </>
) : (
  controlTesters.map(tester => (
    <option key={tester.id} value={tester.id}>
      {tester.full_name || tester.id}
    </option>
  ))
)}
```

**useControlTesters hook (useProfiles.ts lines 47-49):**
```typescript
export function useControlTesters() {
  return useProfilesByRole('control-tester')
}
```

**useProfilesByRole (lines 27-42):**
```typescript
export function useProfilesByRole(role: UserRole) {
  return useQuery({
    queryKey: ['profiles', 'role', role],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('role', role)
        .eq('is_active', true)
        .order('full_name')
      // ...
    },
  })
}
```

**Potential root causes:**
1. No users with role='control-tester' exist in the database
2. Users exist but is_active=false
3. Query succeeds but full_name is null (shows UUID)
4. RLS policy issue (profiles_tenant_read requires matching tenant_id)

**Verification needed:** Check if demo seed data creates control-tester users with is_active=true.

## Database Schema Analysis

### controls table (00015_controls.sql)
```sql
assigned_tester_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL
```

**Key observations:**
- Foreign key to profiles table exists
- ON DELETE SET NULL prevents orphan references
- No owner_id column - only assigned_tester_id

### profiles table (00003_profiles.sql)
```sql
role TEXT NOT NULL DEFAULT 'control-owner' CHECK (role IN (
  'director', 'manager', 'risk-manager', 'control-owner', 'control-tester'
))
is_active BOOLEAN DEFAULT TRUE
```

**Key observations:**
- 5 roles defined at database level
- is_active flag for soft delete
- No Control Owner concept for ownership - only Control Tester for assignment

### Role-Based Filtering Requirements

**ROLE-05 (Control Tester):** See only controls assigned to them
- Filter: `controls.assigned_tester_id = auth.uid()`

**ROLE-04 (Control Owner):** See only controls they "own"
- **Issue:** No owner_id column exists in controls table
- Need to define what "ownership" means for Control Owner
- Options:
  1. Add owner_id column to controls table (schema change)
  2. Use control_links to determine ownership via RCT row ownership
  3. Defer ROLE-04 - let Control Owners see all controls (view-only)

**Recommendation:** Defer ROLE-04 ownership filtering. The current design has assigned_tester_id but no owner_id. Adding owner_id requires:
- Migration to add column
- UI to assign owners
- Query filter updates

This is significant scope creep. The success criteria mention "Control Owners see only controls assigned to them" but the schema doesn't support this pattern.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Role-based profiles | Custom profile queries | useControlTesters(), useProfiles() | Already exists in useProfiles.ts |
| Column sorting | Custom sort logic | @tanstack/react-table sorting | Already configured in ControlsTable |
| Side panel dialogs | Custom modal | @radix-ui/react-dialog | Consistent with existing panels |
| Optimistic updates | Manual cache management | React Query mutation options | Already patterned in useUpdateControl |

## Common Pitfalls

### Pitfall 1: Adding owner_id Without Schema Migration
**What goes wrong:** Trying to filter by owner when column doesn't exist
**Why it happens:** Requirements mention "Control Owner sees only owned controls" but schema lacks owner_id
**How to avoid:** Either add migration or defer ROLE-04 filtering
**Warning signs:** Query errors referencing non-existent column

### Pitfall 2: Demo Mode Hardcoded Options
**What goes wrong:** Demo mode shows generic "Tester 1/2/3" options with no real IDs
**Why it happens:** ControlDetailPanel line 808-811 hardcodes demo options
**How to avoid:** Demo mode should use storeProfiles or similar mock data
**Warning signs:** Assignment works in demo but breaks on reload

### Pitfall 3: Missing Test/Remediation Data in Controls Hub
**What goes wrong:** User expects to see test history in Controls Hub but it's not there
**Why it happens:** ControlDetailPanel doesn't include ControlTestSection/RemediationSection
**How to avoid:** Add the missing sections from ControlPanel
**Warning signs:** User confusion about where to find test information

### Pitfall 4: Inconsistent Control ID References
**What goes wrong:** ControlsTable passes control.id but sections expect rowId + controlId
**Why it happens:** ControlPanel sections need rowId context, ControlDetailPanel doesn't have it
**How to avoid:** Modify sections to work with or without rowId, or pass null
**Warning signs:** Components render empty when rowId is missing

## Implementation Patterns

### Pattern 1: Adding Assigned To Column

**Where:** ControlsTable.tsx

```typescript
// Add to columns array
{
  accessorKey: 'assignedTesterName',
  header: 'Assigned To',
  cell: ({ row }) => {
    const control = row.original
    // Need to join with profiles or pass enriched data
    return (
      <span className="text-text-secondary">
        {control.assignedTesterName || '-'}
      </span>
    )
  },
},
```

**Data enrichment option:**
```typescript
// In ControlsPage or ControlsTable
const { data: profiles } = useProfiles()
const enrichedControls = controls.map(c => ({
  ...c,
  assignedTesterName: profiles?.find(p => p.id === c.assignedTesterId)?.full_name || null
}))
```

### Pattern 2: Adding Missing Sections to ControlDetailPanel

**Approach:** Import and render sections from rct/ directory

```typescript
// In ControlDetailPanel.tsx
import { ControlTestSection } from '@/components/rct/ControlTestSection'
import { RemediationSection } from '@/components/rct/RemediationSection'
import { TicketsSection } from '@/components/tickets'
import { CommentsSection } from '@/components/rct/CommentsSection'

// In render, after Linked Risks section:
{/* Testing */}
<ControlTestSection
  rowId={linkedRows[0]?.id || ''} // Use first linked row or empty
  control={control}
/>

{/* Remediation */}
<RemediationSection
  rowId={linkedRows[0]?.id || ''}
  control={control}
  tests={controlTests}
  grossScore={null} // Controls Hub doesn't have gross score context
/>

{/* Tickets */}
<TicketsSection controlId={control.id} controlName={control.name} />

{/* Comments */}
<CommentsSection entityType="control" entityId={control.id} />
```

**Challenge:** ControlTestSection and RemediationSection expect rowId. When accessed from Controls Hub:
- Option A: Pass first linked row's ID (if any linked)
- Option B: Modify sections to handle null rowId
- Option C: Create Hub-specific versions without rowId requirement

### Pattern 3: Role-Based Query Filtering

**For Control Tester filtering (ROLE-05):**

```typescript
// New hook in useControls.ts
export function useMyAssignedControls() {
  const { user } = useAuth()

  return useQuery({
    queryKey: ['controls', 'assigned', user?.id],
    queryFn: async () => {
      if (!user?.id) return []
      const { data, error } = await supabase
        .from('controls')
        .select('*')
        .eq('assigned_tester_id', user.id)
        .order('name')
      if (error) throw error
      return data.map(toControl)
    },
    enabled: !!user?.id,
  })
}
```

**In ControlsPage:**
```typescript
const { isControlTester } = usePermissions()
const { data: allControls } = useControls()
const { data: myControls } = useMyAssignedControls()

// Use appropriate source
const controls = isControlTester ? (myControls || []) : (allControls || [])
```

## Success Criteria Mapping

| Criteria | Implementation | Confidence |
|----------|---------------|------------|
| 1. RCT panel has same dropdown as Hub | Already same - both use useControlTesters | HIGH |
| 2. Hub shows all RCT panel fields | Add ControlTestSection, RemediationSection, TicketsSection, CommentsSection | HIGH |
| 3. Hub table has "Assigned To" column | Add column to ControlsTable, enrich with profile name | HIGH |
| 4. Testers appear in dropdown | Verify seed data has control-tester users | MEDIUM |
| 5. Testers see only assigned controls | Add useMyAssignedControls hook, filter in ControlsPage | HIGH |
| 6. Owners see only owned controls | **BLOCKED** - no owner_id column in schema | LOW |
| 7. Assignment syncs between panels | Already same data source (controls table) | HIGH |

## Open Questions

### Question 1: ROLE-04 Control Owner Filtering
**What we know:**
- Schema has assigned_tester_id but no owner_id
- Requirements say "Control Owners see only controls assigned to them"
**What's unclear:**
- Is this a schema gap or a requirements misinterpretation?
- Should "assigned" for owners mean something different?
**Recommendation:** Discuss with stakeholder. Likely options:
- Add owner_id column (migration required)
- Owners see all controls (view-only per existing permissions)
- Defer to future phase

### Question 2: rowId Dependency in Test/Remediation Sections
**What we know:**
- ControlTestSection and RemediationSection require rowId
- Controls Hub accesses controls without RCT row context
**What's unclear:**
- Should test history show all tests across all linked rows?
- Or should it be row-specific (requiring row selection)?
**Recommendation:** Modify sections to show all tests for a control when rowId is null/empty

### Question 3: Tester Dropdown Empty State
**What we know:**
- Query looks correct (useProfilesByRole('control-tester'))
- Dropdown shows nothing in authenticated mode
**What's unclear:**
- Are there control-tester users in the database?
- Are they is_active=true?
**Recommendation:** Check seed data (29-03 migration) for control-tester profiles

## Sources

### Primary (HIGH confidence)
- ControlDetailPanel.tsx (lines 777-822) - assignment dropdown implementation
- useProfiles.ts - useControlTesters hook
- 00015_controls.sql - controls schema with assigned_tester_id
- 00003_profiles.sql - profiles schema with role constraint

### Secondary (MEDIUM confidence)
- ControlPanel.tsx - reference implementation with full sections
- usePermissions.ts - role-based permission logic
- lib/permissions.ts - role hierarchy definitions

### Tertiary (LOW confidence)
- Requirements interpretation for ROLE-04 (Control Owner filtering)

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - existing patterns, no new libraries
- Architecture: HIGH - clear component structure, identified gaps
- Pitfalls: HIGH - documented from code analysis
- ROLE-04 filtering: LOW - schema doesn't support current requirements

**Research date:** 2026-01-28
**Valid until:** 2026-02-28 (stable domain, internal components)
