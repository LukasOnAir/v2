import { AlertTriangle } from 'lucide-react'

interface CannotRecordReasonProps {
  reason: string
  onReasonChange: (reason: string) => void
}

const MIN_REASON_LENGTH = 10

export function CannotRecordReason({ reason, onReasonChange }: CannotRecordReasonProps) {
  const isValid = reason.length >= MIN_REASON_LENGTH
  const showValidation = reason.length > 0 && !isValid

  return (
    <div className="p-4 bg-amber-500/10 border border-amber-500/30 rounded-lg space-y-3">
      {/* Header */}
      <div className="flex items-center gap-2">
        <AlertTriangle className="w-5 h-5 text-amber-400 flex-shrink-0" />
        <span className="font-medium text-amber-400">Cannot record this step</span>
      </div>

      {/* Reason textarea */}
      <div>
        <textarea
          value={reason}
          onChange={(e) => onReasonChange(e.target.value)}
          placeholder="Please explain why this step cannot be recorded..."
          className="w-full min-h-[100px] px-4 py-3 bg-surface-elevated border border-surface-border rounded-lg text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-1 focus:ring-amber-500 resize-y text-sm"
        />
      </div>

      {/* Helper text and validation */}
      <div className="flex items-center justify-between text-xs">
        <span className="text-text-muted">
          Please explain why this step cannot be recorded
        </span>
        <span className={showValidation ? 'text-red-400' : 'text-text-muted'}>
          {reason.length}/{MIN_REASON_LENGTH} min
        </span>
      </div>

      {showValidation && (
        <p className="text-xs text-red-400">
          Reason must be at least {MIN_REASON_LENGTH} characters
        </p>
      )}
    </div>
  )
}
