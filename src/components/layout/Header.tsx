import { lazy, Suspense, useState } from 'react'
import { Link, useNavigate } from 'react-router'
import { Bell, FileText, LogOut, User } from 'lucide-react'
import { useUIStore } from '@/stores/uiStore'
import { useApprovalStore } from '@/stores/approvalStore'
import { usePermissions } from '@/hooks/usePermissions'
import { useFeatureFlags } from '@/hooks/useFeatureFlags'
import { usePendingCount } from '@/hooks/usePendingChanges'

// Lazy load RFI dialog to avoid loading PDF library (~500KB) on page load
const RFIDialog = lazy(() => import('@/components/rfi/RFIDialog').then(m => ({ default: m.RFIDialog })))

export function Header() {
  const { logout } = useUIStore()
  const { isManager, isDemoMode } = usePermissions()
  const { showRfi } = useFeatureFlags()

  // Dual-source: Store (demo) vs Database (authenticated)
  const storePendingCount = useApprovalStore((state) => state.getPendingCount())
  const { data: dbPendingCount } = usePendingCount()
  const pendingCount = isDemoMode ? storePendingCount : (dbPendingCount ?? 0)

  const navigate = useNavigate()
  const [showRFI, setShowRFI] = useState(false)

  return (
    <header className="h-14 bg-surface-elevated border-b border-surface-border flex items-center justify-between px-4">
      <div className="flex items-center gap-3">
        <h1 className="text-lg font-semibold text-text-primary">
          RiskLytix ERM
        </h1>
        {showRfi && (
          <button
            onClick={() => setShowRFI(true)}
            className="px-3 py-1.5 text-sm bg-surface-overlay hover:bg-surface-elevated border border-surface-border rounded-md flex items-center gap-1.5 text-text-secondary hover:text-text-primary transition-colors"
          >
            <FileText className="w-4 h-4" />
            Show RFI
          </button>
        )}
      </div>

      <div className="flex items-center gap-4">
        {isManager && (
          <Link
            to="/approval"
            className="relative p-2 text-text-secondary hover:text-text-primary transition-colors"
            title={`${pendingCount} pending approvals`}
          >
            <Bell size={20} />
            {pendingCount > 0 && (
              <span className="absolute -top-1 -right-1 bg-amber-500 text-white text-xs font-medium w-5 h-5 flex items-center justify-center rounded-full">
                {pendingCount > 9 ? '9+' : pendingCount}
              </span>
            )}
          </Link>
        )}
        <Link
          to="/profile"
          className="p-2 rounded-lg hover:bg-surface-overlay text-text-secondary hover:text-text-primary transition-colors"
          title="Profile"
        >
          <User className="w-5 h-5" />
        </Link>
        <button
          onClick={() => {
            logout()
            navigate('/login')
          }}
          className="p-2 rounded-lg hover:bg-surface-overlay text-text-secondary hover:text-text-primary transition-colors"
          title="Logout"
        >
          <LogOut className="w-5 h-5" />
        </button>
      </div>

      {/* Lazy-loaded RFI Dialog */}
      <Suspense fallback={null}>
        {showRFI && (
          <RFIDialog open={showRFI} onOpenChange={setShowRFI} />
        )}
      </Suspense>
    </header>
  )
}
