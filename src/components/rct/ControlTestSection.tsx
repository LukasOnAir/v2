import { useState, useMemo } from 'react'
import { ChevronDown, ChevronRight, Plus, ClipboardCheck, AlertCircle } from 'lucide-react'
import { useRCTStore } from '@/stores/rctStore'
import { usePermissions } from '@/hooks/usePermissions'
import { useIsDemoMode } from '@/hooks/useTenantData'
import { useTestHistory } from '@/hooks/useControlTests'
import { isTestOverdue, formatTestDate } from '@/utils/testScheduling'
import { ControlTestForm } from './ControlTestForm'
import type { Control, TestFrequency, ControlTest, StepResponse } from '@/types/rct'

const FREQUENCY_OPTIONS: { value: TestFrequency | ''; label: string }[] = [
  { value: '', label: 'Not scheduled' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'quarterly', label: 'Quarterly' },
  { value: 'annually', label: 'Annually' },
  { value: 'as-needed', label: 'As needed' },
]

const RESULT_DISPLAY: Record<string, { label: string; color: string }> = {
  pass: { label: 'Pass', color: 'text-green-400' },
  fail: { label: 'Fail', color: 'text-red-400' },
  partial: { label: 'Partial', color: 'text-amber-400' },
  'not-tested': { label: 'Not Tested', color: 'text-text-muted' },
}

interface ControlTestSectionProps {
  rowId: string
  control: Control
}

export function ControlTestSection({ rowId, control }: ControlTestSectionProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  const [showForm, setShowForm] = useState(false)

  const isDemoMode = useIsDemoMode()

  // Store data (demo mode)
  const { updateControlSchedule, controlTests: storeControlTests } = useRCTStore()

  // Database hook (auth mode) - fetches test history for this control
  const { data: dbTestHistory } = useTestHistory(control.id)

  // Dual-source selection - filter store tests for this control
  const controlTests = isDemoMode
    ? storeControlTests.filter(t => t.controlId === control.id)
    : (dbTestHistory || [])

  const { canEditTestSchedule, canRecordTestResults } = usePermissions()

  // Get test history for this control (already filtered by control.id for both sources)
  const testHistory = useMemo(() => {
    return [...controlTests].sort(
      (a, b) => new Date(b.testDate).getTime() - new Date(a.testDate).getTime()
    )
  }, [controlTests])

  const overdue = isTestOverdue(control.nextTestDate)
  const latestTest = testHistory[0]

  const handleFrequencyChange = (value: string) => {
    updateControlSchedule(
      rowId,
      control.id,
      value === '' ? null : (value as TestFrequency),
      control.testProcedure
    )
  }

  const handleProcedureChange = (value: string) => {
    updateControlSchedule(
      rowId,
      control.id,
      control.testFrequency,
      value
    )
  }

  return (
    <div className="mt-3 pt-3 border-t border-surface-border">
      {/* Header - always visible */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex items-center gap-2 w-full text-left"
      >
        {isExpanded ? (
          <ChevronDown size={16} className="text-text-muted" />
        ) : (
          <ChevronRight size={16} className="text-text-muted" />
        )}
        <ClipboardCheck size={16} className="text-text-muted" />
        <span className="text-sm font-medium text-text-primary">Testing</span>

        {/* Quick status indicators */}
        {overdue && (
          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs font-medium bg-red-500/20 text-red-400">
            <AlertCircle size={12} />
            Overdue
          </span>
        )}
        {latestTest && !overdue && (
          <span className={`text-xs ${RESULT_DISPLAY[latestTest.result]?.color || 'text-text-muted'}`}>
            Last: {RESULT_DISPLAY[latestTest.result]?.label}
          </span>
        )}
      </button>

      {/* Expanded content */}
      {isExpanded && (
        <div className="mt-3 space-y-4 pl-6">
          {/* Schedule section */}
          <div className="space-y-2">
            <h5 className="text-xs font-medium text-text-muted uppercase tracking-wider">Schedule</h5>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-text-muted block mb-1">Frequency</label>
                <select
                  value={control.testFrequency ?? ''}
                  onChange={(e) => handleFrequencyChange(e.target.value)}
                  disabled={!canEditTestSchedule}
                  className="w-full px-2 py-1.5 bg-surface-elevated border border-surface-border rounded text-sm text-text-primary focus:outline-none focus:ring-1 focus:ring-accent-500 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {FREQUENCY_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs text-text-muted block mb-1">Next Test</label>
                <div className={`px-2 py-1.5 text-sm ${overdue ? 'text-red-400' : 'text-text-primary'}`}>
                  {formatTestDate(control.nextTestDate)}
                </div>
              </div>
            </div>

            {/* Test Procedure */}
            <div>
              <label className="text-xs text-text-muted block mb-1">Test Procedure</label>
              <textarea
                value={control.testProcedure ?? ''}
                onChange={(e) => handleProcedureChange(e.target.value)}
                disabled={!canEditTestSchedule}
                placeholder="How to test this control..."
                rows={2}
                className="w-full px-2 py-1.5 bg-surface-elevated border border-surface-border rounded text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-1 focus:ring-accent-500 resize-y min-h-[48px] disabled:opacity-50 disabled:cursor-not-allowed"
              />
            </div>
          </div>

          {/* Record Test section */}
          {canRecordTestResults && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h5 className="text-xs font-medium text-text-muted uppercase tracking-wider">Record Test</h5>
                {!showForm && (
                  <button
                    onClick={() => setShowForm(true)}
                    className="flex items-center gap-1 px-2 py-1 text-xs text-accent-400 hover:text-accent-300 transition-colors"
                  >
                    <Plus size={14} />
                    New Test
                  </button>
                )}
              </div>

              {showForm && (
                <div className="p-3 bg-surface-overlay rounded border border-surface-border">
                  <ControlTestForm
                    rowId={rowId}
                    controlId={control.id}
                    onComplete={() => setShowForm(false)}
                  />
                </div>
              )}
            </div>
          )}

          {/* Test History */}
          <div className="space-y-2">
            <h5 className="text-xs font-medium text-text-muted uppercase tracking-wider">
              Test History ({testHistory.length})
            </h5>

            {testHistory.length === 0 ? (
              <p className="text-sm text-text-muted">No tests recorded yet.</p>
            ) : (
              <div className="space-y-2 max-h-[300px] overflow-auto">
                {testHistory.map((test) => (
                  <TestHistoryItem key={test.id} test={test} />
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

function TestHistoryItem({ test }: { test: ControlTest }) {
  const [isExpanded, setIsExpanded] = useState(false)

  return (
    <div className="p-3 bg-surface-overlay rounded border border-surface-border">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex items-center justify-between w-full text-left"
      >
        <div className="flex items-center gap-2">
          <span className={`font-medium text-sm ${RESULT_DISPLAY[test.result]?.color || 'text-text-muted'}`}>
            {RESULT_DISPLAY[test.result]?.label}
          </span>
          {test.effectiveness && (
            <span className="text-xs text-text-muted">
              ({test.effectiveness}/5)
            </span>
          )}
        </div>
        <span className="text-xs text-text-muted">
          {formatTestDate(test.testDate)}
        </span>
      </button>

      {isExpanded && (
        <div className="mt-2 pt-2 border-t border-surface-border space-y-2 text-sm">
          {test.testerName && (
            <div>
              <span className="text-text-muted">Tester:</span>{' '}
              <span className="text-text-primary">{test.testerName}</span>
            </div>
          )}
          {test.evidence && (
            <div>
              <span className="text-text-muted">Evidence:</span>{' '}
              <span className="text-text-secondary">{test.evidence}</span>
            </div>
          )}
          {test.findings && (
            <div>
              <span className="text-text-muted">Findings:</span>{' '}
              <span className="text-text-secondary">{test.findings}</span>
            </div>
          )}
          {test.recommendations && (
            <div>
              <span className="text-text-muted">Recommendations:</span>{' '}
              <span className="text-text-secondary">{test.recommendations}</span>
            </div>
          )}

          {/* Step Responses - show step-by-step audit trail */}
          {test.stepResponses && test.stepResponses.length > 0 && (
            <div className="mt-2 pt-2 border-t border-surface-border/50">
              <p className="text-xs text-text-muted mb-1">Step Responses:</p>
              <div className="space-y-1">
                {test.stepResponses.map((response, idx) => (
                  <StepResponseItem key={response.stepId} response={response} index={idx} />
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

/**
 * Format step response value for display
 */
function formatStepValue(value: string | number | boolean | null): string {
  if (value === null || value === undefined) return '(no response)'
  if (typeof value === 'boolean') return value ? 'Yes' : 'No'
  return String(value)
}

/**
 * Display a single step response in test history
 */
function StepResponseItem({ response, index }: { response: StepResponse; index: number }) {
  return (
    <div className="text-xs flex items-start gap-2">
      <span className="text-text-muted w-4">{index + 1}.</span>
      {response.cannotRecord ? (
        <div className="flex-1">
          <span className="text-amber-400">Cannot record:</span>
          <span className="text-text-secondary ml-1">{response.cannotRecordReason}</span>
        </div>
      ) : (
        <div className="flex-1">
          <span className="text-text-primary">
            {formatStepValue(response.value)}
          </span>
          {response.evidenceUrl && (
            <a
              href={response.evidenceUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="ml-2 text-accent-400 hover:text-accent-300"
            >
              [evidence]
            </a>
          )}
        </div>
      )}
    </div>
  )
}
