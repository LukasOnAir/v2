import { useMemo, useState, useCallback } from 'react'
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  flexRender,
  type SortingState,
  type ColumnDef,
} from '@tanstack/react-table'
import { ChevronUp, ChevronDown, Settings2, Trash2, Loader2 } from 'lucide-react'
import { useControlsStore } from '@/stores/controlsStore'
import { useDeleteControl } from '@/hooks/useControls'
import { usePermissions } from '@/hooks/usePermissions'
import { HeatmapCell } from '@/components/rct/HeatmapCell'
import { ControlTicketIndicator } from '@/components/tickets'
import type { Control, ControlLink } from '@/types/rct'
import type { Profile } from '@/lib/supabase/types'

interface EnrichedControl extends Control {
  linkCount: number
  assignedTesterName: string | null
}

interface ControlsTableProps {
  controls: Control[]
  controlLinks: ControlLink[]
  profiles: Profile[]
  onControlClick: (controlId: string) => void
  isDemoMode: boolean
}

export function ControlsTable({ controls, controlLinks, profiles, onControlClick, isDemoMode }: ControlsTableProps) {
  const { canEditControlDefinitions } = usePermissions()
  const [sorting, setSorting] = useState<SortingState>([])
  const [deletingId, setDeletingId] = useState<string | null>(null)

  // Store functions for demo mode
  const storeRemoveControl = useControlsStore((s) => s.removeControl)

  // Database mutation for authenticated mode
  const deleteMutation = useDeleteControl()

  const handleDelete = useCallback(async (controlId: string, controlName: string) => {
    const linkCount = controlLinks.filter(l => l.controlId === controlId).length
    const message = linkCount > 0
      ? `Delete "${controlName || 'Unnamed control'}" and remove it from ${linkCount} linked risk(s)?`
      : `Delete "${controlName || 'Unnamed control'}"?`

    if (window.confirm(message)) {
      if (isDemoMode) {
        storeRemoveControl(controlId)
      } else {
        setDeletingId(controlId)
        try {
          await deleteMutation.mutateAsync(controlId)
        } finally {
          setDeletingId(null)
        }
      }
    }
  }, [controlLinks, isDemoMode, storeRemoveControl, deleteMutation])

  // Enrich controls with link information and assignee name
  const data = useMemo<EnrichedControl[]>(() => {
    return controls.map(control => {
      const links = controlLinks.filter(l => l.controlId === control.id)
      const tester = control.assignedTesterId
        ? profiles.find(p => p.id === control.assignedTesterId)
        : null
      return {
        ...control,
        linkCount: links.length,
        assignedTesterName: tester?.full_name || null,
      }
    })
  }, [controls, controlLinks, profiles])

  const columns = useMemo<ColumnDef<EnrichedControl>[]>(
    () => [
      {
        accessorKey: 'name',
        header: 'Control Name',
        cell: ({ row }) => (
          <div className="flex items-center gap-2">
            <button
              onClick={() => onControlClick(row.original.id)}
              className="flex items-center gap-1.5 px-2 py-1 text-xs rounded bg-surface-overlay hover:bg-surface-border transition-colors"
              title={`${row.original.linkCount} linked risk${row.original.linkCount === 1 ? '' : 's'}`}
            >
              <Settings2 size={14} />
              <span>{row.original.linkCount}</span>
            </button>
            <button
              onClick={() => onControlClick(row.original.id)}
              className={`text-left text-accent-400 hover:underline ${row.original.name ? '' : 'text-text-muted italic'}`}
            >
              {row.original.name || '(unnamed)'}
            </button>
          </div>
        ),
      },
      {
        accessorKey: 'controlType',
        header: 'Type',
        cell: ({ getValue }) => (
          <span className="text-text-secondary">{getValue<string>() || '—'}</span>
        ),
      },
      {
        accessorKey: 'assignedTesterName',
        header: 'Assigned To',
        cell: ({ getValue }) => (
          <span className="text-text-secondary">
            {getValue<string | null>() || '-'}
          </span>
        ),
      },
      {
        accessorKey: 'netScore',
        header: 'Net Score',
        cell: ({ getValue }) => <HeatmapCell score={getValue<number | null>()} />,
      },
      {
        id: 'tickets',
        header: 'Tickets',
        cell: ({ row }) => <ControlTicketIndicator controlId={row.original.id} />,
      },
      {
        id: 'actions',
        header: '',
        size: 50,
        cell: ({ row }) => canEditControlDefinitions ? (
          <button
            onClick={(e) => {
              e.stopPropagation()
              handleDelete(row.original.id, row.original.name)
            }}
            disabled={deletingId === row.original.id}
            className="p-1.5 rounded hover:bg-red-500/20 text-text-muted hover:text-red-400 transition-colors disabled:opacity-50"
            title="Delete control"
          >
            {deletingId === row.original.id ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <Trash2 size={16} />
            )}
          </button>
        ) : null,
      },
    ],
    [onControlClick, canEditControlDefinitions, handleDelete, deletingId]
  )

  const table = useReactTable({
    data,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  })

  if (data.length === 0) {
    return (
      <div className="text-center py-12 text-text-secondary">
        No controls found. Controls will appear here once created in the Risk Control Table.
      </div>
    )
  }

  return (
    <div className="bg-surface-elevated rounded-lg border border-surface-border overflow-hidden">
      <table className="w-full">
        <thead>
          {table.getHeaderGroups().map(headerGroup => (
            <tr key={headerGroup.id} className="bg-surface-overlay">
              {headerGroup.headers.map(header => (
                <th
                  key={header.id}
                  className="px-4 py-3 text-left text-sm font-medium text-text-secondary cursor-pointer hover:bg-surface-border/50"
                  onClick={header.column.getToggleSortingHandler()}
                >
                  <div className="flex items-center gap-1">
                    {flexRender(header.column.columnDef.header, header.getContext())}
                    {header.column.getIsSorted() && (
                      header.column.getIsSorted() === 'asc'
                        ? <ChevronUp size={14} />
                        : <ChevronDown size={14} />
                    )}
                  </div>
                </th>
              ))}
            </tr>
          ))}
        </thead>
        <tbody>
          {table.getRowModel().rows.map(row => (
            <tr
              key={row.id}
              className="border-t border-surface-border hover:bg-surface-overlay/50 transition-colors"
            >
              {row.getVisibleCells().map(cell => (
                <td key={cell.id} className="px-4 py-3 text-sm text-text-primary">
                  {flexRender(cell.column.columnDef.cell, cell.getContext())}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
