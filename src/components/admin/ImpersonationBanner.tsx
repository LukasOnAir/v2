import { Eye, X, User } from 'lucide-react'
import { useImpersonation } from '@/contexts/ImpersonationContext'

/**
 * Banner displayed when super-admin is impersonating a tenant/profile
 * Shows amber warning color, current impersonation state, and exit button
 */
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
            {impersonation.profileRole && (
              <span className="text-amber-700">({impersonation.profileRole})</span>
            )}
          </>
        )}
        <span className="text-amber-800 ml-2">(Read-only mode)</span>
      </div>
      <button
        onClick={exitImpersonation}
        className="flex items-center gap-1 px-2 py-1 rounded bg-amber-600 hover:bg-amber-700 text-white text-sm transition-colors"
      >
        <X className="w-4 h-4" />
        Exit
      </button>
    </div>
  )
}
