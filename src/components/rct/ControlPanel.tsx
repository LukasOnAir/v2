import { useState, useEffect, useMemo, useCallback } from 'react'
import * as Dialog from '@radix-ui/react-dialog'
import { X, Plus, Trash2, MessageSquarePlus, Check, Link2, Search, Unlink, Send } from 'lucide-react'
import { toast } from 'sonner'
import Fuse from 'fuse.js'
import { useRCTStore } from '@/stores/rctStore'
import { useControlsStore } from '@/stores/controlsStore'
import { useApprovalStore } from '@/stores/approvalStore'
import { useUIStore } from '@/stores/uiStore'
import { usePermissions } from '@/hooks/usePermissions'
import { useIsDemoMode } from '@/hooks/useTenantData'
import { useControlLinks, useLinkControl, useUnlinkControl, useUpdateLink } from '@/hooks/useControlLinks'
import { useControls, useAddControl, useUpdateControl } from '@/hooks/useControls'
import { useControlTesters } from '@/hooks/useProfiles'
import { useSendNotification } from '@/hooks/useSendNotification'
import { ApprovalBadge } from '@/components/approval'
import { ScoreDropdown } from './ScoreDropdown'
import { HeatmapCell } from './HeatmapCell'
import { InfoTooltip } from './InfoTooltip'
import { ControlTestSection } from './ControlTestSection'
import { RemediationSection } from './RemediationSection'
import { CommentsSection } from './CommentsSection'
import { TicketsSection } from '@/components/tickets'
import { TestStepsDisplay } from './TestStepsDisplay'
import type { RCTRow, Control, ControlType } from '@/types/rct'

/**
 * Input that uses local state and only commits to store on blur.
 * Prevents audit trail spam from every keystroke.
 */
function BlurCommitInput({
  value,
  onCommit,
  disabled,
  placeholder,
  className,
}: {
  value: string
  onCommit: (value: string) => void
  disabled?: boolean
  placeholder?: string
  className?: string
}) {
  const [localValue, setLocalValue] = useState(value)

  // Sync local state when external value changes (e.g., from store)
  useEffect(() => {
    setLocalValue(value)
  }, [value])

  return (
    <input
      type="text"
      value={localValue}
      onChange={(e) => setLocalValue(e.target.value)}
      onBlur={() => {
        if (localValue !== value) {
          onCommit(localValue)
        }
      }}
      disabled={disabled}
      placeholder={placeholder}
      className={className}
    />
  )
}

/**
 * Textarea that uses local state and only commits to store on blur.
 * Prevents audit trail spam from every keystroke.
 */
function BlurCommitTextarea({
  value,
  onCommit,
  disabled,
  placeholder,
  className,
  rows,
}: {
  value: string
  onCommit: (value: string) => void
  disabled?: boolean
  placeholder?: string
  className?: string
  rows?: number
}) {
  const [localValue, setLocalValue] = useState(value)

  // Sync local state when external value changes
  useEffect(() => {
    setLocalValue(value)
  }, [value])

  return (
    <textarea
      value={localValue}
      onChange={(e) => {
        setLocalValue(e.target.value)
        // Auto-expand textarea
        e.target.style.height = 'auto'
        e.target.style.height = `${Math.max(64, e.target.scrollHeight)}px`
      }}
      onBlur={() => {
        if (localValue !== value) {
          onCommit(localValue)
        }
      }}
      disabled={disabled}
      placeholder={placeholder}
      className={className}
      rows={rows}
    />
  )
}

const CONTROL_TYPES: ControlType[] = [
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

interface ControlPanelProps {
  isOpen: boolean
  onClose: () => void
  row: RCTRow | null
}

export function ControlPanel({ isOpen, onClose, row }: ControlPanelProps) {
  const { addControl, updateControl, removeControl, changeRequests, addChangeRequest, resolveChangeRequest, controlTests } = useRCTStore()

  // Demo mode check
  const isDemoMode = useIsDemoMode()

  // Store data (for demo mode)
  const storeControls = useControlsStore(state => state.controls)
  const storeControlLinks = useControlsStore(state => state.controlLinks)
  const { linkControl, unlinkControl, updateControl: updateHubControl, addControl: addHubControl } = useControlsStore()

  // Database hooks (for authenticated mode)
  const { data: dbControls } = useControls()
  const { data: dbControlLinks } = useControlLinks()

  // Database mutations (for authenticated mode)
  const addControlMutation = useAddControl()
  const updateControlMutation = useUpdateControl()
  const linkControlMutation = useLinkControl()
  const unlinkControlMutation = useUnlinkControl()
  const updateLinkMutation = useUpdateLink()

  // Tester assignment hooks
  const { data: controlTesters = [] } = useControlTesters()
  const { sendNotification } = useSendNotification()

  // Use appropriate data sources based on auth mode
  const controls = isDemoMode ? storeControls : (dbControls || [])
  const controlLinks = isDemoMode ? storeControlLinks : (dbControlLinks || [])

  // DEBUG: Verify controls data flow - remove after confirming fix
  useEffect(() => {
    if (!isDemoMode && row) {
      console.log('[ControlPanel Debug]', {
        isDemoMode,
        rowId: row.id,
        dbControlsCount: dbControls?.length ?? 'undefined',
        dbControlLinksCount: dbControlLinks?.length ?? 'undefined',
        storeControlsCount: storeControls.length,
        storeControlLinksCount: storeControlLinks.length,
        // Check link-to-row matching
        linksForThisRow: controlLinks.filter(l => l.rowId === row.id).length,
        sampleLinkRowIds: controlLinks.slice(0, 3).map(l => l.rowId),
      })
    }
  }, [isDemoMode, row, dbControls, dbControlLinks, storeControls, storeControlLinks, controlLinks])
  const { canEditControlDefinitions, canEditNetScores, canSubmitChangeRequests, isRiskManager, isManager } = usePermissions()
  const role = useUIStore((state) => state.selectedRole)
  const isApprovalRequired = useApprovalStore((state) => state.isApprovalRequired)
  const createPendingChange = useApprovalStore((state) => state.createPendingChange)
  const getPendingForEntity = useApprovalStore((state) => state.getPendingForEntity)
  const [newDescription, setNewDescription] = useState('')
  // Per-control change request state
  const [activeChangeRequestControlId, setActiveChangeRequestControlId] = useState<string | null>(null)
  const [changeRequestMessage, setChangeRequestMessage] = useState('')
  // Link Existing dialog state
  const [showLinkExistingDialog, setShowLinkExistingDialog] = useState(false)
  const [linkSearch, setLinkSearch] = useState('')

  // Per-control draft state for explicit submission workflow
  // Key: controlId, Value: { fieldName: newValue }
  const [controlDrafts, setControlDrafts] = useState<Record<string, Record<string, unknown>>>({})

  // Helper to get draft for a control
  const getDraftForControl = (controlId: string) => controlDrafts[controlId] || {}
  const hasDraftForControl = (controlId: string) => Object.keys(getDraftForControl(controlId)).length > 0

  // Helper to get display value - shows draft value if exists, otherwise store value
  const getDisplayValue = <T,>(controlId: string, field: string, storeValue: T): T => {
    const draft = getDraftForControl(controlId)
    return draft[field] !== undefined ? (draft[field] as T) : storeValue
  }

  // Helper to add to draft for a specific control
  const addToDraft = (controlId: string, field: string, value: unknown) => {
    setControlDrafts(prev => ({
      ...prev,
      [controlId]: {
        ...(prev[controlId] || {}),
        [field]: value
      }
    }))
  }

  // Helper to check if approval is required for a control
  const requiresApprovalFor = (controlId: string) => isApprovalRequired('control', controlId) && !isManager

  // Handler for embedded control updates - accumulates to draft if approval required
  const handleEmbeddedControlUpdate = useCallback(
    (controlId: string, field: string, value: unknown, controlName: string) => {
      if (!row) return

      if (requiresApprovalFor(controlId)) {
        // Accumulate in draft for explicit submission
        addToDraft(controlId, field, value)
      } else {
        // No approval required - apply directly
        updateControl(row.id, controlId, { [field]: value } as Partial<Control>)
      }
    },
    [row, updateControl]
  )

  // Handler for linked control updates (Hub controls) - accumulates to draft if approval required
  const handleLinkedControlUpdate = useCallback(
    (controlId: string, field: string, value: unknown) => {
      if (requiresApprovalFor(controlId)) {
        // Accumulate in draft for explicit submission
        addToDraft(controlId, field, value)
      } else {
        // No approval required - apply directly
        if (isDemoMode) {
          updateHubControl(controlId, { [field]: value } as Partial<Control>)
        } else {
          updateControlMutation.mutate({ id: controlId, [field]: value } as { id: string } & Partial<Control>)
        }
      }
    },
    [isDemoMode, updateHubControl, updateControlMutation]
  )

  // Handler for per-link score overrides - accumulates to draft if approval required
  const handleLinkedControlScoreChange = useCallback(
    (
      linkId: string,
      controlId: string,
      field: 'netProbability' | 'netImpact',
      value: number
    ) => {
      if (requiresApprovalFor(controlId)) {
        // Accumulate in draft - use link_ prefix and _linkId for per-link tracking
        addToDraft(controlId, `link_${field}`, value)
        addToDraft(controlId, '_linkId', linkId)
      } else {
        // No approval required - apply directly
        if (isDemoMode) {
          const { updateLink } = useControlsStore.getState()
          updateLink(linkId, { [field]: value })
        } else {
          updateLinkMutation.mutate({ id: linkId, [field]: value })
        }
      }
    },
    []
  )

  // Submit all draft changes for a control as a single pending change
  const handleSubmitControlDrafts = useCallback(
    (controlId: string, controlName: string, isEmbedded: boolean) => {
      const drafts = getDraftForControl(controlId)
      if (Object.keys(drafts).length === 0) return

      // Get the control to capture current values
      const control = isEmbedded
        ? row?.controls.find(c => c.id === controlId)
        : controls.find(c => c.id === controlId)

      const currentValues: Record<string, unknown> = {}
      for (const key of Object.keys(drafts)) {
        if (key.startsWith('link_') || key.startsWith('_')) {
          // For per-link overrides, get from the link itself
          const linkId = drafts._linkId as string
          if (linkId && key.startsWith('link_')) {
            const link = controlLinks.find(l => l.id === linkId)
            const baseField = key.replace('link_', '') as 'netProbability' | 'netImpact'
            currentValues[key] = link?.[baseField]
          } else {
            currentValues[key] = drafts[key]
          }
        } else {
          currentValues[key] = control?.[key as keyof Control]
        }
      }

      try {
        createPendingChange({
          entityType: 'control',
          entityId: controlId,
          entityName: controlName,
          changeType: 'update',
          proposedValues: drafts,
          currentValues,
          submittedBy: role,
        })

        // Clear drafts for this control
        setControlDrafts(prev => {
          const next = { ...prev }
          delete next[controlId]
          return next
        })

        toast.success('Changes submitted for approval', {
          description: 'A manager will review your changes.',
          duration: 3000,
        })
      } catch (error) {
        console.error('[Approval] Failed to submit changes:', error)
        toast.error('Failed to submit changes', {
          description: 'Please try again.',
        })
      }
    },
    [row, controls, controlLinks, createPendingChange, role]
  )

  // Get controls available for linking (exclude already linked) - memoized to prevent infinite re-renders
  const availableControls = useMemo(() => {
    if (!row) return []
    const existingControlIds = new Set(row.controls.map(c => c.id))
    // Also exclude controls already linked via controlLinks
    const linkedControlIds = controlLinks
      .filter(l => l.rowId === row.id)
      .map(l => l.controlId)
    linkedControlIds.forEach(id => existingControlIds.add(id))
    return controls.filter(c => !existingControlIds.has(c.id))
  }, [row, controls, controlLinks])

  // Fuse.js search for controls - memoized
  const fuse = useMemo(() => new Fuse(availableControls, {
    keys: ['name', 'description'],
    threshold: 0.3,
  }), [availableControls])

  // Pre-compute link counts to avoid recalculating in render loop
  const linkCountMap = useMemo(() => {
    const map = new Map<string, number>()
    for (const link of controlLinks) {
      map.set(link.controlId, (map.get(link.controlId) || 0) + 1)
    }
    return map
  }, [controlLinks])

  // Get link count for a control (O(1) lookup)
  const getLinkCount = (controlId: string) => linkCountMap.get(controlId) || 0

  // Get controls linked via controlLinks (from Controls Hub)
  const linkedControls = useMemo(() => {
    if (!row) return []
    const linksForRow = controlLinks.filter(l => l.rowId === row.id)
    return linksForRow.map(link => {
      const control = controls.find(c => c.id === link.controlId)
      return control ? { ...control, linkId: link.id, link } : null
    }).filter(Boolean) as (Control & { linkId: string; link: typeof controlLinks[0] })[]
  }, [row, controlLinks, controls])

  if (!row) return null

  const filteredControls = linkSearch.trim()
    ? fuse.search(linkSearch).map(r => r.item)
    : availableControls

  // Handler for linking an existing control
  const handleLinkExistingControl = (controlId: string) => {
    if (isDemoMode) {
      linkControl(controlId, row.id)
    } else {
      linkControlMutation.mutate({ controlId, rowId: row.id })
    }
    setShowLinkExistingDialog(false)
    setLinkSearch('')
  }

  // Get pending change requests for this row
  const pendingRequests = changeRequests.filter(
    (r) => r.rowId === row.id && r.status === 'pending'
  )

  const handleAddControl = () => {
    if (!newDescription.trim()) return

    if (isDemoMode) {
      // Create control in Controls Hub (not embedded in row)
      const controlId = addHubControl({
        name: newDescription.trim(),
        description: '',
        controlType: null,
        netProbability: null,
        netImpact: null,
        netScore: null,
        comment: '',
      })

      // Link the new control to this row
      linkControl(controlId, row.id)
    } else {
      // Database mutation: create control then link
      addControlMutation.mutate({
        name: newDescription.trim(),
        description: undefined,
        controlType: null,
        netProbability: null,
        netImpact: null,
        comment: undefined,
      }, {
        onSuccess: (newControl) => {
          linkControlMutation.mutate({ controlId: newControl.id, rowId: row.id })
        }
      })
    }
    setNewDescription('')
  }

  const handleUpdateControlScore = (
    controlId: string,
    field: 'netProbability' | 'netImpact',
    value: number
  ) => {
    // Find control name for approval tracking
    const control = row.controls.find(c => c.id === controlId)
    handleEmbeddedControlUpdate(controlId, field, value, control?.name || 'Control')
  }

  const handleRemoveControl = (controlId: string) => {
    removeControl(row.id, controlId)
  }

  // Handler for unlinking a control from this row
  const handleUnlinkControl = (linkId: string) => {
    if (isDemoMode) {
      unlinkControl(linkId)
    } else {
      unlinkControlMutation.mutate(linkId)
    }
  }

  const handleSubmitChangeRequest = (controlId: string) => {
    if (!changeRequestMessage.trim()) return
    addChangeRequest(row.id, changeRequestMessage.trim(), controlId)
    setChangeRequestMessage('')
    setActiveChangeRequestControlId(null)
  }

  // Handle dialog close - ensure blur fires first, then clear drafts
  const handleDialogOpenChange = (open: boolean) => {
    if (!open) {
      // Blur active element to trigger any pending saves before closing
      if (document.activeElement instanceof HTMLElement) {
        document.activeElement.blur()
      }
      // Clear all control drafts
      setControlDrafts({})
      onClose()
    }
  }

  return (
    <>
    <Dialog.Root open={isOpen} onOpenChange={handleDialogOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/60 z-40" />
        <Dialog.Content className="fixed right-0 top-0 h-full w-[500px] bg-surface-elevated border-l border-surface-border shadow-xl z-50 flex flex-col overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-surface-border">
            <div>
              <Dialog.Title className="text-lg font-semibold text-text-primary">
                Controls
              </Dialog.Title>
              <Dialog.Description className="text-sm text-text-secondary mt-1">
                {row.riskName} x {row.processName}
              </Dialog.Description>
            </div>
            <Dialog.Close asChild>
              <button className="p-2 rounded-lg hover:bg-surface-overlay transition-colors">
                <X size={20} className="text-text-secondary" />
              </button>
            </Dialog.Close>
          </div>

          {/* Risk context */}
          <div className="p-4 border-b border-surface-border bg-surface-overlay/50">
            <div className="grid grid-cols-3 gap-4 text-sm">
              <div>
                <span className="text-text-muted">Gross Score</span>
                <div className="mt-1">
                  <HeatmapCell score={row.grossScore} />
                </div>
              </div>
              <div>
                <span className="text-text-muted">Appetite</span>
                <div className="mt-1 text-text-primary font-medium">
                  {row.riskAppetite}
                </div>
              </div>
              <div>
                <span className="text-text-muted">Net Score</span>
                <div className="mt-1">
                  <HeatmapCell score={row.netScore} />
                </div>
              </div>
            </div>
          </div>

          {/* Pending Change Requests (visible to Risk Manager) */}
          {isRiskManager && pendingRequests.length > 0 && (
            <div className="p-4 border-b border-surface-border bg-amber-500/10">
              <h4 className="text-sm font-medium text-amber-400 mb-2">
                Pending Change Requests ({pendingRequests.length})
              </h4>
              <div className="space-y-2">
                {pendingRequests.map((request) => {
                  const control = request.controlId
                    ? row.controls.find((c) => c.id === request.controlId)
                    : null
                  return (
                    <div
                      key={request.id}
                      className="flex items-start justify-between gap-2 p-2 bg-surface-overlay rounded border border-surface-border"
                    >
                      <div className="flex-1">
                        {control && (
                          <p className="text-xs text-accent-400 mb-1">
                            Re: {control.name}
                          </p>
                        )}
                        <p className="text-sm text-text-primary">{request.message}</p>
                        <p className="text-xs text-text-muted mt-1">
                          {new Date(request.timestamp).toLocaleString()}
                        </p>
                      </div>
                      <button
                        onClick={() => resolveChangeRequest(request.id)}
                        className="p-1.5 rounded bg-green-500/20 text-green-400 hover:bg-green-500/30 transition-colors"
                        title="Mark as resolved"
                      >
                        <Check size={14} />
                      </button>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Controls list */}
          <div className="flex-1 overflow-auto p-4">
            {row.controls.length === 0 && linkedControls.length === 0 ? (
              <p className="text-text-secondary text-sm text-center py-8">
                No controls added yet.{' '}
                {canEditControlDefinitions
                  ? 'Add a control to mitigate this risk.'
                  : 'A Risk Manager can add controls.'}
              </p>
            ) : (
              <div className="space-y-4">
                {row.controls.map((control, index) => {
                  const controlLinkCount = controlLinks.filter(l => l.controlId === control.id).length
                  const hasPendingApproval = getPendingForEntity(control.id).length > 0
                  const hasDraft = hasDraftForControl(control.id)
                  const needsApproval = requiresApprovalFor(control.id)
                  return (
                  <div
                    key={control.id}
                    className={`bg-surface-overlay rounded-lg p-4 border ${hasPendingApproval ? 'border-amber-500/50 bg-amber-500/5' : hasDraft ? 'border-amber-500/30' : 'border-surface-border'}`}
                  >
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <label className="text-text-muted text-xs">Control {index + 1} - Name</label>
                          {hasPendingApproval && <ApprovalBadge status="pending" size="sm" />}
                          {hasDraft && (
                            <span className="px-1.5 py-0.5 text-xs bg-amber-500/20 text-amber-400 rounded">
                              Unsaved
                            </span>
                          )}
                          {controlLinkCount > 1 && (
                            <span className="px-1.5 py-0.5 text-xs bg-accent-500/20 text-accent-400 rounded" title={`This control is linked to ${controlLinkCount} risks`}>
                              {controlLinkCount} risks
                            </span>
                          )}
                        </div>
                        <BlurCommitInput
                          value={getDisplayValue(control.id, 'name', control.name)}
                          onCommit={(name) => handleEmbeddedControlUpdate(control.id, 'name', name, control.name)}
                          disabled={!canEditControlDefinitions}
                          placeholder="Control name..."
                          className={`w-full px-2 py-1.5 bg-surface-elevated border rounded text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-1 focus:ring-accent-500 disabled:opacity-50 disabled:cursor-not-allowed ${getDraftForControl(control.id).name !== undefined ? 'border-amber-500/50' : 'border-surface-border'}`}
                        />
                      </div>
                      <div className="flex items-center gap-1 mt-5">
                        {/* Submit drafts button */}
                        {hasDraft && needsApproval && (
                          <button
                            onClick={() => handleSubmitControlDrafts(control.id, control.name, true)}
                            className="p-1.5 rounded bg-amber-500/20 text-amber-400 hover:bg-amber-500/30 transition-colors"
                            title="Send changes for approval"
                          >
                            <Send size={16} />
                          </button>
                        )}
                        <button
                          onClick={() => handleRemoveControl(control.id)}
                          disabled={!canEditControlDefinitions}
                          className="p-1.5 rounded hover:bg-red-500/20 text-text-muted hover:text-red-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-transparent disabled:hover:text-text-muted"
                          title={canEditControlDefinitions ? 'Remove control' : 'Only Risk Manager can delete controls'}
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>

                    {/* Control Type */}
                    <div className="mb-3">
                      <label className="text-xs text-text-muted mb-1.5 flex items-center gap-1">
                        Control Type
                        <InfoTooltip type="controlType" />
                      </label>
                      <select
                        value={getDisplayValue(control.id, 'controlType', control.controlType) ?? ''}
                        onChange={(e) => handleEmbeddedControlUpdate(control.id, 'controlType', e.target.value as ControlType || null, control.name)}
                        disabled={!canEditControlDefinitions}
                        className={`w-full px-2 py-1.5 bg-surface-elevated border rounded text-sm text-text-primary focus:outline-none focus:ring-1 focus:ring-accent-500 disabled:opacity-50 disabled:cursor-not-allowed ${getDraftForControl(control.id).controlType !== undefined ? 'border-amber-500/50' : 'border-surface-border'}`}
                      >
                        <option value="">Select type...</option>
                        {CONTROL_TYPES.map(type => (
                          <option key={type} value={type}>{type}</option>
                        ))}
                      </select>
                    </div>

                    {/* Tester Assignment */}
                    {canEditControlDefinitions && (
                      <div className="mb-3">
                        <label className="text-xs text-text-muted block mb-1.5">Assigned Tester</label>
                        <select
                          value={getDisplayValue(control.id, 'assignedTesterId', control.assignedTesterId) ?? ''}
                          onChange={(e) => {
                            const newTesterId = e.target.value || null
                            const previousTesterId = control.assignedTesterId

                            // Update control
                            handleEmbeddedControlUpdate(control.id, 'assignedTesterId', newTesterId, control.name)

                            // Send notification if assigning to new tester
                            if (newTesterId && newTesterId !== previousTesterId) {
                              sendNotification({
                                type: 'test-assigned',
                                recipientId: newTesterId,
                                data: {
                                  controlName: control.name,
                                  dueDate: control.nextTestDate || undefined,
                                },
                              })
                            }
                          }}
                          className="w-full px-2 py-1.5 bg-surface-elevated border border-surface-border rounded text-sm text-text-primary focus:outline-none focus:ring-1 focus:ring-accent-500"
                        >
                          <option value="">Unassigned</option>
                          {isDemoMode ? (
                            <>
                              <option value="tester-1">Tester 1</option>
                              <option value="tester-2">Tester 2</option>
                              <option value="tester-3">Tester 3</option>
                            </>
                          ) : (
                            controlTesters.map(tester => (
                              <option key={tester.id} value={tester.id}>
                                {tester.full_name || tester.id}
                              </option>
                            ))
                          )}
                        </select>
                      </div>
                    )}

                    <div className="grid grid-cols-3 gap-4">
                      <div>
                        <label className="text-xs text-text-muted block mb-1.5">
                          Net Probability
                        </label>
                        <div className={getDraftForControl(control.id).netProbability !== undefined ? 'ring-1 ring-amber-500/50 rounded' : ''}>
                          <ScoreDropdown
                            value={getDisplayValue(control.id, 'netProbability', control.netProbability)}
                            onChange={(v) => handleUpdateControlScore(control.id, 'netProbability', v)}
                            type="probability"
                            showInfo={true}
                            editableInfo={true}
                            disabled={!canEditNetScores}
                          />
                        </div>
                      </div>
                      <div>
                        <label className="text-xs text-text-muted block mb-1.5">
                          Net Impact
                        </label>
                        <div className={getDraftForControl(control.id).netImpact !== undefined ? 'ring-1 ring-amber-500/50 rounded' : ''}>
                          <ScoreDropdown
                            value={getDisplayValue(control.id, 'netImpact', control.netImpact)}
                            onChange={(v) => handleUpdateControlScore(control.id, 'netImpact', v)}
                            type="impact"
                            showInfo={true}
                            editableInfo={true}
                            disabled={!canEditNetScores}
                          />
                        </div>
                      </div>
                      <div>
                        <label className="text-xs text-text-muted block mb-1.5">
                          Net Score
                        </label>
                        <HeatmapCell score={control.netScore} />
                      </div>
                    </div>

                    {/* Description */}
                    <div className="mt-3">
                      <label className="text-xs text-text-muted block mb-1.5">Description</label>
                      <BlurCommitTextarea
                        value={getDisplayValue(control.id, 'description', control.description ?? '')}
                        onCommit={(description) => handleEmbeddedControlUpdate(control.id, 'description', description, control.name)}
                        disabled={!canEditControlDefinitions}
                        placeholder="Describe what this control does..."
                        rows={3}
                        className={`w-full px-2 py-1.5 bg-surface-elevated border rounded text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-1 focus:ring-accent-500 resize-y min-h-[64px] disabled:opacity-50 disabled:cursor-not-allowed ${getDraftForControl(control.id).description !== undefined ? 'border-amber-500/50' : 'border-surface-border'}`}
                      />
                    </div>

                    {/* Notes/Comment */}
                    <div className="mt-3">
                      <label className="text-xs text-text-muted block mb-1.5">Notes</label>
                      <BlurCommitTextarea
                        value={getDisplayValue(control.id, 'comment', control.comment ?? '')}
                        onCommit={(comment) => handleEmbeddedControlUpdate(control.id, 'comment', comment, control.name)}
                        disabled={!canEditControlDefinitions}
                        placeholder="Add notes about this control..."
                        rows={3}
                        className={`w-full px-2 py-1.5 bg-surface-elevated border rounded text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-1 focus:ring-accent-500 resize-y min-h-[64px] disabled:opacity-50 disabled:cursor-not-allowed ${getDraftForControl(control.id).comment !== undefined ? 'border-amber-500/50' : 'border-surface-border'}`}
                      />
                    </div>

                    {/* Test Steps (read-only display) */}
                    {control.testSteps && control.testSteps.length > 0 && (
                      <div className="mt-3 pt-3 border-t border-surface-border">
                        <TestStepsDisplay steps={control.testSteps} />
                      </div>
                    )}

                    {/* Per-control Change Request (Control Owner only) */}
                    {canSubmitChangeRequests && (
                      <div className="mt-3 pt-3 border-t border-surface-border">
                        {activeChangeRequestControlId === control.id ? (
                          <div className="space-y-2">
                            <label className="text-xs text-text-muted">Request a change for this control</label>
                            <textarea
                              value={changeRequestMessage}
                              onChange={(e) => {
                                setChangeRequestMessage(e.target.value)
                                // Auto-expand textarea
                                e.target.style.height = 'auto'
                                e.target.style.height = `${Math.max(64, e.target.scrollHeight)}px`
                              }}
                              placeholder="Describe the change you need..."
                              rows={3}
                              className="w-full px-2 py-1.5 bg-surface-elevated border border-surface-border rounded text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-1 focus:ring-accent-500 resize-y min-h-[64px]"
                              autoFocus
                            />
                            <div className="flex justify-end gap-2">
                              <button
                                onClick={() => {
                                  setActiveChangeRequestControlId(null)
                                  setChangeRequestMessage('')
                                }}
                                className="px-2 py-1 text-xs text-text-secondary hover:text-text-primary transition-colors"
                              >
                                Cancel
                              </button>
                              <button
                                onClick={() => handleSubmitChangeRequest(control.id)}
                                disabled={!changeRequestMessage.trim()}
                                className="px-2 py-1 text-xs bg-accent-500 text-white rounded hover:bg-accent-600 transition-colors disabled:opacity-50"
                              >
                                Submit
                              </button>
                            </div>
                          </div>
                        ) : (
                          <button
                            onClick={() => setActiveChangeRequestControlId(control.id)}
                            className="flex items-center gap-1.5 px-2 py-1 text-xs text-text-secondary hover:text-accent-400 transition-colors"
                          >
                            <MessageSquarePlus size={14} />
                            Request Change
                          </button>
                        )}
                      </div>
                    )}

                    {/* Control Testing Section */}
                    <ControlTestSection rowId={row.id} control={control} />

                    {/* Remediation Section */}
                    <RemediationSection
                      rowId={row.id}
                      control={control}
                      tests={controlTests.filter(t => t.controlId === control.id)}
                      grossScore={row.grossScore}
                    />

                    {/* Tickets Section */}
                    <TicketsSection controlId={control.id} controlName={control.name} />

                    {/* Comments Section */}
                    <CommentsSection
                      entityType="control"
                      entityId={control.id}
                    />
                  </div>
                  )
                })}

                {/* Linked Controls (from Controls Hub) */}
                {linkedControls.map((linkedControl, index) => {
                  const totalIndex = row.controls.length + index + 1
                  const controlLinkCount = getLinkCount(linkedControl.id)
                  // Use per-link scores if set, otherwise fall back to control defaults
                  const displayP = linkedControl.link.netProbability ?? linkedControl.netProbability
                  const displayI = linkedControl.link.netImpact ?? linkedControl.netImpact
                  const displayScore = linkedControl.link.netScore ?? linkedControl.netScore
                  const hasPendingApproval = getPendingForEntity(linkedControl.id).length > 0
                  const hasDraft = hasDraftForControl(linkedControl.id)
                  const needsApproval = requiresApprovalFor(linkedControl.id)

                  return (
                    <div
                      key={linkedControl.id}
                      className={`bg-surface-overlay rounded-lg p-4 border ${hasPendingApproval ? 'border-amber-500/50 bg-amber-500/5' : hasDraft ? 'border-amber-500/30' : 'border-accent-500/30'}`}
                    >
                      <div className="flex items-start justify-between gap-3 mb-3">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <label className="text-text-muted text-xs">Control {totalIndex} - Name</label>
                            <span className="px-1.5 py-0.5 text-xs bg-accent-500/20 text-accent-400 rounded flex items-center gap-1">
                              <Link2 size={10} />
                              Linked
                            </span>
                            {hasPendingApproval && <ApprovalBadge status="pending" size="sm" />}
                            {hasDraft && (
                              <span className="px-1.5 py-0.5 text-xs bg-amber-500/20 text-amber-400 rounded">
                                Unsaved
                              </span>
                            )}
                            {controlLinkCount > 1 && (
                              <span className="px-1.5 py-0.5 text-xs bg-surface-border text-text-secondary rounded" title={`This control is linked to ${controlLinkCount} risks`}>
                                {controlLinkCount} risks
                              </span>
                            )}
                          </div>
                          <BlurCommitInput
                            value={getDisplayValue(linkedControl.id, 'name', linkedControl.name)}
                            onCommit={(name) => handleLinkedControlUpdate(linkedControl.id, 'name', name)}
                            disabled={!canEditControlDefinitions}
                            placeholder="Control name..."
                            className={`w-full px-2 py-1.5 bg-surface-elevated border rounded text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-1 focus:ring-accent-500 disabled:opacity-50 disabled:cursor-not-allowed ${getDraftForControl(linkedControl.id).name !== undefined ? 'border-amber-500/50' : 'border-surface-border'}`}
                          />
                        </div>
                        <div className="flex items-center gap-1 mt-5">
                          {/* Submit drafts button */}
                          {hasDraft && needsApproval && (
                            <button
                              onClick={() => handleSubmitControlDrafts(linkedControl.id, linkedControl.name, false)}
                              className="p-1.5 rounded bg-amber-500/20 text-amber-400 hover:bg-amber-500/30 transition-colors"
                              title="Send changes for approval"
                            >
                              <Send size={16} />
                            </button>
                          )}
                          <button
                            onClick={() => handleUnlinkControl(linkedControl.linkId)}
                            disabled={!canEditControlDefinitions}
                            className="p-1.5 rounded hover:bg-red-500/20 text-text-muted hover:text-red-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-transparent disabled:hover:text-text-muted"
                            title={canEditControlDefinitions ? 'Unlink from this risk' : 'Only Risk Manager can unlink controls'}
                          >
                            <Unlink size={16} />
                          </button>
                        </div>
                      </div>

                      {/* Control Type */}
                      <div className="mb-3">
                        <label className="text-xs text-text-muted mb-1.5 flex items-center gap-1">
                          Control Type
                          <InfoTooltip type="controlType" />
                        </label>
                        <select
                          value={getDisplayValue(linkedControl.id, 'controlType', linkedControl.controlType) ?? ''}
                          onChange={(e) => handleLinkedControlUpdate(linkedControl.id, 'controlType', e.target.value as ControlType || null)}
                          disabled={!canEditControlDefinitions}
                          className={`w-full px-2 py-1.5 bg-surface-elevated border rounded text-sm text-text-primary focus:outline-none focus:ring-1 focus:ring-accent-500 disabled:opacity-50 disabled:cursor-not-allowed ${getDraftForControl(linkedControl.id).controlType !== undefined ? 'border-amber-500/50' : 'border-surface-border'}`}
                        >
                          <option value="">Select type...</option>
                          {CONTROL_TYPES.map(type => (
                            <option key={type} value={type}>{type}</option>
                          ))}
                        </select>
                      </div>

                      {/* Tester Assignment */}
                      {canEditControlDefinitions && (
                        <div className="mb-3">
                          <label className="text-xs text-text-muted block mb-1.5">Assigned Tester</label>
                          <select
                            value={getDisplayValue(linkedControl.id, 'assignedTesterId', linkedControl.assignedTesterId) ?? ''}
                            onChange={(e) => {
                              const newTesterId = e.target.value || null
                              const previousTesterId = linkedControl.assignedTesterId

                              // Update control
                              handleLinkedControlUpdate(linkedControl.id, 'assignedTesterId', newTesterId)

                              // Send notification if assigning to new tester
                              if (newTesterId && newTesterId !== previousTesterId) {
                                sendNotification({
                                  type: 'test-assigned',
                                  recipientId: newTesterId,
                                  data: {
                                    controlName: linkedControl.name,
                                    dueDate: linkedControl.nextTestDate || undefined,
                                  },
                                })
                              }
                            }}
                            className="w-full px-2 py-1.5 bg-surface-elevated border border-surface-border rounded text-sm text-text-primary focus:outline-none focus:ring-1 focus:ring-accent-500"
                          >
                            <option value="">Unassigned</option>
                            {isDemoMode ? (
                              <>
                                <option value="tester-1">Tester 1</option>
                                <option value="tester-2">Tester 2</option>
                                <option value="tester-3">Tester 3</option>
                              </>
                            ) : (
                              controlTesters.map(tester => (
                                <option key={tester.id} value={tester.id}>
                                  {tester.full_name || tester.id}
                                </option>
                              ))
                            )}
                          </select>
                        </div>
                      )}

                      <div className="grid grid-cols-3 gap-4">
                        <div>
                          <label className="text-xs text-text-muted block mb-1.5">
                            Net Probability
                          </label>
                          <div className={getDraftForControl(linkedControl.id).link_netProbability !== undefined ? 'ring-1 ring-amber-500/50 rounded' : ''}>
                            <ScoreDropdown
                              value={getDisplayValue(linkedControl.id, 'link_netProbability', displayP)}
                              onChange={(v) =>
                                handleLinkedControlScoreChange(
                                  linkedControl.linkId,
                                  linkedControl.id,
                                  'netProbability',
                                  v
                                )
                              }
                              type="probability"
                              showInfo={true}
                              editableInfo={true}
                              disabled={!canEditNetScores}
                            />
                          </div>
                        </div>
                        <div>
                          <label className="text-xs text-text-muted block mb-1.5">
                            Net Impact
                          </label>
                          <div className={getDraftForControl(linkedControl.id).link_netImpact !== undefined ? 'ring-1 ring-amber-500/50 rounded' : ''}>
                            <ScoreDropdown
                              value={getDisplayValue(linkedControl.id, 'link_netImpact', displayI)}
                              onChange={(v) =>
                                handleLinkedControlScoreChange(
                                  linkedControl.linkId,
                                  linkedControl.id,
                                  'netImpact',
                                  v
                                )
                              }
                              type="impact"
                              showInfo={true}
                              editableInfo={true}
                              disabled={!canEditNetScores}
                            />
                          </div>
                        </div>
                        <div>
                          <label className="text-xs text-text-muted block mb-1.5">
                            Net Score
                          </label>
                          <HeatmapCell score={displayScore} />
                        </div>
                      </div>

                      {/* Description */}
                      <div className="mt-3">
                        <label className="text-xs text-text-muted block mb-1.5">Description</label>
                        <BlurCommitTextarea
                          value={getDisplayValue(linkedControl.id, 'description', linkedControl.description ?? '')}
                          onCommit={(description) => handleLinkedControlUpdate(linkedControl.id, 'description', description)}
                          disabled={!canEditControlDefinitions}
                          placeholder="Describe what this control does..."
                          rows={3}
                          className={`w-full px-2 py-1.5 bg-surface-elevated border rounded text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-1 focus:ring-accent-500 resize-y min-h-[64px] disabled:opacity-50 disabled:cursor-not-allowed ${getDraftForControl(linkedControl.id).description !== undefined ? 'border-amber-500/50' : 'border-surface-border'}`}
                        />
                      </div>

                      {/* Notes/Comment */}
                      <div className="mt-3">
                        <label className="text-xs text-text-muted block mb-1.5">Notes</label>
                        <BlurCommitTextarea
                          value={getDisplayValue(linkedControl.id, 'comment', linkedControl.comment ?? '')}
                          onCommit={(comment) => handleLinkedControlUpdate(linkedControl.id, 'comment', comment)}
                          disabled={!canEditControlDefinitions}
                          placeholder="Add notes about this control..."
                          rows={3}
                          className={`w-full px-2 py-1.5 bg-surface-elevated border rounded text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-1 focus:ring-accent-500 resize-y min-h-[64px] disabled:opacity-50 disabled:cursor-not-allowed ${getDraftForControl(linkedControl.id).comment !== undefined ? 'border-amber-500/50' : 'border-surface-border'}`}
                        />
                      </div>

                      {/* Test Steps (read-only display) */}
                      {linkedControl.testSteps && linkedControl.testSteps.length > 0 && (
                        <div className="mt-3 pt-3 border-t border-surface-border">
                          <TestStepsDisplay steps={linkedControl.testSteps} />
                        </div>
                      )}

                      {/* Per-control Change Request (Control Owner only) */}
                      {canSubmitChangeRequests && (
                        <div className="mt-3 pt-3 border-t border-surface-border">
                          {activeChangeRequestControlId === linkedControl.id ? (
                            <div className="space-y-2">
                              <label className="text-xs text-text-muted">Request a change for this control</label>
                              <textarea
                                value={changeRequestMessage}
                                onChange={(e) => {
                                  setChangeRequestMessage(e.target.value)
                                  e.target.style.height = 'auto'
                                  e.target.style.height = `${Math.max(64, e.target.scrollHeight)}px`
                                }}
                                placeholder="Describe the change you need..."
                                rows={3}
                                className="w-full px-2 py-1.5 bg-surface-elevated border border-surface-border rounded text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-1 focus:ring-accent-500 resize-y min-h-[64px]"
                                autoFocus
                              />
                              <div className="flex justify-end gap-2">
                                <button
                                  onClick={() => {
                                    setActiveChangeRequestControlId(null)
                                    setChangeRequestMessage('')
                                  }}
                                  className="px-2 py-1 text-xs text-text-secondary hover:text-text-primary transition-colors"
                                >
                                  Cancel
                                </button>
                                <button
                                  onClick={() => handleSubmitChangeRequest(linkedControl.id)}
                                  disabled={!changeRequestMessage.trim()}
                                  className="px-2 py-1 text-xs bg-accent-500 text-white rounded hover:bg-accent-600 transition-colors disabled:opacity-50"
                                >
                                  Submit
                                </button>
                              </div>
                            </div>
                          ) : (
                            <button
                              onClick={() => setActiveChangeRequestControlId(linkedControl.id)}
                              className="flex items-center gap-1.5 px-2 py-1 text-xs text-text-secondary hover:text-accent-400 transition-colors"
                            >
                              <MessageSquarePlus size={14} />
                              Request Change
                            </button>
                          )}
                        </div>
                      )}

                      {/* Control Testing Section */}
                      <ControlTestSection rowId={row.id} control={linkedControl} />

                      {/* Remediation Section */}
                      <RemediationSection
                        rowId={row.id}
                        control={linkedControl}
                        tests={controlTests.filter(t => t.controlId === linkedControl.id)}
                        grossScore={row.grossScore}
                      />

                      {/* Tickets Section */}
                      <TicketsSection controlId={linkedControl.id} controlName={linkedControl.name} />

                      {/* Comments Section */}
                      <CommentsSection
                        entityType="control"
                        entityId={linkedControl.id}
                      />
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* Add control form (Risk Manager only) */}
          {canEditControlDefinitions && (
            <div className="p-4 border-t border-surface-border">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  placeholder="New control name..."
                  className="flex-1 px-3 py-2 bg-surface-overlay border border-surface-border rounded-lg text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-accent-500"
                  onKeyDown={(e) => e.key === 'Enter' && handleAddControl()}
                />
                <button
                  onClick={handleAddControl}
                  disabled={!newDescription.trim()}
                  className="px-4 py-2 bg-accent-500 text-white rounded-lg font-medium hover:bg-accent-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  <Plus size={16} />
                  Add
                </button>
              </div>
              {availableControls.length > 0 && (
                <button
                  onClick={() => setShowLinkExistingDialog(true)}
                  className="mt-2 w-full px-3 py-2 border border-dashed border-surface-border rounded-lg text-sm text-text-secondary hover:text-accent-400 hover:border-accent-500 transition-colors flex items-center justify-center gap-2"
                >
                  <Link2 size={16} />
                  Link Existing Control ({availableControls.length} available)
                </button>
              )}
            </div>
          )}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>

    {/* Link Existing Control Dialog */}
    <Dialog.Root open={showLinkExistingDialog} onOpenChange={setShowLinkExistingDialog}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/60 z-50" />
        <Dialog.Content className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[450px] max-h-[80vh] bg-surface-elevated border border-surface-border rounded-lg shadow-xl z-50 flex flex-col overflow-hidden">
          <div className="flex items-center justify-between p-4 border-b border-surface-border">
            <div>
              <Dialog.Title className="text-lg font-semibold text-text-primary">
                Link Existing Control
              </Dialog.Title>
              <Dialog.Description className="text-xs text-text-muted mt-1">
                Linking to: {row.riskId} - {row.riskName}
              </Dialog.Description>
            </div>
            <Dialog.Close asChild>
              <button className="p-2 rounded-lg hover:bg-surface-overlay transition-colors">
                <X size={20} className="text-text-secondary" />
              </button>
            </Dialog.Close>
          </div>
          <div className="p-4 border-b border-surface-border">
            <div className="relative">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
              <input
                type="text"
                value={linkSearch}
                onChange={(e) => setLinkSearch(e.target.value)}
                placeholder="Search controls..."
                className="w-full pl-9 pr-3 py-2 bg-surface-overlay border border-surface-border rounded-lg text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-accent-500"
                autoFocus
              />
            </div>
          </div>
          <div className="flex-1 overflow-auto p-4">
            {filteredControls.length === 0 ? (
              <p className="text-sm text-text-secondary text-center py-8">
                {linkSearch ? 'No controls match your search.' : 'No controls available to link.'}
              </p>
            ) : (
              <div className="space-y-2">
                {filteredControls.map(control => {
                  const linkCount = getLinkCount(control.id)
                  return (
                    <button
                      key={control.id}
                      onClick={() => handleLinkExistingControl(control.id)}
                      className="w-full flex items-center justify-between p-3 bg-surface-overlay rounded-lg border border-surface-border hover:border-accent-500 transition-colors text-left"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-text-primary truncate">{control.name}</p>
                        <p className="text-xs text-text-secondary mt-0.5">
                          {control.controlType ?? 'No type'} | Linked to {linkCount} {linkCount === 1 ? 'risk' : 'risks'}
                        </p>
                      </div>
                      <Link2 size={16} className="text-text-muted ml-2 flex-shrink-0" />
                    </button>
                  )
                })}
              </div>
            )}
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>

    </>
  )
}
