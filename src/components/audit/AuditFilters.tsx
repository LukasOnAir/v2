import { X, Search } from 'lucide-react'
import type { AuditFilters as AuditFiltersType } from '@/hooks/useAuditLog'
import {
  ALL_ENTITY_TYPES,
  ALL_CHANGE_TYPES,
  ENTITY_TYPE_LABELS,
  CHANGE_TYPE_LABELS,
  DEFAULT_AUDIT_FILTERS,
} from '@/hooks/useAuditLog'
import type { EntityType, ChangeType } from '@/types/audit'

interface AuditFiltersProps {
  filters: AuditFiltersType
  onChange: (filters: AuditFiltersType) => void
  totalCount: number
  filteredCount: number
}

/**
 * Filter controls for the audit log
 */
export function AuditFilters({
  filters,
  onChange,
  totalCount,
  filteredCount,
}: AuditFiltersProps) {
  const hasFilters =
    filters.dateRange.start !== null ||
    filters.dateRange.end !== null ||
    filters.entityTypes.length > 0 ||
    filters.changeTypes.length > 0 ||
    filters.searchQuery.trim() !== ''

  const handleDateChange = (field: 'start' | 'end', value: string) => {
    onChange({
      ...filters,
      dateRange: {
        ...filters.dateRange,
        [field]: value ? new Date(value) : null,
      },
    })
  }

  const handleEntityTypeToggle = (type: EntityType) => {
    const current = filters.entityTypes
    const newTypes = current.includes(type)
      ? current.filter((t) => t !== type)
      : [...current, type]
    onChange({ ...filters, entityTypes: newTypes })
  }

  const handleChangeTypeToggle = (type: ChangeType) => {
    const current = filters.changeTypes
    const newTypes = current.includes(type)
      ? current.filter((t) => t !== type)
      : [...current, type]
    onChange({ ...filters, changeTypes: newTypes })
  }

  const handleSearchChange = (value: string) => {
    onChange({ ...filters, searchQuery: value })
  }

  const handleClearFilters = () => {
    onChange(DEFAULT_AUDIT_FILTERS)
  }

  // Format date for input value
  const formatDateForInput = (date: Date | null): string => {
    if (!date) return ''
    return date.toISOString().split('T')[0]
  }

  return (
    <div className="bg-surface-elevated rounded-lg border border-surface-border p-4 space-y-4">
      {/* Top row: Search and count */}
      <div className="flex items-center gap-4">
        {/* Search input */}
        <div className="flex-1 relative">
          <Search
            size={16}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted"
          />
          <input
            type="text"
            value={filters.searchQuery}
            onChange={(e) => handleSearchChange(e.target.value)}
            placeholder="Search by entity name..."
            className="w-full pl-9 pr-3 py-2 bg-surface-overlay border border-surface-border rounded text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-1 focus:ring-accent-500"
          />
        </div>

        {/* Count display */}
        <div className="text-sm text-text-muted whitespace-nowrap">
          Showing {filteredCount.toLocaleString()} of {totalCount.toLocaleString()} entries
        </div>

        {/* Clear filters button */}
        {hasFilters && (
          <button
            onClick={handleClearFilters}
            className="flex items-center gap-1 px-3 py-2 text-sm text-text-muted hover:text-text-primary bg-surface-overlay border border-surface-border rounded hover:bg-surface-border transition-colors"
          >
            <X size={14} />
            Clear
          </button>
        )}
      </div>

      {/* Second row: Date range */}
      <div className="flex items-center gap-4">
        <span className="text-sm text-text-muted">Date range:</span>
        <input
          type="date"
          value={formatDateForInput(filters.dateRange.start)}
          onChange={(e) => handleDateChange('start', e.target.value)}
          className="px-2 py-1.5 bg-surface-overlay border border-surface-border rounded text-sm text-text-primary focus:outline-none focus:ring-1 focus:ring-accent-500"
        />
        <span className="text-text-muted">to</span>
        <input
          type="date"
          value={formatDateForInput(filters.dateRange.end)}
          onChange={(e) => handleDateChange('end', e.target.value)}
          className="px-2 py-1.5 bg-surface-overlay border border-surface-border rounded text-sm text-text-primary focus:outline-none focus:ring-1 focus:ring-accent-500"
        />
      </div>

      {/* Third row: Entity types */}
      <div className="flex items-start gap-4">
        <span className="text-sm text-text-muted pt-0.5">Entity types:</span>
        <div className="flex flex-wrap gap-2">
          {ALL_ENTITY_TYPES.map((type) => (
            <label
              key={type}
              className="flex items-center gap-1.5 cursor-pointer"
            >
              <input
                type="checkbox"
                checked={filters.entityTypes.includes(type)}
                onChange={() => handleEntityTypeToggle(type)}
                className="w-4 h-4 rounded border-surface-border bg-surface-overlay text-accent-500 focus:ring-accent-500 focus:ring-offset-0"
              />
              <span className="text-sm text-text-secondary">
                {ENTITY_TYPE_LABELS[type]}
              </span>
            </label>
          ))}
        </div>
      </div>

      {/* Fourth row: Change types */}
      <div className="flex items-center gap-4">
        <span className="text-sm text-text-muted">Change types:</span>
        <div className="flex gap-4">
          {ALL_CHANGE_TYPES.map((type) => (
            <label
              key={type}
              className="flex items-center gap-1.5 cursor-pointer"
            >
              <input
                type="checkbox"
                checked={filters.changeTypes.includes(type)}
                onChange={() => handleChangeTypeToggle(type)}
                className="w-4 h-4 rounded border-surface-border bg-surface-overlay text-accent-500 focus:ring-accent-500 focus:ring-offset-0"
              />
              <span className="text-sm text-text-secondary">
                {CHANGE_TYPE_LABELS[type]}
              </span>
            </label>
          ))}
        </div>
      </div>
    </div>
  )
}
