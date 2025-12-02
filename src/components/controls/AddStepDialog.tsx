import { useState, useEffect } from 'react'
import * as Dialog from '@radix-ui/react-dialog'
import { X, Plus, Trash2 } from 'lucide-react'
import type { TestStep, TestStepInputType } from '@/types/rct'

interface AddStepDialogProps {
  isOpen: boolean
  onClose: () => void
  onSave: (step: Omit<TestStep, 'id' | 'order'>) => void
  editingStep?: TestStep  // If provided, editing mode
}

const INPUT_TYPE_OPTIONS: { value: TestStepInputType; label: string; description: string }[] = [
  { value: 'text', label: 'Text', description: 'Free-form text response' },
  { value: 'binary', label: 'Yes/No', description: 'Binary choice' },
  { value: 'multiple_choice', label: 'Multiple Choice', description: 'Pick one option' },
  { value: 'number', label: 'Number', description: 'Numeric value' },
  { value: 'date', label: 'Date', description: 'Calendar picker' },
]

export function AddStepDialog({ isOpen, onClose, onSave, editingStep }: AddStepDialogProps) {
  const [label, setLabel] = useState('')
  const [inputType, setInputType] = useState<TestStepInputType>('text')
  const [options, setOptions] = useState<string[]>([])
  const [newOption, setNewOption] = useState('')
  const [required, setRequired] = useState(true)
  const [helpText, setHelpText] = useState('')

  // Validation errors
  const [errors, setErrors] = useState<{ label?: string; options?: string }>({})

  // Reset form when dialog opens/closes or editing step changes
  useEffect(() => {
    if (isOpen) {
      if (editingStep) {
        setLabel(editingStep.label)
        setInputType(editingStep.inputType)
        setOptions(editingStep.options || [])
        setRequired(editingStep.required)
        setHelpText(editingStep.helpText || '')
      } else {
        setLabel('')
        setInputType('text')
        setOptions([])
        setRequired(true)
        setHelpText('')
      }
      setNewOption('')
      setErrors({})
    }
  }, [isOpen, editingStep])

  const handleAddOption = () => {
    const trimmed = newOption.trim()
    if (trimmed && !options.includes(trimmed)) {
      setOptions([...options, trimmed])
      setNewOption('')
      // Clear options error if we now have 2+
      if (options.length >= 1) {
        setErrors(prev => ({ ...prev, options: undefined }))
      }
    }
  }

  const handleRemoveOption = (index: number) => {
    setOptions(options.filter((_, i) => i !== index))
  }

  const handleKeyDownOption = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      handleAddOption()
    }
  }

  const validate = (): boolean => {
    const newErrors: { label?: string; options?: string } = {}

    if (!label.trim()) {
      newErrors.label = 'Label is required'
    }

    if (inputType === 'multiple_choice' && options.length < 2) {
      newErrors.options = 'Multiple choice requires at least 2 options'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSave = () => {
    if (!validate()) return

    const stepData: Omit<TestStep, 'id' | 'order'> = {
      label: label.trim(),
      inputType,
      required,
      ...(inputType === 'multiple_choice' && { options }),
      ...(helpText.trim() && { helpText: helpText.trim() }),
    }

    onSave(stepData)
    onClose()
  }

  const isEditing = !!editingStep

  return (
    <Dialog.Root open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/60 z-50" />
        <Dialog.Content className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[480px] max-h-[85vh] bg-surface-elevated border border-surface-border rounded-lg shadow-xl z-50 flex flex-col overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-surface-border shrink-0">
            <Dialog.Title className="text-lg font-semibold text-text-primary">
              {isEditing ? 'Edit Test Step' : 'Add Test Step'}
            </Dialog.Title>
            <Dialog.Close asChild>
              <button className="p-2 rounded-lg hover:bg-surface-overlay transition-colors">
                <X size={20} className="text-text-secondary" />
              </button>
            </Dialog.Close>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-4 space-y-5">
            {/* Label */}
            <div>
              <label className="text-sm font-medium text-text-primary block mb-1.5">
                Label <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                value={label}
                onChange={(e) => {
                  setLabel(e.target.value)
                  if (errors.label) setErrors(prev => ({ ...prev, label: undefined }))
                }}
                placeholder="e.g., Verify user access logs are enabled"
                className={`w-full px-3 py-2 bg-surface-overlay border rounded-lg text-sm text-text-primary placeholder:text-text-muted ${
                  errors.label ? 'border-red-500' : 'border-surface-border'
                }`}
                autoFocus
              />
              {errors.label && (
                <p className="text-xs text-red-400 mt-1">{errors.label}</p>
              )}
              <p className="text-xs text-text-muted mt-1">
                The instruction shown to the tester
              </p>
            </div>

            {/* Input Type */}
            <div>
              <label className="text-sm font-medium text-text-primary block mb-1.5">
                Input Type <span className="text-red-400">*</span>
              </label>
              <select
                value={inputType}
                onChange={(e) => setInputType(e.target.value as TestStepInputType)}
                className="w-full px-3 py-2 bg-surface-overlay border border-surface-border rounded-lg text-sm text-text-primary"
              >
                {INPUT_TYPE_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label} - {option.description}
                  </option>
                ))}
              </select>
            </div>

            {/* Multiple Choice Options */}
            {inputType === 'multiple_choice' && (
              <div>
                <label className="text-sm font-medium text-text-primary block mb-1.5">
                  Options <span className="text-red-400">*</span>
                </label>

                {/* Add option input */}
                <div className="flex gap-2 mb-2">
                  <input
                    type="text"
                    value={newOption}
                    onChange={(e) => setNewOption(e.target.value)}
                    onKeyDown={handleKeyDownOption}
                    placeholder="Type an option and press Enter"
                    className="flex-1 px-3 py-2 bg-surface-overlay border border-surface-border rounded-lg text-sm text-text-primary placeholder:text-text-muted"
                  />
                  <button
                    type="button"
                    onClick={handleAddOption}
                    disabled={!newOption.trim()}
                    className="px-3 py-2 bg-accent-500/20 text-accent-400 rounded-lg text-sm hover:bg-accent-500/30 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Plus size={16} />
                  </button>
                </div>

                {/* Options list */}
                {options.length > 0 && (
                  <div className="space-y-1 mb-2">
                    {options.map((option, index) => (
                      <div
                        key={index}
                        className="flex items-center gap-2 px-3 py-2 bg-surface-base border border-surface-border rounded-lg"
                      >
                        <span className="flex-1 text-sm text-text-primary">{option}</span>
                        <button
                          type="button"
                          onClick={() => handleRemoveOption(index)}
                          className="p-1 text-text-muted hover:text-red-400 transition-colors"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {errors.options && (
                  <p className="text-xs text-red-400 mt-1">{errors.options}</p>
                )}
                <p className="text-xs text-text-muted">
                  Add at least 2 options. Tester will select one.
                </p>
              </div>
            )}

            {/* Required */}
            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                id="step-required"
                checked={required}
                onChange={(e) => setRequired(e.target.checked)}
                className="w-4 h-4 rounded border-surface-border bg-surface-overlay accent-accent-500"
              />
              <label htmlFor="step-required" className="text-sm text-text-primary">
                Required step (must be completed)
              </label>
            </div>

            {/* Help Text */}
            <div>
              <label className="text-sm font-medium text-text-primary block mb-1.5">
                Help Text <span className="text-text-muted">(optional)</span>
              </label>
              <textarea
                value={helpText}
                onChange={(e) => setHelpText(e.target.value)}
                placeholder="Additional guidance for the tester..."
                rows={3}
                className="w-full px-3 py-2 bg-surface-overlay border border-surface-border rounded-lg text-sm text-text-primary placeholder:text-text-muted resize-y min-h-[80px]"
              />
              <p className="text-xs text-text-muted mt-1">
                Shown to help testers understand what to check
              </p>
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-3 p-4 border-t border-surface-border shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm text-text-secondary hover:text-text-primary transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="px-4 py-2 bg-accent-500 text-white rounded-lg text-sm font-medium hover:bg-accent-600 transition-colors"
            >
              {isEditing ? 'Save Changes' : 'Add Step'}
            </button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
