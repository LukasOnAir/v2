import { useState, useMemo } from 'react'
import { Lock, Settings, CheckCircle, Clock, Shield, AlertTriangle, Folder, Eye } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { usePermissions } from '@/hooks/usePermissions'
import { useApprovalStore } from '@/stores/approvalStore'
import { usePendingChanges } from '@/hooks/usePendingChanges'
import { ApprovalQueue, ApprovalSettings } from '@/components/approval'

/**
 * Approval queue page for Managers to review and action pending changes.
 * Risk Managers can view their pending approvals in read-only mode.
 */
export function ApprovalPage() {
  const { canApproveChanges, isRiskManager, isControlOwner, isDemoMode } = usePermissions()
  const [showSettings, setShowSettings] = useState(false)

  // Dual-source: Store (demo) vs Database (authenticated)
  const storePendingChanges = useApprovalStore((state) => state.pendingChanges)
  const { data: dbPendingChanges } = usePendingChanges()
  const pendingChanges = isDemoMode ? storePendingChanges : (dbPendingChanges ?? [])

  // Risk Manager can view but not approve/reject
  const isReadOnly = !canApproveChanges

  const pendingOnly = useMemo(
    () => pendingChanges.filter((p) => p.status === 'pending'),
    [pendingChanges]
  )

  // Summary stats
  const stats = useMemo(() => {
    const controls = pendingOnly.filter((p) => p.entityType === 'control').length
    const risks = pendingOnly.filter((p) => p.entityType === 'risk').length
    const processes = pendingOnly.filter((p) => p.entityType === 'process').length

    // Find oldest pending
    let oldestAge = null
    if (pendingOnly.length > 0) {
      const sorted = [...pendingOnly].sort(
        (a, b) => new Date(a.submittedAt).getTime() - new Date(b.submittedAt).getTime()
      )
      oldestAge = formatDistanceToNow(new Date(sorted[0].submittedAt))
    }

    return { controls, risks, processes, oldestAge }
  }, [pendingOnly])

  // Control Owner has no access - only Risk Manager and Manager can view
  if (isControlOwner) {
    return (
      <div className="p-6">
        <div className="bg-surface-elevated rounded-lg p-8 text-center">
          <Lock className="w-12 h-12 text-text-muted mx-auto mb-4" />
          <h2 className="text-lg font-medium text-text-primary mb-2">Access Restricted</h2>
          <p className="text-text-secondary">Only Risk Managers and Managers can access the approval queue.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-text-primary flex items-center gap-2">
            Approval Queue
            {isReadOnly && (
              <span className="flex items-center gap-1 text-sm font-normal text-text-muted">
                <Eye size={16} />
                View Only
              </span>
            )}
          </h1>
          <p className="text-text-secondary mt-1">
            {isReadOnly
              ? `${pendingOnly.length} pending approval${pendingOnly.length !== 1 ? 's' : ''} awaiting manager review`
              : `${pendingOnly.length} pending approval${pendingOnly.length !== 1 ? 's' : ''}`
            }
          </p>
        </div>
        {/* Only Managers can access settings */}
        {canApproveChanges && (
          <button
            onClick={() => setShowSettings(!showSettings)}
            className="flex items-center gap-2 px-3 py-1.5 text-sm bg-surface-elevated border border-surface-border rounded hover:bg-surface-overlay"
          >
            <Settings size={16} />
            Settings
          </button>
        )}
      </div>

      {/* Settings panel (collapsible) - Manager only */}
      {canApproveChanges && showSettings && (
        <div className="bg-surface-elevated rounded-lg p-4 border border-surface-border">
          <ApprovalSettings />
        </div>
      )}

      {/* Summary cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <SummaryCard
          title="Total Pending"
          value={pendingOnly.length}
          icon={Clock}
          color="amber"
        />
        <SummaryCard
          title="Controls"
          value={stats.controls}
          icon={Shield}
          color="blue"
        />
        <SummaryCard
          title="Risks"
          value={stats.risks}
          icon={AlertTriangle}
          color="orange"
        />
        <SummaryCard
          title="Processes"
          value={stats.processes}
          icon={Folder}
          color="purple"
        />
      </div>

      {/* Oldest pending indicator */}
      {stats.oldestAge && (
        <div className="text-sm text-text-muted">
          Oldest pending: <span className="text-text-secondary">{stats.oldestAge} ago</span>
        </div>
      )}

      {/* Queue or empty state */}
      {pendingOnly.length > 0 ? (
        <ApprovalQueue readOnly={isReadOnly} />
      ) : (
        <div className="bg-surface-elevated rounded-lg p-12 text-center">
          <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
          <h2 className="text-lg font-medium text-text-primary mb-2">
            {isReadOnly ? 'No Pending Changes' : 'All Caught Up!'}
          </h2>
          <p className="text-text-secondary">
            {isReadOnly
              ? 'You have no changes awaiting manager approval.'
              : 'No pending approvals at this time.'
            }
          </p>
        </div>
      )}
    </div>
  )
}

interface SummaryCardProps {
  title: string
  value: number
  icon: typeof Clock
  color: 'amber' | 'blue' | 'orange' | 'purple'
}

function SummaryCard({ title, value, icon: Icon, color }: SummaryCardProps) {
  const colorClasses: Record<string, string> = {
    amber: 'bg-amber-500/10 text-amber-400',
    blue: 'bg-blue-500/10 text-blue-400',
    orange: 'bg-orange-500/10 text-orange-400',
    purple: 'bg-purple-500/10 text-purple-400',
  }

  return (
    <div className="bg-surface-elevated rounded-lg p-4 border border-surface-border">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-text-muted">{title}</p>
          <p className="text-2xl font-semibold text-text-primary mt-1">{value}</p>
        </div>
        <div className={`p-3 rounded-lg ${colorClasses[color]}`}>
          <Icon size={20} />
        </div>
      </div>
    </div>
  )
}
