import { Building2, Eye } from 'lucide-react'
import { useTenants } from '@/hooks/useTenants'
import { useImpersonation } from '@/contexts/ImpersonationContext'

interface TenantSwitcherProps {
  onTenantSelect?: (tenantId: string) => void
}

/**
 * List of tenants for super-admin to select for impersonation
 * Highlights currently selected tenant
 */
export function TenantSwitcher({ onTenantSelect }: TenantSwitcherProps) {
  const { data: tenants, isLoading, error } = useTenants()
  const { impersonation, startTenantImpersonation } = useImpersonation()

  const handleSelect = (tenantId: string, tenantName: string) => {
    startTenantImpersonation(tenantId, tenantName)
    onTenantSelect?.(tenantId)
  }

  if (isLoading) return <div className="text-text-secondary">Loading tenants...</div>
  if (error) return <div className="text-red-500">Error loading tenants</div>

  return (
    <div className="space-y-2">
      <h3 className="text-sm font-medium text-text-secondary uppercase tracking-wide">
        Select Tenant
      </h3>
      <div className="space-y-1">
        {tenants?.map(tenant => (
          <button
            key={tenant.id}
            onClick={() => handleSelect(tenant.id, tenant.name)}
            className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left transition-colors ${
              impersonation.tenantId === tenant.id
                ? 'bg-accent-500/20 text-accent-400'
                : 'hover:bg-surface-overlay text-text-primary'
            }`}
          >
            <Building2 className="w-4 h-4 text-text-secondary" />
            <span className="flex-1">{tenant.name}</span>
            {impersonation.tenantId === tenant.id && (
              <Eye className="w-4 h-4 text-accent-400" />
            )}
          </button>
        ))}
        {tenants?.length === 0 && (
          <div className="text-text-secondary text-sm py-2">No tenants found</div>
        )}
      </div>
    </div>
  )
}
