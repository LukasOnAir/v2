import { getHeatmapColor, getContrastingText, getAppetiteColor } from '@/utils/heatmapColors'

interface HeatmapCellProps {
  score: number | null
  variant?: 'score' | 'appetite'
}

export function HeatmapCell({ score, variant = 'score' }: HeatmapCellProps) {
  if (score === null) {
    return (
      <div className="w-full h-8 flex items-center justify-center text-text-muted">
        -
      </div>
    )
  }

  const bgColor = variant === 'appetite' ? getAppetiteColor(score) : getHeatmapColor(score)
  const textColor = getContrastingText(bgColor)

  const displayValue = variant === 'appetite' && score >= 0 ? `+${score}` : score

  return (
    <div
      className="w-full h-8 flex items-center justify-center font-medium rounded text-sm"
      style={{ backgroundColor: bgColor, color: textColor }}
    >
      {displayValue}
    </div>
  )
}
