import { useState, useRef, useEffect } from 'react'
import { Eye, EyeOff, ChevronDown } from 'lucide-react'
import { Table } from '@tanstack/react-table'
import { clsx } from 'clsx'
import type { RCTRow } from '@/types/rct'

interface ColumnVisibilityMenuProps {
  table: Table<RCTRow>
}

export function ColumnVisibilityMenu({ table }: ColumnVisibilityMenuProps) {
  const [isOpen, setIsOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  // Close on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const allColumns = table.getAllLeafColumns()
  const visibleCount = allColumns.filter(c => c.getIsVisible()).length

  return (
    <div ref={menuRef} className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-1.5 text-sm bg-surface-elevated border border-surface-border rounded hover:bg-surface-overlay transition-colors"
      >
        <Eye size={16} />
        <span>Columns ({visibleCount}/{allColumns.length})</span>
        <ChevronDown size={14} className={clsx('transition-transform', isOpen && 'rotate-180')} />
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 mt-1 w-64 max-h-96 overflow-auto bg-surface-elevated border border-surface-border rounded-lg shadow-lg z-20">
          <div className="p-2 border-b border-surface-border">
            <button
              onClick={() => {
                allColumns.forEach(col => col.toggleVisibility(true))
              }}
              className="text-xs text-accent-500 hover:text-accent-400 mr-3"
            >
              Show all
            </button>
            <button
              onClick={() => {
                allColumns.forEach(col => col.toggleVisibility(false))
              }}
              className="text-xs text-text-muted hover:text-text-secondary"
            >
              Hide all
            </button>
          </div>

          <div className="p-2 space-y-1">
            {allColumns.map(column => {
              const isVisible = column.getIsVisible()
              return (
                <label
                  key={column.id}
                  className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-surface-overlay cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={isVisible}
                    onChange={column.getToggleVisibilityHandler()}
                    className="w-4 h-4 rounded border-surface-border bg-surface-overlay text-accent-500 focus:ring-accent-500 focus:ring-offset-0"
                  />
                  <span className="text-sm text-text-primary truncate">
                    {typeof column.columnDef.header === 'string'
                      ? column.columnDef.header
                      : column.id}
                  </span>
                  {isVisible ? (
                    <Eye size={14} className="ml-auto text-text-muted" />
                  ) : (
                    <EyeOff size={14} className="ml-auto text-text-muted" />
                  )}
                </label>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
