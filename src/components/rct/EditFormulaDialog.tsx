import { useState, useEffect } from 'react'
import * as Dialog from '@radix-ui/react-dialog'
import { X } from 'lucide-react'
import { useRCTStore } from '@/stores/rctStore'
import { useCustomColumns, useUpdateCustomColumn } from '@/hooks/useCustomColumns'
import { useIsDemoMode } from '@/hooks/useTenantData'
import { validateFormula } from '@/utils/formulaEngine'
import type { CustomColumn } from '@/types/rct'

interface EditFormulaDialogProps {
  column: CustomColumn | null
  isOpen: boolean
  onClose: () => void
}

export function EditFormulaDialog({ column, isOpen, onClose }: EditFormulaDialogProps) {
  const isDemoMode = useIsDemoMode()

  // Demo mode: use local store
  const { updateCustomColumn: storeUpdateCustomColumn, customColumns: storeCustomColumns } = useRCTStore()

  // Authenticated mode: use database hooks
  const { data: dbCustomColumns } = useCustomColumns()
  const updateCustomColumnMutation = useUpdateCustomColumn()

  // Use appropriate data source
  const customColumns = isDemoMode ? storeCustomColumns : (dbCustomColumns || [])

  const [formula, setFormula] = useState('')
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (column?.formula) {
      setFormula(column.formula)
      setError(null)
    }
  }, [column])

  const handleFormulaChange = (value: string) => {
    setFormula(value)
    if (value.trim()) {
      // Get other custom columns for validation (exclude current column)
      const otherColumns = customColumns.filter((c) => c.id !== column?.id)
      const validation = validateFormula(value, otherColumns)
      setError(validation.error)
    } else {
      setError('Formula is required')
    }
  }

  const handleSave = () => {
    if (!column || !formula.trim() || error) return

    if (isDemoMode) {
      storeUpdateCustomColumn(column.id, { formula: formula.trim() })
    } else {
      updateCustomColumnMutation.mutate({ id: column.id, formula: formula.trim() })
    }
    onClose()
  }

  const handleClose = () => {
    setFormula('')
    setError(null)
    onClose()
  }

  // Get available variables for help text
  const otherCustomColumns = customColumns.filter((c) => c.id !== column?.id)
  const customColumnVars = otherCustomColumns.map((c) => c.name.replace(/\s/g, '_')).join(', ')

  return (
    <Dialog.Root open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/60 z-50" />
        <Dialog.Content className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[480px] bg-surface-elevated border border-surface-border rounded-lg shadow-xl z-50">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-surface-border">
            <Dialog.Title className="text-lg font-semibold text-text-primary">
              Edit Formula: {column?.name}
            </Dialog.Title>
            <Dialog.Close asChild>
              <button className="p-2 rounded-lg hover:bg-surface-overlay transition-colors">
                <X size={20} className="text-text-secondary" />
              </button>
            </Dialog.Close>
          </div>

          {/* Content */}
          <div className="p-4 space-y-4">
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-1.5">
                Formula
              </label>
              <input
                type="text"
                value={formula}
                onChange={(e) => handleFormulaChange(e.target.value)}
                placeholder="e.g., IF(Gross_Score>15,'High','Low')"
                className="w-full px-3 py-2 bg-surface-overlay border border-surface-border rounded-lg text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-accent-500 font-mono"
              />
              {error && <p className="mt-1 text-xs text-red-400">{error}</p>}
            </div>

            <div className="p-3 bg-surface-base rounded-lg">
              <p className="text-xs font-medium text-text-secondary mb-2">
                Available Variables
              </p>
              <p className="text-xs text-text-muted">
                <span className="font-medium">Built-in:</span> Gross_Score, Gross_Probability,
                Gross_Impact, Risk_Appetite, Within_Appetite, Net_Score, Control_Count
              </p>
              {customColumnVars && (
                <p className="text-xs text-text-muted mt-1">
                  <span className="font-medium">Custom:</span> {customColumnVars}
                </p>
              )}
            </div>

            <div className="p-3 bg-surface-base rounded-lg">
              <p className="text-xs font-medium text-text-secondary mb-2">
                Formula Examples
              </p>
              <ul className="text-xs text-text-muted space-y-1">
                <li>
                  <code className="bg-surface-overlay px-1 rounded">IF(Gross_Score&gt;15,"High","Low")</code>
                </li>
                <li>
                  <code className="bg-surface-overlay px-1 rounded">Gross_Score * 2</code>
                </li>
                <li>
                  <code className="bg-surface-overlay px-1 rounded">MAX(Gross_Score, Net_Score)</code>
                </li>
              </ul>
            </div>
          </div>

          {/* Footer */}
          <div className="flex justify-end gap-2 p-4 border-t border-surface-border">
            <button
              onClick={handleClose}
              className="px-4 py-2 text-sm text-text-secondary hover:text-text-primary transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={!formula.trim() || !!error}
              className="px-4 py-2 bg-accent-500 text-white rounded-lg text-sm font-medium hover:bg-accent-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Save Changes
            </button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
