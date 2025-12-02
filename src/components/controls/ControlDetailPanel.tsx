import { useState, useEffect, useMemo } from 'react'
import * as Dialog from '@radix-ui/react-dialog'
import { toast } from 'sonner'
import { X, Link2, Unlink, Plus, Trash2, AlertTriangle, Check, ChevronDown, ChevronUp, RefreshCw, Send, Loader2 } from 'lucide-react'
import { useControlsStore } from '@/stores/controlsStore'
import { useControls, useUpdateControl, useDeleteControl } from '@/hooks/useControls'
import { useControlLinks, useLinkControl, useUnlinkControl, useUpdateLink } from '@/hooks/useControlLinks'
import { useRCTStore } from '@/stores/rctStore'
import { useRCTRows } from '@/hooks/useRCTRows'
import { useTaxonomy } from '@/hooks/useTaxonomy'
import { useControlTesters } from '@/hooks/useProfiles'
import { useTestHistory } from '@/hooks/useControlTests'
import { useApprovalStore } from '@/stores/approvalStore'
import { useUIStore } from '@/stores/uiStore'
import { usePermissions } from '@/hooks/usePermissions'
import { useSendNotification } from '@/hooks/useSendNotification'
import { ScoreDropdown } from '@/components/rct/ScoreDropdown'
import { HeatmapCell } from '@/components/rct/HeatmapCell'
import { ApprovalBadge, DiffViewer } from '@/components/approval'
import { ControlTestSection } from '@/components/rct/ControlTestSection'
import { RemediationSection } from '@/components/rct/RemediationSection'
import { TicketsSection } from '@/components/tickets'
import { CommentsSection } from '@/components/rct/CommentsSection'
import { TestStepsEditor } from '@/components/controls/TestStepsEditor'
import type { Control, ControlType, RCTRow, TestStep } from '@/types/rct'
import type { TaxonomyItem } from '@/types/taxonomy'
import type { PendingChange } from '@/types/approval'
import type { RCTRowData } from '@/hooks/useRCTRows'

const CONTROL_TYPES: ControlType[] = [
  'Preventative', 'Detective', 'Corrective', 'Directive', 'Deterrent',
  'Compensating', 'Acceptance', 'Tolerance', 'Manual', 'Automated',
]

// Demo profile UUIDs from supabase/seed-scripts/38-02-demo-profiles.sql
const DEMO_TESTERS = [
  { id: 'a1b2c3d4-e5f6-7890-abcd-ef1234567891', name: 'Alice Tester' },
  { id: 'a1b2c3d4-e5f6-7890-abcd-ef1234567892', name: 'Bob Tester' },
  { id: 'a1b2c3d4-e5f6-7890-abcd-ef1234567893', name: 'Carol Tester' },
] as const

// Labels for diff viewer
const FIELD_LABELS: Record<string, string> = {
  name: 'Name',
  description: 'Description',
  controlType: 'Type',
  netProbability: 'Net Probability',
  netImpact: 'Net Impact',
  testFrequency: 'Test Frequency',
  testProcedure: 'Test Procedure',
}

// Inline indicator showing pending proposed value vs current value
function PendingChangeIndicator({
  currentValue,
  proposedValue,
}: {
  currentValue: unknown
  proposedValue: unknown
}) {
  return (
    <div className="mt-1 px-2 py-1 bg-amber-500/10 border border-amber-500/30 rounded text-xs">
      <span className="text-amber-400">Pending approval:</span>
      <span className="text-text-secondary ml-1">
        {String(currentValue || '(empty)')}
        <span className="text-text-muted mx-1">-&gt;</span>
        <span className="text-amber-400">{String(proposedValue || '(empty)')}</span>
      </span>
    </div>
  )
}

// Inline indicator showing rejected field with reason and revise button
function RejectedFieldIndicator({
  field,
  rejectedChange,
  onRevise,
}: {
  field: string
  rejectedChange: PendingChange
  onRevise: (change: PendingChange) => void
}) {
  return (
    <div className="mt-1 px-2 py-1.5 bg-red-500/10 border border-red-500/30 rounded text-xs">
      <div className="flex items-center justify-between">
        <div>
          <span className="text-red-400">Rejected:</span>
          <span className="text-text-secondary ml-1">
            Your change to &quot;{String(rejectedChange.proposedValues[field])}&quot; was not approved
          </span>
        </div>
        <button
          onClick={() => onRevise(rejectedChange)}
          className="px-2 py-0.5 text-xs text-accent-400 hover:text-accent-300 transition-colors"
        >
          Revise
        </button>
      </div>
      {rejectedChange.rejectionReason && (
        <p className="text-text-muted mt-1">Reason: {rejectedChange.rejectionReason}</p>
      )}
    </div>
  )
}

/**
 * Find a taxonomy item by ID in a nested tree structure
 */
function findTaxonomyById(items: TaxonomyItem[], id: string): TaxonomyItem | undefined {
  for (const item of items) {
    if (item.id === id) return item
    if (item.children) {
      const found = findTaxonomyById(item.children, id)
      if (found) return found
    }
  }
  return undefined
}

/**
 * Denormalize a database RCT row to include risk/process names
 */
function denormalizeRow(
  row: RCTRowData,
  risks: TaxonomyItem[],
  processes: TaxonomyItem[]
): { riskName: string; processName: string; riskId: string; processId: string; id: string } {
  const riskItem = findTaxonomyById(risks, row.riskId)
  const processItem = findTaxonomyById(processes, row.processId)

  return {
    id: row.id,
    riskId: row.riskId,
    processId: row.processId,
    riskName: riskItem?.name || row.riskId,
    processName: processItem?.name || row.processId,
  }
}

interface ControlDetailPanelProps {
  isOpen: boolean
  onClose: () => void
  controlId: string | null
  isDemoMode: boolean
}

export function ControlDetailPanel({ isOpen, onClose, controlId, isDemoMode }: ControlDetailPanelProps) {
  // Store data for demo mode
  const storeControls = useControlsStore((s) => s.controls)
  const storeControlLinks = useControlsStore((s) => s.controlLinks)
  const storeUpdateControl = useControlsStore((s) => s.updateControl)
  const storeLinkControl = useControlsStore((s) => s.linkControl)
  const storeUnlinkControl = useControlsStore((s) => s.unlinkControl)
  const storeUpdateLink = useControlsStore((s) => s.updateLink)
  const storeRemoveControl = useControlsStore((s) => s.removeControl)

  const storeRows = useRCTStore(state => state.rows)

  // Database hooks for authenticated mode
  const { data: dbControls } = useControls()
  const { data: dbControlLinks } = useControlLinks()
  const { data: dbRows } = useRCTRows()
  const { data: dbRisks } = useTaxonomy('risk')
  const { data: dbProcesses } = useTaxonomy('process')
  const { data: dbControlTesters } = useControlTesters()

  // Get tests for this control (for Remediation section)
  const { data: controlTests } = useTestHistory(controlId || '')

  const updateMutation = useUpdateControl()
  const deleteMutation = useDeleteControl()
  const linkMutation = useLinkControl()
  const unlinkMutation = useUnlinkControl()
  const updateLinkMutation = useUpdateLink()

  // Use appropriate data source
  const controls = isDemoMode ? storeControls : (dbControls || [])
  const controlLinks = isDemoMode ? storeControlLinks : (dbControlLinks || [])
  const controlTesters = isDemoMode ? [] : (dbControlTesters || [])

  // Denormalize rows with taxonomy names when using database
  const rows = useMemo(() => {
    if (isDemoMode) {
      return storeRows
    }
    if (!dbRows || !dbRisks || !dbProcesses) {
      return []
    }
    return dbRows.map(row => denormalizeRow(row, dbRisks, dbProcesses))
  }, [isDemoMode, storeRows, dbRows, dbRisks, dbProcesses]) as Array<{ id: string; riskId: string; processId: string; riskName: string; processName: string }>

  const { canEditControlDefinitions, canEditNetScores, isManager } = usePermissions()
  const { getPendingForEntity, approveChange, rejectChange, createPendingChange, pendingChanges, isApprovalRequired } = useApprovalStore()
  const role = useUIStore((state) => state.selectedRole)
  const { sendNotification } = useSendNotification()

  const [showLinkDialog, setShowLinkDialog] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [showPendingChanges, setShowPendingChanges] = useState(true)
  const [rejectingId, setRejectingId] = useState<string | null>(null)
  const [rejectReason, setRejectReason] = useState('')

  const control = controls.find(c => c.id === controlId)
  const links = controlLinks.filter(l => l.controlId === controlId)
  const linkedRowIds = new Set(links.map(l => l.rowId))
  const linkedRows = rows.filter(r => linkedRowIds.has(r.id))
  const unlinkedRows = rows.filter(r => !linkedRowIds.has(r.id))

  // Get pending changes for this control
  const controlPendingChanges = controlId ? getPendingForEntity(controlId) : []
  const hasPendingChanges = controlPendingChanges.length > 0

  // Get rejected changes (for Risk Manager to see and revise)
  const rejectedChanges = controlId
    ? pendingChanges.filter(
        (c) => c.entityId === controlId && c.status === 'rejected'
      )
    : []

  // Get my pending changes (non-Manager) - changes submitted by current role awaiting approval
  const myPendingChanges = controlPendingChanges.filter(
    (c) => c.submittedBy === role && c.status === 'pending'
  )

  // Helper to get pending value for a field
  const getPendingValue = (field: string): unknown | undefined => {
    for (const change of myPendingChanges) {
      if (change.proposedValues[field] !== undefined) {
        return change.proposedValues[field]
      }
    }
    return undefined
  }

  const hasPendingForField = (field: string): boolean => {
    return myPendingChanges.some((c) => c.proposedValues[field] !== undefined)
  }

  // Helper to check if a field was rejected
  const getRejectedForField = (field: string): PendingChange | undefined => {
    return rejectedChanges.find((c) => c.proposedValues[field] !== undefined)
  }

  // Local state for editing
  const [localName, setLocalName] = useState('')
  const [localDescription, setLocalDescription] = useState('')
  const [localType, setLocalType] = useState<ControlType | null>(null)
  const [localNetProbability, setLocalNetProbability] = useState<number | null>(null)
  const [localNetImpact, setLocalNetImpact] = useState<number | null>(null)

  // Draft state for explicit submission workflow
  const [draftChanges, setDraftChanges] = useState<Record<string, unknown>>({})
  const hasDraftChanges = Object.keys(draftChanges).length > 0

  // Check if approval is required for this control
  const requiresApproval = controlId ? isApprovalRequired('control', controlId) && !isManager : false

  // Sync local state when control ID changes (not on every control reference change)
  useEffect(() => {
    if (control) {
      setLocalName(control.name)
      setLocalDescription(control.description ?? '')
      setLocalType(control.controlType)
      setLocalNetProbability(control.netProbability)
      setLocalNetImpact(control.netImpact)
      // Clear drafts when switching to different control
      setDraftChanges({})
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [controlId]) // Use controlId instead of control object to prevent clearing drafts on re-renders

  if (!control) return null

  // Update control helper
  const doUpdateControl = (updates: Partial<Control>) => {
    if (isDemoMode) {
      storeUpdateControl(control.id, updates)
    } else {
      updateMutation.mutate({ id: control.id, ...updates })
    }
  }

  // Handler to accumulate draft changes (for explicit submission)
  const addToDraft = (field: string, value: unknown) => {
    setDraftChanges(prev => ({ ...prev, [field]: value }))
  }

  const handleNameBlur = () => {
    const trimmed = localName.trim()
    if (trimmed !== control.name && trimmed) {
      if (requiresApproval) {
        addToDraft('name', trimmed)
      } else {
        // Manager or no approval required - apply directly
        doUpdateControl({ name: trimmed })
      }
    }
  }

  const handleDescriptionBlur = () => {
    if (localDescription !== (control.description ?? '')) {
      if (requiresApproval) {
        addToDraft('description', localDescription)
      } else {
        doUpdateControl({ description: localDescription })
      }
    }
  }

  const handleTypeChange = (type: ControlType | '') => {
    const newType = type || null
    setLocalType(newType)
    if (requiresApproval) {
      addToDraft('controlType', newType)
    } else {
      doUpdateControl({ controlType: newType })
    }
  }

  const handleScoreChange = (field: 'netProbability' | 'netImpact', value: number) => {
    if (field === 'netProbability') {
      setLocalNetProbability(value)
    } else {
      setLocalNetImpact(value)
    }
    if (requiresApproval) {
      addToDraft(field, value)
    } else {
      doUpdateControl({ [field]: value })
    }
  }

  // Submit all draft changes as a single pending change
  const handleSubmitChanges = () => {
    if (!hasDraftChanges || !control) return

    // Build current values for the changed fields
    const currentValues: Record<string, unknown> = {}
    for (const key of Object.keys(draftChanges)) {
      currentValues[key] = control[key as keyof Control]
    }

    try {
      createPendingChange({
        entityType: 'control',
        entityId: control.id,
        entityName: control.name,
        changeType: 'update',
        proposedValues: draftChanges,
        currentValues,
        submittedBy: role,
      })

      // Clear drafts after submission
      setDraftChanges({})

      // Show success notification
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
  }

  const handleLinkRow = (rowId: string) => {
    if (isDemoMode) {
      storeLinkControl(control.id, rowId)
    } else {
      linkMutation.mutate({ controlId: control.id, rowId })
    }
  }

  const handleUnlinkRow = (rowId: string) => {
    const link = links.find(l => l.rowId === rowId)
    if (link) {
      if (isDemoMode) {
        storeUnlinkControl(link.id)
      } else {
        unlinkMutation.mutate(link.id)
      }
    }
  }

  const handleLinkScoreChange = (
    linkId: string,
    field: 'netProbability' | 'netImpact',
    value: number | null
  ) => {
    if (isDemoMode) {
      storeUpdateLink(linkId, { [field]: value })
    } else {
      updateLinkMutation.mutate({
        id: linkId,
        [field]: value,
      })
    }
  }

  const handleClearLinkOverride = (linkId: string) => {
    if (isDemoMode) {
      storeUpdateLink(linkId, { netProbability: null, netImpact: null, netScore: null })
    } else {
      updateLinkMutation.mutate({
        id: linkId,
        netProbability: null,
        netImpact: null,
      })
    }
  }

  const handleDeleteControl = async () => {
    if (isDemoMode) {
      storeRemoveControl(control.id)
      setShowDeleteDialog(false)
      onClose()
    } else {
      try {
        await deleteMutation.mutateAsync(control.id)
        setShowDeleteDialog(false)
        onClose()
      } catch (error) {
        console.error('Failed to delete control:', error)
        toast.error('Failed to delete control')
      }
    }
  }

  const handleUnlinkAll = () => {
    // Unlink from all risks but keep the control
    links.forEach(link => {
      if (isDemoMode) {
        storeUnlinkControl(link.id)
      } else {
        unlinkMutation.mutate(link.id)
      }
    })
    setShowDeleteDialog(false)
  }

  const handleApprove = (pendingId: string, change: PendingChange) => {
    // First approve the change in the approval store
    approveChange(pendingId)

    // Then apply the actual change based on changeType
    if (change.changeType === 'update') {
      doUpdateControl(change.proposedValues as Partial<typeof control>)
    } else if (change.changeType === 'delete') {
      if (isDemoMode) {
        storeRemoveControl(change.entityId)
      } else {
        deleteMutation.mutate(change.entityId)
      }
      onClose()
    }
    // For 'create' changes, the actual entity creation would be handled separately
  }

  const handleReject = (pendingId: string) => {
    rejectChange(pendingId, rejectReason || undefined)
    setRejectingId(null)
    setRejectReason('')
  }

  const handleReviseAndResubmit = (rejectedChange: PendingChange) => {
    // Create a new pending change with incremented version
    createPendingChange({
      entityType: rejectedChange.entityType,
      entityId: rejectedChange.entityId,
      entityName: rejectedChange.entityName,
      changeType: rejectedChange.changeType,
      proposedValues: rejectedChange.proposedValues,
      currentValues: rejectedChange.currentValues,
      submittedBy: rejectedChange.submittedBy,
    })
    console.log('[Approval] Change resubmitted for approval')
  }

  // Handle dialog close - ensure blur fires first, then clear drafts
  const handleDialogOpenChange = (open: boolean) => {
    if (!open) {
      // Blur active element to trigger any pending saves before closing
      if (document.activeElement instanceof HTMLElement) {
        document.activeElement.blur()
      }
      // Clear any unsaved drafts
      setDraftChanges({})
      onClose()
    }
  }

  return (
    <>
      <Dialog.Root open={isOpen} onOpenChange={handleDialogOpenChange}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 bg-black/60 z-40" />
          <Dialog.Content
            className={`fixed right-0 top-0 h-full w-[500px] bg-surface-elevated border-l shadow-xl z-50 flex flex-col overflow-hidden ${
              hasPendingChanges ? 'border-l-4 border-l-amber-500' : 'border-l border-surface-border'
            }`}
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-surface-border">
              <div className="flex items-center gap-2">
                <Dialog.Title className="text-lg font-semibold text-text-primary">
                  Control Details
                </Dialog.Title>
                {hasPendingChanges && <ApprovalBadge status="pending" />}
                {hasDraftChanges && (
                  <span className="text-xs text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded">
                    Unsaved changes
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                {/* Submit Changes Button - only for non-Manager when approval required */}
                {hasDraftChanges && requiresApproval && (
                  <button
                    onClick={handleSubmitChanges}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-500/20 text-amber-400 rounded-lg text-sm font-medium hover:bg-amber-500/30 transition-colors"
                    title="Submit changes for manager approval"
                  >
                    <Send size={16} />
                    Send for Approval
                  </button>
                )}
                {canEditControlDefinitions && (
                  <button
                    onClick={() => setShowDeleteDialog(true)}
                    className="p-2 rounded-lg hover:bg-red-500/20 text-text-muted hover:text-red-400 transition-colors"
                    title="Delete control"
                  >
                    <Trash2 size={20} />
                  </button>
                )}
                <Dialog.Close asChild>
                  <button className="p-2 rounded-lg hover:bg-surface-overlay transition-colors">
                    <X size={20} className="text-text-secondary" />
                  </button>
                </Dialog.Close>
              </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-auto p-4 space-y-6">
              {/* Rejection Alert Banner - Non-Manager Only */}
              {!isManager && rejectedChanges.length > 0 && (
                <div className="flex items-start gap-3 p-4 bg-red-500/10 border border-red-500/30 rounded-lg">
                  <AlertTriangle size={20} className="text-red-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <h4 className="text-sm font-medium text-red-400">
                      {rejectedChanges.length} {rejectedChanges.length === 1 ? 'change was' : 'changes were'} rejected
                    </h4>
                    <p className="text-xs text-text-secondary mt-1">
                      Your recent changes were not approved. Review the feedback below and revise if needed.
                    </p>
                  </div>
                </div>
              )}

              {/* Pending Changes Section - Manager Only */}
              {isManager && controlPendingChanges.length > 0 && (
                <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg overflow-hidden">
                  <button
                    onClick={() => setShowPendingChanges(!showPendingChanges)}
                    className="w-full flex items-center justify-between p-3 text-sm font-medium text-amber-400 hover:bg-amber-500/10 transition-colors"
                  >
                    <span>Pending Changes ({controlPendingChanges.length})</span>
                    {showPendingChanges ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                  </button>

                  {showPendingChanges && (
                    <div className="p-3 pt-0 space-y-4">
                      {controlPendingChanges.map((change) => (
                        <div key={change.id} className="bg-surface-overlay rounded-lg p-3 border border-surface-border">
                          <div className="flex items-center justify-between mb-3">
                            <span className="text-xs text-text-muted">
                              {change.changeType === 'update' && 'Proposed Update'}
                              {change.changeType === 'delete' && 'Proposed Delete'}
                              {change.changeType === 'create' && 'Proposed Create'}
                            </span>
                            <span className="text-xs text-text-secondary">
                              by {change.submittedBy}
                            </span>
                          </div>

                          {change.changeType === 'update' && (
                            <DiffViewer
                              currentValues={change.currentValues}
                              proposedValues={change.proposedValues}
                              fieldLabels={FIELD_LABELS}
                            />
                          )}

                          {change.changeType === 'delete' && (
                            <p className="text-sm text-red-400">
                              This control will be permanently deleted.
                            </p>
                          )}

                          <div className="flex items-center gap-2 mt-4">
                            {rejectingId === change.id ? (
                              <div className="flex-1 flex items-center gap-2">
                                <input
                                  type="text"
                                  value={rejectReason}
                                  onChange={(e) => setRejectReason(e.target.value)}
                                  placeholder="Reason (optional)"
                                  className="flex-1 px-2 py-1 text-sm bg-surface-overlay border border-surface-border rounded text-text-primary"
                                  autoFocus
                                />
                                <button
                                  onClick={() => handleReject(change.id)}
                                  className="px-3 py-1 text-sm bg-red-500/20 text-red-400 rounded hover:bg-red-500/30 transition-colors"
                                >
                                  Reject
                                </button>
                                <button
                                  onClick={() => {
                                    setRejectingId(null)
                                    setRejectReason('')
                                  }}
                                  className="px-2 py-1 text-sm text-text-muted hover:text-text-primary transition-colors"
                                >
                                  Cancel
                                </button>
                              </div>
                            ) : (
                              <>
                                <button
                                  onClick={() => handleApprove(change.id, change)}
                                  className="flex items-center gap-1 px-3 py-1.5 text-sm bg-green-500/20 text-green-400 rounded-lg hover:bg-green-500/30 transition-colors"
                                >
                                  <Check size={14} />
                                  Approve
                                </button>
                                <button
                                  onClick={() => setRejectingId(change.id)}
                                  className="flex items-center gap-1 px-3 py-1.5 text-sm bg-red-500/20 text-red-400 rounded-lg hover:bg-red-500/30 transition-colors"
                                >
                                  <X size={14} />
                                  Reject
                                </button>
                              </>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Rejected Changes Section - Non-Manager Only */}
              {!isManager && rejectedChanges.length > 0 && (
                <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 space-y-3">
                  <h4 className="text-sm font-medium text-red-400">Rejected Changes</h4>
                  {rejectedChanges.map((change) => (
                    <div key={change.id} className="bg-surface-overlay rounded-lg p-3 border border-surface-border">
                      <div className="flex items-center gap-2 mb-2">
                        <ApprovalBadge status="rejected" compact />
                        <span className="text-sm text-text-primary">
                          {change.changeType === 'update' && 'Update rejected'}
                          {change.changeType === 'delete' && 'Delete rejected'}
                        </span>
                      </div>

                      {change.rejectionReason && (
                        <p className="text-sm text-text-secondary mb-3">
                          Reason: {change.rejectionReason}
                        </p>
                      )}

                      <DiffViewer
                        currentValues={change.currentValues}
                        proposedValues={change.proposedValues}
                        fieldLabels={FIELD_LABELS}
                      />

                      <button
                        onClick={() => handleReviseAndResubmit(change)}
                        className="flex items-center gap-1 mt-3 px-3 py-1.5 text-sm bg-accent-500/20 text-accent-400 rounded-lg hover:bg-accent-500/30 transition-colors"
                      >
                        <RefreshCw size={14} />
                        Revise and Resubmit
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* My Pending Changes Summary - Non-Manager Only */}
              {!isManager && myPendingChanges.length > 0 && (
                <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-lg">
                  <p className="text-sm text-amber-400">
                    You have {myPendingChanges.length} pending {myPendingChanges.length === 1 ? 'change' : 'changes'} awaiting Manager approval
                  </p>
                </div>
              )}

              {/* Control Info */}
              <div className="space-y-4">
                <div className={`${getRejectedForField('name') ? 'ring-1 ring-red-500/50 rounded-lg p-2 -m-2' : ''} ${draftChanges.name !== undefined ? 'ring-1 ring-amber-500/50 rounded-lg p-2 -m-2' : ''}`}>
                  <label className="text-xs text-text-muted block mb-1">Name</label>
                  <input
                    type="text"
                    value={localName}
                    onChange={(e) => setLocalName(e.target.value)}
                    onBlur={handleNameBlur}
                    disabled={!canEditControlDefinitions}
                    className="w-full px-3 py-2 bg-surface-overlay border border-surface-border rounded-lg text-sm text-text-primary disabled:opacity-50"
                  />
                  {draftChanges.name !== undefined && (
                    <div className="mt-1 text-xs text-amber-400">Draft: will be submitted for approval</div>
                  )}
                  {!isManager && hasPendingForField('name') && (
                    <PendingChangeIndicator
                      currentValue={control.name}
                      proposedValue={getPendingValue('name')}
                    />
                  )}
                  {!isManager && getRejectedForField('name') && (
                    <RejectedFieldIndicator
                      field="name"
                      rejectedChange={getRejectedForField('name')!}
                      onRevise={handleReviseAndResubmit}
                    />
                  )}
                </div>

                <div className={`${getRejectedForField('description') ? 'ring-1 ring-red-500/50 rounded-lg p-2 -m-2' : ''} ${draftChanges.description !== undefined ? 'ring-1 ring-amber-500/50 rounded-lg p-2 -m-2' : ''}`}>
                  <label className="text-xs text-text-muted block mb-1">Description</label>
                  <textarea
                    value={localDescription}
                    onChange={(e) => setLocalDescription(e.target.value)}
                    onBlur={handleDescriptionBlur}
                    disabled={!canEditControlDefinitions}
                    rows={3}
                    className="w-full px-3 py-2 bg-surface-overlay border border-surface-border rounded-lg text-sm text-text-primary resize-y min-h-[80px] disabled:opacity-50"
                  />
                  {draftChanges.description !== undefined && (
                    <div className="mt-1 text-xs text-amber-400">Draft: will be submitted for approval</div>
                  )}
                  {!isManager && hasPendingForField('description') && (
                    <PendingChangeIndicator
                      currentValue={control.description || ''}
                      proposedValue={getPendingValue('description')}
                    />
                  )}
                  {!isManager && getRejectedForField('description') && (
                    <RejectedFieldIndicator
                      field="description"
                      rejectedChange={getRejectedForField('description')!}
                      onRevise={handleReviseAndResubmit}
                    />
                  )}
                </div>

                <div className={`${getRejectedForField('controlType') ? 'ring-1 ring-red-500/50 rounded-lg p-2 -m-2' : ''} ${draftChanges.controlType !== undefined ? 'ring-1 ring-amber-500/50 rounded-lg p-2 -m-2' : ''}`}>
                  <label className="text-xs text-text-muted block mb-1">Type</label>
                  <select
                    value={localType ?? ''}
                    onChange={(e) => handleTypeChange(e.target.value as ControlType | '')}
                    disabled={!canEditControlDefinitions}
                    className="w-full px-3 py-2 bg-surface-overlay border border-surface-border rounded-lg text-sm text-text-primary disabled:opacity-50"
                  >
                    <option value="">Select type...</option>
                    {CONTROL_TYPES.map(type => (
                      <option key={type} value={type}>{type}</option>
                    ))}
                  </select>
                  {draftChanges.controlType !== undefined && (
                    <div className="mt-1 text-xs text-amber-400">Draft: will be submitted for approval</div>
                  )}
                  {!isManager && hasPendingForField('controlType') && (
                    <PendingChangeIndicator
                      currentValue={control.controlType || '(none)'}
                      proposedValue={getPendingValue('controlType')}
                    />
                  )}
                  {!isManager && getRejectedForField('controlType') && (
                    <RejectedFieldIndicator
                      field="controlType"
                      rejectedChange={getRejectedForField('controlType')!}
                      onRevise={handleReviseAndResubmit}
                    />
                  )}
                </div>

                {/* Tester Assignment - Risk Manager only */}
                {canEditControlDefinitions && (
                  <div>
                    <label className="text-xs text-text-muted block mb-1">Assigned Tester</label>
                    <select
                      value={control.assignedTesterId ?? ''}
                      onChange={(e) => {
                        const newTesterId = e.target.value || null
                        const previousTesterId = control.assignedTesterId

                        // Update the control assignment
                        doUpdateControl({
                          assignedTesterId: newTesterId,
                        })

                        // Send notification only when assigning (not clearing) and to a different tester
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
                      className="w-full px-3 py-2 bg-surface-overlay border border-surface-border rounded-lg text-sm text-text-primary"
                    >
                      <option value="">Unassigned</option>
                      {isDemoMode ? (
                        DEMO_TESTERS.map(tester => (
                          <option key={tester.id} value={tester.id}>
                            {tester.name}
                          </option>
                        ))
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

                {/* Scores */}
                <div className="grid grid-cols-3 gap-4">
                  <div className={`${getRejectedForField('netProbability') ? 'ring-1 ring-red-500/50 rounded-lg p-2 -m-2' : ''} ${draftChanges.netProbability !== undefined ? 'ring-1 ring-amber-500/50 rounded-lg p-2 -m-2' : ''}`}>
                    <label className="text-xs text-text-muted block mb-1">Net Probability</label>
                    <ScoreDropdown
                      value={localNetProbability}
                      onChange={(v) => handleScoreChange('netProbability', v)}
                      type="probability"
                      disabled={!canEditNetScores}
                    />
                    {!isManager && hasPendingForField('netProbability') && (
                      <PendingChangeIndicator
                        currentValue={control.netProbability}
                        proposedValue={getPendingValue('netProbability')}
                      />
                    )}
                    {!isManager && getRejectedForField('netProbability') && (
                      <RejectedFieldIndicator
                        field="netProbability"
                        rejectedChange={getRejectedForField('netProbability')!}
                        onRevise={handleReviseAndResubmit}
                      />
                    )}
                  </div>
                  <div className={`${getRejectedForField('netImpact') ? 'ring-1 ring-red-500/50 rounded-lg p-2 -m-2' : ''} ${draftChanges.netImpact !== undefined ? 'ring-1 ring-amber-500/50 rounded-lg p-2 -m-2' : ''}`}>
                    <label className="text-xs text-text-muted block mb-1">Net Impact</label>
                    <ScoreDropdown
                      value={localNetImpact}
                      onChange={(v) => handleScoreChange('netImpact', v)}
                      type="impact"
                      disabled={!canEditNetScores}
                    />
                    {!isManager && hasPendingForField('netImpact') && (
                      <PendingChangeIndicator
                        currentValue={control.netImpact}
                        proposedValue={getPendingValue('netImpact')}
                      />
                    )}
                    {!isManager && getRejectedForField('netImpact') && (
                      <RejectedFieldIndicator
                        field="netImpact"
                        rejectedChange={getRejectedForField('netImpact')!}
                        onRevise={handleReviseAndResubmit}
                      />
                    )}
                  </div>
                  <div>
                    <label className="text-xs text-text-muted block mb-1">Net Score</label>
                    <HeatmapCell score={control.netScore} />
                  </div>
                </div>
              </div>

              {/* Linked Risks */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-medium text-text-primary flex items-center gap-2">
                    <Link2 size={16} />
                    Linked Risks ({links.length})
                  </h3>
                  {canEditControlDefinitions && unlinkedRows.length > 0 && (
                    <button
                      onClick={() => setShowLinkDialog(true)}
                      className="flex items-center gap-1 px-2 py-1 text-xs text-accent-400 hover:text-accent-300 transition-colors"
                    >
                      <Plus size={14} />
                      Link to Risk
                    </button>
                  )}
                </div>

                {linkedRows.length === 0 ? (
                  <p className="text-sm text-text-secondary py-4 text-center bg-surface-overlay rounded-lg">
                    This control is not linked to any risks.
                  </p>
                ) : (
                  <div className="space-y-3">
                    {linkedRows.map(row => {
                      const link = links.find(l => l.rowId === row.id)!
                      const hasOverride = link.netProbability !== null || link.netImpact !== null
                      // Compute displayed values: link override or fall back to control base
                      const displayP = link.netProbability ?? control.netProbability
                      const displayI = link.netImpact ?? control.netImpact
                      const displayScore = link.netScore ?? control.netScore

                      return (
                        <div
                          key={row.id}
                          className="p-3 bg-surface-overlay rounded-lg border border-surface-border"
                        >
                          <div className="flex items-start justify-between mb-3">
                            <div>
                              <p className="text-sm text-text-primary">{row.riskName}</p>
                              <p className="text-xs text-text-muted">ID: {row.riskId}</p>
                              <p className="text-xs text-text-secondary">{row.processName}</p>
                            </div>
                            <div className="flex items-center gap-1">
                              {hasOverride && (
                                <button
                                  onClick={() => handleClearLinkOverride(link.id)}
                                  disabled={!canEditNetScores}
                                  className="px-2 py-1 text-xs text-text-secondary hover:text-text-primary transition-colors disabled:opacity-50"
                                  title="Clear override, use control defaults"
                                >
                                  Reset
                                </button>
                              )}
                              {canEditControlDefinitions && (
                                <button
                                  onClick={() => handleUnlinkRow(row.id)}
                                  disabled={unlinkMutation.isPending}
                                  className="p-1.5 rounded hover:bg-red-500/20 text-text-muted hover:text-red-400 transition-colors disabled:opacity-50"
                                  title="Unlink from this risk"
                                >
                                  {unlinkMutation.isPending ? (
                                    <Loader2 size={14} className="animate-spin" />
                                  ) : (
                                    <Unlink size={14} />
                                  )}
                                </button>
                              )}
                            </div>
                          </div>

                          {/* Per-link score editing */}
                          <div className="pt-3 border-t border-surface-border">
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-xs text-text-muted">Scores for this risk</span>
                              {hasOverride && (
                                <span className="text-xs text-accent-400">Override active</span>
                              )}
                            </div>
                            <div className="grid grid-cols-3 gap-3">
                              <div>
                                <label className="text-xs text-text-muted block mb-1">Net P</label>
                                <ScoreDropdown
                                  value={displayP}
                                  onChange={(v) => handleLinkScoreChange(link.id, 'netProbability', v)}
                                  type="probability"
                                  disabled={!canEditNetScores}
                                />
                              </div>
                              <div>
                                <label className="text-xs text-text-muted block mb-1">Net I</label>
                                <ScoreDropdown
                                  value={displayI}
                                  onChange={(v) => handleLinkScoreChange(link.id, 'netImpact', v)}
                                  type="impact"
                                  disabled={!canEditNetScores}
                                />
                              </div>
                              <div>
                                <label className="text-xs text-text-muted block mb-1">Net Score</label>
                                <HeatmapCell score={displayScore} />
                              </div>
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>

              {/* Test Steps Section */}
              {control && (
                <TestStepsEditor
                  controlId={control.id}
                  steps={control.testSteps || []}
                  onChange={(steps: TestStep[]) => doUpdateControl({ testSteps: steps })}
                  disabled={!canEditControlDefinitions}
                />
              )}

              {/* Info message for controls with no linked rows */}
              {control && linkedRows.length === 0 && (
                <div className="text-sm text-text-muted p-3 bg-surface-overlay rounded-lg border border-surface-border">
                  Link this control to a risk to enable testing and remediation tracking.
                </div>
              )}

              {/* Testing Section */}
              {control && linkedRows.length > 0 && (
                <ControlTestSection
                  rowId={linkedRows[0].id}
                  control={control}
                />
              )}

              {/* Remediation Section */}
              {control && linkedRows.length > 0 && (
                <RemediationSection
                  rowId={linkedRows[0].id}
                  control={control}
                  tests={controlTests || []}
                  grossScore={null}
                />
              )}

              {/* Tickets Section */}
              {control && (
                <TicketsSection
                  controlId={control.id}
                  controlName={control.name}
                />
              )}

              {/* Comments Section */}
              {control && (
                <CommentsSection
                  entityType="control"
                  entityId={control.id}
                />
              )}
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>

      {/* Link Dialog */}
      <Dialog.Root open={showLinkDialog} onOpenChange={setShowLinkDialog}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 bg-black/60 z-50" />
          <Dialog.Content className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] max-h-[80vh] bg-surface-elevated border border-surface-border rounded-lg shadow-xl z-50 flex flex-col overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b border-surface-border">
              <Dialog.Title className="text-lg font-semibold text-text-primary">
                Link to Risk
              </Dialog.Title>
              <Dialog.Close asChild>
                <button className="p-2 rounded-lg hover:bg-surface-overlay transition-colors">
                  <X size={20} className="text-text-secondary" />
                </button>
              </Dialog.Close>
            </div>
            <div className="flex-1 overflow-auto p-4">
              {unlinkedRows.length === 0 ? (
                <p className="text-sm text-text-secondary text-center py-4">
                  All risks are already linked to this control.
                </p>
              ) : (
                <div className="space-y-2">
                  {unlinkedRows.map(row => (
                    <button
                      key={row.id}
                      onClick={() => {
                        handleLinkRow(row.id)
                        setShowLinkDialog(false)
                      }}
                      disabled={linkMutation.isPending}
                      className="w-full flex items-center justify-between p-3 bg-surface-overlay rounded-lg border border-surface-border hover:border-accent-500 transition-colors text-left disabled:opacity-50"
                    >
                      <div>
                        <p className="text-sm text-text-primary">{row.riskName}</p>
                        <p className="text-xs text-text-secondary">{row.processName}</p>
                      </div>
                      {linkMutation.isPending ? (
                        <Loader2 size={16} className="animate-spin text-text-muted" />
                      ) : (
                        <Link2 size={16} className="text-text-muted" />
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>

      {/* Delete Confirmation Dialog */}
      <Dialog.Root open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 bg-black/60 z-50" />
          <Dialog.Content className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[450px] bg-surface-elevated border border-surface-border rounded-lg shadow-xl z-50 overflow-hidden">
            <div className="flex items-center gap-3 p-4 border-b border-surface-border bg-red-500/10">
              <AlertTriangle size={24} className="text-red-400" />
              <Dialog.Title className="text-lg font-semibold text-text-primary">
                Delete Control
              </Dialog.Title>
            </div>
            <div className="p-4 space-y-4">
              <p className="text-sm text-text-secondary">
                Are you sure you want to delete <span className="font-medium text-text-primary">{control.name}</span>?
              </p>

              {links.length > 0 && (
                <div className="p-3 bg-surface-overlay rounded-lg border border-surface-border">
                  <p className="text-sm text-text-primary mb-2">
                    This control is linked to {links.length} {links.length === 1 ? 'risk' : 'risks'}:
                  </p>
                  <ul className="text-xs text-text-secondary space-y-1 max-h-32 overflow-auto">
                    {linkedRows.map(row => (
                      <li key={row.id} className="flex items-center gap-2">
                        <span className="text-text-muted">{row.riskId}</span>
                        <span>{row.riskName}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="flex flex-col gap-2 pt-2">
                {links.length > 0 && (
                  <button
                    onClick={handleUnlinkAll}
                    className="w-full px-4 py-2 bg-surface-overlay border border-surface-border rounded-lg text-sm text-text-primary hover:bg-surface-border transition-colors"
                  >
                    Unlink from all risks (keep control)
                  </button>
                )}
                <button
                  onClick={handleDeleteControl}
                  disabled={deleteMutation.isPending}
                  className="w-full px-4 py-2 bg-red-500/20 border border-red-500/50 rounded-lg text-sm text-red-400 hover:bg-red-500/30 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {deleteMutation.isPending && <Loader2 size={16} className="animate-spin" />}
                  Delete control permanently
                </button>
                <button
                  onClick={() => setShowDeleteDialog(false)}
                  className="w-full px-4 py-2 text-sm text-text-secondary hover:text-text-primary transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </>
  )
}
