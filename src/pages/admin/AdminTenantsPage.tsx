import { useNavigate } from 'react-router'
import { ArrowRight, Shield } from 'lucide-react'
import { TenantSwitcher } from '@/components/admin/TenantSwitcher'
import { ProfileSwitcher } from '@/components/admin/ProfileSwitcher'
import { useImpersonation } from '@/contexts/ImpersonationContext'

/**
 * Admin page for tenant/profile impersonation
 * Allows super-admin to browse tenants and select one to view as
 */
export function AdminTenantsPage() {
  const navigate = useNavigate()
  const { impersonation, isImpersonating } = useImpersonation()

  const handleViewAsTenant = () => {
    // Navigate to main app to see the impersonated view
    navigate('/')
  }

  return (
    <div className="max-w-4xl">
      <div className="flex items-center gap-3 mb-6">
        <Shield className="w-6 h-6 text-accent-500" />
        <h1 className="text-2xl font-bold text-text-primary">
          Tenant Impersonation
        </h1>
      </div>

      <p className="text-text-secondary mb-6">
        View the application as any tenant or user to verify their experience.
        All actions are read-only while impersonating.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Tenant Selection */}
        <div className="bg-surface-elevated border border-surface-border rounded-lg p-4">
          <TenantSwitcher />
        </div>

        {/* Profile Selection */}
        <div className="bg-surface-elevated border border-surface-border rounded-lg p-4">
          <ProfileSwitcher tenantId={impersonation.tenantId} />
        </div>
      </div>

      {/* Action Button */}
      {isImpersonating && (
        <div className="mt-6">
          <button
            onClick={handleViewAsTenant}
            className="flex items-center gap-2 px-4 py-2 bg-accent-500 hover:bg-accent-600 text-white rounded-lg transition-colors"
          >
            View as {impersonation.tenantName}
            {impersonation.profileName && ` (${impersonation.profileName})`}
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  )
}
