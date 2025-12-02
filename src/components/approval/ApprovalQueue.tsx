import { useState, useMemo } from 'react'
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  flexRender,
  type ColumnDef,
  type SortingState,
  type RowSelectionState,
} from '@tanstack/react-table'
import * as Dialog from '@radix-ui/react-dialog'
import { formatDistanceToNow } from 'date-fns'
import {
  Shield,
  AlertTriangle,
  Folder,
  Eye,
  Check,
  X,
  ChevronDown,
  ChevronUp,
} from 'lucide-react'
import { clsx } from 'clsx'
import { useApprovalStore } from '@/stores/approvalStore'
import { usePermissions } from '@/hooks/usePermissions'
import { useAuth } from '@/contexts/AuthContext'
import {
  usePendingChanges,
  useApproveChange,
  useRejectChange,
} from '@/hooks/usePendingChanges'
import { DiffViewer } from './DiffViewer'
import type { PendingChange, PendingChangeEntityType } from '@/types/approval'

const entityTypeIcons: Record<PendingChangeEntityType, typeof Shield> = {
  control: Shield,
  risk: AlertTriangle,
  process: Folder,
}

const changeTypeColors: Record<string, string> = {
  create: 'bg-green-500/20 text-green-400',
  update: 'bg-blue-500/20 text-blue-400',
  delete: 'bg-red-500/20 text-red-400',
}

interface ApprovalQueueProps {
  readOnly?: boolean
}

export function ApprovalQueue({ readOnly = false }: ApprovalQueueProps) {
  const { isDemoMode } = usePermissions()
  const { user } = useAuth()

  // Store data (demo mode)
  const storePendingChanges = useApprovalStore((state) => state.pendingChanges)
  const storeApprove = useApprovalStore((state) => state.approveChange)
  const storeReject = useApprovalStore((state) => state.rejectChange)

  // Database data (authenticated mode)
  const { data: dbPendingChanges } = usePendingChanges()
  const { mutate: dbApprove } = useApproveChange()
  const { mutate: dbReject } = useRejectChange()

  // Dual-source selection
  const pendingChanges = isDemoMode ? storePendingChanges : (dbPendingChanges || [])

  // Dual-mode approve/reject handlers
  const handleApprove = (id: string) => {
    if (isDemoMode) {
      storeApprove(id)
    } else {
      const reviewedBy = user?.email || 'unknown'
      dbApprove({ id, reviewedBy })
    }
  }

  const handleReject = (id: string, reason?: string) => {
    if (isDemoMode) {
      storeReject(id, reason)
    } else {
      const reviewedBy = user?.email || 'unknown'
      dbReject({ id, reviewedBy, reason })
    }
  }

  // Filter state
  const [entityTypeFilter, setEntityTypeFilter] = useState<PendingChangeEntityType | 'all'>('all')
  const [statusFilter, setStatusFilter] = useState<'pending' | 'approved' | 'rejected' | 'all'>('pending')

  // Table state
  const [sorting, setSorting] = useState<SortingState>([
    { id: 'submittedAt', desc: true },
  ])
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({})

  // Dialog state
  const [viewingChange, setViewingChange] = useState<PendingChange | null>(null)
  const [rejectingId, setRejectingId] = useState<string | null>(null)
  const [rejectReason, setRejectReason] = useState('')

  // Filtered data
  const filteredData = useMemo(() => {
    return pendingChanges.filter((change) => {
      if (entityTypeFilter !== 'all' && change.entityType !== entityTypeFilter) {
        return false
      }
      if (statusFilter !== 'all' && change.status !== statusFilter) {
        return false
      }
      return true
    })
  }, [pendingChanges, entityTypeFilter, statusFilter])

  // Column definitions
  const columns = useMemo<ColumnDef<PendingChange>[]>(
    () => [
      // Only show select column when not in read-only mode
      ...(!readOnly ? [{
        id: 'select',
        header: ({ table }: { table: ReturnType<typeof useReactTable<PendingChange>> }) => (
          <input
            type="checkbox"
            checked={table.getIsAllRowsSelected()}
            onChange={table.getToggleAllRowsSelectedHandler()}
            className="w-4 h-4 rounded border-surface-border bg-surface-overlay"
          />
        ),
        cell: ({ row }: { row: { original: PendingChange; getIsSelected: () => boolean; getToggleSelectedHandler: () => (e: unknown) => void } }) => (
          <input
            type="checkbox"
            checked={row.getIsSelected()}
            disabled={row.original.status !== 'pending'}
            onChange={row.getToggleSelectedHandler()}
            className="w-4 h-4 rounded border-surface-border bg-surface-overlay disabled:opacity-50"
          />
        ),
        enableSorting: false,
      } as ColumnDef<PendingChange>] : []),
      {
        accessorKey: 'entityType',
        header: 'Type',
        cell: ({ getValue }) => {
          const type = getValue() as PendingChangeEntityType
          const Icon = entityTypeIcons[type]
          return (
            <span className="flex items-center gap-1.5 capitalize">
              <Icon size={14} className="text-text-muted" />
              {type}
            </span>
          )
        },
      },
      {
        accessorKey: 'entityName',
        header: 'Name',
        cell: ({ getValue }) => (
          <span className="font-medium text-text-primary">{getValue() as string}</span>
        ),
      },
      {
        accessorKey: 'changeType',
        header: 'Change',
        cell: ({ getValue }) => {
          const type = getValue() as string
          return (
            <span
              className={clsx(
                'px-2 py-0.5 rounded text-xs font-medium capitalize',
                changeTypeColors[type]
              )}
            >
              {type}
            </span>
          )
        },
      },
      {
        accessorKey: 'submittedBy',
        header: 'Submitted By',
        cell: ({ getValue }) => (
          <span className="text-text-secondary capitalize">{getValue() as string}</span>
        ),
      },
      {
        accessorKey: 'submittedAt',
        header: 'Submitted',
        cell: ({ getValue }) => (
          <span className="text-text-muted text-sm">
            {formatDistanceToNow(new Date(getValue() as string), { addSuffix: true })}
          </span>
        ),
      },
      {
        accessorKey: 'status',
        header: 'Status',
        cell: ({ getValue }) => {
          const status = getValue() as string
          const colors: Record<string, string> = {
            pending: 'bg-amber-500/20 text-amber-400',
            approved: 'bg-green-500/20 text-green-400',
            rejected: 'bg-red-500/20 text-red-400',
          }
          return (
            <span
              className={clsx(
                'px-2 py-0.5 rounded text-xs font-medium capitalize',
                colors[status]
              )}
            >
              {status}
            </span>
          )
        },
      },
      {
        id: 'actions',
        header: '',
        cell: ({ row }) => {
          const change = row.original
          const isPending = change.status === 'pending'

          return (
            <div className="flex items-center gap-1">
              <button
                onClick={() => setViewingChange(change)}
                className="p-1.5 rounded hover:bg-surface-overlay text-text-muted hover:text-text-primary"
                title="View Details"
              >
                <Eye size={16} />
              </button>
              {/* Only show approve/reject buttons when not in read-only mode */}
              {!readOnly && isPending && (
                <>
                  <button
                    onClick={() => handleApprove(change.id)}
                    className="p-1.5 rounded hover:bg-green-500/10 text-green-400 hover:text-green-300"
                    title="Approve"
                  >
                    <Check size={16} />
                  </button>
                  <button
                    onClick={() => {
                      setRejectingId(change.id)
                      setRejectReason('')
                    }}
                    className="p-1.5 rounded hover:bg-red-500/10 text-red-400 hover:text-red-300"
                    title="Reject"
                  >
                    <X size={16} />
                  </button>
                </>
              )}
            </div>
          )
        },
        enableSorting: false,
      },
    ],
    [handleApprove, readOnly]
  )

  const table = useReactTable({
    data: filteredData,
    columns,
    state: {
      sorting,
      rowSelection,
    },
    onSortingChange: setSorting,
    onRowSelectionChange: setRowSelection,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    enableRowSelection: (row) => row.original.status === 'pending',
  })

  // Bulk actions
  const selectedRows = table.getSelectedRowModel().rows
  const selectedPendingIds = selectedRows.map((row) => row.original.id)

  const handleBulkApprove = () => {
    selectedPendingIds.forEach((id) => handleApprove(id))
    setRowSelection({})
  }

  const handleBulkReject = () => {
    selectedPendingIds.forEach((id) => handleReject(id))
    setRowSelection({})
  }

  const handleRejectWithReason = () => {
    if (rejectingId) {
      handleReject(rejectingId, rejectReason || undefined)
      setRejectingId(null)
      setRejectReason('')
    }
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <label className="text-sm text-text-muted">Type:</label>
          <select
            value={entityTypeFilter}
            onChange={(e) => setEntityTypeFilter(e.target.value as typeof entityTypeFilter)}
            className="px-2 py-1 text-sm bg-surface-overlay border border-surface-border rounded text-text-primary"
          >
            <option value="all">All</option>
            <option value="control">Controls</option>
            <option value="risk">Risks</option>
            <option value="process">Processes</option>
          </select>
        </div>
        <div className="flex items-center gap-2">
          <label className="text-sm text-text-muted">Status:</label>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)}
            className="px-2 py-1 text-sm bg-surface-overlay border border-surface-border rounded text-text-primary"
          >
            <option value="pending">Pending</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
            <option value="all">All</option>
          </select>
        </div>
      </div>

      {/* Bulk actions bar - only show when not in read-only mode */}
      {!readOnly && selectedRows.length > 0 && (
        <div className="flex items-center gap-3 px-4 py-2 bg-accent-500/10 border border-accent-500/20 rounded-lg">
          <span className="text-sm text-text-secondary">
            {selectedRows.length} selected
          </span>
          <button
            onClick={handleBulkApprove}
            className="px-3 py-1 text-sm bg-green-500/20 text-green-400 rounded hover:bg-green-500/30"
          >
            Approve Selected ({selectedRows.length})
          </button>
          <button
            onClick={handleBulkReject}
            className="px-3 py-1 text-sm bg-red-500/20 text-red-400 rounded hover:bg-red-500/30"
          >
            Reject Selected ({selectedRows.length})
          </button>
        </div>
      )}

      {/* Table */}
      <div className="bg-surface-elevated rounded-lg border border-surface-border overflow-hidden">
        <table className="w-full">
          <thead>
            {table.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id} className="border-b border-surface-border">
                {headerGroup.headers.map((header) => (
                  <th
                    key={header.id}
                    className={clsx(
                      'px-4 py-3 text-left text-xs font-medium text-text-muted uppercase tracking-wider',
                      header.column.getCanSort() && 'cursor-pointer select-none hover:text-text-secondary'
                    )}
                    onClick={header.column.getToggleSortingHandler()}
                  >
                    <div className="flex items-center gap-1">
                      {flexRender(header.column.columnDef.header, header.getContext())}
                      {header.column.getIsSorted() === 'asc' && <ChevronUp size={14} />}
                      {header.column.getIsSorted() === 'desc' && <ChevronDown size={14} />}
                    </div>
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody>
            {table.getRowModel().rows.length === 0 ? (
              <tr>
                <td
                  colSpan={columns.length}
                  className="px-4 py-8 text-center text-text-muted"
                >
                  No changes found matching the filters.
                </td>
              </tr>
            ) : (
              table.getRowModel().rows.map((row) => (
                <tr
                  key={row.id}
                  className="border-b border-surface-border last:border-0 hover:bg-surface-overlay/50"
                >
                  {row.getVisibleCells().map((cell) => (
                    <td key={cell.id} className="px-4 py-3">
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* View Details Dialog */}
      <Dialog.Root open={!!viewingChange} onOpenChange={(open) => !open && setViewingChange(null)}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 bg-black/50" />
          <Dialog.Content className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-surface-elevated rounded-lg p-6 w-[600px] max-h-[80vh] overflow-y-auto border border-surface-border">
            <Dialog.Title className="text-lg font-semibold text-text-primary mb-4">
              Change Details
            </Dialog.Title>
            {viewingChange && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-text-muted">Entity Type:</span>
                    <span className="ml-2 text-text-primary capitalize">{viewingChange.entityType}</span>
                  </div>
                  <div>
                    <span className="text-text-muted">Change Type:</span>
                    <span className={clsx('ml-2 px-2 py-0.5 rounded text-xs', changeTypeColors[viewingChange.changeType])}>
                      {viewingChange.changeType}
                    </span>
                  </div>
                  <div>
                    <span className="text-text-muted">Submitted By:</span>
                    <span className="ml-2 text-text-primary capitalize">{viewingChange.submittedBy}</span>
                  </div>
                  <div>
                    <span className="text-text-muted">Submitted:</span>
                    <span className="ml-2 text-text-primary">
                      {formatDistanceToNow(new Date(viewingChange.submittedAt), { addSuffix: true })}
                    </span>
                  </div>
                </div>

                <div className="pt-4 border-t border-surface-border">
                  <h4 className="text-sm font-medium text-text-secondary mb-3">Changes</h4>
                  <DiffViewer
                    currentValues={viewingChange.currentValues}
                    proposedValues={viewingChange.proposedValues}
                  />
                </div>

                {viewingChange.status === 'rejected' && viewingChange.rejectionReason && (
                  <div className="pt-4 border-t border-surface-border">
                    <h4 className="text-sm font-medium text-red-400 mb-2">Rejection Reason</h4>
                    <p className="text-sm text-text-secondary">{viewingChange.rejectionReason}</p>
                  </div>
                )}

                {/* Only show approve/reject buttons when not in read-only mode */}
                {!readOnly && viewingChange.status === 'pending' && (
                  <div className="flex justify-end gap-2 pt-4 border-t border-surface-border">
                    <button
                      onClick={() => {
                        handleApprove(viewingChange.id)
                        setViewingChange(null)
                      }}
                      className="px-4 py-2 text-sm bg-green-500/20 text-green-400 rounded hover:bg-green-500/30"
                    >
                      Approve
                    </button>
                    <button
                      onClick={() => {
                        setRejectingId(viewingChange.id)
                        setViewingChange(null)
                        setRejectReason('')
                      }}
                      className="px-4 py-2 text-sm bg-red-500/20 text-red-400 rounded hover:bg-red-500/30"
                    >
                      Reject
                    </button>
                  </div>
                )}
              </div>
            )}
            <Dialog.Close asChild>
              <button
                className="absolute top-4 right-4 p-1 text-text-muted hover:text-text-primary"
                aria-label="Close"
              >
                <X size={20} />
              </button>
            </Dialog.Close>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>

      {/* Reject Dialog */}
      <Dialog.Root open={!!rejectingId} onOpenChange={(open) => !open && setRejectingId(null)}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 bg-black/50" />
          <Dialog.Content className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-surface-elevated rounded-lg p-6 w-[400px] border border-surface-border">
            <Dialog.Title className="text-lg font-semibold text-text-primary mb-4">
              Reject Change
            </Dialog.Title>
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-text-secondary mb-2">
                  Reason (optional)
                </label>
                <textarea
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  placeholder="Provide a reason for rejection..."
                  className="w-full px-3 py-2 bg-surface-overlay border border-surface-border rounded text-text-primary placeholder:text-text-muted resize-none"
                  rows={3}
                />
              </div>
              <div className="flex justify-end gap-2">
                <button
                  onClick={() => setRejectingId(null)}
                  className="px-4 py-2 text-sm text-text-secondary hover:text-text-primary"
                >
                  Cancel
                </button>
                <button
                  onClick={handleRejectWithReason}
                  className="px-4 py-2 text-sm bg-red-500/20 text-red-400 rounded hover:bg-red-500/30"
                >
                  Reject
                </button>
              </div>
            </div>
            <Dialog.Close asChild>
              <button
                className="absolute top-4 right-4 p-1 text-text-muted hover:text-text-primary"
                aria-label="Close"
              >
                <X size={20} />
              </button>
            </Dialog.Close>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </div>
  )
}
