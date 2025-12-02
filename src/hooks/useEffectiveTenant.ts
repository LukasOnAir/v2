import { useAuth } from '@/contexts/AuthContext'
import { useImpersonation } from '@/contexts/ImpersonationContext'

/**
 * Hook that combines auth tenant with impersonation override.
 *
 * Use this hook when you need to:
 * 1. Get the effective tenant ID for data queries (effectiveTenantId)
 * 2. Check if data should be read-only (isReadOnly)
 * 3. Show effective role for permission-based UI (effectiveRole)
 * 4. Know who the actual user is (realTenantId, realRole)
 *
 * When impersonating:
 * - effectiveTenantId = impersonated tenant's ID
 * - effectiveProfileId = impersonated profile's ID (if selected)
 * - effectiveRole = impersonated profile's role (if selected)
 * - isReadOnly = true (modifications disabled)
 *
 * When not impersonating:
 * - effectiveTenantId = real tenant from JWT
 * - effectiveProfileId = null
 * - effectiveRole = real role from JWT
 * - isReadOnly = false
 */
export function useEffectiveTenant() {
  const { tenantId: realTenantId, role: realRole } = useAuth()
  const { impersonation, isImpersonating, isReadOnly } = useImpersonation()

  return {
    // Effective values (impersonation overrides real)
    effectiveTenantId: impersonation.tenantId ?? realTenantId,
    effectiveProfileId: impersonation.profileId ?? null,
    effectiveRole: impersonation.profileRole ?? realRole,

    // State flags
    isImpersonating,
    isReadOnly,

    // Real values (for admin UI to know who the actual user is)
    realTenantId,
    realRole,
  }
}
