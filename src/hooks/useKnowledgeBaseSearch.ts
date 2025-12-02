import Fuse from 'fuse.js'
import { useMemo, useState } from 'react'
import type { KnowledgeBaseEntry } from '@/types/collaboration'

interface UseKnowledgeBaseSearchOptions {
  items: KnowledgeBaseEntry[]
  threshold?: number // 0.0 = exact match, 1.0 = anything matches (default 0.3)
}

/**
 * Hook for fuzzy searching knowledge base entries using Fuse.js
 */
export function useKnowledgeBaseSearch({
  items,
  threshold = 0.3,
}: UseKnowledgeBaseSearchOptions) {
  const [query, setQuery] = useState('')

  // Recreate Fuse instance when items change
  const fuse = useMemo(
    () =>
      new Fuse(items, {
        keys: ['title', 'content', 'tags'],
        threshold,
        includeScore: true,
      }),
    [items, threshold]
  )

  // Compute results when query or items change
  const results = useMemo(() => {
    if (!query.trim()) return items
    return fuse.search(query).map((result) => result.item)
  }, [fuse, query, items])

  return { query, setQuery, results }
}
