// src/components/admin/PresetSelector.tsx
import { Building2, Landmark, Shield, Briefcase, FolderX } from 'lucide-react'
import { clsx } from 'clsx'

interface PresetOption {
  id: string
  name: string
  description: string
  icon: React.ElementType
  industries: string[]
}

const PRESET_OPTIONS: PresetOption[] = [
  {
    id: 'casino',
    name: 'Casino',
    description: 'Gaming operations, AML/KYC compliance, surveillance',
    icon: Building2,
    industries: ['Casino', 'Gaming', 'Entertainment'],
  },
  {
    id: 'bank',
    name: 'Financial Services',
    description: 'Credit risk, market risk, regulatory compliance',
    icon: Landmark,
    industries: ['Banking', 'Investment', 'FinTech'],
  },
  {
    id: 'insurer',
    name: 'Insurance',
    description: 'Underwriting, claims, investment risk management',
    icon: Shield,
    industries: ['Insurance', 'Reinsurance', 'Healthcare'],
  },
  {
    id: 'generic',
    name: 'General ERM',
    description: 'Standard enterprise risk management framework',
    icon: Briefcase,
    industries: ['Manufacturing', 'Retail', 'Services'],
  },
  {
    id: 'empty',
    name: 'Start Empty',
    description: 'Begin with a blank slate and build your own framework',
    icon: FolderX,
    industries: [],
  },
]

interface PresetSelectorProps {
  selectedPreset: string | null
  onSelect: (presetId: string) => void
  disabled?: boolean
}

export function PresetSelector({ selectedPreset, onSelect, disabled }: PresetSelectorProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {PRESET_OPTIONS.map((preset) => {
        const Icon = preset.icon
        const isSelected = selectedPreset === preset.id

        return (
          <button
            key={preset.id}
            onClick={() => onSelect(preset.id)}
            disabled={disabled}
            className={clsx(
              'p-4 rounded-lg border text-left transition-all min-h-[120px]',
              'hover:border-accent-400 hover:bg-surface-elevated',
              isSelected
                ? 'border-accent-500 bg-accent-500/10'
                : 'border-surface-border bg-surface-overlay',
              disabled && 'opacity-50 cursor-not-allowed'
            )}
          >
            <div className="flex items-start gap-3">
              <div className={clsx(
                'p-2 rounded-lg shrink-0',
                isSelected ? 'bg-accent-500/20 text-accent-400' : 'bg-surface-elevated text-text-muted'
              )}>
                <Icon size={24} />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-medium text-text-primary">{preset.name}</h3>
                <p className="text-sm text-text-secondary mt-1">{preset.description}</p>
                {preset.industries.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {preset.industries.map((industry) => (
                      <span
                        key={industry}
                        className="text-xs px-2 py-0.5 rounded bg-surface-elevated text-text-muted"
                      >
                        {industry}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </button>
        )
      })}
    </div>
  )
}
