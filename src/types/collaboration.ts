import type { ControlType } from './rct'

/**
 * CommentableEntityType - Types of entities that can have comments
 */
export type CommentableEntityType = 'risk' | 'process' | 'control' | 'rctRow'

/**
 * Comment - Threaded comment on an entity
 */
export interface Comment {
  /** Unique identifier (nanoid) */
  id: string
  /** Type of entity being commented on */
  entityType: CommentableEntityType
  /** ID of the risk, process, control, or RCT row */
  entityId: string
  /** Parent comment ID for threading (null = top-level comment) */
  parentId: string | null
  /** Comment content */
  content: string
  /** Role who created the comment */
  author: 'risk-manager' | 'control-owner'
  /** ISO timestamp when created */
  createdAt: string
  /** ISO timestamp when edited (if edited) */
  updatedAt?: string
  /** Whether comment has been edited */
  isEdited: boolean
}

/**
 * KnowledgeBaseCategory - Categories for knowledge base articles
 */
export type KnowledgeBaseCategory =
  | 'testing-procedure'
  | 'best-practice'
  | 'policy'
  | 'template'
  | 'reference'

/**
 * KnowledgeBaseEntry - Article in the knowledge base
 */
export interface KnowledgeBaseEntry {
  /** Unique identifier (nanoid) */
  id: string
  /** Article title */
  title: string
  /** Article content (plain text) */
  content: string
  /** Category for organization */
  category: KnowledgeBaseCategory
  /** Free-form tags for filtering */
  tags: string[]
  /** Role who created the article */
  author: string
  /** ISO timestamp when created */
  createdAt: string
  /** ISO timestamp when edited (if edited) */
  updatedAt?: string
  /** Optional link to control types */
  relatedControlTypes?: ControlType[]
}
