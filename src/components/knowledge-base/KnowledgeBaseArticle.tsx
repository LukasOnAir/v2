import { format } from 'date-fns'
import { X, Edit2, Trash2 } from 'lucide-react'
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

interface KnowledgeBaseArticleProps {
  entry: KnowledgeBaseEntry
  onClose: () => void
  onEdit: () => void
  onDelete: () => void
  canEdit: boolean
}

/**
 * Full article view with edit/delete actions
 */
export function KnowledgeBaseArticle({
  entry,
  onClose,
  onEdit,
  onDelete,
  canEdit,
}: KnowledgeBaseArticleProps) {
  const handleDelete = () => {
    if (window.confirm('Are you sure you want to delete this article?')) {
      onDelete()
    }
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 mb-4">
        <div className="flex-1">
          <h2 className="text-xl font-semibold text-text-primary">{entry.title}</h2>
          <div className="flex items-center gap-2 mt-2">
            <span
              className={clsx(
                'text-xs px-2 py-0.5 rounded',
                CATEGORY_COLORS[entry.category]
              )}
            >
              {CATEGORY_LABELS[entry.category]}
            </span>
            {entry.tags.length > 0 && (
              <span className="text-xs text-text-muted">
                Tags: {entry.tags.join(', ')}
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          {canEdit && (
            <>
              <button
                onClick={onEdit}
                className="p-2 rounded hover:bg-surface-overlay text-text-muted hover:text-text-primary transition-colors"
                title="Edit article"
              >
                <Edit2 size={16} />
              </button>
              <button
                onClick={handleDelete}
                className="p-2 rounded hover:bg-red-500/20 text-text-muted hover:text-red-400 transition-colors"
                title="Delete article"
              >
                <Trash2 size={16} />
              </button>
            </>
          )}
          <button
            onClick={onClose}
            className="p-2 rounded hover:bg-surface-overlay text-text-muted hover:text-text-primary transition-colors"
            title="Close"
          >
            <X size={16} />
          </button>
        </div>
      </div>

      {/* Metadata */}
      <div className="flex items-center gap-4 text-xs text-text-muted mb-6">
        <span>
          Created: {format(new Date(entry.createdAt), 'MMM d, yyyy')}
        </span>
        {entry.updatedAt && (
          <span>
            Updated: {format(new Date(entry.updatedAt), 'MMM d, yyyy')}
          </span>
        )}
        <span>By: {entry.author === 'risk-manager' ? 'Risk Manager' : 'Control Owner'}</span>
      </div>

      {/* Related control types */}
      {entry.relatedControlTypes && entry.relatedControlTypes.length > 0 && (
        <div className="mb-4">
          <span className="text-xs text-text-muted">Related control types: </span>
          <span className="text-xs text-text-secondary">
            {entry.relatedControlTypes.join(', ')}
          </span>
        </div>
      )}

      {/* Content */}
      <div className="prose prose-invert max-w-none">
        <p className="text-text-primary whitespace-pre-wrap">{entry.content}</p>
      </div>
    </div>
  )
}
