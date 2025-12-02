import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import { immer } from 'zustand/middleware/immer'
import { nanoid } from 'nanoid'
import type {
  Comment,
  CommentableEntityType,
  KnowledgeBaseCategory,
  KnowledgeBaseEntry,
} from '@/types/collaboration'

interface CollaborationState {
  /** All comments */
  comments: Comment[]
  /** All knowledge base entries */
  knowledgeBaseEntries: KnowledgeBaseEntry[]

  // Comment actions
  /**
   * Add a new comment
   * @returns The new comment's ID
   */
  addComment: (
    comment: Omit<Comment, 'id' | 'createdAt' | 'isEdited'>
  ) => string

  /**
   * Update an existing comment's content
   */
  updateComment: (commentId: string, content: string) => void

  /**
   * Delete a comment and all its replies (cascade delete)
   */
  deleteComment: (commentId: string) => void

  /**
   * Get all comments for a specific entity, sorted oldest first
   */
  getCommentsForEntity: (
    entityType: CommentableEntityType,
    entityId: string
  ) => Comment[]

  // Knowledge base actions
  /**
   * Add a new knowledge base entry
   * @returns The new entry's ID
   */
  addKnowledgeBaseEntry: (
    entry: Omit<KnowledgeBaseEntry, 'id' | 'createdAt'>
  ) => string

  /**
   * Update an existing knowledge base entry
   */
  updateKnowledgeBaseEntry: (
    entryId: string,
    updates: Partial<Omit<KnowledgeBaseEntry, 'id' | 'createdAt'>>
  ) => void

  /**
   * Delete a knowledge base entry
   */
  deleteKnowledgeBaseEntry: (entryId: string) => void

  /**
   * Get entries by category
   */
  getEntriesByCategory: (category: KnowledgeBaseCategory) => KnowledgeBaseEntry[]

  /**
   * Get entries by tag
   */
  getEntriesByTag: (tag: string) => KnowledgeBaseEntry[]

  // Bulk setters for mock data loading
  setComments: (comments: Comment[]) => void
  setKnowledgeBaseEntries: (entries: KnowledgeBaseEntry[]) => void
}

/**
 * Helper to get all descendant comment IDs (for cascade delete)
 */
function getDescendantIds(comments: Comment[], parentId: string): string[] {
  const descendants: string[] = []
  const directChildren = comments.filter((c) => c.parentId === parentId)
  for (const child of directChildren) {
    descendants.push(child.id)
    descendants.push(...getDescendantIds(comments, child.id))
  }
  return descendants
}

export const useCollaborationStore = create<CollaborationState>()(
  persist(
    immer((set, get) => ({
      comments: [],
      knowledgeBaseEntries: [],

      addComment: (comment) => {
        const id = nanoid()
        set((state) => {
          const newComment: Comment = {
            ...comment,
            id,
            createdAt: new Date().toISOString(),
            isEdited: false,
          }
          state.comments.push(newComment)
        })
        return id
      },

      updateComment: (commentId, content) =>
        set((state) => {
          const comment = state.comments.find((c) => c.id === commentId)
          if (comment) {
            comment.content = content
            comment.updatedAt = new Date().toISOString()
            comment.isEdited = true
          }
        }),

      deleteComment: (commentId) =>
        set((state) => {
          // Get all descendant IDs to cascade delete
          const descendantIds = getDescendantIds(state.comments, commentId)
          const idsToDelete = new Set([commentId, ...descendantIds])
          state.comments = state.comments.filter((c) => !idsToDelete.has(c.id))
        }),

      getCommentsForEntity: (entityType, entityId) => {
        return get()
          .comments.filter(
            (c) => c.entityType === entityType && c.entityId === entityId
          )
          .sort(
            (a, b) =>
              new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
          )
      },

      addKnowledgeBaseEntry: (entry) => {
        const id = nanoid()
        set((state) => {
          const newEntry: KnowledgeBaseEntry = {
            ...entry,
            id,
            createdAt: new Date().toISOString(),
          }
          state.knowledgeBaseEntries.push(newEntry)
        })
        return id
      },

      updateKnowledgeBaseEntry: (entryId, updates) =>
        set((state) => {
          const entry = state.knowledgeBaseEntries.find((e) => e.id === entryId)
          if (entry) {
            Object.assign(entry, updates)
            entry.updatedAt = new Date().toISOString()
          }
        }),

      deleteKnowledgeBaseEntry: (entryId) =>
        set((state) => {
          state.knowledgeBaseEntries = state.knowledgeBaseEntries.filter(
            (e) => e.id !== entryId
          )
        }),

      getEntriesByCategory: (category) => {
        return get().knowledgeBaseEntries.filter((e) => e.category === category)
      },

      getEntriesByTag: (tag) => {
        return get().knowledgeBaseEntries.filter((e) =>
          e.tags.includes(tag)
        )
      },

      // Bulk setters for mock data loading
      setComments: (comments) =>
        set((state) => {
          state.comments = comments
        }),

      setKnowledgeBaseEntries: (entries) =>
        set((state) => {
          state.knowledgeBaseEntries = entries
        }),
    })),
    {
      name: 'riskguard-collaboration',
      storage: createJSONStorage(() => localStorage),
    }
  )
)
