import { WeightBadge } from './WeightBadge'

interface LevelWeightsBarProps {
  /** Current level default weights */
  weights: { l1: number; l2: number; l3: number; l4: number; l5: number }
  /** Called when a level weight changes */
  onWeightChange: (level: 1 | 2 | 3 | 4 | 5, weight: number) => void
  /** Disable editing */
  disabled?: boolean
}

const LEVELS = [1, 2, 3, 4, 5] as const

export function LevelWeightsBar({
  weights,
  onWeightChange,
  disabled = false,
}: LevelWeightsBarProps) {
  return (
    <div className="flex items-center gap-3 px-3 py-2 bg-surface-elevated rounded-md border border-surface-border">
      <span className="text-xs font-medium text-text-secondary">Level Weights:</span>
      <div className="flex items-center gap-2">
        {LEVELS.map((level) => (
          <div key={level} className="flex items-center gap-1">
            <span className="text-xs text-text-muted">L{level}</span>
            <WeightBadge
              value={weights[`l${level}` as keyof typeof weights]}
              isOverride={false}
              onChange={(value) => onWeightChange(level, value)}
              disabled={disabled}
            />
          </div>
        ))}
      </div>
    </div>
  )
}
