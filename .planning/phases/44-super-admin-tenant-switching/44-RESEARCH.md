# Phase 44: Super-Admin Tenant Switching - Research

**Researched:** 2026-01-28
**Domain:** Multi-tenant impersonation, React context patterns, Supabase RLS
**Confidence:** HIGH

## Summary

This phase implements tenant/profile impersonation for super-admins, allowing them to "view as" any tenant or profile without modifying actual authentication. The research reveals a clear architecture: use a dedicated `ImpersonationContext` that provides an "effective tenant/profile" override, which data hooks consume instead of the real JWT-based tenant_id. RLS bypass requires database-side changes (super-admin policies) since RLS uses JWT claims directly.

The existing codebase has established patterns we can leverage:
- `AuthContext` provides `tenantId` from JWT app_metadata
- Data hooks (useRCTRows, useTaxonomy, etc.) don't explicitly filter by tenant_id - they rely on RLS
- Zustand stores are used for UI state (uiStore pattern)
- OfflineIndicator shows a good banner pattern for visual indicators
- AdminLayout already handles super-admin authentication checks

**Primary recommendation:** Create an `ImpersonationContext` with `effectiveTenantId`/`effectiveProfileId` that overrides AuthContext values for data fetching, add RLS policies for super-admin cross-tenant read access, and implement a prominent banner showing impersonation state.

## Standard Stack

### Core (No New Libraries Required)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| React Context | 19.x | Impersonation state | Already used for AuthContext |
| Zustand | 5.x | Impersonation UI state | Already in stack for uiStore |
| TanStack Query | 5.x | Data fetching with tenant override | Already handles all data hooks |
| Supabase Client | 2.x | Direct queries with tenant filter | Already configured |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| lucide-react | existing | Icons for impersonation UI | Eye icon, X for exit |
| sonner | existing | Toast notifications | Impersonation start/end feedback |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Context | Zustand only | Context better for "wrap subtree" pattern needed for impersonation |
| RLS bypass | Service role key | Security risk - service key in browser is dangerous |
| Query param | Context state | URL pollution, harder to manage, bookmarking issues |

**Installation:**
```bash
# No new packages needed - all dependencies already in project
```

## Architecture Patterns

### Recommended Project Structure
```
src/
├── contexts/
│   ├── AuthContext.tsx           # Existing - real auth state
│   └── ImpersonationContext.tsx  # NEW - impersonation override
├── components/
│   └── admin/
│       ├── AdminLayout.tsx       # MODIFY - add impersonation provider
│       ├── TenantSwitcher.tsx    # NEW - tenant list + selector
│       ├── ProfileSwitcher.tsx   # NEW - profile list within tenant
│       └── ImpersonationBanner.tsx # NEW - visual indicator
├── hooks/
│   └── useEffectiveTenant.ts     # NEW - combines auth + impersonation
├── pages/
│   └── admin/
│       └── AdminTenantsPage.tsx  # NEW - tenant/profile browser
└── stores/
    └── impersonationStore.ts     # OPTIONAL - persist across refresh
```

### Pattern 1: Impersonation Context Wrapper
**What:** Context that provides effective tenant/profile, defaulting to real auth when not impersonating
**When to use:** Wrap the entire app tree so all data hooks can access effective values
**Example:**
```typescript
// ImpersonationContext.tsx
interface ImpersonationState {
  impersonatedTenantId: string | null
  impersonatedProfileId: string | null
  impersonatedTenantName: string | null
  impersonatedProfileName: string | null
  isImpersonating: boolean
  isReadOnly: boolean  // Always true when impersonating
  startImpersonation: (tenantId: string, tenantName: string) => void
  selectProfile: (profileId: string, profileName: string) => void
  exitImpersonation: () => void
}

// Hook combining auth + impersonation
function useEffectiveTenant() {
  const { tenantId: realTenantId, role: realRole } = useAuth()
  const { impersonatedTenantId, impersonatedProfileId, isImpersonating } = useImpersonation()

  return {
    effectiveTenantId: impersonatedTenantId ?? realTenantId,
    effectiveProfileId: impersonatedProfileId,
    isImpersonating,
    isReadOnly: isImpersonating,
    realTenantId,
    realRole,
  }
}
```

### Pattern 2: RLS Bypass for Super-Admin Reads
**What:** Add RLS policies that allow super-admins to SELECT from any tenant
**When to use:** Every tenant-scoped table needs a super-admin read policy
**Example:**
```sql
-- Example for controls table (apply pattern to all tenant-scoped tables)
CREATE POLICY "controls_superadmin_read" ON public.controls
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND is_super_admin = TRUE
    )
  );
```

### Pattern 3: Explicit Tenant Filter for Impersonation
**What:** When super-admin is impersonating, add explicit `.eq('tenant_id', effectiveTenantId)` to queries
**When to use:** Data hooks need to filter by effective tenant when impersonating
**Example:**
```typescript
// Modified useRCTRows for impersonation support
export function useRCTRows() {
  const { effectiveTenantId, isImpersonating } = useEffectiveTenant()

  return useQuery({
    queryKey: ['rctRows', effectiveTenantId], // Include tenant in key for cache isolation
    queryFn: async () => {
      let query = supabase.from('rct_rows').select('*')

      // When impersonating, add explicit tenant filter
      // (RLS allows super-admin to read all, but we want specific tenant)
      if (isImpersonating && effectiveTenantId) {
        query = query.eq('tenant_id', effectiveTenantId)
      }

      const { data, error } = await query.order('row_id')
      if (error) throw error
      return data.map(toRCTRow)
    },
    enabled: !!effectiveTenantId || !isImpersonating,
  })
}
```

### Pattern 4: Read-Only Mode Enforcement
**What:** Disable all mutations when impersonating
**When to use:** Every mutation hook should check `isReadOnly` before executing
**Example:**
```typescript
// Read-only wrapper for mutations
function useReadOnlyAwareMutation<T, V>(
  mutationFn: (variables: V) => Promise<T>,
  options?: UseMutationOptions<T, Error, V>
) {
  const { isReadOnly } = useEffectiveTenant()

  return useMutation({
    ...options,
    mutationFn: async (variables: V) => {
      if (isReadOnly) {
        toast.error('Cannot modify data while viewing as another user')
        throw new Error('Read-only mode: modifications disabled')
      }
      return mutationFn(variables)
    },
  })
}
```

### Anti-Patterns to Avoid
- **Modifying JWT claims:** Don't try to change app_metadata for impersonation - use context overlay
- **Service role key in browser:** Never expose SUPABASE_SERVICE_ROLE_KEY to frontend
- **Storing impersonation in URL:** Query params leak in browser history, bookmarks
- **Forgetting cache isolation:** Query keys MUST include tenant ID to avoid cross-tenant cache pollution

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Cross-tenant data access | Custom API bypass | Super-admin RLS policies | RLS is the security boundary |
| State management | Custom state | React Context + Zustand | Established patterns in codebase |
| Tenant listing | Direct table query | Supabase query with admin policy | Need proper auth check |
| Visual indicators | Custom toast | Persistent banner component | Impersonation needs always-visible state |

**Key insight:** The real challenge is RLS - normal users are blocked by `tenant_id = public.tenant_id()` which reads JWT. Super-admins need explicit RLS policies that bypass this check for SELECT only.

## Common Pitfalls

### Pitfall 1: Cache Pollution Between Tenants
**What goes wrong:** Super-admin views Tenant A, then Tenant B, sees Tenant A's data
**Why it happens:** Query keys don't include tenant ID, React Query caches by key
**How to avoid:** Always include `effectiveTenantId` in queryKey: `['rctRows', effectiveTenantId]`
**Warning signs:** Stale data after switching tenants, data from wrong tenant appearing

### Pitfall 2: Mutations Executing in Impersonation Mode
**What goes wrong:** Super-admin accidentally modifies data while viewing as another tenant
**Why it happens:** Mutation hooks don't check impersonation state
**How to avoid:** Create `useReadOnlyAwareMutation` wrapper, check `isReadOnly` before every mutation
**Warning signs:** Audit logs showing super-admin creating data in other tenants

### Pitfall 3: RLS Denying Super-Admin Access
**What goes wrong:** Super-admin tries to view tenant data, gets empty results or error
**Why it happens:** Existing RLS policies use `tenant_id = public.tenant_id()` which is NULL for super-admins
**How to avoid:** Add explicit super-admin read policies to ALL tenant-scoped tables
**Warning signs:** Empty data when impersonating, "permission denied" errors

### Pitfall 4: Impersonation State Lost on Refresh
**What goes wrong:** Super-admin refreshes page, loses impersonation state
**Why it happens:** Context state is in-memory only
**How to avoid:** Persist to sessionStorage (not localStorage - session-scoped)
**Warning signs:** Having to re-select tenant after every refresh

### Pitfall 5: No Visual Feedback During Impersonation
**What goes wrong:** Super-admin forgets they're impersonating, confused about what they're seeing
**Why it happens:** No persistent indicator showing impersonation state
**How to avoid:** Always-visible banner/header modification when impersonating
**Warning signs:** Support tickets from super-admins confused about data they're seeing

## Code Examples

### Example 1: ImpersonationContext Implementation
```typescript
// src/contexts/ImpersonationContext.tsx
import { createContext, useContext, useState, useCallback, type ReactNode } from 'react'

interface ImpersonationState {
  tenantId: string | null
  tenantName: string | null
  profileId: string | null
  profileName: string | null
}

interface ImpersonationContextType {
  impersonation: ImpersonationState
  isImpersonating: boolean
  isReadOnly: boolean
  startTenantImpersonation: (tenantId: string, tenantName: string) => void
  selectProfile: (profileId: string, profileName: string) => void
  exitImpersonation: () => void
}

const ImpersonationContext = createContext<ImpersonationContextType | undefined>(undefined)

export function ImpersonationProvider({ children }: { children: ReactNode }) {
  const [impersonation, setImpersonation] = useState<ImpersonationState>(() => {
    // Restore from sessionStorage on mount
    const saved = sessionStorage.getItem('impersonation')
    return saved ? JSON.parse(saved) : {
      tenantId: null,
      tenantName: null,
      profileId: null,
      profileName: null,
    }
  })

  const persist = useCallback((state: ImpersonationState) => {
    sessionStorage.setItem('impersonation', JSON.stringify(state))
    setImpersonation(state)
  }, [])

  const startTenantImpersonation = useCallback((tenantId: string, tenantName: string) => {
    persist({
      tenantId,
      tenantName,
      profileId: null,
      profileName: null,
    })
  }, [persist])

  const selectProfile = useCallback((profileId: string, profileName: string) => {
    persist({
      ...impersonation,
      profileId,
      profileName,
    })
  }, [impersonation, persist])

  const exitImpersonation = useCallback(() => {
    sessionStorage.removeItem('impersonation')
    setImpersonation({
      tenantId: null,
      tenantName: null,
      profileId: null,
      profileName: null,
    })
  }, [])

  const isImpersonating = !!impersonation.tenantId
  const isReadOnly = isImpersonating // Always read-only when impersonating

  return (
    <ImpersonationContext.Provider value={{
      impersonation,
      isImpersonating,
      isReadOnly,
      startTenantImpersonation,
      selectProfile,
      exitImpersonation,
    }}>
      {children}
    </ImpersonationContext.Provider>
  )
}

export function useImpersonation() {
  const context = useContext(ImpersonationContext)
  if (!context) {
    throw new Error('useImpersonation must be used within ImpersonationProvider')
  }
  return context
}
```

### Example 2: Super-Admin RLS Policy Migration
```sql
-- 00033_superadmin_tenant_read_policies.sql
-- Add super-admin read policies to all tenant-scoped tables

-- Pattern: Allow super-admin SELECT on any row
-- Super-admin check via profiles table join

-- controls
CREATE POLICY "controls_superadmin_read" ON public.controls
  FOR SELECT TO authenticated
  USING (public.is_super_admin());

-- rct_rows
CREATE POLICY "rct_rows_superadmin_read" ON public.rct_rows
  FOR SELECT TO authenticated
  USING (public.is_super_admin());

-- taxonomy_nodes
CREATE POLICY "taxonomy_nodes_superadmin_read" ON public.taxonomy_nodes
  FOR SELECT TO authenticated
  USING (public.is_super_admin());

-- control_links
CREATE POLICY "control_links_superadmin_read" ON public.control_links
  FOR SELECT TO authenticated
  USING (public.is_super_admin());

-- control_tests
CREATE POLICY "control_tests_superadmin_read" ON public.control_tests
  FOR SELECT TO authenticated
  USING (public.is_super_admin());

-- remediation_plans
CREATE POLICY "remediation_plans_superadmin_read" ON public.remediation_plans
  FOR SELECT TO authenticated
  USING (public.is_super_admin());

-- tickets
CREATE POLICY "tickets_superadmin_read" ON public.tickets
  FOR SELECT TO authenticated
  USING (public.is_super_admin());

-- comments
CREATE POLICY "comments_superadmin_read" ON public.comments
  FOR SELECT TO authenticated
  USING (public.is_super_admin());

-- pending_changes
CREATE POLICY "pending_changes_superadmin_read" ON public.pending_changes
  FOR SELECT TO authenticated
  USING (public.is_super_admin());

-- audit_log
CREATE POLICY "audit_log_superadmin_read" ON public.audit_log
  FOR SELECT TO authenticated
  USING (public.is_super_admin());

-- custom_columns
CREATE POLICY "custom_columns_superadmin_read" ON public.custom_columns
  FOR SELECT TO authenticated
  USING (public.is_super_admin());

-- score_labels
CREATE POLICY "score_labels_superadmin_read" ON public.score_labels
  FOR SELECT TO authenticated
  USING (public.is_super_admin());

-- taxonomy_weights
CREATE POLICY "taxonomy_weights_superadmin_read" ON public.taxonomy_weights
  FOR SELECT TO authenticated
  USING (public.is_super_admin());

-- knowledge_base
CREATE POLICY "knowledge_base_superadmin_read" ON public.knowledge_base
  FOR SELECT TO authenticated
  USING (public.is_super_admin());

-- feature_flags (tenant-scoped)
CREATE POLICY "feature_flags_superadmin_read" ON public.feature_flags
  FOR SELECT TO authenticated
  USING (public.is_super_admin());

-- profiles (super-admin can read all profiles for impersonation selection)
DROP POLICY IF EXISTS "profiles_superadmin_all_read" ON public.profiles;
CREATE POLICY "profiles_superadmin_all_read" ON public.profiles
  FOR SELECT TO authenticated
  USING (public.is_super_admin());

-- tenants (super-admin can read all tenants for tenant selection)
-- Note: tenants table may not have RLS, check first
ALTER TABLE public.tenants ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tenants_superadmin_read" ON public.tenants
  FOR SELECT TO authenticated
  USING (public.is_super_admin());

-- Allow regular users to read their own tenant
CREATE POLICY "tenants_own_tenant_read" ON public.tenants
  FOR SELECT TO authenticated
  USING (id = public.tenant_id());
```

### Example 3: Impersonation Banner Component
```typescript
// src/components/admin/ImpersonationBanner.tsx
import { Eye, X, User } from 'lucide-react'
import { useImpersonation } from '@/contexts/ImpersonationContext'

export function ImpersonationBanner() {
  const { impersonation, isImpersonating, exitImpersonation } = useImpersonation()

  if (!isImpersonating) return null

  return (
    <div className="bg-amber-500 text-amber-950 px-4 py-2 flex items-center justify-center gap-4">
      <div className="flex items-center gap-2">
        <Eye className="w-4 h-4" />
        <span className="font-medium">Viewing as:</span>
        <span>{impersonation.tenantName}</span>
        {impersonation.profileName && (
          <>
            <User className="w-4 h-4 ml-2" />
            <span>{impersonation.profileName}</span>
          </>
        )}
        <span className="text-amber-800 ml-2">(Read-only mode)</span>
      </div>
      <button
        onClick={exitImpersonation}
        className="flex items-center gap-1 px-2 py-1 rounded bg-amber-600 hover:bg-amber-700 text-white text-sm"
      >
        <X className="w-4 h-4" />
        Exit
      </button>
    </div>
  )
}
```

### Example 4: Modified Data Hook with Impersonation Support
```typescript
// Pattern for modifying existing hooks
// Apply to: useRCTRows, useTaxonomy, useControls, etc.

import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase/client'
import { useEffectiveTenant } from '@/hooks/useEffectiveTenant'

export function useRCTRows() {
  const { effectiveTenantId, isImpersonating } = useEffectiveTenant()

  return useQuery({
    // CRITICAL: Include tenant ID in query key for cache isolation
    queryKey: ['rctRows', effectiveTenantId],
    queryFn: async () => {
      let query = supabase.from('rct_rows').select('*')

      // When impersonating, super-admin RLS allows all reads
      // but we need explicit filter to get specific tenant
      if (isImpersonating && effectiveTenantId) {
        query = query.eq('tenant_id', effectiveTenantId)
      }

      const { data, error } = await query.order('row_id')
      if (error) throw error
      return data.map(toRCTRow)
    },
  })
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| JWT claim modification | Context-based override | Always | JWT modification requires re-auth, context is immediate |
| Service role bypass | RLS super-admin policies | Best practice | Service role in browser is security risk |
| Query param state | Session storage | Standard practice | URLs stay clean, state persists across refresh |

**Deprecated/outdated:**
- Using service role key in frontend code - security vulnerability
- Modifying user JWT claims for impersonation - requires logout/login cycle

## Open Questions

1. **Realtime subscriptions during impersonation**
   - What we know: Realtime uses JWT for RLS filtering
   - What's unclear: Will super-admin receive all tenant updates or need channel filtering?
   - Recommendation: Test with RealtimeProvider, may need to add tenant filter to subscription

2. **File storage access**
   - What we know: test-evidence bucket has RLS policies
   - What's unclear: Can super-admin view uploaded files from impersonated tenant?
   - Recommendation: Add storage bucket policies for super-admin read access

3. **Audit logging of impersonation**
   - What we know: audit_log exists for data changes
   - What's unclear: Should we log when super-admin starts/ends impersonation?
   - Recommendation: Consider separate impersonation_log table or auth_events entries

## Sources

### Primary (HIGH confidence)
- `src/contexts/AuthContext.tsx` - Current auth pattern, tenantId from JWT
- `src/components/admin/AdminLayout.tsx` - Super-admin check pattern
- `supabase/migrations/00031_super_admin_and_global_flags.sql` - is_super_admin() function
- `supabase/migrations/00015_controls.sql` - RLS policy pattern
- `src/hooks/useRCTRows.ts` - Data hook pattern without explicit tenant filter

### Secondary (MEDIUM confidence)
- `src/stores/uiStore.ts` - Zustand state management pattern
- `src/components/tester/OfflineIndicator.tsx` - Banner UI pattern
- `src/hooks/usePermissions.ts` - Role-based access pattern

### Tertiary (LOW confidence)
- React Context best practices for impersonation (general knowledge)
- Supabase RLS policy patterns (training data)

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - All libraries already in use
- Architecture: HIGH - Clear patterns from existing codebase
- RLS bypass: HIGH - is_super_admin() already exists, just need policies
- Pitfalls: HIGH - Cache isolation is well-documented issue

**Research date:** 2026-01-28
**Valid until:** 60 days (architecture is stable)

## Files Requiring Modification

### New Files
| File | Purpose |
|------|---------|
| `src/contexts/ImpersonationContext.tsx` | Impersonation state management |
| `src/hooks/useEffectiveTenant.ts` | Combines auth + impersonation |
| `src/components/admin/ImpersonationBanner.tsx` | Visual indicator |
| `src/components/admin/TenantSwitcher.tsx` | Tenant selection UI |
| `src/components/admin/ProfileSwitcher.tsx` | Profile selection within tenant |
| `src/pages/admin/AdminTenantsPage.tsx` | Tenant browser page |
| `supabase/migrations/00033_superadmin_tenant_read.sql` | RLS policies |

### Modified Files
| File | Changes |
|------|---------|
| `src/App.tsx` | Wrap with ImpersonationProvider |
| `src/components/admin/AdminLayout.tsx` | Add ImpersonationBanner, link to tenants page |
| `src/hooks/useRCTRows.ts` | Add effectiveTenantId to queryKey, explicit filter when impersonating |
| `src/hooks/useTaxonomy.ts` | Add effectiveTenantId to queryKey, explicit filter |
| `src/hooks/useControls.ts` | Add effectiveTenantId to queryKey, explicit filter |
| `src/hooks/useControlLinks.ts` | Add effectiveTenantId to queryKey, explicit filter |
| `src/hooks/useControlTests.ts` | Add effectiveTenantId to queryKey, explicit filter |
| `src/hooks/useTickets.ts` | Add effectiveTenantId to queryKey, explicit filter |
| `src/hooks/useComments.ts` | Add effectiveTenantId to queryKey, explicit filter |
| `src/hooks/usePendingChanges.ts` | Add effectiveTenantId to queryKey, explicit filter |
| `src/hooks/useCustomColumns.ts` | Add effectiveTenantId to queryKey, explicit filter |
| `src/hooks/useScoreLabels.ts` | Add effectiveTenantId to queryKey, explicit filter |
| `src/hooks/useTaxonomyWeights.ts` | Add effectiveTenantId to queryKey, explicit filter |
| `src/hooks/useKnowledgeBase.ts` | Add effectiveTenantId to queryKey, explicit filter |
| `src/hooks/useProfiles.ts` | Add effectiveTenantId to queryKey, explicit filter |
| `src/hooks/useRemediationPlans.ts` | Add effectiveTenantId to queryKey, explicit filter |
| All mutation hooks | Add isReadOnly check to prevent modifications |

## Technical Risks

1. **Performance:** Super-admin RLS policies add OR conditions to every query - may need index optimization
2. **Migration complexity:** 15+ data hooks need modification - risk of missing one
3. **Cache invalidation:** Switching tenants must clear all cached data properly
4. **Testing:** Hard to test impersonation without multiple tenants in dev environment
