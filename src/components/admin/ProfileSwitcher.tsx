import { User, Eye } from 'lucide-react'
import { useProfilesByTenant } from '@/hooks/useTenants'
import { useImpersonation } from '@/contexts/ImpersonationContext'

interface ProfileSwitcherProps {
  tenantId: string | null
}

/**
 * List of profiles within selected tenant for super-admin to impersonate
 * Shows role badge and highlights currently selected profile
 */
export function ProfileSwitcher({ tenantId }: ProfileSwitcherProps) {
  const { data: profiles, isLoading, error } = useProfilesByTenant(tenantId)
  const { impersonation, selectProfile } = useImpersonation()

  if (!tenantId) {
    return (
      <div className="text-text-secondary text-sm">
        Select a tenant first to view profiles
      </div>
    )
  }

  if (isLoading) return <div className="text-text-secondary">Loading profiles...</div>
  if (error) return <div className="text-red-500">Error loading profiles</div>

  return (
    <div className="space-y-2">
      <h3 className="text-sm font-medium text-text-secondary uppercase tracking-wide">
        Select Profile (Optional)
      </h3>
      <p className="text-xs text-text-secondary">
        Impersonating a profile shows you their exact view based on role
      </p>
      <div className="space-y-1">
        {profiles?.map(profile => (
          <button
            key={profile.id}
            onClick={() => selectProfile(profile.id, profile.name, profile.role)}
            disabled={!profile.isActive}
            className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left transition-colors ${
              impersonation.profileId === profile.id
                ? 'bg-accent-500/20 text-accent-400'
                : profile.isActive
                  ? 'hover:bg-surface-overlay text-text-primary'
                  : 'opacity-50 cursor-not-allowed text-text-secondary'
            }`}
          >
            <User className="w-4 h-4 text-text-secondary" />
            <div className="flex-1">
              <div>{profile.name}</div>
            </div>
            <span className={`text-xs px-2 py-0.5 rounded ${
              profile.role === 'director' ? 'bg-purple-500/20 text-purple-400' :
              profile.role === 'manager' ? 'bg-blue-500/20 text-blue-400' :
              profile.role === 'risk-manager' ? 'bg-green-500/20 text-green-400' :
              profile.role === 'control-owner' ? 'bg-yellow-500/20 text-yellow-400' :
              'bg-gray-500/20 text-gray-400'
            }`}>
              {profile.role}
            </span>
            {impersonation.profileId === profile.id && (
              <Eye className="w-4 h-4 text-accent-400" />
            )}
            {!profile.isActive && (
              <span className="text-xs text-red-400">Inactive</span>
            )}
          </button>
        ))}
        {profiles?.length === 0 && (
          <div className="text-text-secondary text-sm py-2">No profiles in this tenant</div>
        )}
      </div>
    </div>
  )
}
