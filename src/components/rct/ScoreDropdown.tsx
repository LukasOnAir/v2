import { InfoTooltip } from './InfoTooltip'
import { useRCTStore } from '@/stores/rctStore'

interface ScoreDropdownProps {
  value: number | null
  onChange: (value: number) => void
  type: 'probability' | 'impact'
  showInfo?: boolean
  editableInfo?: boolean
  disabled?: boolean
}

export function ScoreDropdown({
  value,
  onChange,
  type,
  showInfo = false,
  editableInfo = false,
  disabled = false
}: ScoreDropdownProps) {
  const { probabilityLabels, impactLabels } = useRCTStore()
  const labels = type === 'probability' ? probabilityLabels : impactLabels

  return (
    <div className="flex items-center gap-1">
      <select
        value={value ?? ''}
        onChange={(e) => e.target.value && onChange(Number(e.target.value))}
        disabled={disabled}
        className="w-full px-2 py-1 bg-surface-overlay border border-surface-border rounded text-sm text-text-primary focus:outline-none focus:ring-1 focus:ring-accent-500 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <option value="">-</option>
        {labels.map(({ score, label }) => (
          <option key={score} value={score}>
            {score} - {label}
          </option>
        ))}
      </select>
      {showInfo && <InfoTooltip type={type} editable={editableInfo} />}
    </div>
  )
}
