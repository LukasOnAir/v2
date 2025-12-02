import { useState } from 'react'
import * as Dialog from '@radix-ui/react-dialog'
import { X, GripVertical, Trash2, Edit2 } from 'lucide-react'
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
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { useRCTStore } from '@/stores/rctStore'
import { useCustomColumns, useDeleteCustomColumn, useReorderCustomColumns } from '@/hooks/useCustomColumns'
import { useIsDemoMode } from '@/hooks/useTenantData'
import { EditFormulaDialog } from './EditFormulaDialog'
import type { CustomColumn } from '@/types/rct'

interface ColumnManagerProps {
  isOpen: boolean
  onClose: () => void
}

interface SortableColumnItemProps {
  column: CustomColumn
  onEdit: (column: CustomColumn) => void
  onDelete: (columnId: string) => void
}

function SortableColumnItem({ column, onEdit, onDelete }: SortableColumnItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: column.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  const typeColors: Record<CustomColumn['type'], string> = {
    text: 'bg-blue-500/20 text-blue-400',
    number: 'bg-green-500/20 text-green-400',
    dropdown: 'bg-purple-500/20 text-purple-400',
    date: 'bg-orange-500/20 text-orange-400',
    formula: 'bg-cyan-500/20 text-cyan-400',
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
        className="p-1 cursor-grab active:cursor-grabbing text-text-muted hover:text-text-secondary"
      >
        <GripVertical size={18} />
      </button>

      {/* Column name */}
      <span className="flex-1 text-sm text-text-primary font-medium">
        {column.name}
      </span>

      {/* Type badge */}
      <span className={`px-2 py-0.5 text-xs rounded ${typeColors[column.type]}`}>
        {column.type}
      </span>

      {/* Edit button (formula only) */}
      {column.type === 'formula' && (
        <button
          onClick={() => onEdit(column)}
          className="p-1.5 text-text-muted hover:text-accent-500 transition-colors rounded hover:bg-surface-base"
        >
          <Edit2 size={16} />
        </button>
      )}

      {/* Delete button */}
      <button
        onClick={() => onDelete(column.id)}
        className="p-1.5 text-text-muted hover:text-red-400 transition-colors rounded hover:bg-surface-base"
      >
        <Trash2 size={16} />
      </button>
    </div>
  )
}

export function ColumnManager({ isOpen, onClose }: ColumnManagerProps) {
  const isDemoMode = useIsDemoMode()

  // Demo mode: use local store
  const {
    customColumns: storeCustomColumns,
    removeCustomColumn: storeRemoveCustomColumn,
    reorderCustomColumns: storeReorderCustomColumns,
  } = useRCTStore()

  // Authenticated mode: use database hooks
  const { data: dbCustomColumns } = useCustomColumns()
  const deleteCustomColumnMutation = useDeleteCustomColumn()
  const reorderCustomColumnsMutation = useReorderCustomColumns()

  // Use appropriate data source
  const customColumns = isDemoMode ? storeCustomColumns : (dbCustomColumns || [])

  const [editingColumn, setEditingColumn] = useState<CustomColumn | null>(null)
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event

    if (over && active.id !== over.id) {
      const oldIndex = customColumns.findIndex((c) => c.id === active.id)
      const newIndex = customColumns.findIndex((c) => c.id === over.id)

      if (isDemoMode) {
        storeReorderCustomColumns(oldIndex, newIndex)
      } else {
        // Reorder by updating sort_order in database
        const reorderedColumns = arrayMove(customColumns, oldIndex, newIndex)
        const orderedIds = reorderedColumns.map((c) => c.id)
        reorderCustomColumnsMutation.mutate(orderedIds)
      }
    }
  }

  const handleDelete = (columnId: string) => {
    if (deleteConfirm === columnId) {
      if (isDemoMode) {
        storeRemoveCustomColumn(columnId)
      } else {
        deleteCustomColumnMutation.mutate(columnId)
      }
      setDeleteConfirm(null)
    } else {
      setDeleteConfirm(columnId)
      // Auto-reset confirm after 3 seconds
      setTimeout(() => setDeleteConfirm(null), 3000)
    }
  }

  return (
    <>
      <Dialog.Root open={isOpen} onOpenChange={(open) => !open && onClose()}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 bg-black/60 z-40" />
          <Dialog.Content className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] max-h-[80vh] bg-surface-elevated border border-surface-border rounded-lg shadow-xl z-50 flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-surface-border shrink-0">
              <Dialog.Title className="text-lg font-semibold text-text-primary">
                Manage Custom Columns
              </Dialog.Title>
              <Dialog.Close asChild>
                <button className="p-2 rounded-lg hover:bg-surface-overlay transition-colors">
                  <X size={20} className="text-text-secondary" />
                </button>
              </Dialog.Close>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-4">
              {customColumns.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-text-muted">No custom columns added yet.</p>
                  <p className="text-text-muted text-sm mt-1">
                    Click "Add Column" in the toolbar to create one.
                  </p>
                </div>
              ) : (
                <DndContext
                  sensors={sensors}
                  collisionDetection={closestCenter}
                  onDragEnd={handleDragEnd}
                >
                  <SortableContext
                    items={customColumns.map((c) => c.id)}
                    strategy={verticalListSortingStrategy}
                  >
                    <div className="space-y-2">
                      {customColumns.map((column) => (
                        <div key={column.id}>
                          <SortableColumnItem
                            column={column}
                            onEdit={setEditingColumn}
                            onDelete={handleDelete}
                          />
                          {deleteConfirm === column.id && (
                            <p className="text-xs text-red-400 mt-1 ml-10">
                              Click delete again to confirm removal of "{column.name}"
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  </SortableContext>
                </DndContext>
              )}
            </div>

            {/* Footer */}
            <div className="flex justify-between items-center p-4 border-t border-surface-border shrink-0">
              <p className="text-xs text-text-muted">
                Drag to reorder. Pre-installed columns cannot be managed here.
              </p>
              <button
                onClick={onClose}
                className="px-4 py-2 text-sm text-text-secondary hover:text-text-primary transition-colors"
              >
                Close
              </button>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>

      {/* Edit Formula Dialog */}
      <EditFormulaDialog
        column={editingColumn}
        isOpen={!!editingColumn}
        onClose={() => setEditingColumn(null)}
      />
    </>
  )
}
