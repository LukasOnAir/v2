import { useRef, forwardRef, useImperativeHandle, useCallback, useState } from 'react'
import { Tree, TreeApi, CreateHandler, RenameHandler, MoveHandler, DeleteHandler } from 'react-arborist'
import { UseMutationResult } from '@tanstack/react-query'
import { TaxonomyNode } from './TaxonomyNode'
import type { TaxonomyItem } from '@/types/taxonomy'
import type { TaxonomyNode as DBTaxonomyNode } from '@/lib/supabase/types'
import { useTaxonomyStore } from '@/stores/taxonomyStore'
import { useApprovalStore } from '@/stores/approvalStore'
import { useApprovalAwareTaxonomy } from '@/hooks/useApprovalAwareTaxonomy'

/** Tree methods exposed via ref */
export interface TaxonomyTreeRef {
  expandAll: () => void
  collapseAll: () => void
  createAtRoot: () => void
}

/** Type for add mutation hook result */
type AddMutationType = UseMutationResult<
  DBTaxonomyNode,
  Error,
  { name: string; description?: string; parentId?: string | null; sortOrder?: number }
>

/** Type for update mutation hook result */
type UpdateMutationType = UseMutationResult<
  DBTaxonomyNode,
  Error,
  { id: string; name?: string; description?: string; parentId?: string | null; sortOrder?: number }
>

/** Type for delete mutation hook result */
type DeleteMutationType = UseMutationResult<void, Error, string>

interface TaxonomyTreeProps {
  /** Which taxonomy to display */
  type: 'risks' | 'processes'
  /** Taxonomy data (from database or store) */
  data?: TaxonomyItem[]
  /** Search term to filter/highlight items */
  searchTerm?: string
  /** Whether to show hierarchical IDs */
  showIds?: boolean
  /** Whether to show descriptions */
  showDescriptions?: boolean
  /** Height of the tree container */
  height?: number
  /** Whether to show weight badges */
  showWeights?: boolean
  /** Whether running in demo mode (use localStorage store) */
  isDemoMode?: boolean
  /** Database add mutation (when authenticated) */
  addMutation?: AddMutationType
  /** Database update mutation (when authenticated) */
  updateMutation?: UpdateMutationType
  /** Database delete mutation (when authenticated) */
  deleteMutation?: DeleteMutationType
}

/**
 * TaxonomyTree - Tree wrapper using react-arborist
 *
 * Provides full CRUD functionality for hierarchical taxonomy items:
 * - Create: Add new items at any level (up to 5 deep)
 * - Rename: Double-click to edit name inline
 * - Move: Drag and drop to reorder or reparent
 * - Delete: Remove items via trash icon
 *
 * Hierarchical IDs are auto-regenerated on every structure change.
 */
export const TaxonomyTree = forwardRef<TaxonomyTreeRef, TaxonomyTreeProps>(
  function TaxonomyTree(
    {
      type,
      data: propData,
      searchTerm = '',
      showIds = true,
      showDescriptions = true,
      height = 500,
      showWeights = false,
      isDemoMode = true,
      addMutation,
      updateMutation,
      deleteMutation,
    },
    ref
  ) {
    const treeRef = useRef<TreeApi<TaxonomyItem>>(null)
    const [notification, setNotification] = useState<string | null>(null)

    // Get store data and setters based on type (for demo mode)
    const storeRisks = useTaxonomyStore((state) => state.risks)
    const storeProcesses = useTaxonomyStore((state) => state.processes)
    const setRisks = useTaxonomyStore((state) => state.setRisks)
    const setProcesses = useTaxonomyStore((state) => state.setProcesses)

    // Use data from props (which comes from either DB or store depending on auth state)
    // Fall back to store data for backwards compatibility
    const storeData = type === 'risks' ? storeRisks : storeProcesses
    const data = propData ?? storeData
    const setData = type === 'risks' ? setRisks : setProcesses

    // Approval integration
    const getPendingForEntity = useApprovalStore((state) => state.getPendingForEntity)
    const {
      renameTaxonomyItemWithApproval,
      deleteTaxonomyItemWithApproval,
      addTaxonomyItemWithApproval,
      updateDescriptionWithApproval,
    } = useApprovalAwareTaxonomy()
    const taxonomyType = type === 'risks' ? 'risk' : 'process'

    // Show notification temporarily
    const showNotification = useCallback((message: string) => {
      setNotification(message)
      setTimeout(() => setNotification(null), 3000)
    }, [])

    // Expose tree methods via ref
    useImperativeHandle(ref, () => ({
      expandAll: () => treeRef.current?.openAll(),
      collapseAll: () => treeRef.current?.closeAll(),
      createAtRoot: () => treeRef.current?.create({ parentId: null, index: data.length }),
    }))

    // Helper to recursively find and update an item
    const updateItemInTree = useCallback(
      (
        items: TaxonomyItem[],
        id: string,
        updater: (item: TaxonomyItem) => TaxonomyItem
      ): TaxonomyItem[] => {
        return items.map((item) => {
          if (item.id === id) {
            return updater(item)
          }
          if (item.children) {
            return {
              ...item,
              children: updateItemInTree(item.children, id, updater),
            }
          }
          return item
        })
      },
      []
    )

    // Helper to add item to parent or root
    const addItemToTree = useCallback(
      (
        items: TaxonomyItem[],
        parentId: string | null,
        newItem: TaxonomyItem,
        index: number
      ): TaxonomyItem[] => {
        if (parentId === null) {
          // Add to root
          const result = [...items]
          result.splice(index, 0, newItem)
          return result
        }

        return items.map((item) => {
          if (item.id === parentId) {
            const children = item.children ? [...item.children] : []
            children.splice(index, 0, newItem)
            return { ...item, children }
          }
          if (item.children) {
            return {
              ...item,
              children: addItemToTree(item.children, parentId, newItem, index),
            }
          }
          return item
        })
      },
      []
    )

    // Helper to remove items from tree
    const removeItemsFromTree = useCallback(
      (items: TaxonomyItem[], idsToRemove: string[]): TaxonomyItem[] => {
        return items
          .filter((item) => !idsToRemove.includes(item.id))
          .map((item) => {
            if (item.children) {
              return {
                ...item,
                children: removeItemsFromTree(item.children, idsToRemove),
              }
            }
            return item
          })
      },
      []
    )

    // Helper to flatten tree for finding parent
    const flattenTree = useCallback(
      (
        items: TaxonomyItem[],
        parentId: string | null = null
      ): Array<{ item: TaxonomyItem; parentId: string | null }> => {
        const result: Array<{ item: TaxonomyItem; parentId: string | null }> = []
        for (const item of items) {
          result.push({ item, parentId })
          if (item.children) {
            result.push(...flattenTree(item.children, item.id))
          }
        }
        return result
      },
      []
    )

    // Create handler - adds new item when user creates via UI
    const handleCreate: CreateHandler<TaxonomyItem> = ({ parentId, index }) => {
      // For database mode, use mutation
      if (!isDemoMode && addMutation) {
        const newItem: TaxonomyItem = {
          id: crypto.randomUUID(),
          hierarchicalId: '', // Will be set by database trigger
          name: 'New Item',
          description: '',
        }

        // Fire the mutation asynchronously
        addMutation.mutateAsync({
          name: 'New Item',
          description: '',
          parentId: parentId || null,
          sortOrder: index,
        }).catch((error) => {
          console.error('Failed to add taxonomy node:', error)
          showNotification('Failed to add item')
        })

        // Return optimistic item - React Query will refresh the data
        return newItem
      }

      // Demo mode: Check if approval is required for new items
      const result = addTaxonomyItemWithApproval(taxonomyType, parentId, 'New Item')
      if (result.requiresApproval) {
        showNotification('New item submitted for approval')
        return null // Prevent default tree creation
      }

      const newItem: TaxonomyItem = {
        id: crypto.randomUUID(),
        hierarchicalId: '', // Will be regenerated by store setter
        name: 'New Item',
        description: '',
      }

      const newData = addItemToTree(data, parentId, newItem, index)
      setData(newData)

      return newItem
    }

    // Rename handler - updates item name (routes through approval if required)
    const handleRename: RenameHandler<TaxonomyItem> = ({ id, name }) => {
      // For database mode, use mutation
      if (!isDemoMode && updateMutation) {
        updateMutation.mutateAsync({ id, name }).catch((error) => {
          console.error('Failed to rename taxonomy node:', error)
          showNotification('Failed to rename item')
        })
        return
      }

      // Demo mode: Route through approval
      const result = renameTaxonomyItemWithApproval(taxonomyType, id, name)
      if (result.requiresApproval) {
        showNotification('Change submitted for approval')
        return // Don't apply change - it's pending approval
      }
      // If not requiring approval, the hook already applied the change
    }

    // Move handler - handles both reordering and reparenting
    const handleMove: MoveHandler<TaxonomyItem> = ({ dragIds, parentId, index }) => {
      // For database mode, use mutation to update parent and sort order
      if (!isDemoMode && updateMutation) {
        // Update each moved item with new parent and sort order
        dragIds.forEach((dragId, i) => {
          updateMutation.mutateAsync({
            id: dragId,
            parentId: parentId || null,
            sortOrder: index + i,
          }).catch((error) => {
            console.error('Failed to move taxonomy node:', error)
            showNotification('Failed to move item')
          })
        })
        return
      }

      // Demo mode: First, collect the items being moved
      const flatItems = flattenTree(data)
      const itemsToMove: TaxonomyItem[] = []

      for (const dragId of dragIds) {
        const found = flatItems.find((f) => f.item.id === dragId)
        if (found) {
          itemsToMove.push(found.item)
        }
      }

      // Remove dragged items from tree
      let newData = removeItemsFromTree(data, dragIds)

      // Add items at new position
      for (let i = 0; i < itemsToMove.length; i++) {
        newData = addItemToTree(newData, parentId, itemsToMove[i], index + i)
      }

      setData(newData)
    }

    // Delete handler - removes items from tree (routes through approval if required)
    const handleDelete: DeleteHandler<TaxonomyItem> = ({ ids }) => {
      // For database mode, use mutation
      if (!isDemoMode && deleteMutation) {
        // Delete each item
        for (const id of ids) {
          deleteMutation.mutateAsync(id).catch((error) => {
            console.error('Failed to delete taxonomy node:', error)
            showNotification('Failed to delete item')
          })
        }
        return
      }

      // Demo mode: Process each item - if any require approval, show notification
      let anyRequiresApproval = false

      for (const id of ids) {
        const result = deleteTaxonomyItemWithApproval(taxonomyType, id)
        if (result.requiresApproval) {
          anyRequiresApproval = true
        } else {
          // Item was deleted directly (no approval needed, hook already applied)
          // No need to add to idsToDelete since hook already deleted it
        }
      }

      if (anyRequiresApproval) {
        showNotification('Deletion submitted for approval')
      }
    }

    // Handle description change (routes through approval if required)
    const handleDescriptionChange = useCallback(
      (id: string, description: string) => {
        // For database mode, use mutation
        if (!isDemoMode && updateMutation) {
          updateMutation.mutateAsync({ id, description }).catch((error) => {
            console.error('Failed to update description:', error)
            showNotification('Failed to update description')
          })
          return
        }

        // Demo mode: Route through approval
        const result = updateDescriptionWithApproval(taxonomyType, id, description)
        if (result.requiresApproval) {
          showNotification('Description change submitted for approval')
        }
        // If not requiring approval, the hook already applied the change
      },
      [taxonomyType, updateDescriptionWithApproval, showNotification, isDemoMode, updateMutation]
    )

    // Handle add child from node button
    const handleAddChild = useCallback(
      (parentId: string) => {
        treeRef.current?.create({ parentId, index: 0 })
      },
      []
    )

    // Search match function
    const searchMatch = useCallback(
      (node: { data: TaxonomyItem }, term: string): boolean => {
        const searchLower = term.toLowerCase()
        return (
          node.data.name.toLowerCase().includes(searchLower) ||
          node.data.description.toLowerCase().includes(searchLower) ||
          node.data.hierarchicalId.includes(term)
        )
      },
      []
    )

    return (
      <div className="relative">
        <Tree
          ref={treeRef}
          data={data}
          onCreate={handleCreate}
          onRename={handleRename}
          onMove={handleMove}
          onDelete={handleDelete}
          openByDefault={true}
          width="100%"
          height={height}
          indent={24}
          rowHeight={72}
          overscanCount={5}
          paddingTop={16}
          paddingBottom={24}
          searchTerm={searchTerm}
          searchMatch={searchMatch}
          disableDrop={({ parentNode }) => {
            // Prevent dropping beyond level 5 (parentNode at level 4 = child at level 5)
            if (parentNode && parentNode.level >= 4) {
              return true
            }
            return false
          }}
        >
          {(props) => (
            <TaxonomyNode
              {...props}
              onAddChild={handleAddChild}
              showIds={showIds}
              showDescriptions={showDescriptions}
              onDescriptionChange={handleDescriptionChange}
              taxonomyType={taxonomyType}
              showWeights={showWeights}
              getPendingForEntity={getPendingForEntity}
            />
          )}
        </Tree>

        {/* Approval notification toast */}
        {notification && (
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 px-4 py-2 bg-amber-500/90 text-amber-950 text-sm font-medium rounded-lg shadow-lg animate-in fade-in slide-in-from-bottom-2">
            {notification}
          </div>
        )}
      </div>
    )
  }
)
