import { AlertTriangle, GitBranch } from 'lucide-react'
import clsx from 'clsx'

export type TaxonomyType = 'risks' | 'processes'

interface TaxonomyTabsProps {
  /** Currently active tab */
  activeTab: TaxonomyType
  /** Tab change handler */
  onTabChange: (tab: TaxonomyType) => void
}

/**
 * TaxonomyTabs - Tab switcher for Risk and Process taxonomies
 *
 * Styled as pill tabs with amber accent on active tab.
 * Uses lucide-react icons: AlertTriangle for risks, GitBranch for processes.
 */
export function TaxonomyTabs({ activeTab, onTabChange }: TaxonomyTabsProps) {
  return (
    <div className="flex gap-2 p-1 bg-surface-overlay rounded-lg w-fit mb-4">
      <button
        onClick={() => onTabChange('risks')}
        className={clsx(
          'flex items-center gap-2 px-4 py-2 rounded-md transition-colors',
          'text-sm font-medium',
          activeTab === 'risks'
            ? 'bg-accent-600 text-white shadow-sm'
            : 'text-text-secondary hover:text-text-primary hover:bg-surface-elevated'
        )}
      >
        <AlertTriangle size={16} />
        Risk Taxonomy
      </button>
      <button
        onClick={() => onTabChange('processes')}
        className={clsx(
          'flex items-center gap-2 px-4 py-2 rounded-md transition-colors',
          'text-sm font-medium',
          activeTab === 'processes'
            ? 'bg-accent-600 text-white shadow-sm'
            : 'text-text-secondary hover:text-text-primary hover:bg-surface-elevated'
        )}
      >
        <GitBranch size={16} />
        Process Taxonomy
      </button>
    </div>
  )
}
