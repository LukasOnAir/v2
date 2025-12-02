import { useState } from 'react'
import { ChevronDown, ChevronRight, AlertCircle, Clock, CheckCircle, XCircle, AlertTriangle, X } from 'lucide-react'
import { clsx } from 'clsx'
import type { Control } from '@/types/rct'
import { useLinksForControl } from '@/hooks/useControlLinks'
import { useTestHistory } from '@/hooks/useControlTests'
import { isTestOverdue, formatTestDate, getDaysUntilDue } from '@/utils/testScheduling'
import { TestWizard } from './TestWizard'

const RESULT_DISPLAY: Record<string, { label: string; icon: typeof CheckCircle; color: string }> = {
  pass: { label: 'Pass', icon: CheckCircle, color: 'text-green-400' },
  fail: { label: 'Fail', icon: XCircle, color: 'text-red-400' },
  partial: { label: 'Partial', icon: AlertTriangle, color: 'text-amber-400' },
  'not-tested': { label: 'Not Tested', icon: Clock, color: 'text-text-muted' },
}

interface TesterControlCardProps {
  control: Control
}

export function TesterControlCard({ control }: TesterControlCardProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  const [showWizard, setShowWizard] = useState(false)

  // Use React Query hooks to fetch from Supabase (works in authenticated mode)
  const { data: controlLinks = [] } = useLinksForControl(control.id)
  const { data: testHistory = [] } = useTestHistory(control.id)

  const latestTest = testHistory[0]
  const overdue = isTestOverdue(control.nextTestDate)
  const daysUntilDue = getDaysUntilDue(control.nextTestDate)

  // Use first linked row for test recording (control may be linked to multiple rows)
  const primaryRowId = controlLinks[0]?.rowId

  return (
    <div
      className={clsx(
        'border rounded-lg p-3 sm:p-4 transition-colors',
        overdue
          ? 'border-red-500/50 bg-red-500/5'
          : daysUntilDue !== null && daysUntilDue <= 7
            ? 'border-amber-500/30 bg-amber-500/5'
            : 'border-surface-border bg-surface-elevated'
      )}
    >
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2 sm:gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-sm sm:text-base font-medium text-text-primary truncate">
              {control.name}
            </h3>
            {overdue && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-red-500/20 text-red-400">
                <AlertCircle size={12} />
                Overdue
              </span>
            )}
            {!overdue && daysUntilDue !== null && daysUntilDue <= 7 && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-amber-500/20 text-amber-400">
                <Clock size={12} />
                Due Soon
              </span>
            )}
          </div>
          {control.description && (
            <p className="text-xs sm:text-sm text-text-secondary mt-1 line-clamp-2">
              {control.description}
            </p>
          )}
        </div>

        {/* Status indicators */}
        <div className="flex items-center gap-3 flex-shrink-0">
          {latestTest && (
            <div className={clsx('flex items-center gap-1 text-xs sm:text-sm', RESULT_DISPLAY[latestTest.result]?.color)}>
              {(() => {
                const ResultIcon = RESULT_DISPLAY[latestTest.result]?.icon || Clock
                return <ResultIcon size={16} />
              })()}
              <span>{RESULT_DISPLAY[latestTest.result]?.label}</span>
            </div>
          )}
        </div>
      </div>

      {/* Quick info row */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-6 mt-3 text-xs sm:text-sm text-text-secondary">
        <div>
          <span className="text-text-muted">Frequency:</span>{' '}
          <span className="text-text-primary capitalize">
            {control.testFrequency || 'Not set'}
          </span>
        </div>
        <div>
          <span className="text-text-muted">Next Test:</span>{' '}
          <span className={overdue ? 'text-red-400' : 'text-text-primary'}>
            {formatTestDate(control.nextTestDate)}
          </span>
        </div>
        <div>
          <span className="text-text-muted">Last Test:</span>{' '}
          <span className="text-text-primary">
            {formatTestDate(control.lastTestDate)}
          </span>
        </div>
      </div>

      {/* Expand/Collapse */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex items-center gap-1 mt-3 text-xs sm:text-sm text-accent-400 hover:text-accent-300 transition-colors min-h-[44px] focus:outline-none focus:ring-2 focus:ring-accent-500 focus:ring-offset-2 focus:ring-offset-surface-elevated rounded"
      >
        {isExpanded ? (
          <>
            <ChevronDown size={16} />
            Hide Details
          </>
        ) : (
          <>
            <ChevronRight size={16} />
            Show Details
          </>
        )}
      </button>

      {/* Expanded content */}
      {isExpanded && (
        <div className="mt-3 sm:mt-4 pt-3 sm:pt-4 border-t border-surface-border space-y-3 sm:space-y-4">
          {/* Test Procedure */}
          {control.testProcedure && (
            <div>
              <h4 className="text-xs font-medium text-text-muted uppercase tracking-wider mb-1 sm:mb-2">
                Test Procedure
              </h4>
              <p className="text-xs sm:text-sm text-text-secondary whitespace-pre-wrap">
                {control.testProcedure}
              </p>
            </div>
          )}

          {/* Record Test */}
          <div>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
              <h4 className="text-xs font-medium text-text-muted uppercase tracking-wider">
                Record Test
              </h4>
              {primaryRowId && (
                <button
                  onClick={() => setShowWizard(true)}
                  className="px-3 py-2 sm:py-1.5 text-sm font-medium text-white bg-accent-500 hover:bg-accent-600 rounded transition-colors min-h-[44px] sm:min-h-0 focus:outline-none focus:ring-2 focus:ring-accent-500 focus:ring-offset-2 focus:ring-offset-surface-elevated"
                >
                  Record Test Result
                </button>
              )}
            </div>

            {!primaryRowId && (
              <p className="text-xs sm:text-sm text-text-muted">
                This control is not linked to any risk. Contact your Risk Manager.
              </p>
            )}
          </div>

          {/* Test History */}
          <div>
            <h4 className="text-xs font-medium text-text-muted uppercase tracking-wider mb-1 sm:mb-2">
              Test History ({testHistory.length})
            </h4>

            {testHistory.length === 0 ? (
              <p className="text-xs sm:text-sm text-text-muted">No tests recorded yet.</p>
            ) : (
              <div className="space-y-2 max-h-[200px] overflow-auto">
                {testHistory.slice(0, 5).map((test) => (
                  <div
                    key={test.id}
                    className="p-2 bg-surface-overlay rounded border border-surface-border text-xs sm:text-sm"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 sm:gap-0">
                      <span className={RESULT_DISPLAY[test.result]?.color || 'text-text-muted'}>
                        {RESULT_DISPLAY[test.result]?.label}
                        {test.effectiveness && ` (${test.effectiveness}/5)`}
                      </span>
                      <span className="text-text-muted text-xs">
                        {formatTestDate(test.testDate)}
                      </span>
                    </div>
                    {test.testerName && (
                      <div className="text-text-muted text-xs mt-1">
                        By: {test.testerName}
                      </div>
                    )}
                  </div>
                ))}
                {testHistory.length > 5 && (
                  <p className="text-xs text-text-muted">
                    +{testHistory.length - 5} more tests
                  </p>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Full-screen wizard overlay */}
      {showWizard && primaryRowId && (
        <div className="fixed inset-0 z-50 bg-surface-base flex flex-col">
          {/* Wizard header */}
          <div className="flex items-center justify-between p-4 border-b border-surface-border">
            <h2 className="text-lg font-medium text-text-primary truncate flex-1 mr-4">
              {control.name}
            </h2>
            <button
              onClick={() => setShowWizard(false)}
              className="flex items-center justify-center min-h-[48px] min-w-[48px] p-2 text-text-muted hover:text-text-primary transition-colors focus:outline-none focus:ring-2 focus:ring-accent-500 focus:ring-offset-2 focus:ring-offset-surface-base rounded-lg"
              aria-label="Close wizard"
            >
              <X size={24} />
            </button>
          </div>

          {/* Wizard content */}
          <div className="flex-1 overflow-auto p-4">
            <TestWizard
              control={control}
              rowId={primaryRowId}
              onComplete={() => setShowWizard(false)}
            />
          </div>
        </div>
      )}
    </div>
  )
}
