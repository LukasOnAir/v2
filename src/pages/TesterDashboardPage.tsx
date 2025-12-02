import { useMemo } from 'react'
import { AlertCircle, Clock, CheckCircle, Loader2, ClipboardList } from 'lucide-react'
import { useMyAssignedControls } from '@/hooks/useControls'
import { useAuth } from '@/contexts/AuthContext'
import { useUIStore } from '@/stores/uiStore'
import { usePermissions } from '@/hooks/usePermissions'
import { useEffectiveTenant } from '@/hooks/useEffectiveTenant'
import { isTestOverdue, getDaysUntilDue } from '@/utils/testScheduling'
import { TesterControlCard, OfflineIndicator } from '@/components/tester'
import { usePendingSync } from '@/hooks/usePendingSync'

export function TesterDashboardPage() {
  // Enable auto-sync of pending tests when back online
  usePendingSync()

  const { user } = useAuth()
  const { isControlTester } = usePermissions()
  const { effectiveProfileId, isImpersonating } = useEffectiveTenant()
  const currentTesterId = useUIStore((state) => state.currentTesterId)

  // Determine which tester ID to use:
  // - If impersonating a profile: use the impersonated profile's ID
  // - If user is an actual control tester: use their own user.id
  // - If user is a director/manager viewing as a tester: use the dropdown selection (currentTesterId)
  const effectiveTesterId = isImpersonating && effectiveProfileId
    ? effectiveProfileId
    : isControlTester
      ? user?.id
      : currentTesterId

  // Fetch controls assigned to the effective tester
  const { data: assignedControls = [], isLoading } = useMyAssignedControls(effectiveTesterId)

  // Categorize controls by status
  const overdueControls = useMemo(
    () => assignedControls.filter((c) => isTestOverdue(c.nextTestDate)),
    [assignedControls]
  )

  const dueSoonControls = useMemo(
    () =>
      assignedControls.filter((c) => {
        const days = getDaysUntilDue(c.nextTestDate)
        return days !== null && days >= 0 && days <= 7 && !isTestOverdue(c.nextTestDate)
      }),
    [assignedControls]
  )

  const upToDateControls = useMemo(
    () =>
      assignedControls.filter((c) => {
        const days = getDaysUntilDue(c.nextTestDate)
        return days === null || days > 7
      }),
    [assignedControls]
  )

  return (
    <div className="h-full flex flex-col">
      {/* Compact header with inline stats - scrolls with content */}
      <div className="flex-shrink-0 p-3 sm:p-4 border-b border-surface-border bg-surface-base">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-3 min-w-0">
            <h1 className="text-base sm:text-xl font-semibold text-text-primary whitespace-nowrap">My Controls</h1>
            {/* Inline compact stats on mobile */}
            <div className="flex items-center gap-2 text-xs overflow-x-auto">
              <span className="px-2 py-0.5 rounded bg-surface-elevated text-text-secondary whitespace-nowrap">
                {assignedControls.length} total
              </span>
              {overdueControls.length > 0 && (
                <span className="px-2 py-0.5 rounded bg-red-500/20 text-red-400 whitespace-nowrap flex items-center gap-1">
                  <AlertCircle size={12} />
                  {overdueControls.length}
                </span>
              )}
              {dueSoonControls.length > 0 && (
                <span className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-400 whitespace-nowrap flex items-center gap-1">
                  <Clock size={12} />
                  {dueSoonControls.length}
                </span>
              )}
            </div>
          </div>
          <OfflineIndicator />
        </div>
      </div>

      {/* Controls List */}
      <div className="flex-1 overflow-auto p-4 sm:p-6 pt-0">
        {isLoading ? (
          <LoadingState />
        ) : assignedControls.length === 0 ? (
          <EmptyState />
        ) : (
          <div className="space-y-3 sm:space-y-4">
            {/* Overdue section */}
            {overdueControls.length > 0 && (
              <section>
                <h2 className="text-xs sm:text-sm font-medium text-red-400 uppercase tracking-wider mb-2 sm:mb-3 flex items-center gap-2">
                  <AlertCircle size={16} />
                  Overdue ({overdueControls.length})
                </h2>
                <div className="space-y-3">
                  {overdueControls.map((control) => (
                    <TesterControlCard key={control.id} control={control} />
                  ))}
                </div>
              </section>
            )}

            {/* Due Soon section */}
            {dueSoonControls.length > 0 && (
              <section className={overdueControls.length > 0 ? 'mt-4 sm:mt-6' : ''}>
                <h2 className="text-xs sm:text-sm font-medium text-amber-400 uppercase tracking-wider mb-2 sm:mb-3 flex items-center gap-2">
                  <Clock size={16} />
                  Due This Week ({dueSoonControls.length})
                </h2>
                <div className="space-y-3">
                  {dueSoonControls.map((control) => (
                    <TesterControlCard key={control.id} control={control} />
                  ))}
                </div>
              </section>
            )}

            {/* Up to Date section */}
            {upToDateControls.length > 0 && (
              <section className={overdueControls.length > 0 || dueSoonControls.length > 0 ? 'mt-4 sm:mt-6' : ''}>
                <h2 className="text-xs sm:text-sm font-medium text-text-muted uppercase tracking-wider mb-2 sm:mb-3 flex items-center gap-2">
                  <CheckCircle size={16} />
                  Up to Date ({upToDateControls.length})
                </h2>
                <div className="space-y-3">
                  {upToDateControls.map((control) => (
                    <TesterControlCard key={control.id} control={control} />
                  ))}
                </div>
              </section>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

function LoadingState() {
  return (
    <div className="flex flex-col items-center justify-center h-full text-center py-8 sm:py-12">
      <Loader2 className="w-12 h-12 sm:w-16 sm:h-16 text-text-muted mb-4 animate-spin" />
      <h3 className="text-base sm:text-lg font-medium text-text-primary mb-2">
        Loading Controls
      </h3>
      <p className="text-xs sm:text-sm text-text-secondary">
        Fetching your assigned controls...
      </p>
    </div>
  )
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center h-full text-center py-8 sm:py-12">
      <ClipboardList className="w-12 h-12 sm:w-16 sm:h-16 text-text-muted mb-4" />
      <h3 className="text-base sm:text-lg font-medium text-text-primary mb-2">
        No Controls Assigned
      </h3>
      <p className="text-xs sm:text-sm text-text-secondary max-w-sm sm:max-w-md">
        You don't have any controls assigned to you yet.
        Contact your Risk Manager to get controls assigned for testing.
      </p>
    </div>
  )
}
