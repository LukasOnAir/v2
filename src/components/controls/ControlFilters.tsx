import { useState } from 'react'
import { Search, X } from 'lucide-react'
import Fuse from 'fuse.js'
import type { Control, ControlType } from '@/types/rct'

const CONTROL_TYPES: ControlType[] = [
  'Preventative', 'Detective', 'Corrective', 'Directive', 'Deterrent',
  'Compensating', 'Acceptance', 'Tolerance', 'Manual', 'Automated',
]

interface ControlFiltersProps {
  controls: Control[]
  onFilteredChange: (filtered: Control[]) => void
}

export function ControlFilters({ controls, onFilteredChange }: ControlFiltersProps) {
  const [search, setSearch] = useState('')
  const [selectedType, setSelectedType] = useState<ControlType | 'all'>('all')

  // Fuse.js instance for fuzzy search
  const fuse = new Fuse(controls, {
    keys: ['name', 'description'],
    threshold: 0.3,
    includeScore: true,
  })

  const applyFilters = (searchTerm: string, typeFilter: ControlType | 'all') => {
    let result = controls

    // Apply search
    if (searchTerm.trim()) {
      const fuseResults = fuse.search(searchTerm)
      result = fuseResults.map(r => r.item)
    }

    // Apply type filter
    if (typeFilter !== 'all') {
      result = result.filter(c => c.controlType === typeFilter)
    }

    onFilteredChange(result)
  }

  const handleSearchChange = (value: string) => {
    setSearch(value)
    applyFilters(value, selectedType)
  }

  const handleTypeChange = (type: ControlType | 'all') => {
    setSelectedType(type)
    applyFilters(search, type)
  }

  const clearFilters = () => {
    setSearch('')
    setSelectedType('all')
    onFilteredChange(controls)
  }

  const hasFilters = search.trim() || selectedType !== 'all'

  return (
    <div className="flex flex-wrap items-center gap-4 p-4 bg-surface-elevated rounded-lg border border-surface-border">
      {/* Search */}
      <div className="relative flex-1 min-w-[200px]">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
        <input
          type="text"
          value={search}
          onChange={(e) => handleSearchChange(e.target.value)}
          placeholder="Search controls..."
          className="w-full pl-9 pr-3 py-2 bg-surface-overlay border border-surface-border rounded-lg text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-accent-500"
        />
      </div>

      {/* Type filter */}
      <div>
        <select
          value={selectedType}
          onChange={(e) => handleTypeChange(e.target.value as ControlType | 'all')}
          className="px-3 py-2 bg-surface-overlay border border-surface-border rounded-lg text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-accent-500"
        >
          <option value="all">All Types</option>
          {CONTROL_TYPES.map(type => (
            <option key={type} value={type}>{type}</option>
          ))}
        </select>
      </div>

      {/* Clear filters */}
      {hasFilters && (
        <button
          onClick={clearFilters}
          className="flex items-center gap-1 px-2 py-1 text-xs text-text-secondary hover:text-text-primary transition-colors"
        >
          <X size={14} />
          Clear
        </button>
      )}
    </div>
  )
}
