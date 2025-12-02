import { useState, useMemo } from 'react'
import { format } from 'date-fns'
import { CheckCircle, XCircle, AlertTriangle, ChevronLeft, ArrowRight, Edit2, Ban } from 'lucide-react'
import { clsx } from 'clsx'
import { toast } from 'sonner'
import type { Control, TestResult, TestStep, StepResponse, TestStepInputType } from '@/types/rct'
import { useNetworkStatus } from '@/hooks/useNetworkStatus'
import { useRecordTest } from '@/hooks/useControlTests'
import { useIsDemoMode } from '@/hooks/useTenantData'
import { useRCTStore } from '@/stores/rctStore'
import { queueTestSubmission } from '@/lib/offlineQueue'
import { WizardStep } from './WizardStep'
import { PhotoUpload } from './PhotoUpload'
import { StepInput } from './StepInput'

interface WizardStepConfig {
  id: string
  title: string
  subtitle: string
  procedureStep?: TestStep
}

const RESULT_OPTIONS: { value: TestResult; label: string; icon: typeof CheckCircle; color: string; bgColor: string }[] = [
  { value: 'pass', label: 'Pass', icon: CheckCircle, color: 'text-green-400', bgColor: 'bg-green-500/10 border-green-500/30' },
  { value: 'fail', label: 'Fail', icon: XCircle, color: 'text-red-400', bgColor: 'bg-red-500/10 border-red-500/30' },
  { value: 'partial', label: 'Partially', icon: AlertTriangle, color: 'text-amber-400', bgColor: 'bg-amber-500/10 border-amber-500/30' },
]

/**
 * Get human-readable label for input type
 */
function getInputTypeLabel(type: TestStepInputType): string {
  const labels: Record<TestStepInputType, string> = {
    text: 'Enter your observation',
    binary: 'Yes or No',
    multiple_choice: 'Select one option',
    number: 'Enter a number',
    date: 'Select a date',
  }
  return labels[type]
}

/**
 * Build dynamic wizard steps based on control configuration
 */
function buildWizardSteps(control: Control): WizardStepConfig[] {
  const steps: WizardStepConfig[] = [
    { id: 'confirm', title: 'Review Control', subtitle: 'Verify this is the correct control' },
  ]

  // Inject procedure steps if defined
  if (control.testSteps && control.testSteps.length > 0) {
    const procedureSteps = [...control.testSteps]
      .sort((a, b) => a.order - b.order)
      .map((step, idx) => ({
        id: `step-${step.id}`,
        title: `Step ${idx + 1}: ${step.label}`,
        subtitle: step.helpText || getInputTypeLabel(step.inputType),
        procedureStep: step,
      }))
    steps.push(...procedureSteps)
  }

  steps.push(
    { id: 'result', title: 'Test Result', subtitle: 'Did the control work as expected?' },
    { id: 'evidence', title: 'Add Evidence', subtitle: 'Optional: Take a photo or add notes' },
    { id: 'review', title: 'Review & Submit', subtitle: 'Check your answers before submitting' },
  )

  return steps
}

interface TestWizardProps {
  control: Control
  rowId: string
  onComplete: () => void
}

export function TestWizard({ control, rowId, onComplete }: TestWizardProps) {
  const isOnline = useNetworkStatus()
  const isDemoMode = useIsDemoMode()
  const recordTestMutation = useRecordTest()
  const storeRecordTest = useRCTStore((state) => state.recordControlTest)

  // Build wizard steps dynamically based on control configuration
  const wizardSteps = useMemo(() => buildWizardSteps(control), [control])

  const [currentStep, setCurrentStep] = useState(0)
  const [result, setResult] = useState<TestResult>('pass')
  const [photoUrl, setPhotoUrl] = useState<string | null>(null)
  const [notes, setNotes] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [stepResponses, setStepResponses] = useState<Map<string, StepResponse>>(new Map())

  const currentWizardStep = wizardSteps[currentStep]
  const progress = ((currentStep + 1) / wizardSteps.length) * 100

  // Helper to update step responses
  const updateStepResponse = (stepId: string, updates: Partial<StepResponse>) => {
    setStepResponses(prev => {
      const current = prev.get(stepId) || {
        stepId,
        value: null,
        cannotRecord: false,
        recordedAt: new Date().toISOString()
      }
      const updated = new Map(prev)
      updated.set(stepId, { ...current, ...updates, recordedAt: new Date().toISOString() })
      return updated
    })
  }

  const canProceed = (): boolean => {
    const stepId = currentWizardStep.id

    // Procedure step validation
    if (currentWizardStep.procedureStep) {
      const step = currentWizardStep.procedureStep
      const response = stepResponses.get(step.id)

      if (step.required) {
        if (response?.cannotRecord) {
          // Cannot record requires reason >= 10 chars
          return (response.cannotRecordReason?.length ?? 0) >= 10
        }
        // Required step needs a value
        return response?.value !== null && response?.value !== undefined && response?.value !== ''
      }
      return true // Non-required steps can proceed
    }

    // Standard step validation
    switch (stepId) {
      case 'confirm': // Confirm step - always can proceed
        return true
      case 'result': // Result step - must select result
        return !!result
      case 'evidence': // Evidence step - always optional
        return true
      case 'review': // Review step - always can submit
        return true
      default:
        return false
    }
  }

  const handleSubmit = async () => {
    setSubmitting(true)

    // Map result to default effectiveness
    const effectivenessMap: Record<TestResult, number> = {
      pass: 5,
      partial: 3,
      fail: 1,
      'not-tested': 0,
    }

    const testData = {
      controlId: control.id,
      rowId,
      testDate: format(new Date(), 'yyyy-MM-dd'),
      result,
      effectiveness: effectivenessMap[result],
      evidence: [photoUrl, notes].filter(Boolean).join('\n\n') || undefined,
      // Include step responses if control has testSteps
      stepResponses: control.testSteps?.length
        ? Array.from(stepResponses.values())
        : undefined,
    }

    try {
      if (isDemoMode) {
        // Demo mode - use store
        storeRecordTest(testData)
        toast.success('Test recorded')
      } else if (isOnline) {
        // Online - submit to database
        await recordTestMutation.mutateAsync(testData)
        toast.success('Test recorded')
      } else {
        // Offline - queue for later sync
        await queueTestSubmission(testData)
        toast.info('Test saved offline - will sync when connected')
      }
      onComplete()
    } catch (error) {
      console.error('Failed to submit test:', error)
      toast.error('Failed to submit test')
    } finally {
      setSubmitting(false)
    }
  }

  const handleNext = () => {
    if (currentStep < wizardSteps.length - 1) {
      setCurrentStep(currentStep + 1)
    } else {
      handleSubmit()
    }
  }

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1)
    }
  }

  const goToStep = (step: number) => {
    setCurrentStep(step)
  }

  // Find step indices for review navigation
  const confirmStepIndex = wizardSteps.findIndex(s => s.id === 'confirm')
  const resultStepIndex = wizardSteps.findIndex(s => s.id === 'result')
  const evidenceStepIndex = wizardSteps.findIndex(s => s.id === 'evidence')

  const selectedResult = RESULT_OPTIONS.find((r) => r.value === result)

  // Get step responses for review display
  const procedureSteps = wizardSteps.filter(s => s.procedureStep)

  return (
    <div className="flex flex-col h-full">
      {/* Progress bar */}
      <div className="mb-6">
        <div className="h-2 bg-surface-border rounded-full overflow-hidden">
          <div
            className="h-full bg-accent-500 transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
        <p className="text-xs text-text-muted mt-2">
          Step {currentStep + 1} of {wizardSteps.length}: {currentWizardStep.title}
        </p>
      </div>

      {/* Step content */}
      <div className="flex-1 overflow-auto">
        <WizardStep step={currentWizardStep}>
          {/* Confirm step */}
          {currentWizardStep.id === 'confirm' && (
            <div className="space-y-4">
              <div className="p-4 bg-surface-elevated rounded-lg border border-surface-border">
                <h3 className="font-medium text-text-primary mb-2">{control.name}</h3>
                {control.description && (
                  <p className="text-sm text-text-secondary mb-4">{control.description}</p>
                )}
                {/* Show legacy procedure for controls without testSteps */}
                {control.testProcedure && !control.testSteps?.length && (
                  <div>
                    <h4 className="text-xs font-medium text-text-muted uppercase tracking-wider mb-2">
                      How to Test
                    </h4>
                    <p className="text-sm text-text-secondary whitespace-pre-wrap">
                      {control.testProcedure}
                    </p>
                  </div>
                )}
                {/* Show step count for controls with testSteps */}
                {control.testSteps && control.testSteps.length > 0 && (
                  <div className="mt-4 pt-4 border-t border-surface-border">
                    <p className="text-sm text-text-secondary">
                      This test has <span className="font-medium text-accent-400">{control.testSteps.length} procedure step{control.testSteps.length > 1 ? 's' : ''}</span> to complete.
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Procedure step - render StepInput */}
          {currentWizardStep.procedureStep && (
            <StepInput
              step={currentWizardStep.procedureStep}
              value={stepResponses.get(currentWizardStep.procedureStep.id)?.value ?? null}
              onChange={(value) => updateStepResponse(currentWizardStep.procedureStep!.id, { value })}
              cannotRecord={stepResponses.get(currentWizardStep.procedureStep.id)?.cannotRecord ?? false}
              cannotRecordReason={stepResponses.get(currentWizardStep.procedureStep.id)?.cannotRecordReason ?? ''}
              onCannotRecordChange={(cannot, reason) => updateStepResponse(currentWizardStep.procedureStep!.id, { cannotRecord: cannot, cannotRecordReason: reason })}
              evidenceUrl={stepResponses.get(currentWizardStep.procedureStep.id)?.evidenceUrl ?? null}
              onEvidenceChange={(url) => updateStepResponse(currentWizardStep.procedureStep!.id, { evidenceUrl: url ?? undefined })}
            />
          )}

          {/* Result step */}
          {currentWizardStep.id === 'result' && (
            <div className="space-y-3">
              {RESULT_OPTIONS.map((option) => {
                const Icon = option.icon
                const isSelected = result === option.value
                return (
                  <button
                    key={option.value}
                    onClick={() => setResult(option.value)}
                    className={clsx(
                      'w-full min-h-[64px] p-4 rounded-lg border-2 flex items-center gap-4 transition-all focus:outline-none focus:ring-2 focus:ring-accent-500 focus:ring-offset-2 focus:ring-offset-surface-base',
                      isSelected
                        ? option.bgColor
                        : 'bg-surface-elevated border-surface-border hover:border-surface-overlay'
                    )}
                  >
                    <Icon className={clsx('w-8 h-8', option.color)} />
                    <span className={clsx('text-lg font-medium', isSelected ? option.color : 'text-text-primary')}>
                      {option.label}
                    </span>
                    {isSelected && (
                      <CheckCircle className="w-5 h-5 text-accent-400 ml-auto" />
                    )}
                  </button>
                )
              })}
            </div>
          )}

          {/* Evidence step */}
          {currentWizardStep.id === 'evidence' && (
            <div className="space-y-4">
              <PhotoUpload onUpload={setPhotoUrl} existingUrl={photoUrl || undefined} />
              <div>
                <label className="text-xs text-text-muted block mb-2">
                  Notes (optional)
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Add any observations or additional details..."
                  rows={4}
                  className="w-full px-3 py-2 bg-surface-elevated border border-surface-border rounded-lg text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-1 focus:ring-accent-500 resize-y min-h-[100px]"
                />
              </div>
            </div>
          )}

          {/* Review step */}
          {currentWizardStep.id === 'review' && (
            <div className="space-y-4">
              {/* Control summary */}
              <div className="p-4 bg-surface-elevated rounded-lg border border-surface-border">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-text-muted">Control</span>
                  <button
                    onClick={() => goToStep(confirmStepIndex)}
                    className="text-xs text-accent-400 hover:text-accent-300 flex items-center gap-1"
                  >
                    <Edit2 size={12} />
                    Edit
                  </button>
                </div>
                <p className="text-text-primary font-medium">{control.name}</p>
              </div>

              {/* Step responses summary */}
              {procedureSteps.length > 0 && (
                <div className="p-4 bg-surface-elevated rounded-lg border border-surface-border">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-sm text-text-muted">Procedure Steps</span>
                  </div>
                  <div className="space-y-2">
                    {procedureSteps.map((ws, idx) => {
                      const step = ws.procedureStep!
                      const response = stepResponses.get(step.id)
                      const stepIndex = wizardSteps.findIndex(s => s.id === ws.id)

                      return (
                        <div
                          key={step.id}
                          className="flex items-start gap-2 text-sm"
                        >
                          <span className="text-text-muted shrink-0">{idx + 1}.</span>
                          <div className="flex-1 min-w-0">
                            <span className="text-text-secondary">{step.label}: </span>
                            {response?.cannotRecord ? (
                              <span className="text-amber-400 flex items-center gap-1">
                                <Ban size={12} />
                                Cannot record
                              </span>
                            ) : response?.value !== null && response?.value !== undefined && response?.value !== '' ? (
                              <span className="text-text-primary font-medium">
                                {formatResponseValue(response.value)}
                              </span>
                            ) : (
                              <span className="text-text-muted italic">Not recorded</span>
                            )}
                          </div>
                          <button
                            onClick={() => goToStep(stepIndex)}
                            className="text-xs text-accent-400 hover:text-accent-300 flex items-center gap-1 shrink-0"
                          >
                            <Edit2 size={10} />
                          </button>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}

              {/* Result summary */}
              <div className="p-4 bg-surface-elevated rounded-lg border border-surface-border">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-text-muted">Result</span>
                  <button
                    onClick={() => goToStep(resultStepIndex)}
                    className="text-xs text-accent-400 hover:text-accent-300 flex items-center gap-1"
                  >
                    <Edit2 size={12} />
                    Edit
                  </button>
                </div>
                {selectedResult && (
                  <div className="flex items-center gap-2">
                    <selectedResult.icon className={clsx('w-5 h-5', selectedResult.color)} />
                    <span className={clsx('font-medium', selectedResult.color)}>
                      {selectedResult.label}
                    </span>
                  </div>
                )}
              </div>

              {/* Evidence summary */}
              <div className="p-4 bg-surface-elevated rounded-lg border border-surface-border">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-text-muted">Evidence</span>
                  <button
                    onClick={() => goToStep(evidenceStepIndex)}
                    className="text-xs text-accent-400 hover:text-accent-300 flex items-center gap-1"
                  >
                    <Edit2 size={12} />
                    Edit
                  </button>
                </div>
                {photoUrl ? (
                  <img
                    src={photoUrl}
                    alt="Evidence"
                    className="w-full max-h-32 object-cover rounded-lg mb-2"
                  />
                ) : (
                  <p className="text-text-muted text-sm">No photo</p>
                )}
                {notes ? (
                  <p className="text-sm text-text-secondary line-clamp-2">{notes}</p>
                ) : (
                  <p className="text-text-muted text-sm">No notes</p>
                )}
              </div>

              {!isOnline && !isDemoMode && (
                <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-lg">
                  <p className="text-sm text-amber-400">
                    You're offline. Test will be saved and synced when you reconnect.
                  </p>
                </div>
              )}
            </div>
          )}
        </WizardStep>
      </div>

      {/* Navigation */}
      <div className="mt-auto pt-4 flex gap-3">
        {currentStep > 0 && (
          <button
            onClick={handleBack}
            disabled={submitting}
            className="flex items-center justify-center gap-2 min-h-[48px] px-4 py-3 bg-surface-elevated border border-surface-border rounded-lg text-text-secondary hover:text-text-primary hover:bg-surface-overlay transition-colors disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-accent-500 focus:ring-offset-2 focus:ring-offset-surface-base"
          >
            <ChevronLeft size={20} />
            Back
          </button>
        )}
        <button
          onClick={handleNext}
          disabled={!canProceed() || submitting}
          className="flex-1 flex items-center justify-center gap-2 min-h-[48px] px-4 py-3 bg-accent-500 hover:bg-accent-600 text-white font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-accent-500 focus:ring-offset-2 focus:ring-offset-surface-base"
        >
          {submitting ? (
            'Submitting...'
          ) : currentStep === wizardSteps.length - 1 ? (
            'Submit Test'
          ) : (
            <>
              Next
              <ArrowRight size={20} />
            </>
          )}
        </button>
      </div>
    </div>
  )
}

/**
 * Format response value for display in review
 */
function formatResponseValue(value: string | number | boolean | null): string {
  if (value === null || value === undefined) return ''
  if (typeof value === 'boolean') return value ? 'Yes' : 'No'
  if (typeof value === 'number') return String(value)
  return String(value)
}
