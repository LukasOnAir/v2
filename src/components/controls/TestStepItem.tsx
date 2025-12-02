import { GripVertical, Pencil, Trash2 } from 'lucide-react'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import type { TestStep, TestStepInputType } from '@/types/rct'

interface TestStepItemProps {
  step: TestStep
  onEdit: (step: TestStep) => void
  onDelete: (stepId: string) => void
  disabled?: boolean
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

export function TestStepItem({ step, onEdit, onDelete, disabled }: TestStepItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: step.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-center gap-3 p-3 bg-surface-overlay border border-surface-border rounded-lg"
    >
      {/* Drag handle */}
      <button
        {...attributes}
        {...listeners}
        disabled={disabled}
        className="p-1 cursor-grab active:cursor-grabbing text-text-muted hover:text-text-secondary disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <GripVertical size={18} />
      </button>

      {/* Step label with required indicator */}
      <span className="flex-1 text-sm text-text-primary">
        {step.label}
        {step.required && <span className="text-red-400 ml-1">*</span>}
      </span>

      {/* Input type badge */}
      <span className={`px-2 py-0.5 text-xs rounded ${inputTypeBadgeColors[step.inputType]}`}>
        {inputTypeLabels[step.inputType]}
      </span>

      {/* Edit button */}
      <button
        onClick={() => onEdit(step)}
        disabled={disabled}
        className="p-1.5 text-text-muted hover:text-accent-500 transition-colors rounded hover:bg-surface-base disabled:opacity-50 disabled:cursor-not-allowed"
        title="Edit step"
      >
        <Pencil size={16} />
      </button>

      {/* Delete button */}
      <button
        onClick={() => onDelete(step.id)}
        disabled={disabled}
        className="p-1.5 text-text-muted hover:text-red-400 transition-colors rounded hover:bg-surface-base disabled:opacity-50 disabled:cursor-not-allowed"
        title="Delete step"
      >
        <Trash2 size={16} />
      </button>
    </div>
  )
}
