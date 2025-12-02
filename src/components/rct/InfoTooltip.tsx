import { useState } from 'react'
import { Info, Pencil, X, Check } from 'lucide-react'
import * as Tooltip from '@radix-ui/react-tooltip'
import * as Dialog from '@radix-ui/react-dialog'
import { useRCTStore, ScoreLabel } from '@/stores/rctStore'

const CONTROL_TYPE_INFO = [
  { type: 'Preventative', description: 'Stops the risk from occurring' },
  { type: 'Detective', description: 'Identifies when risk has occurred' },
  { type: 'Corrective', description: 'Reduces impact after occurrence' },
  { type: 'Directive', description: 'Guides behavior through policies' },
  { type: 'Deterrent', description: 'Discourages risk-taking behavior' },
  { type: 'Compensating', description: 'Alternative control when primary unavailable' },
  { type: 'Acceptance', description: 'Acknowledges and accepts the risk' },
  { type: 'Tolerance', description: 'Operates within acceptable risk levels' },
  { type: 'Manual', description: 'Human-operated control process' },
  { type: 'Automated', description: 'System-operated control process' },
]

interface InfoTooltipProps {
  type: 'probability' | 'impact' | 'controlType'
  editable?: boolean
}

export function InfoTooltip({ type, editable = false }: InfoTooltipProps) {
  const { probabilityLabels, impactLabels, updateScoreLabel } = useRCTStore()
  const [isEditing, setIsEditing] = useState(false)
  const [editingLabels, setEditingLabels] = useState<ScoreLabel[]>([])

  const labels = type === 'probability' ? probabilityLabels
    : type === 'impact' ? impactLabels
    : null

  const handleOpenEdit = () => {
    if (labels) {
      setEditingLabels(labels.map(l => ({ ...l })))
      setIsEditing(true)
    }
  }

  const handleSave = () => {
    editingLabels.forEach(label => {
      if (type === 'probability' || type === 'impact') {
        updateScoreLabel(type, label.score, { label: label.label, description: label.description })
      }
    })
    setIsEditing(false)
  }

  const handleLabelChange = (score: number, field: 'label' | 'description', value: string) => {
    setEditingLabels(prev => prev.map(l =>
      l.score === score ? { ...l, [field]: value } : l
    ))
  }

  // Control type tooltip (not editable)
  if (type === 'controlType') {
    return (
      <Tooltip.Provider delayDuration={200}>
        <Tooltip.Root>
          <Tooltip.Trigger asChild>
            <button
              type="button"
              className="p-1 text-text-muted hover:text-text-secondary transition-colors"
            >
              <Info size={14} />
            </button>
          </Tooltip.Trigger>
          <Tooltip.Portal>
            <Tooltip.Content
              className="bg-surface-elevated border border-surface-border rounded-lg p-3 shadow-xl z-50 max-w-xs"
              sideOffset={5}
            >
              <div className="space-y-2">
                {CONTROL_TYPE_INFO.map(item => (
                  <div key={item.type} className="text-xs">
                    <span className="font-medium text-text-primary">{item.type}:</span>
                    <span className="text-text-secondary ml-1">{item.description}</span>
                  </div>
                ))}
              </div>
              <Tooltip.Arrow className="fill-surface-border" />
            </Tooltip.Content>
          </Tooltip.Portal>
        </Tooltip.Root>
      </Tooltip.Provider>
    )
  }

  // Probability/Impact tooltip with optional edit
  return (
    <>
      <Tooltip.Provider delayDuration={200}>
        <Tooltip.Root>
          <Tooltip.Trigger asChild>
            <button
              type="button"
              className="p-1 text-text-muted hover:text-text-secondary transition-colors"
              onClick={editable ? handleOpenEdit : undefined}
            >
              <Info size={14} />
            </button>
          </Tooltip.Trigger>
          <Tooltip.Portal>
            <Tooltip.Content
              className="bg-surface-elevated border border-surface-border rounded-lg p-3 shadow-xl z-50 max-w-xs"
              sideOffset={5}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-medium text-text-secondary">
                  {type === 'probability' ? 'Probability Scale' : 'Impact Scale'}
                </span>
                {editable && (
                  <button
                    onClick={handleOpenEdit}
                    className="p-1 text-text-muted hover:text-accent-500 transition-colors"
                    title="Edit definitions"
                  >
                    <Pencil size={12} />
                  </button>
                )}
              </div>
              <div className="space-y-2">
                {labels?.map(item => (
                  <div key={item.score} className="text-xs">
                    <span className="font-medium text-text-primary">{item.score} - {item.label}:</span>
                    <span className="text-text-secondary ml-1">{item.description}</span>
                  </div>
                ))}
              </div>
              <Tooltip.Arrow className="fill-surface-border" />
            </Tooltip.Content>
          </Tooltip.Portal>
        </Tooltip.Root>
      </Tooltip.Provider>

      {/* Edit dialog */}
      <Dialog.Root open={isEditing} onOpenChange={setIsEditing}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 bg-black/60 z-50" />
          <Dialog.Content className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-surface-elevated border border-surface-border rounded-lg shadow-xl z-50 w-[500px] max-h-[80vh] overflow-auto">
            <div className="flex items-center justify-between p-4 border-b border-surface-border">
              <Dialog.Title className="text-lg font-semibold text-text-primary">
                Edit {type === 'probability' ? 'Probability' : 'Impact'} Scale
              </Dialog.Title>
              <Dialog.Close asChild>
                <button className="p-2 rounded-lg hover:bg-surface-overlay transition-colors">
                  <X size={20} className="text-text-secondary" />
                </button>
              </Dialog.Close>
            </div>

            <div className="p-4 space-y-4">
              <p className="text-sm text-text-secondary">
                Customize the labels and descriptions for each score level. These definitions apply globally to all {type} scores.
              </p>

              {editingLabels.map(item => (
                <div key={item.score} className="bg-surface-overlay rounded-lg p-3 border border-surface-border">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="w-6 h-6 flex items-center justify-center bg-accent-500/20 text-accent-500 rounded text-sm font-medium">
                      {item.score}
                    </span>
                    <input
                      type="text"
                      value={item.label}
                      onChange={(e) => handleLabelChange(item.score, 'label', e.target.value)}
                      placeholder="Label (e.g., Rare, High)"
                      className="flex-1 px-2 py-1 bg-surface-elevated border border-surface-border rounded text-sm text-text-primary focus:outline-none focus:ring-1 focus:ring-accent-500"
                    />
                  </div>
                  <textarea
                    value={item.description}
                    onChange={(e) => handleLabelChange(item.score, 'description', e.target.value)}
                    placeholder="Description of what this score means..."
                    rows={2}
                    className="w-full px-2 py-1.5 bg-surface-elevated border border-surface-border rounded text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-1 focus:ring-accent-500 resize-y"
                  />
                </div>
              ))}
            </div>

            <div className="flex justify-end gap-2 p-4 border-t border-surface-border">
              <Dialog.Close asChild>
                <button className="px-4 py-2 text-sm text-text-secondary hover:text-text-primary transition-colors">
                  Cancel
                </button>
              </Dialog.Close>
              <button
                onClick={handleSave}
                className="flex items-center gap-2 px-4 py-2 bg-accent-500 text-white rounded-lg text-sm font-medium hover:bg-accent-600 transition-colors"
              >
                <Check size={16} />
                Save Changes
              </button>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </>
  )
}
