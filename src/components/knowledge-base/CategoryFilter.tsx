import { ClipboardCheck, Star, FileText, File, BookOpen } from 'lucide-react'
import { clsx } from 'clsx'
import type { KnowledgeBaseCategory } from '@/types/collaboration'

const CATEGORY_OPTIONS: {
  value: KnowledgeBaseCategory
  label: string
  icon: typeof ClipboardCheck
}[] = [
  { value: 'testing-procedure', label: 'Testing Procedures', icon: ClipboardCheck },
  { value: 'best-practice', label: 'Best Practices', icon: Star },
  { value: 'policy', label: 'Policies', icon: FileText },
  { value: 'template', label: 'Templates', icon: File },
  { value: 'reference', label: 'Reference', icon: BookOpen },
]

interface CategoryFilterProps {
  selected: KnowledgeBaseCategory | null
  onChange: (category: KnowledgeBaseCategory | null) => void
}

/**
 * Category filter chips for knowledge base
 */
export function CategoryFilter({ selected, onChange }: CategoryFilterProps) {
  return (
    <div className="flex flex-wrap gap-2">
      {/* All button */}
      <button
        onClick={() => onChange(null)}
        className={clsx(
          'px-3 py-1.5 rounded-full text-sm font-medium transition-colors',
          selected === null
            ? 'bg-accent-500 text-white'
            : 'bg-surface-overlay text-text-secondary hover:text-text-primary'
        )}
      >
        All
      </button>

      {/* Category buttons */}
      {CATEGORY_OPTIONS.map((option) => (
        <button
          key={option.value}
          onClick={() => onChange(option.value)}
          className={clsx(
            'flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-colors',
            selected === option.value
              ? 'bg-accent-500 text-white'
              : 'bg-surface-overlay text-text-secondary hover:text-text-primary'
          )}
        >
          <option.icon size={14} />
          {option.label}
        </button>
      ))}
    </div>
  )
}
