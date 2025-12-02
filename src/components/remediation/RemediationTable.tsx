import { useMemo, useState, Fragment } from 'react'
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getExpandedRowModel,
  flexRender,
  type SortingState,
  type ColumnDef,
  type Row,
} from '@tanstack/react-table'
import { ArrowUpDown, ArrowUp, ArrowDown, ChevronDown, ChevronRight, Trash2, Plus, Square, CheckSquare } from 'lucide-react'
import { useRCTStore } from '@/stores/rctStore'
import { usePermissions } from '@/hooks/usePermissions'
import { useIsDemoMode } from '@/hooks/useTenantData'
import { useRemediationPlans, useUpdateRemediationStatus, useUpdateRemediationPlan, useDeleteRemediationPlan } from '@/hooks/useRemediationPlans'
import { useRCTRows } from '@/hooks/useRCTRows'
import { format, parseISO, isValid } from 'date-fns'

/** Safely format a date string, returning fallback if invalid */
function safeFormatDate(dateStr: string | undefined, formatStr: string = 'MMM d, yyyy'): string {
  if (!dateStr) return '—'
  const parsed = parseISO(dateStr)
  return isValid(parsed) ? format(parsed, formatStr) : '—'
}
import type { RemediationPlan, RemediationStatus } from '@/types/rct'

const STATUS_OPTIONS: { value: RemediationStatus; label: string }[] = [
  { value: 'open', label: 'Open' },
  { value: 'in-progress', label: 'In Progress' },
  { value: 'resolved', label: 'Resolved' },
  { value: 'closed', label: 'Closed' },
]

const PRIORITY_OPTIONS: { value: RemediationPlan['priority']; label: string }[] = [
  { value: 'critical', label: 'Critical' },
  { value: 'high', label: 'High' },
  { value: 'medium', label: 'Medium' },
  { value: 'low', label: 'Low' },
]

/**
 * Priority badge styling
 */
const PRIORITY_STYLES: Record<RemediationPlan['priority'], string> = {
  critical: 'bg-red-500/20 text-red-400',
  high: 'bg-orange-500/20 text-orange-400',
  medium: 'bg-amber-500/20 text-amber-400',
  low: 'bg-green-500/20 text-green-400',
}

/**
 * Status badge styling
 */
const STATUS_STYLES: Record<RemediationStatus, string> = {
  open: 'bg-blue-500/20 text-blue-400',
  'in-progress': 'bg-amber-500/20 text-amber-400',
  resolved: 'bg-green-500/20 text-green-400',
  closed: 'bg-gray-500/20 text-gray-400',
}

interface EnrichedRemediationPlan extends RemediationPlan {
  riskName: string
}

/**
 * Full list table showing all remediation plans with inline editing
 */
export function RemediationTable() {
  const isDemoMode = useIsDemoMode()

  // Store data (for demo mode)
  const storeRemediationPlans = useRCTStore((state) => state.remediationPlans)
  const storeRows = useRCTStore((state) => state.rows)
  const storeUpdateStatus = useRCTStore((state) => state.updateRemediationStatus)
  const storeUpdatePlan = useRCTStore((state) => state.updateRemediationPlan)
  const storeToggleAction = useRCTStore((state) => state.toggleActionItem)
  const storeAddAction = useRCTStore((state) => state.addActionItem)
  const storeRemoveAction = useRCTStore((state) => state.removeActionItem)
  const storeDeletePlan = useRCTStore((state) => state.deleteRemediationPlan)

  // Database hooks (for authenticated mode)
  const { data: dbRemediationPlans } = useRemediationPlans()
  const { data: dbRows } = useRCTRows()
  const updateStatusMutation = useUpdateRemediationStatus()
  const updatePlanMutation = useUpdateRemediationPlan()
  const deletePlanMutation = useDeleteRemediationPlan()

  // Dual-source selection
  const remediationPlans = isDemoMode ? storeRemediationPlans : (dbRemediationPlans || [])
  // Memoize rows to prevent infinite re-renders from creating new array every render
  const rows = useMemo(() => {
    if (isDemoMode) return storeRows
    if (!dbRows) return []
    return dbRows.map(r => ({ id: r.id, riskName: 'Unknown' }))
  }, [isDemoMode, storeRows, dbRows])

  // Wrapper handlers for mutations
  const handleStatusChange = (id: string, status: RemediationStatus) => {
    if (isDemoMode) {
      storeUpdateStatus(id, status)
    } else {
      updateStatusMutation.mutate({ id, status })
    }
  }

  const handlePlanUpdate = (id: string, updates: Partial<RemediationPlan>) => {
    if (isDemoMode) {
      storeUpdatePlan(id, updates)
    } else {
      updatePlanMutation.mutate({ id, ...updates })
    }
  }

  const handleDeletePlan = (id: string) => {
    if (isDemoMode) {
      storeDeletePlan(id)
    } else {
      deletePlanMutation.mutate(id)
    }
  }

  const handleToggleAction = (planId: string, actionId: string) => {
    if (isDemoMode) {
      storeToggleAction(planId, actionId)
    } else {
      // For action items, update the whole actionItems array
      const plan = remediationPlans.find(p => p.id === planId)
      if (plan) {
        const updatedItems = plan.actionItems.map(item =>
          item.id === actionId ? { ...item, completed: !item.completed } : item
        )
        updatePlanMutation.mutate({ id: planId, actionItems: updatedItems })
      }
    }
  }

  const handleAddAction = (planId: string, description: string) => {
    if (isDemoMode) {
      storeAddAction(planId, description)
    } else {
      const plan = remediationPlans.find(p => p.id === planId)
      if (plan) {
        const newItem = { id: `ai-${Date.now()}`, description, completed: false }
        updatePlanMutation.mutate({ id: planId, actionItems: [...plan.actionItems, newItem] })
      }
    }
  }

  const handleRemoveAction = (planId: string, actionId: string) => {
    if (isDemoMode) {
      storeRemoveAction(planId, actionId)
    } else {
      const plan = remediationPlans.find(p => p.id === planId)
      if (plan) {
        const updatedItems = plan.actionItems.filter(item => item.id !== actionId)
        updatePlanMutation.mutate({ id: planId, actionItems: updatedItems })
      }
    }
  }

  const { canEditControlDefinitions } = usePermissions()

  const [sorting, setSorting] = useState<SortingState>([])
  const [newActionItems, setNewActionItems] = useState<Record<string, string>>({})

  // Enrich plans with risk name
  const data = useMemo(() => {
    return remediationPlans.map((plan) => {
      const row = rows.find((r) => r.id === plan.rowId)
      return {
        ...plan,
        riskName: row?.riskName || 'Unknown Risk',
      }
    })
  }, [remediationPlans, rows])

  // Handle add action item (local wrapper for adding action from input)
  const handleAddActionItem = (planId: string) => {
    const description = newActionItems[planId]?.trim()
    if (description) {
      handleAddAction(planId, description)
      setNewActionItems(prev => ({ ...prev, [planId]: '' }))
    }
  }

  // Define columns
  const columns = useMemo<ColumnDef<EnrichedRemediationPlan>[]>(
    () => [
      {
        id: 'expander',
        header: () => null,
        cell: ({ row }) => (
          <div className="flex items-center justify-center">
            {row.getIsExpanded() ? (
              <ChevronDown size={16} className="text-text-muted" />
            ) : (
              <ChevronRight size={16} className="text-text-muted" />
            )}
          </div>
        ),
        size: 32,
        meta: { noLeftPadding: true },
      },
      {
        accessorKey: 'title',
        header: 'Title',
        cell: ({ getValue }) => (
          <span className="font-medium text-text-primary">{getValue<string>()}</span>
        ),
      },
      {
        accessorKey: 'status',
        header: 'Status',
        cell: ({ getValue, row }) => {
          const status = getValue<RemediationStatus>()
          if (canEditControlDefinitions) {
            return (
              <select
                value={status}
                onClick={(e) => e.stopPropagation()}
                onChange={(e) => {
                  e.stopPropagation()
                  handleStatusChange(row.original.id, e.target.value as RemediationStatus)
                }}
                className={`px-2 py-0.5 rounded text-xs font-medium border-0 cursor-pointer focus:outline-none focus:ring-1 focus:ring-accent-500 ${STATUS_STYLES[status]}`}
              >
                {STATUS_OPTIONS.map(opt => (
                  <option key={opt.value} value={opt.value} className="bg-surface-elevated text-text-primary">{opt.label}</option>
                ))}
              </select>
            )
          }
          return (
            <span className={`px-2 py-0.5 rounded text-xs font-medium ${STATUS_STYLES[status]}`}>
              {status === 'in-progress' ? 'In Progress' : status.charAt(0).toUpperCase() + status.slice(1)}
            </span>
          )
        },
      },
      {
        accessorKey: 'priority',
        header: 'Priority',
        cell: ({ getValue, row }) => {
          const priority = getValue<RemediationPlan['priority']>()
          if (canEditControlDefinitions) {
            return (
              <select
                value={priority}
                onClick={(e) => e.stopPropagation()}
                onChange={(e) => {
                  e.stopPropagation()
                  handlePlanUpdate(row.original.id, { priority: e.target.value as RemediationPlan['priority'] })
                }}
                className={`px-2 py-0.5 rounded text-xs font-medium border-0 cursor-pointer focus:outline-none focus:ring-1 focus:ring-accent-500 capitalize ${PRIORITY_STYLES[priority]}`}
              >
                {PRIORITY_OPTIONS.map(opt => (
                  <option key={opt.value} value={opt.value} className="bg-surface-elevated text-text-primary">{opt.label}</option>
                ))}
              </select>
            )
          }
          return (
            <span className={`px-2 py-0.5 rounded text-xs font-medium capitalize ${PRIORITY_STYLES[priority]}`}>
              {priority}
            </span>
          )
        },
      },
      {
        accessorKey: 'owner',
        header: 'Owner',
        cell: ({ getValue }) => (
          <span className="text-text-secondary">{getValue<string>()}</span>
        ),
      },
      {
        accessorKey: 'deadline',
        header: 'Deadline',
        cell: ({ getValue }) => {
          const deadline = getValue<string>()
          return (
            <span className="text-text-secondary">
              {safeFormatDate(deadline)}
            </span>
          )
        },
      },
      {
        accessorKey: 'riskName',
        header: 'Risk',
        cell: ({ getValue }) => (
          <span className="text-text-muted truncate max-w-[200px] block">{getValue<string>()}</span>
        ),
      },
      {
        id: 'actions',
        header: () => null,
        cell: ({ row }) => canEditControlDefinitions ? (
          <button
            onClick={(e) => {
              e.stopPropagation()
              if (confirm('Delete this remediation plan?')) {
                handleDeletePlan(row.original.id)
              }
            }}
            className="p-1.5 rounded hover:bg-red-500/20 text-text-muted hover:text-red-400 transition-colors"
            title="Delete"
          >
            <Trash2 size={14} />
          </button>
        ) : null,
        size: 50,
      },
    ],
    [canEditControlDefinitions, handleStatusChange, handleDeletePlan, handlePlanUpdate]
  )

  const table = useReactTable({
    data,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getExpandedRowModel: getExpandedRowModel(),
    getRowCanExpand: () => true,
  })

  // Render expanded row content
  const renderExpandedRow = (row: Row<EnrichedRemediationPlan>) => {
    const plan = row.original
    // Defensive: ensure actionItems is always an array
    const actionItems = Array.isArray(plan.actionItems) ? plan.actionItems : []
    const completedCount = actionItems.filter(a => a.completed).length
    const totalCount = actionItems.length

    return (
      <tr className="bg-surface-overlay/50">
        <td colSpan={columns.length} className="px-4 py-4">
          <div className="space-y-4 max-w-3xl">
            {/* Editable Fields Row */}
            {canEditControlDefinitions && (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {/* Owner */}
                <div>
                  <label className="text-xs font-medium text-text-muted uppercase tracking-wider block mb-1">Owner</label>
                  <input
                    type="text"
                    value={plan.owner}
                    onChange={(e) => handlePlanUpdate(plan.id, { owner: e.target.value })}
                    className="w-full px-2 py-1.5 bg-surface-elevated border border-surface-border rounded text-sm text-text-primary focus:outline-none focus:ring-1 focus:ring-accent-500"
                  />
                </div>

                {/* Deadline */}
                <div>
                  <label className="text-xs font-medium text-text-muted uppercase tracking-wider block mb-1">Deadline</label>
                  <input
                    type="date"
                    value={plan.deadline}
                    onChange={(e) => handlePlanUpdate(plan.id, { deadline: e.target.value })}
                    className="w-full px-2 py-1.5 bg-surface-elevated border border-surface-border rounded text-sm text-text-primary focus:outline-none focus:ring-1 focus:ring-accent-500"
                  />
                </div>

                {/* Title */}
                <div>
                  <label className="text-xs font-medium text-text-muted uppercase tracking-wider block mb-1">Title</label>
                  <input
                    type="text"
                    value={plan.title}
                    onChange={(e) => handlePlanUpdate(plan.id, { title: e.target.value })}
                    className="w-full px-2 py-1.5 bg-surface-elevated border border-surface-border rounded text-sm text-text-primary focus:outline-none focus:ring-1 focus:ring-accent-500"
                  />
                </div>
              </div>
            )}

            {/* Description */}
            <div>
              <span className="text-xs font-medium text-text-muted uppercase tracking-wider">Description</span>
              {canEditControlDefinitions ? (
                <textarea
                  value={plan.description || ''}
                  onChange={(e) => handlePlanUpdate(plan.id, { description: e.target.value })}
                  placeholder="Add description..."
                  rows={2}
                  className="w-full mt-1 px-2 py-1.5 bg-surface-elevated border border-surface-border rounded text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-1 focus:ring-accent-500 resize-none"
                />
              ) : plan.description ? (
                <p className="text-sm text-text-secondary mt-1">{plan.description}</p>
              ) : (
                <p className="text-sm text-text-muted italic mt-1">No description</p>
              )}
            </div>

            {/* Action Items */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-medium text-text-muted uppercase tracking-wider">
                  Action Items {totalCount > 0 && `(${completedCount}/${totalCount})`}
                </span>
              </div>
              <div className="space-y-1">
                {actionItems.length === 0 ? (
                  <p className="text-sm text-text-muted italic">No action items yet</p>
                ) : (
                  actionItems.map(item => (
                    <div
                      key={item.id}
                      className="flex items-start gap-2 p-2 rounded hover:bg-surface-elevated group"
                    >
                      <button
                        onClick={() => handleToggleAction(plan.id, item.id)}
                        className="flex-shrink-0 mt-0.5"
                      >
                        {item.completed ? (
                          <CheckSquare size={16} className="text-green-400" />
                        ) : (
                          <Square size={16} className="text-text-muted hover:text-accent-400" />
                        )}
                      </button>
                      <span className={`flex-1 text-sm ${item.completed ? 'text-text-muted line-through' : 'text-text-primary'}`}>
                        {item.description}
                      </span>
                      {canEditControlDefinitions && (
                        <button
                          onClick={() => handleRemoveAction(plan.id, item.id)}
                          className="opacity-0 group-hover:opacity-100 p-0.5 rounded hover:bg-red-500/20 text-text-muted hover:text-red-400 transition-all"
                        >
                          <Trash2 size={12} />
                        </button>
                      )}
                    </div>
                  ))
                )}
              </div>

              {/* Add new action item */}
              <div className="mt-2 flex gap-2">
                <input
                  type="text"
                  value={newActionItems[plan.id] || ''}
                  onChange={(e) => setNewActionItems(prev => ({ ...prev, [plan.id]: e.target.value }))}
                  placeholder="Add action item..."
                  onKeyDown={(e) => e.key === 'Enter' && handleAddActionItem(plan.id)}
                  className="flex-1 px-2 py-1.5 bg-surface-elevated border border-surface-border rounded text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-1 focus:ring-accent-500"
                />
                <button
                  onClick={() => handleAddActionItem(plan.id)}
                  disabled={!newActionItems[plan.id]?.trim()}
                  className="px-3 py-1.5 rounded bg-accent-500/20 text-accent-400 hover:bg-accent-500/30 transition-colors disabled:opacity-50 flex items-center gap-1"
                >
                  <Plus size={14} />
                  Add
                </button>
              </div>
            </div>

            {/* Notes - editable */}
            <div>
              <span className="text-xs font-medium text-text-muted uppercase tracking-wider">Notes</span>
              {canEditControlDefinitions ? (
                <textarea
                  value={plan.notes || ''}
                  onChange={(e) => handlePlanUpdate(plan.id, { notes: e.target.value })}
                  placeholder="Add notes..."
                  rows={2}
                  className="w-full mt-1 px-2 py-1.5 bg-surface-elevated border border-surface-border rounded text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-1 focus:ring-accent-500 resize-none"
                />
              ) : plan.notes ? (
                <p className="text-sm text-text-secondary mt-1">{plan.notes}</p>
              ) : (
                <p className="text-sm text-text-muted italic mt-1">No notes</p>
              )}
            </div>

            {/* Metadata */}
            <div className="flex flex-wrap gap-4 text-xs text-text-muted pt-2 border-t border-surface-border">
              <span>Created: {safeFormatDate(plan.createdDate)}</span>
              {plan.resolvedDate && <span>Resolved: {safeFormatDate(plan.resolvedDate)}</span>}
              {plan.closedDate && <span>Closed: {safeFormatDate(plan.closedDate)}</span>}
            </div>
          </div>
        </td>
      </tr>
    )
  }

  if (data.length === 0) {
    return (
      <div className="p-8 text-center text-text-muted">
        No remediation plans yet. Remediation plans are created when control tests identify issues.
      </div>
    )
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          {table.getHeaderGroups().map((headerGroup) => (
            <tr key={headerGroup.id} className="border-b border-surface-border">
              {headerGroup.headers.map((header) => (
                <th
                  key={header.id}
                  className="px-4 py-3 text-left text-xs font-medium text-text-muted uppercase tracking-wider"
                >
                  {header.isPlaceholder ? null : (
                    <button
                      className="flex items-center gap-1 hover:text-text-primary transition-colors"
                      onClick={header.column.getToggleSortingHandler()}
                    >
                      {flexRender(header.column.columnDef.header, header.getContext())}
                      {header.column.getIsSorted() === 'asc' ? (
                        <ArrowUp size={14} />
                      ) : header.column.getIsSorted() === 'desc' ? (
                        <ArrowDown size={14} />
                      ) : (
                        <ArrowUpDown size={14} className="opacity-50" />
                      )}
                    </button>
                  )}
                </th>
              ))}
            </tr>
          ))}
        </thead>
        <tbody>
          {table.getRowModel().rows.map((row) => (
            <Fragment key={row.id}>
              <tr
                onClick={() => row.toggleExpanded()}
                className={`border-b border-surface-border hover:bg-surface-overlay transition-colors cursor-pointer ${row.getIsExpanded() ? 'bg-surface-overlay/30' : ''}`}
              >
                {row.getVisibleCells().map((cell) => (
                  <td
                    key={cell.id}
                    className={`py-3 text-sm ${cell.column.id === 'expander' ? 'pl-2 pr-0 w-8' : 'px-4'}`}
                  >
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </td>
                ))}
              </tr>
              {row.getIsExpanded() && renderExpandedRow(row)}
            </Fragment>
          ))}
        </tbody>
      </table>
    </div>
  )
}
