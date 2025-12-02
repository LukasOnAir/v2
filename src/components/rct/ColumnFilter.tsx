import { useState, useRef, useEffect, useMemo } from 'react'
import { Filter, X } from 'lucide-react'
import { Column } from '@tanstack/react-table'
import { clsx } from 'clsx'
import type { RCTRow } from '@/types/rct'

interface ColumnFilterProps {
  column: Column<RCTRow>
}

export function ColumnFilter({ column }: ColumnFilterProps) {
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

  const columnFilterValue = column.getFilterValue() as string[] | undefined
  const facetedUniqueValues = column.getFacetedUniqueValues()

  // Get ALL unique values sorted
  const allUniqueValues = useMemo(() => {
    const values = Array.from(facetedUniqueValues.keys())
      .filter(v => v !== '' && v !== null && v !== undefined)
      .map(String)
      .sort()
    return values
  }, [facetedUniqueValues])

  const toggleValue = (value: string) => {
    const current = columnFilterValue ?? []
    const updated = current.includes(value)
      ? current.filter(v => v !== value)
      : [...current, value]
    column.setFilterValue(updated.length ? updated : undefined)
  }

  const clearFilter = () => {
    column.setFilterValue(undefined)
    setIsOpen(false)
  }

  const hasFilter = columnFilterValue && columnFilterValue.length > 0

  return (
    <div ref={menuRef} className="relative inline-block">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={clsx(
          'p-1 rounded hover:bg-surface-overlay transition-colors',
          hasFilter ? 'text-accent-500' : 'text-text-muted'
        )}
        title={hasFilter ? `Filtered: ${columnFilterValue.length} selected` : 'Filter'}
      >
        <Filter size={14} />
      </button>

      {isOpen && (
        <div className="absolute top-full right-0 mt-1 w-56 max-h-64 overflow-auto bg-surface-elevated border border-surface-border rounded-lg shadow-lg z-30">
          {/* Header with clear */}
          <div className="flex items-center justify-between p-2 border-b border-surface-border">
            <span className="text-xs text-text-muted">
              {allUniqueValues.length} unique values
            </span>
            {hasFilter && (
              <button
                onClick={clearFilter}
                className="flex items-center gap-1 text-xs text-red-400 hover:text-red-300"
              >
                <X size={12} />
                Clear
              </button>
            )}
          </div>

          {/* Value checkboxes */}
          <div className="p-2 space-y-1">
            {allUniqueValues.length === 0 ? (
              <p className="text-xs text-text-muted py-2 text-center">No values</p>
            ) : (
              allUniqueValues.map(value => (
                <label
                  key={value}
                  className="flex items-center gap-2 px-2 py-1 rounded hover:bg-surface-overlay cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={columnFilterValue?.includes(value) ?? false}
                    onChange={() => toggleValue(value)}
                    className="w-4 h-4 rounded border-surface-border bg-surface-overlay text-accent-500 focus:ring-accent-500 focus:ring-offset-0"
                  />
                  <span className="text-sm text-text-primary truncate" title={value}>
                    {value || '(empty)'}
                  </span>
                </label>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  )
}
