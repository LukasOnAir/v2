import { Search, ChevronsUpDown, ChevronsDownUp, Plus, Eye, EyeOff } from 'lucide-react'
import clsx from 'clsx'
import type { TaxonomyTreeRef } from './TaxonomyTree'

interface TaxonomyToolbarProps {
  /** Title to display */
  title: string
  /** Tree ref for expand/collapse actions */
  treeRef: React.RefObject<TaxonomyTreeRef | null>
  /** Current search term */
  searchTerm: string
  /** Search term change handler */
  onSearchChange: (term: string) => void
  /** Whether IDs are visible */
  showIds: boolean
  /** Toggle ID visibility */
  onToggleIds: () => void
  /** Whether descriptions are visible */
  showDescriptions: boolean
  /** Toggle description visibility */
  onToggleDescriptions: () => void
  /** Whether there are items in the tree */
  hasItems: boolean
  /** Whether the user can edit taxonomies (only Risk Manager) */
  canEdit?: boolean
}

/**
 * TaxonomyToolbar - Header toolbar above the taxonomy tree
 *
 * Provides:
 * - Title display
 * - Search input for filtering items
 * - Expand/Collapse all buttons
 * - Add root item button
 * - Toggle visibility for IDs and descriptions
 */
export function TaxonomyToolbar({
  title,
  treeRef,
  searchTerm,
  onSearchChange,
  showIds,
  onToggleIds,
  showDescriptions,
  onToggleDescriptions,
  hasItems,
  canEdit = true,
}: TaxonomyToolbarProps) {
  const handleExpandAll = () => {
    treeRef.current?.expandAll()
  }

  const handleCollapseAll = () => {
    treeRef.current?.collapseAll()
  }

  const handleAddRootItem = () => {
    treeRef.current?.createAtRoot()
  }

  return (
    <div className="flex items-center gap-4 mb-4 flex-wrap">
      {/* Title */}
      <h2 className="text-lg font-semibold text-text-primary mr-auto">
        {title}
      </h2>

      {/* Search input */}
      <div className="relative">
        <Search
          size={16}
          className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted"
        />
        <input
          type="text"
          placeholder="Search..."
          value={searchTerm}
          onChange={(e) => onSearchChange(e.target.value)}
          className={clsx(
            'pl-9 pr-4 py-1.5 rounded-md w-48',
            'bg-surface-overlay border border-surface-border',
            'text-sm text-text-primary placeholder-text-muted',
            'focus:outline-none focus:ring-1 focus:ring-accent-500'
          )}
        />
      </div>

      {/* View toggles */}
      <div className="flex gap-1">
        <button
          onClick={onToggleIds}
          className={clsx(
            'p-2 rounded-md transition-colors',
            'border border-surface-border',
            showIds
              ? 'bg-accent-500/20 text-accent-400 border-accent-500/30'
              : 'bg-surface-overlay text-text-muted hover:text-text-secondary'
          )}
          title={showIds ? 'Hide IDs' : 'Show IDs'}
        >
          {showIds ? <Eye size={16} /> : <EyeOff size={16} />}
          <span className="sr-only">{showIds ? 'Hide IDs' : 'Show IDs'}</span>
        </button>
        <button
          onClick={onToggleDescriptions}
          className={clsx(
            'px-2 py-1 rounded-md transition-colors text-xs',
            'border border-surface-border',
            showDescriptions
              ? 'bg-accent-500/20 text-accent-400 border-accent-500/30'
              : 'bg-surface-overlay text-text-muted hover:text-text-secondary'
          )}
          title={showDescriptions ? 'Hide Descriptions' : 'Show Descriptions'}
        >
          Desc
        </button>
      </div>

      {/* Expand/Collapse buttons */}
      <div className="flex gap-1">
        <button
          onClick={handleExpandAll}
          disabled={!hasItems}
          className={clsx(
            'p-2 rounded-md transition-colors',
            'border border-surface-border',
            hasItems
              ? 'bg-surface-overlay text-text-secondary hover:text-text-primary hover:bg-surface-elevated'
              : 'bg-surface-overlay text-text-muted cursor-not-allowed opacity-50'
          )}
          title="Expand All"
        >
          <ChevronsUpDown size={16} />
        </button>
        <button
          onClick={handleCollapseAll}
          disabled={!hasItems}
          className={clsx(
            'p-2 rounded-md transition-colors',
            'border border-surface-border',
            hasItems
              ? 'bg-surface-overlay text-text-secondary hover:text-text-primary hover:bg-surface-elevated'
              : 'bg-surface-overlay text-text-muted cursor-not-allowed opacity-50'
          )}
          title="Collapse All"
        >
          <ChevronsDownUp size={16} />
        </button>
      </div>

      {/* Add Root Item button - only shown for Risk Manager */}
      {canEdit && (
        <button
          onClick={handleAddRootItem}
          className={clsx(
            'flex items-center gap-2 px-3 py-1.5 rounded-md transition-colors',
            'bg-accent-600 hover:bg-accent-500 text-white',
            'text-sm font-medium'
          )}
        >
          <Plus size={16} />
          Add Root Item
        </button>
      )}
    </div>
  )
}
