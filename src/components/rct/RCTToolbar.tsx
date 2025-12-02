import { useState } from 'react'
import * as AlertDialog from '@radix-ui/react-alert-dialog'
import { Plus, RefreshCw, Settings2, Download, Search, X, Columns } from 'lucide-react'
import { Table } from '@tanstack/react-table'
import { ColumnVisibilityMenu } from './ColumnVisibilityMenu'
import { AddColumnDialog } from './AddColumnDialog'
import { ColumnManager } from './ColumnManager'
import { useRCTStore } from '@/stores/rctStore'
import { useTaxonomyStore } from '@/stores/taxonomyStore'
import { usePermissions } from '@/hooks/usePermissions'
import { exportToExcel } from '@/utils/excelExport'
import type { RCTRow } from '@/types/rct'

interface RCTToolbarProps {
  table: Table<RCTRow>
  rowCount: number
  filteredCount: number
  onRegenerate: () => void
  onAutoFitColumns: () => void
  globalFilter: string
  setGlobalFilter: (value: string) => void
}

export function RCTToolbar({ table, rowCount, filteredCount, onRegenerate, onAutoFitColumns, globalFilter, setGlobalFilter }: RCTToolbarProps) {
  const [isAddColumnOpen, setIsAddColumnOpen] = useState(false)
  const [isManageColumnsOpen, setIsManageColumnsOpen] = useState(false)
  const [isExportDialogOpen, setIsExportDialogOpen] = useState(false)
  const [isExporting, setIsExporting] = useState(false)

  const rows = useRCTStore((state) => state.rows)
  const { risks, processes } = useTaxonomyStore()
  const { canManageCustomColumns, canRegenerateRCT } = usePermissions()

  const hasFilters = filteredCount < rowCount

  const handleExport = async (exportAll: boolean) => {
    setIsExporting(true)
    try {
      const filteredRows = table.getFilteredRowModel().rows.map((r) => r.original)
      await exportToExcel(rows, filteredRows, risks, processes, { exportAll })
    } catch (error) {
      console.error('Export failed:', error)
    } finally {
      setIsExporting(false)
      setIsExportDialogOpen(false)
    }
  }

  return (
    <div className="flex items-center justify-between gap-4 mb-4">
      <div className="flex items-center gap-4">
        <span className="text-text-secondary text-sm">
          {hasFilters ? (
            <>
              <span className="text-text-primary font-medium">{filteredCount}</span>
              <span> of {rowCount} rows</span>
            </>
          ) : (
            <>{rowCount} rows</>
          )}
        </span>

        {/* Search input */}
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search
            size={18}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted"
          />
          <input
            type="text"
            value={globalFilter}
            onChange={(e) => setGlobalFilter(e.target.value)}
            placeholder="Search risks and processes..."
            className="w-full pl-10 pr-8 py-2 bg-surface-base border border-surface-border rounded-lg text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-accent-500"
          />
          {globalFilter && (
            <button
              onClick={() => setGlobalFilter('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-text-muted hover:text-text-primary transition-colors"
              aria-label="Clear search"
            >
              <X size={16} />
            </button>
          )}
        </div>

        {canRegenerateRCT && (
          <button
            onClick={onRegenerate}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-surface-elevated border border-surface-border rounded hover:bg-surface-overlay transition-colors"
          >
            <RefreshCw size={14} />
            Regenerate
          </button>
        )}
      </div>

      <div className="flex items-center gap-2">
        <AlertDialog.Root open={isExportDialogOpen} onOpenChange={setIsExportDialogOpen}>
          <AlertDialog.Trigger asChild>
            <button className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-surface-elevated border border-surface-border rounded hover:bg-surface-overlay transition-colors">
              <Download size={14} />
              Export
            </button>
          </AlertDialog.Trigger>
          <AlertDialog.Portal>
            <AlertDialog.Overlay className="fixed inset-0 bg-black/60 z-40" />
            <AlertDialog.Content className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-surface-elevated border border-surface-border rounded-lg p-6 shadow-xl z-50 w-[400px]">
              <AlertDialog.Title className="text-lg font-semibold text-text-primary mb-2">
                Export to Excel
              </AlertDialog.Title>
              <AlertDialog.Description className="text-sm text-text-secondary mb-6">
                Choose which data to include in the export.
              </AlertDialog.Description>

              <div className="flex flex-col gap-3">
                <button
                  onClick={() => handleExport(false)}
                  disabled={isExporting}
                  className="w-full px-4 py-2.5 text-sm bg-accent-500 text-white rounded-lg hover:bg-accent-600 transition-colors disabled:opacity-50"
                >
                  {isExporting ? 'Exporting...' : `Filtered (${filteredCount} rows)`}
                </button>
                <button
                  onClick={() => handleExport(true)}
                  disabled={isExporting}
                  className="w-full px-4 py-2.5 text-sm bg-surface-overlay border border-surface-border rounded-lg hover:bg-surface-border transition-colors disabled:opacity-50"
                >
                  {isExporting ? 'Exporting...' : `All (${rowCount} rows)`}
                </button>
                <AlertDialog.Cancel asChild>
                  <button className="w-full px-4 py-2 text-sm text-text-secondary hover:text-text-primary transition-colors">
                    Cancel
                  </button>
                </AlertDialog.Cancel>
              </div>
            </AlertDialog.Content>
          </AlertDialog.Portal>
        </AlertDialog.Root>

        <button
          onClick={onAutoFitColumns}
          className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-surface-elevated border border-surface-border rounded hover:bg-surface-overlay transition-colors"
          title="Auto-fit all columns to content"
        >
          <Columns size={14} />
          Auto-fit
        </button>

        <ColumnVisibilityMenu table={table} />

        {canManageCustomColumns && (
          <button
            onClick={() => setIsManageColumnsOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-surface-elevated border border-surface-border rounded hover:bg-surface-overlay transition-colors"
          >
            <Settings2 size={14} />
            Manage Columns
          </button>
        )}

        {canManageCustomColumns && (
          <button
            onClick={() => setIsAddColumnOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-accent-500 text-white rounded hover:bg-accent-600 transition-colors"
          >
            <Plus size={14} />
            Add Column
          </button>
        )}
      </div>

      <AddColumnDialog
        isOpen={isAddColumnOpen}
        onClose={() => setIsAddColumnOpen(false)}
      />

      <ColumnManager
        isOpen={isManageColumnsOpen}
        onClose={() => setIsManageColumnsOpen(false)}
      />
    </div>
  )
}
