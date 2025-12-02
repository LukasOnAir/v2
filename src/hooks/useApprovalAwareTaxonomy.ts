import { useUIStore } from '@/stores/uiStore'
import { useApprovalStore } from '@/stores/approvalStore'
import { useTaxonomyStore } from '@/stores/taxonomyStore'
import type { TaxonomyItem } from '@/types/taxonomy'
import type { PendingChangeEntityType } from '@/types/approval'

/**
 * useApprovalAwareTaxonomy - Routes taxonomy operations through four-eye approval
 *
 * When four-eye approval is enabled:
 * - Rename, delete, and create operations create pending changes instead of direct updates
 * - Manager role bypasses approval and applies changes directly
 * - Returns whether operation required approval for UI feedback
 */
export function useApprovalAwareTaxonomy() {
  const role = useUIStore((state) => state.selectedRole)
  const isApprovalRequired = useApprovalStore((state) => state.isApprovalRequired)
  const createPendingChange = useApprovalStore((state) => state.createPendingChange)
  const settings = useApprovalStore((state) => state.settings)
  const { risks, processes, setRisks, setProcesses } = useTaxonomyStore()

  // Helper to find item in tree by ID
  const findItemInTree = (items: TaxonomyItem[], id: string): TaxonomyItem | null => {
    for (const item of items) {
      if (item.id === id) return item
      if (item.children) {
        const found = findItemInTree(item.children, id)
        if (found) return found
      }
    }
    return null
  }

  // Check if taxonomy changes need approval
  const checkTaxonomyApproval = (
    entityType: 'risk' | 'process',
    itemId: string,
    isNew: boolean
  ): boolean => {
    if (role === 'manager') return false

    if (isNew) {
      return entityType === 'risk'
        ? settings.requireForNewRisks
        : settings.requireForNewProcesses
    }

    return isApprovalRequired(entityType, itemId)
  }

  // Create pending change for taxonomy item rename
  const renameTaxonomyItemWithApproval = (
    type: 'risk' | 'process',
    itemId: string,
    newName: string
  ): { requiresApproval: boolean; pendingId?: string } => {
    const tree = type === 'risk' ? risks : processes
    const item = findItemInTree(tree, itemId)
    if (!item) return { requiresApproval: false }

    const requiresApproval = checkTaxonomyApproval(type, itemId, false)

    if (requiresApproval) {
      const pendingId = createPendingChange({
        entityType: type,
        entityId: itemId,
        entityName: `${item.hierarchicalId} ${item.name}`,
        changeType: 'update',
        proposedValues: { name: newName },
        currentValues: { name: item.name },
        submittedBy: role,
      })
      return { requiresApproval: true, pendingId }
    }

    // Direct update - apply to tree
    const updateTree = (items: TaxonomyItem[]): TaxonomyItem[] => {
      return items.map(i => {
        if (i.id === itemId) {
          return { ...i, name: newName }
        }
        if (i.children) {
          return { ...i, children: updateTree(i.children) }
        }
        return i
      })
    }

    if (type === 'risk') {
      setRisks(updateTree(risks))
    } else {
      setProcesses(updateTree(processes))
    }
    return { requiresApproval: false }
  }

  // Create pending change for taxonomy item deletion
  const deleteTaxonomyItemWithApproval = (
    type: 'risk' | 'process',
    itemId: string
  ): { requiresApproval: boolean; pendingId?: string } => {
    const tree = type === 'risk' ? risks : processes
    const item = findItemInTree(tree, itemId)
    if (!item) return { requiresApproval: false }

    const requiresApproval = checkTaxonomyApproval(type, itemId, false)

    if (requiresApproval) {
      const pendingId = createPendingChange({
        entityType: type,
        entityId: itemId,
        entityName: `${item.hierarchicalId} ${item.name}`,
        changeType: 'delete',
        proposedValues: {},
        currentValues: {
          name: item.name,
          hierarchicalId: item.hierarchicalId,
          children: item.children?.length || 0,
        },
        submittedBy: role,
      })
      return { requiresApproval: true, pendingId }
    }

    // Direct delete - apply to tree
    const removeFromTree = (items: TaxonomyItem[]): TaxonomyItem[] => {
      return items
        .filter(i => i.id !== itemId)
        .map(i => ({
          ...i,
          children: i.children ? removeFromTree(i.children) : undefined,
        }))
    }

    if (type === 'risk') {
      setRisks(removeFromTree(risks))
    } else {
      setProcesses(removeFromTree(processes))
    }
    return { requiresApproval: false }
  }

  // Create pending change for new taxonomy item
  const addTaxonomyItemWithApproval = (
    type: 'risk' | 'process',
    parentId: string | null,
    name: string
  ): { requiresApproval: boolean; pendingId?: string } => {
    const requiresApproval = checkTaxonomyApproval(type, `new-${Date.now()}`, true)

    if (requiresApproval) {
      const pendingId = createPendingChange({
        entityType: type,
        entityId: `new-${Date.now()}`,
        entityName: name,
        changeType: 'create',
        proposedValues: { name, parentId },
        currentValues: {},
        submittedBy: role,
      })
      return { requiresApproval: true, pendingId }
    }

    // Direct add - let the tree component handle normal add flow
    return { requiresApproval: false }
  }

  // Create pending change for taxonomy item description update
  const updateDescriptionWithApproval = (
    type: 'risk' | 'process',
    itemId: string,
    newDescription: string
  ): { requiresApproval: boolean; pendingId?: string } => {
    const tree = type === 'risk' ? risks : processes
    const item = findItemInTree(tree, itemId)
    if (!item) return { requiresApproval: false }

    const requiresApproval = checkTaxonomyApproval(type, itemId, false)

    if (requiresApproval) {
      const pendingId = createPendingChange({
        entityType: type,
        entityId: itemId,
        entityName: `${item.hierarchicalId} ${item.name}`,
        changeType: 'update',
        proposedValues: { description: newDescription },
        currentValues: { description: item.description },
        submittedBy: role,
      })
      return { requiresApproval: true, pendingId }
    }

    // Direct update - apply to tree
    const updateTree = (items: TaxonomyItem[]): TaxonomyItem[] => {
      return items.map(i => {
        if (i.id === itemId) {
          return { ...i, description: newDescription }
        }
        if (i.children) {
          return { ...i, children: updateTree(i.children) }
        }
        return i
      })
    }

    if (type === 'risk') {
      setRisks(updateTree(risks))
    } else {
      setProcesses(updateTree(processes))
    }
    return { requiresApproval: false }
  }

  return {
    renameTaxonomyItemWithApproval,
    deleteTaxonomyItemWithApproval,
    addTaxonomyItemWithApproval,
    updateDescriptionWithApproval,
    isManager: role === 'manager',
    checkTaxonomyApproval,
  }
}
