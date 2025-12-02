import { clsx } from 'clsx'
import { Ban, CheckCircle } from 'lucide-react'
import type { TestStep } from '@/types/rct'
import { PhotoUpload } from './PhotoUpload'
import { CannotRecordReason } from './CannotRecordReason'

interface StepInputProps {
  step: TestStep
  value: string | number | boolean | null
  onChange: (value: string | number | boolean | null) => void
  cannotRecord: boolean
  cannotRecordReason: string
  onCannotRecordChange: (cannot: boolean, reason: string) => void
  evidenceUrl: string | null
  onEvidenceChange: (url: string | null) => void
}

export function StepInput({
  step,
  value,
  onChange,
  cannotRecord,
  cannotRecordReason,
  onCannotRecordChange,
  evidenceUrl,
  onEvidenceChange,
}: StepInputProps) {
  const handleCannotRecordToggle = () => {
    if (cannotRecord) {
      // Turning off cannot record - clear reason and restore value
      onCannotRecordChange(false, '')
    } else {
      // Turning on cannot record - clear value
      onChange(null)
      onCannotRecordChange(true, '')
    }
  }

  return (
    <div className="space-y-4">
      {/* Input or Cannot Record reason */}
      {cannotRecord ? (
        <CannotRecordReason
          reason={cannotRecordReason}
          onReasonChange={(reason) => onCannotRecordChange(true, reason)}
        />
      ) : (
        <div className="space-y-2">
          {renderInput(step, value, onChange)}
        </div>
      )}

      {/* Cannot record toggle */}
      <button
        type="button"
        onClick={handleCannotRecordToggle}
        className={clsx(
          'w-full min-h-[48px] px-4 py-3 rounded-lg border-2 flex items-center justify-center gap-2 transition-all focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-2 focus:ring-offset-surface-base',
          cannotRecord
            ? 'bg-amber-500/10 border-amber-500/30 text-amber-400'
            : 'bg-surface-elevated border-surface-border text-text-secondary hover:text-text-primary hover:border-surface-overlay'
        )}
      >
        <Ban size={18} />
        <span className="text-sm font-medium">
          {cannotRecord ? 'Recording enabled - tap to disable' : 'Cannot record this step'}
        </span>
      </button>

      {/* Per-step evidence */}
      {!cannotRecord && (
        <div className="pt-2 border-t border-surface-border">
          <p className="text-xs text-text-muted mb-2">Evidence for this step (optional)</p>
          <PhotoUpload onUpload={onEvidenceChange} existingUrl={evidenceUrl || undefined} />
        </div>
      )}
    </div>
  )
}

function renderInput(
  step: TestStep,
  value: string | number | boolean | null,
  onChange: (value: string | number | boolean | null) => void
) {
  switch (step.inputType) {
    case 'text':
      return (
        <textarea
          value={typeof value === 'string' ? value : ''}
          onChange={(e) => onChange(e.target.value || null)}
          placeholder={step.helpText || 'Enter your observation...'}
          className="w-full min-h-[100px] px-4 py-3 bg-surface-elevated border border-surface-border rounded-lg text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-1 focus:ring-accent-500 resize-y text-sm"
        />
      )

    case 'binary':
      return (
        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => onChange(true)}
            className={clsx(
              'flex-1 min-h-[64px] px-4 py-3 rounded-lg border-2 flex items-center justify-center gap-3 transition-all focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 focus:ring-offset-surface-base',
              value === true
                ? 'bg-green-500/10 border-green-500 text-green-400'
                : 'bg-surface-elevated border-surface-border text-text-secondary hover:border-green-500/50 hover:text-green-400'
            )}
          >
            <CheckCircle size={24} />
            <span className="text-lg font-medium">Yes</span>
          </button>
          <button
            type="button"
            onClick={() => onChange(false)}
            className={clsx(
              'flex-1 min-h-[64px] px-4 py-3 rounded-lg border-2 flex items-center justify-center gap-3 transition-all focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 focus:ring-offset-surface-base',
              value === false
                ? 'bg-red-500/10 border-red-500 text-red-400'
                : 'bg-surface-elevated border-surface-border text-text-secondary hover:border-red-500/50 hover:text-red-400'
            )}
          >
            <Ban size={24} />
            <span className="text-lg font-medium">No</span>
          </button>
        </div>
      )

    case 'multiple_choice':
      return (
        <div className="space-y-2">
          {step.options?.map((option, index) => (
            <button
              key={index}
              type="button"
              onClick={() => onChange(option)}
              className={clsx(
                'w-full min-h-[48px] px-4 py-3 rounded-lg border-2 flex items-center gap-3 transition-all focus:outline-none focus:ring-2 focus:ring-accent-500 focus:ring-offset-2 focus:ring-offset-surface-base',
                value === option
                  ? 'bg-accent-500/10 border-accent-500 text-accent-400'
                  : 'bg-surface-elevated border-surface-border text-text-secondary hover:border-accent-500/50 hover:text-text-primary'
              )}
            >
              <span
                className={clsx(
                  'w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0',
                  value === option
                    ? 'border-accent-500 bg-accent-500'
                    : 'border-surface-overlay'
                )}
              >
                {value === option && (
                  <span className="w-2 h-2 rounded-full bg-white" />
                )}
              </span>
              <span className="text-sm">{option}</span>
            </button>
          ))}
        </div>
      )

    case 'number':
      return (
        <input
          type="number"
          inputMode="decimal"
          value={typeof value === 'number' ? value : ''}
          onChange={(e) => {
            const val = e.target.value
            onChange(val === '' ? null : parseFloat(val))
          }}
          placeholder={step.helpText || 'Enter a number...'}
          className="w-full min-h-[48px] px-4 py-3 bg-surface-elevated border border-surface-border rounded-lg text-lg text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-1 focus:ring-accent-500"
        />
      )

    case 'date':
      return (
        <input
          type="date"
          value={typeof value === 'string' ? value : ''}
          onChange={(e) => onChange(e.target.value || null)}
          className="w-full min-h-[48px] px-4 py-3 bg-surface-elevated border border-surface-border rounded-lg text-text-primary focus:outline-none focus:ring-1 focus:ring-accent-500"
        />
      )

    default:
      return (
        <p className="text-text-muted text-sm">
          Unknown input type: {step.inputType}
        </p>
      )
  }
}
