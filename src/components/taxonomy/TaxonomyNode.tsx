import { useState, useRef, useEffect, useMemo } from 'react'
import { NodeRendererProps, NodeApi } from 'react-arborist'
import { ChevronRight, ChevronDown, Plus, Trash2, Clock } from 'lucide-react'
import clsx from 'clsx'
import type { TaxonomyItem } from '@/types/taxonomy'
import type { PendingChange } from '@/types/approval'
import { usePermissions } from '@/hooks/usePermissions'
import { WeightBadge } from './WeightBadge'
import { useTaxonomyStore } from '@/stores/taxonomyStore'

/**
 * Compute positional ID from react-arborist node by walking up the parent chain.
 * Uses childIndex (0-based) to compute 1-based positional IDs like "1", "1.2", "1.2.3".
 */
function computePositionalId<T>(node: NodeApi<T>): string {
  const positions: number[] = []
  let current: NodeApi<T> | null = node

  // Walk up the tree collecting each node's position among siblings
  // Stop when we reach the tree's virtual root (parent.parent is null)
  while (current && current.parent) {
    // childIndex is 0-based, convert to 1-based for display
    positions.unshift(current.childIndex + 1)
    current = current.parent
  }

  return positions.join('.')
}

/** Level-based colors for visual hierarchy (5 levels) */
const LEVEL_COLORS = [
  'border-l-blue-500',
  'border-l-emerald-500',
  'border-l-amber-500',
  'border-l-purple-500',
  'border-l-rose-500',
]

interface TaxonomyNodeProps extends NodeRendererProps<TaxonomyItem> {
  /** Callback to add a child item */
  onAddChild?: (parentId: string) => void
  /** Whether to show hierarchical IDs */
  showIds?: boolean
  /** Whether to show descriptions */
  showDescriptions?: boolean
  /** Callback when description changes */
  onDescriptionChange?: (id: string, description: string) => void
  /** Taxonomy type for weight lookups */
  taxonomyType?: 'risk' | 'process'
  /** Whether to show weight badges */
  showWeights?: boolean
  /** Function to get pending changes for an entity */
  getPendingForEntity?: (entityId: string) => PendingChange[]
}

export function TaxonomyNode({
  node,
  style,
  dragHandle,
  tree,
  onAddChild,
  showIds = true,
  showDescriptions = true,
  onDescriptionChange,
  taxonomyType,
  showWeights = false,
  getPendingForEntity,
}: TaxonomyNodeProps) {
  const [isEditingDescription, setIsEditingDescription] = useState(false)
  const [localDescription, setLocalDescription] = useState(node.data.description)
  const descriptionInputRef = useRef<HTMLTextAreaElement>(null)
  const { canEditTaxonomies } = usePermissions()

  // Weight management
  const { getEffectiveWeight, setNodeWeight, riskWeights, processWeights } = useTaxonomyStore()
  const taxonomyWeights = taxonomyType === 'risk' ? riskWeights : processWeights

  // Get effective weight for this node (level is 0-indexed in react-arborist, weights use 1-5)
  const nodeLevel = node.level + 1
  const effectiveWeight = taxonomyType ? getEffectiveWeight(taxonomyType, node.id, nodeLevel) : 1
  const hasOverride = taxonomyType ? node.id in taxonomyWeights.nodeOverrides : false

  const handleWeightChange = (value: number) => {
    if (taxonomyType) {
      setNodeWeight(taxonomyType, node.id, value)
    }
  }

  const handleWeightClear = () => {
    if (taxonomyType) {
      setNodeWeight(taxonomyType, node.id, null)
    }
  }

  // Check for pending approval changes on this node
  const pendingChanges = getPendingForEntity?.(node.id) ?? []
  const hasPendingChanges = pendingChanges.length > 0

  // Compute positional ID from tree structure (e.g., "1", "1.2", "1.2.3")
  // This replaces the broken hierarchicalId field which shows "1" for all items
  const positionalId = useMemo(() => computePositionalId(node), [node])

  // Determine level color (cycle through colors for levels > 5)
  const levelIndex = Math.min(node.level, LEVEL_COLORS.length - 1)
  const levelColor = LEVEL_COLORS[levelIndex]

  // Focus description input when entering edit mode
  useEffect(() => {
    if (isEditingDescription && descriptionInputRef.current) {
      descriptionInputRef.current.focus()
      descriptionInputRef.current.select()
    }
  }, [isEditingDescription])

  // Sync local description with node data when it changes externally
  useEffect(() => {
    setLocalDescription(node.data.description)
  }, [node.data.description])

  const handleDescriptionSubmit = () => {
    if (onDescriptionChange && localDescription !== node.data.description) {
      onDescriptionChange(node.id, localDescription)
    }
    setIsEditingDescription(false)
  }

  const handleDescriptionKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    // Stop propagation for all keys to prevent tree navigation while typing
    e.stopPropagation()

    if (e.key === 'Enter') {
      handleDescriptionSubmit()
    } else if (e.key === 'Escape') {
      setLocalDescription(node.data.description)
      setIsEditingDescription(false)
    }
  }

  const handleAddChild = (e: React.MouseEvent) => {
    e.stopPropagation()
    // Check max depth (5 levels, 0-indexed = level 4 max)
    if (node.level >= 4) {
      return // Can't add more than 5 levels deep
    }
    onAddChild?.(node.id)
  }

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation()
    tree.delete(node.id)
  }

  return (
    <div
      ref={dragHandle}
      style={style}
      className={clsx(
        'group flex items-start gap-2 px-2 py-1.5 border-l-4 rounded-r-sm',
        'cursor-pointer select-none',
        'hover:bg-surface-elevated transition-colors',
        levelColor,
        node.isSelected && 'bg-surface-elevated ring-1 ring-accent-500/50',
        node.willReceiveDrop && 'bg-accent-500/10 ring-1 ring-accent-500',
        hasPendingChanges && 'bg-amber-500/10'
      )}
      onClick={() => node.isInternal && node.toggle()}
    >
      {/* Expand/collapse chevron */}
      <span className="w-5 flex-shrink-0 pt-0.5">
        {node.isInternal ? (
          <button
            onClick={(e) => {
              e.stopPropagation()
              node.toggle()
            }}
            className="p-0.5 hover:bg-surface-overlay rounded transition-colors"
          >
            {node.isOpen ? (
              <ChevronDown size={16} className="text-text-secondary" />
            ) : (
              <ChevronRight size={16} className="text-text-secondary" />
            )}
          </button>
        ) : null}
      </span>

      {/* Positional ID badge - computed from tree structure */}
      {showIds && (
        <span className="text-xs font-mono text-text-muted min-w-[3rem] flex-shrink-0 pt-0.5">
          {positionalId}
        </span>
      )}

      {/* Weight badge */}
      {showWeights && taxonomyType && (
        <WeightBadge
          value={effectiveWeight}
          isOverride={hasOverride}
          onChange={handleWeightChange}
          onClear={hasOverride ? handleWeightClear : undefined}
          disabled={!canEditTaxonomies}
        />
      )}

      {/* Name and Description container */}
      <div className="flex-1 min-w-0 flex flex-col gap-0.5">
        {/* Name - editable on double click */}
        <div className="flex-shrink-0">
          {node.isEditing ? (
            <input
              autoFocus
              className={clsx(
                'w-full px-2 py-0.5 rounded',
                'bg-surface-overlay border border-surface-border',
                'text-text-primary text-sm',
                'focus:outline-none focus:ring-1 focus:ring-accent-500'
              )}
              defaultValue={node.data.name}
              onFocus={(e) => e.target.select()}
              onBlur={(e) => node.submit(e.target.value)}
              onKeyDown={(e) => {
                // Stop propagation for all keys to prevent tree navigation while typing
                e.stopPropagation()
                if (e.key === 'Enter') {
                  node.submit(e.currentTarget.value)
                } else if (e.key === 'Escape') {
                  node.reset()
                }
              }}
              onClick={(e) => e.stopPropagation()}
            />
          ) : (
            <span className="flex items-center gap-2">
              <span
                className={clsx(
                  'text-sm text-text-primary',
                  canEditTaxonomies && 'cursor-text'
                )}
                onDoubleClick={(e) => {
                  e.stopPropagation()
                  if (canEditTaxonomies) {
                    node.edit()
                  }
                }}
              >
                {node.data.name || 'Untitled'}
              </span>
              {hasPendingChanges && (
                <span
                  className="inline-flex items-center gap-1 px-1.5 py-0.5 text-xs font-medium rounded bg-amber-500/20 text-amber-400"
                  title={`${pendingChanges.length} pending change${pendingChanges.length > 1 ? 's' : ''}`}
                >
                  <Clock size={10} />
                  Pending
                </span>
              )}
            </span>
          )}
        </div>

        {/* Description - separate inline edit, wraps to multiple lines */}
        {showDescriptions && (
          <div className="min-w-0">
            {isEditingDescription ? (
              <textarea
                ref={descriptionInputRef}
                className={clsx(
                  'w-full px-2 py-0.5 rounded resize-none',
                  'bg-surface-overlay border border-surface-border',
                  'text-text-secondary text-xs',
                  'focus:outline-none focus:ring-1 focus:ring-accent-500'
                )}
                rows={2}
                value={localDescription}
                onChange={(e) => setLocalDescription(e.target.value)}
                onBlur={handleDescriptionSubmit}
                onKeyDown={(e) => {
                  // Stop propagation for all keys to prevent tree navigation while typing
                  e.stopPropagation()
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault()
                    handleDescriptionSubmit()
                  } else if (e.key === 'Escape') {
                    setLocalDescription(node.data.description)
                    setIsEditingDescription(false)
                  }
                }}
                onClick={(e) => e.stopPropagation()}
                placeholder="Add description..."
              />
            ) : (
              <span
                className={clsx(
                  'text-xs text-text-muted italic block whitespace-pre-wrap break-words leading-relaxed',
                  canEditTaxonomies && 'cursor-text'
                )}
                onClick={(e) => {
                  e.stopPropagation()
                  if (canEditTaxonomies) {
                    setIsEditingDescription(true)
                  }
                }}
              >
                {node.data.description || 'No description'}
              </span>
            )}
          </div>
        )}
      </div>

      {/* Action buttons - visible on hover (only for Risk Manager) */}
      {canEditTaxonomies && (
        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0 pt-0.5">
          {/* Add child button (only if under max depth) */}
          {node.level < 4 && (
            <button
              onClick={handleAddChild}
              className={clsx(
                'p-1 rounded transition-colors',
                'hover:bg-accent-500/20 text-text-muted hover:text-accent-400'
              )}
              title="Add child item"
            >
              <Plus size={14} />
            </button>
          )}
          {/* Delete button */}
          <button
            onClick={handleDelete}
            className={clsx(
              'p-1 rounded transition-colors',
              'hover:bg-rose-500/20 text-text-muted hover:text-rose-400'
            )}
            title="Delete item"
          >
            <Trash2 size={14} />
          </button>
        </div>
      )}
    </div>
  )
}
