import { useState, useEffect } from 'react'
import { useUIStore } from '@/stores/uiStore'
import type { KnowledgeBaseEntry, KnowledgeBaseCategory } from '@/types/collaboration'
import type { ControlType } from '@/types/rct'

const CATEGORY_OPTIONS: { value: KnowledgeBaseCategory; label: string }[] = [
  { value: 'testing-procedure', label: 'Testing Procedure' },
  { value: 'best-practice', label: 'Best Practice' },
  { value: 'policy', label: 'Policy' },
  { value: 'template', label: 'Template' },
  { value: 'reference', label: 'Reference' },
]

const CONTROL_TYPE_OPTIONS: ControlType[] = [
  'Preventative',
  'Detective',
  'Corrective',
  'Directive',
  'Deterrent',
  'Compensating',
  'Acceptance',
  'Tolerance',
  'Manual',
  'Automated',
]

interface KnowledgeBaseFormProps {
  entry?: KnowledgeBaseEntry
  onSubmit: (data: Omit<KnowledgeBaseEntry, 'id' | 'createdAt'>) => void
  onCancel: () => void
}

/**
 * Form for creating/editing knowledge base entries
 */
export function KnowledgeBaseForm({ entry, onSubmit, onCancel }: KnowledgeBaseFormProps) {
  const { selectedRole } = useUIStore()

  const [title, setTitle] = useState(entry?.title ?? '')
  const [category, setCategory] = useState<KnowledgeBaseCategory>(
    entry?.category ?? 'best-practice'
  )
  const [tags, setTags] = useState(entry?.tags.join(', ') ?? '')
  const [content, setContent] = useState(entry?.content ?? '')
  const [relatedControlTypes, setRelatedControlTypes] = useState<ControlType[]>(
    entry?.relatedControlTypes ?? []
  )

  // Reset form when entry changes
  useEffect(() => {
    if (entry) {
      setTitle(entry.title)
      setCategory(entry.category)
      setTags(entry.tags.join(', '))
      setContent(entry.content)
      setRelatedControlTypes(entry.relatedControlTypes ?? [])
    }
  }, [entry])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim() || !content.trim()) return

    onSubmit({
      title: title.trim(),
      category,
      tags: tags
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean),
      content: content.trim(),
      author: selectedRole,
      relatedControlTypes: relatedControlTypes.length > 0 ? relatedControlTypes : undefined,
    })
  }

  const toggleControlType = (type: ControlType) => {
    setRelatedControlTypes((prev) =>
      prev.includes(type) ? prev.filter((t) => t !== type) : [...prev, type]
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Title */}
      <div>
        <label className="block text-sm font-medium text-text-primary mb-1">
          Title <span className="text-red-400">*</span>
        </label>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Article title..."
          required
          className="w-full px-3 py-2 bg-surface-elevated border border-surface-border rounded text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-accent-500"
        />
      </div>

      {/* Category */}
      <div>
        <label className="block text-sm font-medium text-text-primary mb-1">
          Category
        </label>
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value as KnowledgeBaseCategory)}
          className="w-full px-3 py-2 bg-surface-elevated border border-surface-border rounded text-text-primary focus:outline-none focus:ring-2 focus:ring-accent-500"
        >
          {CATEGORY_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value} className="bg-surface-elevated">
              {opt.label}
            </option>
          ))}
        </select>
      </div>

      {/* Tags */}
      <div>
        <label className="block text-sm font-medium text-text-primary mb-1">
          Tags
        </label>
        <input
          type="text"
          value={tags}
          onChange={(e) => setTags(e.target.value)}
          placeholder="Comma-separated tags (e.g., testing, controls, audit)"
          className="w-full px-3 py-2 bg-surface-elevated border border-surface-border rounded text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-accent-500"
        />
        <p className="text-xs text-text-muted mt-1">Separate tags with commas</p>
      </div>

      {/* Content */}
      <div>
        <label className="block text-sm font-medium text-text-primary mb-1">
          Content <span className="text-red-400">*</span>
        </label>
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Write your article content..."
          required
          rows={8}
          className="w-full px-3 py-2 bg-surface-elevated border border-surface-border rounded text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-accent-500 resize-y min-h-[200px]"
        />
      </div>

      {/* Related Control Types */}
      <div>
        <label className="block text-sm font-medium text-text-primary mb-2">
          Related Control Types (optional)
        </label>
        <div className="flex flex-wrap gap-2">
          {CONTROL_TYPE_OPTIONS.map((type) => (
            <button
              key={type}
              type="button"
              onClick={() => toggleControlType(type)}
              className={`px-2 py-1 text-xs rounded transition-colors ${
                relatedControlTypes.includes(type)
                  ? 'bg-accent-500 text-white'
                  : 'bg-surface-overlay text-text-secondary hover:text-text-primary'
              }`}
            >
              {type}
            </button>
          ))}
        </div>
      </div>

      {/* Actions */}
      <div className="flex justify-end gap-3 pt-4 border-t border-surface-border">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 text-sm text-text-secondary hover:text-text-primary transition-colors"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={!title.trim() || !content.trim()}
          className="px-4 py-2 text-sm bg-accent-500 text-white rounded hover:bg-accent-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {entry ? 'Update' : 'Create'}
        </button>
      </div>
    </form>
  )
}
