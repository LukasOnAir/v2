# Phase 41: Control Tester Visibility Fix - Research

**Researched:** 2026-01-28
**Domain:** Role-based control filtering, RLS policies, user authentication
**Confidence:** HIGH

## Summary

This research investigates the bug where Control Testers cannot see controls assigned to them in the My Controls dashboard. The investigation reviewed the existing debug file (`.planning/debug/my-controls-not-showing.md`), the current implementation of `useMyAssignedControls` hook, RLS policies, seed data, and the authentication flow.

**Root cause identified:** There are TWO distinct issues that compound:

1. **Seed data mismatch:** Demo profiles created via `38-02-demo-profiles.sql` have profile UUIDs that don't exist in `auth.users` table. The profiles reference `auth.users(id)` as a foreign key, but demo profiles are inserted directly into profiles WITHOUT corresponding auth users.

2. **Query ID mismatch:** When controls are assigned in demo mode, `assigned_tester_id` gets set to mock strings like "tester-1" (from ControlDetailPanel demo mode dropdown). Real authenticated users have UUID-based `user.id`. The query `useMyAssignedControls` matches `assigned_tester_id` against `user.id`, which will never match mock strings.

**Primary recommendation:** Fix requires both (a) ensuring Control Testers have properly linked auth users and profiles, AND (b) ensuring controls are assigned using actual profile UUIDs not mock strings.

## Current Implementation Analysis

### useMyAssignedControls Hook (src/hooks/useControls.ts)

```typescript
// Lines 67-99: Current implementation
export function useMyAssignedControls(testerId?: string) {
  const { user } = useAuth()

  // Use provided testerId if given, otherwise fall back to authenticated user's ID
  const effectiveTesterId = testerId ?? user?.id

  return useQuery({
    queryKey: ['controls', 'assigned', effectiveTesterId],
    queryFn: async () => {
      if (!effectiveTesterId) {
        return []
      }

      const { data, error } = await supabase
        .from('controls')
        .select('*')
        .eq('assigned_tester_id', effectiveTesterId)  // <-- KEY: matches against UUID
        .order('name')

      if (error) throw error
      return data.map(toControl)
    },
    enabled: !!effectiveTesterId,
  })
}
```

**Finding (HIGH confidence):** The hook correctly queries by `assigned_tester_id`. The issue is upstream - what value is stored in `assigned_tester_id`.

### TesterDashboardPage.tsx (src/pages/TesterDashboardPage.tsx)

```typescript
// Lines 19-25: Correct role-aware ID selection
const effectiveTesterId = isControlTester ? user?.id : currentTesterId

// Fetch controls assigned to the effective tester
const { data: assignedControls = [], isLoading } = useMyAssignedControls(effectiveTesterId)
```

**Finding (HIGH confidence):** The page correctly passes `user?.id` for actual control testers. The fix from the debug session is correctly implemented.

### ControlDetailPanel Assignment Dropdown (src/components/controls/ControlDetailPanel.tsx)

```typescript
// Lines 816-828: PROBLEM - Demo mode uses mock string values
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

**Finding (HIGH confidence):** In demo mode, assignment dropdown uses mock string values ("tester-1"). In authenticated mode, it uses real profile UUIDs from `useControlTesters()`. If controls were assigned in demo mode, their `assigned_tester_id` contains strings that will never match a real user's UUID.

### RLS Policy on Controls Table (supabase/migrations/00015_controls.sql)

```sql
-- Lines 43-46: Tenant isolation only
CREATE POLICY "controls_tenant_isolation" ON public.controls
  FOR ALL TO authenticated
  USING (tenant_id = (SELECT public.tenant_id()))
  WITH CHECK (tenant_id = (SELECT public.tenant_id()));
```

**Finding (HIGH confidence):** The RLS policy only enforces tenant isolation. It does NOT filter by `assigned_tester_id`. This is correct - the application-level filtering in `useMyAssignedControls` handles tester-specific filtering.

### Demo Profile Seed Data (supabase/seed-scripts/38-02-demo-profiles.sql)

```sql
-- Fixed UUIDs for demo testers
tester1_id UUID := 'a1b2c3d4-e5f6-7890-abcd-ef1234567891';
tester2_id UUID := 'a1b2c3d4-e5f6-7890-abcd-ef1234567892';
tester3_id UUID := 'a1b2c3d4-e5f6-7890-abcd-ef1234567893';

-- Inserted into profiles table
INSERT INTO public.profiles (id, tenant_id, full_name, role, is_active)
VALUES
  (tester1_id, demo_tenant_id, 'Alice Tester', 'control-tester', true),
  ...
```

**Finding (HIGH confidence):** Demo profiles have REAL UUIDs, but:
1. The profiles table FK references `auth.users(id)` - these UUIDs don't exist in auth.users
2. The ControlDetailPanel demo mode uses "tester-1" strings, NOT these profile UUIDs
3. There's a complete mismatch between seed profiles and UI assignment values

### Profiles Table Schema (supabase/migrations/00003_profiles.sql)

```sql
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  ...
);
```

**Finding (HIGH confidence):** The profiles.id column is a foreign key to auth.users.id. Demo profiles inserted without corresponding auth users would violate referential integrity OR (if using DEFERRABLE or ON CONFLICT) exist orphaned.

## Root Cause Analysis

### Scenario 1: Control Tester logging in and viewing My Controls

1. User authenticates via Supabase Auth -> gets `user.id` (UUID)
2. User has role `control-tester` in JWT app_metadata
3. `TesterDashboardPage` calls `useMyAssignedControls()` with `user.id`
4. Query: `SELECT * FROM controls WHERE assigned_tester_id = [user.id]`
5. **Problem:** `assigned_tester_id` column contains either:
   - Mock strings ("tester-1") if assigned in demo mode
   - Different UUIDs if assigned to demo profile users
   - Null if never assigned

### Scenario 2: Director viewing a tester's controls via dropdown

1. Director selects tester from dropdown in `TesterHeader`
2. `useControlTesters()` returns profiles with role='control-tester'
3. `currentTesterId` set to selected profile's UUID
4. `TesterDashboardPage` passes `currentTesterId` to `useMyAssignedControls`
5. Query matches against `assigned_tester_id`
6. **Problem:** Same mismatch as Scenario 1

### The Fix Chain

For controls to be visible to testers:

1. **Controls must have correct `assigned_tester_id`**: Real profile UUIDs, not mock strings
2. **Profile UUIDs must match auth user IDs**: Since profiles.id = auth.users.id
3. **Tester must authenticate with matching auth user**: user.id must match assigned_tester_id

## Specific Issues to Fix

### Issue 1: Demo Mode Assignment Uses Mock Strings

**Location:** `src/components/controls/ControlDetailPanel.tsx` lines 816-821

**Problem:** When `isDemoMode === true`, assignment dropdown shows "tester-1", "tester-2", "tester-3" - these are strings, not UUIDs.

**Fix:** In demo mode, use the demo profile UUIDs from the seed data instead of mock strings.

### Issue 2: Demo Profiles Not Visible in useControlTesters

**Location:** `src/hooks/useProfiles.ts` `useControlTesters()` function

**Problem:** If demo profiles don't have matching auth.users entries, RLS on profiles table may block access OR the profiles may not exist due to FK violation.

**Investigation needed:** Verify what happens when profiles are seeded without auth.users. The FK constraint `REFERENCES auth.users(id) ON DELETE CASCADE` should prevent insertion.

### Issue 3: Seed Data Doesn't Create Auth Users

**Location:** `supabase/seed-scripts/38-02-demo-profiles.sql`

**Problem:** Creates profiles but not auth.users. The FK constraint would block this unless:
- The seed was run with a super-user bypassing constraints
- The constraint is DEFERRABLE
- The insert silently fails

**Fix:** Either:
- Create auth users via Supabase service role before profile insertion
- Or remove the demo tester dropdown in auth mode and only show real testers

## Standard Stack

No new libraries needed. This is a data/logic fix.

| Component | Current | Status |
|-----------|---------|--------|
| React Query | @tanstack/react-query | Working correctly |
| Supabase Auth | @supabase/supabase-js | Working correctly |
| RLS Policies | Supabase | Correct (tenant isolation) |

## Architecture Patterns

### Correct Pattern for Tester Assignment

```
1. User authenticates -> Supabase Auth creates auth.users entry
2. Profile created via invite flow -> profiles.id = auth.users.id
3. Risk Manager assigns tester -> assigned_tester_id = profile.id
4. Tester views My Controls -> user.id matches assigned_tester_id
```

### Current Broken Pattern (Demo Mode)

```
1. Demo mode has no real auth users
2. Demo profiles inserted (FK violation possible)
3. Demo assignment uses "tester-1" strings (not UUIDs)
4. Real testers have UUID-based user.id
5. Query never matches
```

## Don't Hand-Roll

| Problem | Existing Solution | Why |
|---------|------------------|-----|
| Profile FK to auth.users | Supabase invite flow | Creates both records atomically |
| Demo mode testing | Use real test accounts | Avoid mock data mismatches |

## Common Pitfalls

### Pitfall 1: Mock Data Leaking to Production

**What goes wrong:** Demo mode mock values ("tester-1") stored in database, then not recognized in auth mode
**Why it happens:** isDemoMode conditional in dropdown doesn't prevent database writes
**How to avoid:** Either use real UUIDs in demo mode OR prevent writes in demo mode
**Warning signs:** Empty My Controls despite assigned controls visible in Controls Hub

### Pitfall 2: FK Constraint on profiles.id

**What goes wrong:** Attempt to insert demo profiles fails silently due to FK to auth.users
**Why it happens:** profiles.id must exist in auth.users first
**How to avoid:** Create auth users before profiles via service role
**Warning signs:** Demo profiles not appearing in dropdown

### Pitfall 3: currentTesterId State Pollution

**What goes wrong:** Old mock values persist in localStorage (Zustand persist)
**Why it happens:** uiStore persists currentTesterId which may contain "tester-1"
**How to avoid:** Auto-select first valid tester from useControlTesters on load
**Warning signs:** Invalid tester ID selected by default

## Code Examples

### Fix 1: Use Real Profile UUIDs in Demo Mode

```typescript
// src/components/controls/ControlDetailPanel.tsx
// Replace mock strings with actual demo profile UUIDs

const DEMO_TESTERS = [
  { id: 'a1b2c3d4-e5f6-7890-abcd-ef1234567891', name: 'Alice Tester' },
  { id: 'a1b2c3d4-e5f6-7890-abcd-ef1234567892', name: 'Bob Tester' },
  { id: 'a1b2c3d4-e5f6-7890-abcd-ef1234567893', name: 'Carol Tester' },
]

// In JSX:
{isDemoMode ? (
  DEMO_TESTERS.map(tester => (
    <option key={tester.id} value={tester.id}>
      {tester.name}
    </option>
  ))
) : (
  controlTesters.map(tester => ...)
)}
```

### Fix 2: Verify/Fix Existing assigned_tester_id Values

```sql
-- Check current state of assigned_tester_id values
SELECT name, assigned_tester_id
FROM controls
WHERE tenant_id = '5ea03edb-6e79-4b62-bd36-39f1963d0640'
AND assigned_tester_id IS NOT NULL;

-- If values are mock strings, update to real profile UUIDs
UPDATE controls
SET assigned_tester_id = 'a1b2c3d4-e5f6-7890-abcd-ef1234567891'
WHERE assigned_tester_id = 'tester-1'
AND tenant_id = '5ea03edb-6e79-4b62-bd36-39f1963d0640';
```

### Fix 3: TesterHeader Auto-Selection Fix

```typescript
// src/components/layout/TesterHeader.tsx
// Already has useEffect to auto-select first tester (line 13-17)
// Verify this fires when testers list loads
useEffect(() => {
  if (testers.length > 0 && !testers.find(t => t.id === currentTesterId)) {
    setCurrentTesterId(testers[0].id)
  }
}, [testers, currentTesterId, setCurrentTesterId])
```

## Open Questions

1. **Demo Profile FK Constraint:** What happens when demo profiles are seeded? Does the FK constraint to auth.users block insertion? Need to verify actual database state.

2. **Existing Control Assignments:** Are any controls currently assigned with mock string values that need data migration?

3. **Auth Mode vs Demo Mode Boundary:** Should we allow assignment changes in demo mode at all, or should demo mode be truly read-only for assignments?

## Sources

### Primary (HIGH confidence)
- Direct code review: `src/hooks/useControls.ts`
- Direct code review: `src/pages/TesterDashboardPage.tsx`
- Direct code review: `src/components/controls/ControlDetailPanel.tsx`
- Direct code review: `supabase/migrations/00015_controls.sql`
- Direct code review: `supabase/seed-scripts/38-02-demo-profiles.sql`
- Direct code review: `.planning/debug/my-controls-not-showing.md`

### Secondary (MEDIUM confidence)
- STATE.md decisions [38-01], [38-02], [38-03]

## Metadata

**Confidence breakdown:**
- Root cause identification: HIGH - Code review clearly shows ID mismatch
- Fix approach: HIGH - Straightforward data/logic correction
- RLS policy analysis: HIGH - Direct SQL review

**Research date:** 2026-01-28
**Valid until:** N/A - This is a bug fix, not version-dependent
