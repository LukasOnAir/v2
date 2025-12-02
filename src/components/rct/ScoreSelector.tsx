import { clsx } from 'clsx'

const PROBABILITY_LABELS = ['Rare', 'Unlikely', 'Possible', 'Likely', 'Almost Certain']
const IMPACT_LABELS = ['Negligible', 'Minor', 'Moderate', 'Major', 'Catastrophic']

interface ScoreSelectorProps {
  value: number | null
  onChange: (value: number) => void
  type: 'probability' | 'impact'
  disabled?: boolean
}

export function ScoreSelector({ value, onChange, type, disabled = false }: ScoreSelectorProps) {
  const labels = type === 'probability' ? PROBABILITY_LABELS : IMPACT_LABELS

  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map(score => (
        <button
          key={score}
          onClick={() => !disabled && onChange(score)}
          disabled={disabled}
          className={clsx(
            'w-7 h-7 rounded text-xs font-medium transition-all duration-150',
            'focus:outline-none focus:ring-2 focus:ring-accent-500 focus:ring-offset-1 focus:ring-offset-surface-base',
            value === score
              ? 'bg-accent-500 text-white shadow-sm'
              : 'bg-surface-overlay text-text-secondary hover:bg-surface-border hover:text-text-primary',
            disabled && 'opacity-50 cursor-not-allowed'
          )}
          title={`${score} - ${labels[score - 1]}`}
        >
          {score}
        </button>
      ))}
    </div>
  )
}

// Inline display variant (for showing value without interaction)
export function ScoreDisplay({ value, type }: { value: number | null; type: 'probability' | 'impact' }) {
  const labels = type === 'probability' ? PROBABILITY_LABELS : IMPACT_LABELS

  if (value === null) return <span className="text-text-muted">-</span>

  return (
    <span className="text-text-primary" title={labels[value - 1]}>
      {value}
    </span>
  )
}
