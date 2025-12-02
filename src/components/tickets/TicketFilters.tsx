import { Search, X } from 'lucide-react'
import type { TicketCategory, TicketPriority } from '@/types/tickets'

export interface TicketFiltersValue {
  categories: TicketCategory[]
  priorities: TicketPriority[]
  searchQuery: string
}

interface TicketFiltersProps {
  filters: TicketFiltersValue
  onFiltersChange: (filters: TicketFiltersValue) => void
}

/** All category options */
const CATEGORIES: { value: TicketCategory; label: string }[] = [
  { value: 'maintenance', label: 'Maintenance' },
  { value: 'periodic-review', label: 'Periodic Review' },
  { value: 'update-change', label: 'Update/Change' },
  { value: 'other', label: 'Other' },
]

/** All priority options */
const PRIORITIES: { value: TicketPriority; label: string; color: string }[] = [
  { value: 'critical', label: 'Critical', color: 'bg-red-500/20 text-red-400 border-red-500/30' },
  { value: 'high', label: 'High', color: 'bg-orange-500/20 text-orange-400 border-orange-500/30' },
  { value: 'medium', label: 'Medium', color: 'bg-amber-500/20 text-amber-400 border-amber-500/30' },
  { value: 'low', label: 'Low', color: 'bg-green-500/20 text-green-400 border-green-500/30' },
]

/**
 * TicketFilters - Filter controls for ticket Kanban board
 */
export function TicketFilters({ filters, onFiltersChange }: TicketFiltersProps) {
  const hasActiveFilters =
    filters.categories.length > 0 ||
    filters.priorities.length > 0 ||
    filters.searchQuery.trim() !== ''

  const toggleCategory = (category: TicketCategory) => {
    const newCategories = filters.categories.includes(category)
      ? filters.categories.filter((c) => c !== category)
      : [...filters.categories, category]
    onFiltersChange({ ...filters, categories: newCategories })
  }

  const togglePriority = (priority: TicketPriority) => {
    const newPriorities = filters.priorities.includes(priority)
      ? filters.priorities.filter((p) => p !== priority)
      : [...filters.priorities, priority]
    onFiltersChange({ ...filters, priorities: newPriorities })
  }

  const handleSearchChange = (value: string) => {
    onFiltersChange({ ...filters, searchQuery: value })
  }

  const clearFilters = () => {
    onFiltersChange({ categories: [], priorities: [], searchQuery: '' })
  }

  return (
    <div className="flex flex-wrap items-center gap-4 p-4 bg-surface-elevated rounded-lg border border-surface-border">
      {/* Search input */}
      <div className="relative flex-1 min-w-[200px] max-w-sm">
        <Search
          size={18}
          className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted"
        />
        <input
          type="text"
          value={filters.searchQuery}
          onChange={(e) => handleSearchChange(e.target.value)}
          placeholder="Search tickets..."
          className="w-full pl-10 pr-4 py-2 bg-surface-base border border-surface-border rounded-lg text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-accent-500"
        />
      </div>

      {/* Category filter chips */}
      <div className="flex items-center gap-2">
        <span className="text-sm text-text-muted">Category:</span>
        <div className="flex flex-wrap gap-1.5">
          {CATEGORIES.map((cat) => {
            const isActive = filters.categories.includes(cat.value)
            return (
              <button
                key={cat.value}
                onClick={() => toggleCategory(cat.value)}
                className={`
                  px-2.5 py-1 text-xs rounded-full border transition-colors
                  ${
                    isActive
                      ? 'bg-accent-600 text-white border-accent-600'
                      : 'bg-surface-base text-text-secondary border-surface-border hover:border-accent-500'
                  }
                `}
              >
                {cat.label}
              </button>
            )
          })}
        </div>
      </div>

      {/* Priority filter chips */}
      <div className="flex items-center gap-2">
        <span className="text-sm text-text-muted">Priority:</span>
        <div className="flex flex-wrap gap-1.5">
          {PRIORITIES.map((pri) => {
            const isActive = filters.priorities.includes(pri.value)
            return (
              <button
                key={pri.value}
                onClick={() => togglePriority(pri.value)}
                className={`
                  px-2.5 py-1 text-xs rounded-full border transition-colors
                  ${
                    isActive
                      ? pri.color
                      : 'bg-surface-base text-text-secondary border-surface-border hover:border-accent-500'
                  }
                `}
              >
                {pri.label}
              </button>
            )
          })}
        </div>
      </div>

      {/* Clear filters button */}
      {hasActiveFilters && (
        <button
          onClick={clearFilters}
          className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-text-muted hover:text-text-primary transition-colors"
        >
          <X size={14} />
          Clear filters
        </button>
      )}
    </div>
  )
}
