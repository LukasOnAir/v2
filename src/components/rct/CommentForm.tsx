import { useState } from 'react'
import { useCollaborationStore } from '@/stores/collaborationStore'
import { useUIStore } from '@/stores/uiStore'
import type { CommentableEntityType } from '@/types/collaboration'

interface CommentFormProps {
  entityType: CommentableEntityType
  entityId: string
  parentId?: string | null
  onSubmit: () => void
  onCancel?: () => void
}

/**
 * Form for adding new comments or replies
 */
export function CommentForm({
  entityType,
  entityId,
  parentId = null,
  onSubmit,
  onCancel,
}: CommentFormProps) {
  const [content, setContent] = useState('')
  const { selectedRole } = useUIStore()
  const { addComment } = useCollaborationStore()

  const handleSubmit = () => {
    if (!content.trim()) return

    addComment({
      entityType,
      entityId,
      parentId,
      content: content.trim(),
      author: selectedRole,
    })

    setContent('')
    onSubmit()
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && e.ctrlKey) {
      handleSubmit()
    }
  }

  return (
    <div className="space-y-2">
      <textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={parentId ? 'Write a reply...' : 'Add a comment...'}
        autoFocus
        rows={2}
        className="w-full px-2 py-1.5 bg-surface-elevated border border-surface-border rounded text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-1 focus:ring-accent-500 resize-y min-h-[64px]"
      />
      <div className="flex justify-end gap-2">
        {onCancel && (
          <button
            onClick={onCancel}
            className="px-2 py-1 text-xs text-text-secondary hover:text-text-primary transition-colors"
          >
            Cancel
          </button>
        )}
        <button
          onClick={handleSubmit}
          disabled={!content.trim()}
          className="px-2 py-1 text-xs bg-accent-500 text-white rounded hover:bg-accent-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {parentId ? 'Reply' : 'Comment'}
        </button>
      </div>
      <p className="text-xs text-text-muted">Ctrl+Enter to submit</p>
    </div>
  )
}
