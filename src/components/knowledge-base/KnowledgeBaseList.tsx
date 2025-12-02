import { formatDistanceToNow } from 'date-fns'
import { clsx } from 'clsx'
import type { KnowledgeBaseEntry, KnowledgeBaseCategory } from '@/types/collaboration'

const CATEGORY_COLORS: Record<KnowledgeBaseCategory, string> = {
  'testing-procedure': 'bg-blue-500/20 text-blue-400',
  'best-practice': 'bg-amber-500/20 text-amber-400',
  policy: 'bg-purple-500/20 text-purple-400',
  template: 'bg-green-500/20 text-green-400',
  reference: 'bg-gray-500/20 text-gray-400',
}

const CATEGORY_LABELS: Record<KnowledgeBaseCategory, string> = {
  'testing-procedure': 'Testing Procedure',
  'best-practice': 'Best Practice',
  policy: 'Policy',
  template: 'Template',
  reference: 'Reference',
}

interface KnowledgeBaseListProps {
  entries: KnowledgeBaseEntry[]
  onSelect: (entry: KnowledgeBaseEntry) => void
}

/**
 * List of knowledge base articles
 */
export function KnowledgeBaseList({ entries, onSelect }: KnowledgeBaseListProps) {
  if (entries.length === 0) {
    return (
      <div className="p-8 text-center">
        <p className="text-text-muted">
          No articles found. Create your first article to get started.
        </p>
      </div>
    )
  }

  return (
    <div className="divide-y divide-surface-border">
      {entries.map((entry) => (
        <button
          key={entry.id}
          onClick={() => onSelect(entry)}
          className="w-full p-4 text-left hover:bg-surface-overlay transition-colors"
        >
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              {/* Title */}
              <h3 className="text-sm font-medium text-text-primary truncate">
                {entry.title}
              </h3>

              {/* Category and tags */}
              <div className="flex items-center gap-2 mt-1">
                <span
                  className={clsx(
                    'text-xs px-1.5 py-0.5 rounded',
                    CATEGORY_COLORS[entry.category]
                  )}
                >
                  {CATEGORY_LABELS[entry.category]}
                </span>
                {entry.tags.length > 0 && (
                  <span className="text-xs text-text-muted truncate">
                    {entry.tags.join(', ')}
                  </span>
                )}
              </div>

              {/* Content preview */}
              <p className="text-xs text-text-secondary mt-2 line-clamp-2">
                {entry.content.substring(0, 150)}
                {entry.content.length > 150 ? '...' : ''}
              </p>
            </div>

            {/* Date */}
            <span className="text-xs text-text-muted whitespace-nowrap">
              {formatDistanceToNow(new Date(entry.createdAt), { addSuffix: true })}
            </span>
          </div>
        </button>
      ))}
    </div>
  )
}
