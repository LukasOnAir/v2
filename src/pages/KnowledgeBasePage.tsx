import { useState, useMemo } from 'react'
import * as Dialog from '@radix-ui/react-dialog'
import { Plus, Search, X } from 'lucide-react'
import { useCollaborationStore } from '@/stores/collaborationStore'
import { useKnowledgeBaseSearch } from '@/hooks/useKnowledgeBaseSearch'
import { usePermissions } from '@/hooks/usePermissions'
import {
  useKnowledgeBase,
  useCreateKnowledgeBaseEntry,
  useUpdateKnowledgeBaseEntry,
  useDeleteKnowledgeBaseEntry,
} from '@/hooks/useKnowledgeBase'
import {
  CategoryFilter,
  KnowledgeBaseList,
  KnowledgeBaseArticle,
  KnowledgeBaseForm,
} from '@/components/knowledge-base'
import type { KnowledgeBaseEntry, KnowledgeBaseCategory } from '@/types/collaboration'

/**
 * Knowledge Base page with search, filtering, and CRUD
 */
export function KnowledgeBasePage() {
  const { isRiskManager, isDemoMode } = usePermissions()

  // Store data and mutations (demo mode)
  const {
    knowledgeBaseEntries: storeEntries,
    addKnowledgeBaseEntry: storeAdd,
    updateKnowledgeBaseEntry: storeUpdate,
    deleteKnowledgeBaseEntry: storeDelete,
  } = useCollaborationStore()

  // Database data and mutations (authenticated mode)
  const { data: dbEntries, isLoading } = useKnowledgeBase()
  const { mutate: dbAdd } = useCreateKnowledgeBaseEntry()
  const { mutate: dbUpdate } = useUpdateKnowledgeBaseEntry()
  const { mutate: dbDelete } = useDeleteKnowledgeBaseEntry()

  // Dual-source selection
  const knowledgeBaseEntries = isDemoMode ? storeEntries : (dbEntries || [])

  // State
  const [selectedCategory, setSelectedCategory] = useState<KnowledgeBaseCategory | null>(null)
  const [selectedEntry, setSelectedEntry] = useState<KnowledgeBaseEntry | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [editingEntry, setEditingEntry] = useState<KnowledgeBaseEntry | null>(null)

  // Search with Fuse.js
  const { query, setQuery, results } = useKnowledgeBaseSearch({
    items: knowledgeBaseEntries,
  })

  // Filter by category
  const filteredEntries = useMemo(() => {
    if (!selectedCategory) return results
    return results.filter((entry) => entry.category === selectedCategory)
  }, [results, selectedCategory])

  // Handlers
  const handleCreateEntry = (data: Omit<KnowledgeBaseEntry, 'id' | 'createdAt'>) => {
    if (isDemoMode) {
      storeAdd(data)
    } else {
      dbAdd(data)
    }
    setShowForm(false)
  }

  const handleUpdateEntry = (data: Omit<KnowledgeBaseEntry, 'id' | 'createdAt'>) => {
    if (!editingEntry) return
    if (isDemoMode) {
      storeUpdate(editingEntry.id, data)
    } else {
      dbUpdate({ id: editingEntry.id, updates: data })
    }
    setShowForm(false)
    setEditingEntry(null)
  }

  const handleDeleteEntry = (entryId: string) => {
    if (isDemoMode) {
      storeDelete(entryId)
    } else {
      dbDelete(entryId)
    }
    setSelectedEntry(null)
  }

  const handleEdit = () => {
    if (!selectedEntry) return
    setEditingEntry(selectedEntry)
    setShowForm(true)
    setSelectedEntry(null)
  }

  // Handle loading state (authenticated mode only)
  if (!isDemoMode && isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold text-text-primary">Knowledge Base</h1>
        </div>
        <div className="flex items-center justify-center p-8">
          <div className="animate-spin rounded-full h-8 w-8 border-2 border-accent-500 border-t-transparent" />
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-text-primary">Knowledge Base</h1>
        {isRiskManager && (
          <button
            onClick={() => {
              setEditingEntry(null)
              setShowForm(true)
            }}
            className="flex items-center gap-2 px-4 py-2 bg-accent-500 text-white rounded-lg font-medium hover:bg-accent-600 transition-colors"
          >
            <Plus size={16} />
            New Article
          </button>
        )}
      </div>

      {/* Search and filters */}
      <section className="space-y-4">
        {/* Search input */}
        <div className="relative">
          <Search
            size={16}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted"
          />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search articles..."
            className="w-full pl-10 pr-4 py-2 bg-surface-elevated border border-surface-border rounded-lg text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-accent-500"
          />
        </div>

        {/* Category filter */}
        <CategoryFilter selected={selectedCategory} onChange={setSelectedCategory} />
      </section>

      {/* Results count */}
      <p className="text-sm text-text-muted">
        Showing {filteredEntries.length} of {knowledgeBaseEntries.length} articles
      </p>

      {/* Article list or detail view */}
      <section className="bg-surface-elevated rounded-lg border border-surface-border">
        {selectedEntry ? (
          <KnowledgeBaseArticle
            entry={selectedEntry}
            onClose={() => setSelectedEntry(null)}
            onEdit={handleEdit}
            onDelete={() => handleDeleteEntry(selectedEntry.id)}
            canEdit={isRiskManager}
          />
        ) : (
          <KnowledgeBaseList entries={filteredEntries} onSelect={setSelectedEntry} />
        )}
      </section>

      {/* Create/Edit form dialog */}
      <Dialog.Root open={showForm} onOpenChange={(open) => !open && setShowForm(false)}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 bg-black/60 z-40" />
          <Dialog.Content className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-2xl max-h-[85vh] overflow-auto bg-surface-elevated border border-surface-border rounded-lg shadow-xl z-50">
            <div className="flex items-center justify-between p-4 border-b border-surface-border">
              <Dialog.Title className="text-lg font-semibold text-text-primary">
                {editingEntry ? 'Edit Article' : 'New Article'}
              </Dialog.Title>
              <Dialog.Close asChild>
                <button className="p-2 rounded hover:bg-surface-overlay transition-colors">
                  <X size={20} className="text-text-secondary" />
                </button>
              </Dialog.Close>
            </div>
            <div className="p-4">
              <KnowledgeBaseForm
                entry={editingEntry ?? undefined}
                onSubmit={editingEntry ? handleUpdateEntry : handleCreateEntry}
                onCancel={() => {
                  setShowForm(false)
                  setEditingEntry(null)
                }}
              />
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </div>
  )
}
