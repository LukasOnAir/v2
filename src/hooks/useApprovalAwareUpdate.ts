import { useUIStore } from '@/stores/uiStore'
import { useApprovalStore } from '@/stores/approvalStore'
import { useControlsStore } from '@/stores/controlsStore'
import type { Control } from '@/types/rct'

export function useApprovalAwareUpdate() {
  const role = useUIStore((state) => state.selectedRole)
  const isApprovalRequired = useApprovalStore((state) => state.isApprovalRequired)
  const createPendingChange = useApprovalStore((state) => state.createPendingChange)
  const updateControl = useControlsStore((state) => state.updateControl)
  const addControl = useControlsStore((state) => state.addControl)
  const removeControl = useControlsStore((state) => state.removeControl)
  const getControlById = useControlsStore((state) => state.getControlById)

  const updateControlWithApproval = (
    controlId: string,
    updates: Partial<Control>,
    controlName: string
  ): { requiresApproval: boolean; pendingId?: string } => {
    const requiresApproval = isApprovalRequired('control', controlId) && role !== 'manager'

    if (requiresApproval) {
      const control = getControlById(controlId)
      const currentValues: Record<string, unknown> = {}
      for (const key of Object.keys(updates)) {
        currentValues[key] = control?.[key as keyof Control]
      }

      const pendingId = createPendingChange({
        entityType: 'control',
        entityId: controlId,
        entityName: controlName,
        changeType: 'update',
        proposedValues: updates as Record<string, unknown>,
        currentValues,
        submittedBy: role,
      })
      return { requiresApproval: true, pendingId }
    }

    updateControl(controlId, updates)
    return { requiresApproval: false }
  }

  const addControlWithApproval = (
    control: Omit<Control, 'id'>,
    rowId: string
  ): { requiresApproval: boolean; controlId?: string; pendingId?: string } => {
    const settings = useApprovalStore.getState().settings
    const requiresApproval = settings.requireForNewControls && role !== 'manager'

    if (requiresApproval) {
      const pendingId = createPendingChange({
        entityType: 'control',
        entityId: `new-${Date.now()}`, // Temporary ID for new control
        entityName: control.name,
        changeType: 'create',
        proposedValues: { ...control, rowId } as Record<string, unknown>,
        currentValues: {},
        submittedBy: role,
      })
      return { requiresApproval: true, pendingId }
    }

    const controlId = addControl(control)
    return { requiresApproval: false, controlId }
  }

  const removeControlWithApproval = (
    controlId: string,
    controlName: string
  ): { requiresApproval: boolean; pendingId?: string } => {
    const requiresApproval = isApprovalRequired('control', controlId) && role !== 'manager'

    if (requiresApproval) {
      const control = getControlById(controlId)
      const pendingId = createPendingChange({
        entityType: 'control',
        entityId: controlId,
        entityName: controlName,
        changeType: 'delete',
        proposedValues: {},
        currentValues: control as unknown as Record<string, unknown>,
        submittedBy: role,
      })
      return { requiresApproval: true, pendingId }
    }

    removeControl(controlId)
    return { requiresApproval: false }
  }

  return {
    updateControlWithApproval,
    addControlWithApproval,
    removeControlWithApproval,
    isManager: role === 'manager',
  }
}
