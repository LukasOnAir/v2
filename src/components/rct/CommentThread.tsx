import { useState } from 'react'
import { Reply, Edit2, Trash2 } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { useCollaborationStore } from '@/stores/collaborationStore'
import { useUIStore } from '@/stores/uiStore'
import { CommentForm } from './CommentForm'
import type { Comment, CommentableEntityType } from '@/types/collaboration'

const MAX_DEPTH = 3

interface CommentThreadProps {
  comments: Comment[]
  parentId: string | null
  entityType: CommentableEntityType
  entityId: string
  depth?: number
}

/**
 * Recursive component for rendering threaded comments
 */
export function CommentThread({
  comments,
  parentId,
  entityType,
  entityId,
  depth = 0,
}: CommentThreadProps) {
  // Filter comments for this level
  const levelComments = comments
    .filter((c) => c.parentId === parentId)
    .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())

  if (levelComments.length === 0) return null

  return (
    <div className={depth > 0 ? 'ml-6 pl-4 border-l border-surface-border' : ''}>
      {levelComments.map((comment) => (
        <div key={comment.id} className="py-2">
          <CommentItem
            comment={comment}
            entityType={entityType}
            entityId={entityId}
            allComments={comments}
            depth={depth}
          />
        </div>
      ))}
    </div>
  )
}

interface CommentItemProps {
  comment: Comment
  entityType: CommentableEntityType
  entityId: string
  allComments: Comment[]
  depth: number
}

function CommentItem({
  comment,
  entityType,
  entityId,
  allComments,
  depth,
}: CommentItemProps) {
  const [isReplying, setIsReplying] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [editContent, setEditContent] = useState(comment.content)

  const { selectedRole } = useUIStore()
  const { updateComment, deleteComment } = useCollaborationStore()

  const isOwnComment = comment.author === selectedRole
  const isRiskManager = selectedRole === 'risk-manager'
  const canDelete = isOwnComment || isRiskManager
  const canEdit = isOwnComment

  // Check if this comment has replies
  const hasReplies = allComments.some((c) => c.parentId === comment.id)

  const handleSaveEdit = () => {
    if (!editContent.trim()) return
    updateComment(comment.id, editContent.trim())
    setIsEditing(false)
  }

  const handleDelete = () => {
    const message = hasReplies
      ? 'This comment has replies. Deleting it will also delete all replies. Are you sure?'
      : 'Are you sure you want to delete this comment?'

    if (window.confirm(message)) {
      deleteComment(comment.id)
    }
  }

  return (
    <div className="space-y-2">
      {/* Author and timestamp */}
      <div className="flex items-center gap-2">
        <span
          className={`text-xs font-medium px-1.5 py-0.5 rounded ${
            comment.author === 'risk-manager'
              ? 'bg-accent-500/20 text-accent-400'
              : 'bg-blue-500/20 text-blue-400'
          }`}
        >
          {comment.author === 'risk-manager' ? 'Risk Manager' : 'Control Owner'}
        </span>
        <span className="text-xs text-text-muted">
          {formatDistanceToNow(new Date(comment.createdAt), { addSuffix: true })}
        </span>
        {comment.isEdited && (
          <span className="text-xs text-text-muted italic">(edited)</span>
        )}
      </div>

      {/* Content or edit form */}
      {isEditing ? (
        <div className="space-y-2">
          <textarea
            value={editContent}
            onChange={(e) => setEditContent(e.target.value)}
            autoFocus
            rows={2}
            className="w-full px-2 py-1.5 bg-surface-elevated border border-surface-border rounded text-sm text-text-primary focus:outline-none focus:ring-1 focus:ring-accent-500 resize-y min-h-[48px]"
          />
          <div className="flex gap-2">
            <button
              onClick={() => setIsEditing(false)}
              className="px-2 py-1 text-xs text-text-secondary hover:text-text-primary transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSaveEdit}
              disabled={!editContent.trim()}
              className="px-2 py-1 text-xs bg-accent-500 text-white rounded hover:bg-accent-600 transition-colors disabled:opacity-50"
            >
              Save
            </button>
          </div>
        </div>
      ) : (
        <p className="text-sm text-text-primary whitespace-pre-wrap">{comment.content}</p>
      )}

      {/* Actions */}
      {!isEditing && (
        <div className="flex items-center gap-3">
          {depth < MAX_DEPTH && (
            <button
              onClick={() => setIsReplying(!isReplying)}
              className="flex items-center gap-1 text-xs text-text-muted hover:text-text-primary transition-colors"
            >
              <Reply size={12} />
              Reply
            </button>
          )}
          {canEdit && (
            <button
              onClick={() => {
                setEditContent(comment.content)
                setIsEditing(true)
              }}
              className="flex items-center gap-1 text-xs text-text-muted hover:text-text-primary transition-colors"
            >
              <Edit2 size={12} />
              Edit
            </button>
          )}
          {canDelete && (
            <button
              onClick={handleDelete}
              className="flex items-center gap-1 text-xs text-text-muted hover:text-red-400 transition-colors"
            >
              <Trash2 size={12} />
              Delete
            </button>
          )}
        </div>
      )}

      {/* Reply form */}
      {isReplying && (
        <div className="mt-2 ml-4">
          <CommentForm
            entityType={entityType}
            entityId={entityId}
            parentId={comment.id}
            onSubmit={() => setIsReplying(false)}
            onCancel={() => setIsReplying(false)}
          />
        </div>
      )}

      {/* Nested replies */}
      {depth < MAX_DEPTH && (
        <CommentThread
          comments={allComments}
          parentId={comment.id}
          entityType={entityType}
          entityId={entityId}
          depth={depth + 1}
        />
      )}
    </div>
  )
}
