import { ClipboardList } from 'lucide-react'
import type { TestStep, TestStepInputType } from '@/types/rct'

interface TestStepsDisplayProps {
  steps: TestStep[]
}

const inputTypeBadgeColors: Record<TestStepInputType, string> = {
  text: 'bg-blue-500/20 text-blue-400',
  binary: 'bg-green-500/20 text-green-400',
  multiple_choice: 'bg-purple-500/20 text-purple-400',
  number: 'bg-orange-500/20 text-orange-400',
  date: 'bg-cyan-500/20 text-cyan-400',
}

const inputTypeLabels: Record<TestStepInputType, string> = {
  text: 'Text',
  binary: 'Yes/No',
  multiple_choice: 'Choice',
  number: 'Number',
  date: 'Date',
}

/**
 * Read-only display of test steps for the RCT Control Panel.
 * Shows steps in order with type badges and required indicators.
 * Editing happens in ControlDetailPanel (Controls Hub).
 */
export function TestStepsDisplay({ steps }: TestStepsDisplayProps) {
  // Don't render section if no steps
  if (!steps || steps.length === 0) {
    return null
  }

  // Sort steps by order field
  const sortedSteps = [...steps].sort((a, b) => a.order - b.order)

  return (
    <div className="bg-surface-overlay rounded-lg p-3">
      {/* Header */}
      <div className="flex items-center gap-2 mb-3">
        <ClipboardList size={16} className="text-text-muted" />
        <span className="text-sm font-medium text-text-primary">
          Test Steps ({steps.length})
        </span>
      </div>

      {/* Ordered list of steps */}
      <ol className="space-y-2">
        {sortedSteps.map((step, index) => (
          <li key={step.id} className="flex items-start gap-2 text-sm">
            {/* Step number */}
            <span className="text-text-muted w-5 flex-shrink-0 text-right">
              {index + 1}.
            </span>

            {/* Step content */}
            <div className="flex-1 min-w-0">
              {/* Label with required indicator */}
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-text-primary">
                  {step.label}
                  {step.required && (
                    <span className="text-red-400 ml-1">*</span>
                  )}
                </span>

                {/* Input type badge */}
                <span
                  className={`px-1.5 py-0.5 text-xs rounded ${inputTypeBadgeColors[step.inputType]}`}
                >
                  {inputTypeLabels[step.inputType]}
                </span>
              </div>

              {/* Help text if present */}
              {step.helpText && (
                <p className="text-xs text-text-muted mt-0.5">
                  {step.helpText}
                </p>
              )}
            </div>
          </li>
        ))}
      </ol>
    </div>
  )
}
