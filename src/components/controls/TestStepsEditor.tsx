import { useState } from 'react'
import { Plus, ListChecks } from 'lucide-react'
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core'
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { TestStepItem } from './TestStepItem'
import { AddStepDialog } from './AddStepDialog'
import type { TestStep } from '@/types/rct'

interface TestStepsEditorProps {
  controlId: string
  steps: TestStep[]
  onChange: (steps: TestStep[]) => void
  disabled?: boolean
}

export function TestStepsEditor({ controlId, steps, onChange, disabled }: TestStepsEditorProps) {
  const [showAddDialog, setShowAddDialog] = useState(false)
  const [editingStep, setEditingStep] = useState<TestStep | null>(null)

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event

    if (over && active.id !== over.id) {
      const oldIndex = steps.findIndex((s) => s.id === active.id)
      const newIndex = steps.findIndex((s) => s.id === over.id)

      // Reorder and re-index the order field
      const reordered = arrayMove(steps, oldIndex, newIndex).map((step, index) => ({
        ...step,
        order: index,
      }))

      onChange(reordered)
    }
  }

  const handleAddStep = (stepData: Omit<TestStep, 'id' | 'order'>) => {
    const newStep: TestStep = {
      ...stepData,
      id: crypto.randomUUID(),
      order: steps.length,
    }
    onChange([...steps, newStep])
  }

  const handleEditStep = (step: TestStep) => {
    setEditingStep(step)
    setShowAddDialog(true)
  }

  const handleSaveEdit = (stepData: Omit<TestStep, 'id' | 'order'>) => {
    if (!editingStep) return

    const updatedSteps = steps.map((s) =>
      s.id === editingStep.id
        ? { ...stepData, id: editingStep.id, order: editingStep.order }
        : s
    )
    onChange(updatedSteps)
    setEditingStep(null)
  }

  const handleDeleteStep = (stepId: string) => {
    // Filter out the deleted step and re-index remaining
    const filtered = steps
      .filter((s) => s.id !== stepId)
      .map((step, index) => ({ ...step, order: index }))
    onChange(filtered)
  }

  const handleCloseDialog = () => {
    setShowAddDialog(false)
    setEditingStep(null)
  }

  // Suppress unused controlId warning - kept for future API calls
  void controlId

  return (
    <div>
      {/* Header with count and add button */}
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-medium text-text-primary flex items-center gap-2">
          <ListChecks size={16} />
          Test Steps
          {steps.length > 0 && (
            <span className="px-1.5 py-0.5 text-xs bg-surface-overlay rounded-full text-text-muted">
              {steps.length}
            </span>
          )}
        </h3>
        {!disabled && (
          <button
            onClick={() => setShowAddDialog(true)}
            className="flex items-center gap-1 px-2 py-1 text-xs text-accent-400 hover:text-accent-300 transition-colors"
          >
            <Plus size={14} />
            Add Step
          </button>
        )}
      </div>

      {/* Steps list or empty state */}
      {steps.length === 0 ? (
        <div className="text-center py-6 bg-surface-overlay rounded-lg border border-surface-border">
          <ListChecks size={32} className="mx-auto text-text-muted mb-2" />
          <p className="text-sm text-text-secondary">
            No test steps defined.
          </p>
          <p className="text-xs text-text-muted mt-1">
            Add steps to guide testers through structured testing.
          </p>
          {!disabled && (
            <button
              onClick={() => setShowAddDialog(true)}
              className="mt-3 px-3 py-1.5 text-xs bg-accent-500/20 text-accent-400 rounded-lg hover:bg-accent-500/30 transition-colors"
            >
              <Plus size={14} className="inline mr-1" />
              Add First Step
            </button>
          )}
        </div>
      ) : (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={steps.map((s) => s.id)}
            strategy={verticalListSortingStrategy}
          >
            <div className="space-y-2">
              {steps.map((step) => (
                <TestStepItem
                  key={step.id}
                  step={step}
                  onEdit={handleEditStep}
                  onDelete={handleDeleteStep}
                  disabled={disabled}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      )}

      {/* Add/Edit Dialog */}
      <AddStepDialog
        isOpen={showAddDialog}
        onClose={handleCloseDialog}
        onSave={editingStep ? handleSaveEdit : handleAddStep}
        editingStep={editingStep || undefined}
      />
    </div>
  )
}
