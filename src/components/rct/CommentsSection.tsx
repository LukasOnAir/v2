import { useState, useMemo } from 'react'
import { ChevronDown, ChevronRight, MessageCircle, Plus } from 'lucide-react'
import { useCollaborationStore } from '@/stores/collaborationStore'
import { CommentForm } from './CommentForm'
import { CommentThread } from './CommentThread'
import type { CommentableEntityType } from '@/types/collaboration'

interface CommentsSectionProps {
  entityType: CommentableEntityType
  entityId: string
}

/**
 * Collapsible comments section for controls
 * Follows the same pattern as ControlTestSection
 */
export function CommentsSection({ entityType, entityId }: CommentsSectionProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  const [showForm, setShowForm] = useState(false)

  const { getCommentsForEntity } = useCollaborationStore()

  // Get comments for this entity
  const comments = useMemo(
    () => getCommentsForEntity(entityType, entityId),
    [getCommentsForEntity, entityType, entityId]
  )

  const commentCount = comments.length

  return (
    <div className="mt-3 pt-3 border-t border-surface-border">
      {/* Header - always visible */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex items-center gap-2 w-full text-left"
      >
        {isExpanded ? (
          <ChevronDown size={16} className="text-text-muted" />
        ) : (
          <ChevronRight size={16} className="text-text-muted" />
        )}
        <MessageCircle size={16} className="text-text-muted" />
        <span className="text-sm font-medium text-text-primary">Comments</span>
        {commentCount > 0 && (
          <span className="text-xs text-text-muted">({commentCount})</span>
        )}
      </button>

      {/* Expanded content */}
      {isExpanded && (
        <div className="mt-3 pl-6 space-y-3">
          {/* Existing comments */}
          {comments.length > 0 ? (
            <CommentThread
              comments={comments}
              parentId={null}
              entityType={entityType}
              entityId={entityId}
            />
          ) : (
            <p className="text-sm text-text-muted">No comments yet.</p>
          )}

          {/* Add comment button or form */}
          {showForm ? (
            <div className="p-3 bg-surface-overlay rounded border border-surface-border">
              <CommentForm
                entityType={entityType}
                entityId={entityId}
                onSubmit={() => setShowForm(false)}
                onCancel={() => setShowForm(false)}
              />
            </div>
          ) : (
            <button
              onClick={() => setShowForm(true)}
              className="flex items-center gap-1 px-2 py-1 text-xs text-accent-400 hover:text-accent-300 transition-colors"
            >
              <Plus size={14} />
              Add Comment
            </button>
          )}
        </div>
      )}
    </div>
  )
}
