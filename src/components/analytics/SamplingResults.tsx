import type { SamplingResult } from '@/utils/samplingCalculator'

interface SamplingResultsProps {
  result: SamplingResult | null
}

/**
 * Display component for sample size recommendations
 * Shows the recommended sample size, methodology, and any notes
 */
export function SamplingResults({ result }: SamplingResultsProps) {
  if (!result) {
    return (
      <div className="bg-surface-elevated rounded-lg p-4">
        <p className="text-text-secondary">
          Enter parameters to calculate sample size
        </p>
      </div>
    )
  }

  return (
    <div className="bg-surface-elevated rounded-lg p-4 space-y-3">
      {/* Main result */}
      <div>
        <p className="text-text-secondary text-sm mb-1">Recommended Sample Size</p>
        <p className="text-3xl font-bold text-accent">
          {result.recommendedSampleSize}
        </p>
      </div>

      {/* Methodology */}
      <div>
        <p className="text-text-secondary text-sm">
          {result.methodology}
        </p>
      </div>

      {/* Notes */}
      {result.notes.length > 0 && (
        <ul className="text-text-muted text-sm list-disc list-inside space-y-1">
          {result.notes.map((note, index) => (
            <li key={index}>{note}</li>
          ))}
        </ul>
      )}
    </div>
  )
}
