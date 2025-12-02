import { useState, useMemo } from 'react'
import { ChevronDown, ChevronRight, Plus, ClipboardList, Trash2, Check, Square, CheckSquare } from 'lucide-react'
import { useRCTStore } from '@/stores/rctStore'
import { usePermissions } from '@/hooks/usePermissions'
import { useIsDemoMode } from '@/hooks/useTenantData'
import { useRemediationForControl, useUpdateRemediationStatus, useUpdateRemediationPlan, useDeleteRemediationPlan } from '@/hooks/useRemediationPlans'
import { formatTestDate } from '@/utils/testScheduling'
import { RemediationForm } from './RemediationForm'
import type { Control, ControlTest, RemediationPlan, RemediationStatus } from '@/types/rct'

const STATUS_OPTIONS: { value: RemediationStatus; label: string }[] = [
  { value: 'open', label: 'Open' },
  { value: 'in-progress', label: 'In Progress' },
  { value: 'resolved', label: 'Resolved' },
  { value: 'closed', label: 'Closed' },
]

const STATUS_COLORS: Record<RemediationStatus, string> = {
  'open': 'bg-blue-500/20 text-blue-400',
  'in-progress': 'bg-amber-500/20 text-amber-400',
  'resolved': 'bg-green-500/20 text-green-400',
  'closed': 'bg-surface-overlay text-text-muted',
}

const PRIORITY_COLORS: Record<string, string> = {
  'critical': 'bg-red-500/20 text-red-400',
  'high': 'bg-orange-500/20 text-orange-400',
  'medium': 'bg-amber-500/20 text-amber-400',
  'low': 'bg-green-500/20 text-green-400',
}

interface RemediationSectionProps {
  rowId: string
  control: Control
  tests: ControlTest[]  // Tests for this control (to find deficient ones)
  grossScore: number | null
}

export function RemediationSection({ rowId, control, tests, grossScore }: RemediationSectionProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [selectedTestId, setSelectedTestId] = useState<string | null>(null)
  const [newActionItem, setNewActionItem] = useState<Record<string, string>>({})

  const isDemoMode = useIsDemoMode()

  // Store data (demo mode)
  const storeRemediationPlans = useRCTStore(s => s.remediationPlans)
  const storeUpdateStatus = useRCTStore(s => s.updateRemediationStatus)
  const storeToggleAction = useRCTStore(s => s.toggleActionItem)
  const storeAddAction = useRCTStore(s => s.addActionItem)
  const storeRemoveAction = useRCTStore(s => s.removeActionItem)
  const storeDeletePlan = useRCTStore(s => s.deleteRemediationPlan)

  // Database hooks (auth mode)
  const { data: dbPlans } = useRemediationForControl(control.id)
  const updateStatusMutation = useUpdateRemediationStatus()
  const updatePlanMutation = useUpdateRemediationPlan()
  const deletePlanMutation = useDeleteRemediationPlan()

  // Dual-source selection - filter store plans for this control
  const remediationPlans = isDemoMode
    ? storeRemediationPlans.filter(p => p.controlId === control.id)
    : (dbPlans || [])

  const { canEditControlDefinitions } = usePermissions()

  // Get remediation plans for this control (already filtered in dual-source above)
  const controlRemediations = remediationPlans

  // Find deficient tests (fail/partial) that don't already have remediation
  const deficientTestsWithoutRemediation = useMemo(() => {
    const testsWithRemediation = new Set(controlRemediations.map(p => p.controlTestId))
    return tests.filter(
      t => (t.result === 'fail' || t.result === 'partial') && !testsWithRemediation.has(t.id)
    )
  }, [tests, controlRemediations])

  // Count active remediations (not closed)
  const activeCount = controlRemediations.filter(p => p.status !== 'closed').length

  const handleStartCreate = (testId: string) => {
    setSelectedTestId(testId)
    setShowForm(true)
  }

  const handleFormComplete = () => {
    setShowForm(false)
    setSelectedTestId(null)
  }

  // Wrapper handlers for dual-source mutations
  const handleStatusChange = (planId: string, status: RemediationStatus) => {
    if (isDemoMode) {
      storeUpdateStatus(planId, status)
    } else {
      updateStatusMutation.mutate({ id: planId, status })
    }
  }

  const handleToggleAction = (planId: string, actionId: string) => {
    if (isDemoMode) {
      storeToggleAction(planId, actionId)
    } else {
      const plan = remediationPlans.find(p => p.id === planId)
      if (plan) {
        const updatedItems = plan.actionItems.map(item =>
          item.id === actionId ? { ...item, completed: !item.completed } : item
        )
        updatePlanMutation.mutate({ id: planId, actionItems: updatedItems })
      }
    }
  }

  const handleAddAction = (planId: string, description: string) => {
    if (isDemoMode) {
      storeAddAction(planId, description)
    } else {
      const plan = remediationPlans.find(p => p.id === planId)
      if (plan) {
        const newItem = { id: `ai-${Date.now()}`, description, completed: false }
        updatePlanMutation.mutate({ id: planId, actionItems: [...plan.actionItems, newItem] })
      }
    }
  }

  const handleRemoveAction = (planId: string, actionId: string) => {
    if (isDemoMode) {
      storeRemoveAction(planId, actionId)
    } else {
      const plan = remediationPlans.find(p => p.id === planId)
      if (plan) {
        const updatedItems = plan.actionItems.filter(item => item.id !== actionId)
        updatePlanMutation.mutate({ id: planId, actionItems: updatedItems })
      }
    }
  }

  const handleDeletePlan = (planId: string) => {
    if (isDemoMode) {
      storeDeletePlan(planId)
    } else {
      deletePlanMutation.mutate(planId)
    }
  }

  const handleAddActionItem = (planId: string) => {
    const description = newActionItem[planId]?.trim()
    if (description) {
      handleAddAction(planId, description)
      setNewActionItem(prev => ({ ...prev, [planId]: '' }))
    }
  }

  return (
    <div className="mt-3 pt-3 border-t border-surface-border">
      {/* Header - always visible */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex items-center gap-2 w-full text-left"
      >
        {isExpanded ? (
          <ChevronDown size={16} className="text-text-muted" />
        ) : (
          <ChevronRight size={16} className="text-text-muted" />
        )}
        <ClipboardList size={16} className="text-text-muted" />
        <span className="text-sm font-medium text-text-primary">Remediation</span>

        {/* Quick status indicator - active count */}
        {activeCount > 0 && (
          <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-amber-500/20 text-amber-400">
            {activeCount} active
          </span>
        )}
      </button>

      {/* Expanded content */}
      {isExpanded && (
        <div className="mt-3 space-y-4 pl-6">
          {/* Existing remediation plans */}
          {controlRemediations.length > 0 && (
            <div className="space-y-3">
              {controlRemediations.map(plan => (
                <RemediationPlanCard
                  key={plan.id}
                  plan={plan}
                  canEdit={canEditControlDefinitions}
                  onStatusChange={(status) => handleStatusChange(plan.id, status)}
                  onToggleAction={(actionId) => handleToggleAction(plan.id, actionId)}
                  onRemoveAction={(actionId) => handleRemoveAction(plan.id, actionId)}
                  onAddAction={(description) => handleAddAction(plan.id, description)}
                  onDelete={() => handleDeletePlan(plan.id)}
                  newActionValue={newActionItem[plan.id] || ''}
                  onNewActionChange={(value) => setNewActionItem(prev => ({ ...prev, [plan.id]: value }))}
                  onNewActionSubmit={() => handleAddActionItem(plan.id)}
                />
              ))}
            </div>
          )}

          {/* Create remediation for deficient tests */}
          {deficientTestsWithoutRemediation.length > 0 && canEditControlDefinitions && (
            <div className="space-y-2">
              <h5 className="text-xs font-medium text-text-muted uppercase tracking-wider">
                Deficient Tests Requiring Remediation
              </h5>
              {deficientTestsWithoutRemediation.map(test => (
                <div key={test.id} className="p-2 bg-surface-overlay rounded border border-surface-border">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex-1">
                      <span className={`text-sm font-medium ${test.result === 'fail' ? 'text-red-400' : 'text-amber-400'}`}>
                        {test.result === 'fail' ? 'Failed' : 'Partial'} Test
                      </span>
                      <span className="text-xs text-text-muted ml-2">
                        {formatTestDate(test.testDate)}
                      </span>
                      {test.findings && (
                        <p className="text-xs text-text-secondary mt-1 line-clamp-2">
                          {test.findings}
                        </p>
                      )}
                    </div>
                    {selectedTestId !== test.id && (
                      <button
                        onClick={() => handleStartCreate(test.id)}
                        className="flex items-center gap-1 px-2 py-1 text-xs text-accent-400 hover:text-accent-300 transition-colors"
                      >
                        <Plus size={14} />
                        Create Plan
                      </button>
                    )}
                  </div>
                  {showForm && selectedTestId === test.id && (
                    <div className="mt-3 p-3 bg-surface-elevated rounded border border-surface-border">
                      <RemediationForm
                        rowId={rowId}
                        controlId={control.id}
                        test={test}
                        grossScore={grossScore}
                        onComplete={handleFormComplete}
                      />
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Empty state */}
          {controlRemediations.length === 0 && deficientTestsWithoutRemediation.length === 0 && (
            <p className="text-sm text-text-muted">
              No remediation plans. Record a test with findings to create one.
            </p>
          )}
        </div>
      )}
    </div>
  )
}

interface RemediationPlanCardProps {
  plan: RemediationPlan
  canEdit: boolean
  onStatusChange: (status: RemediationStatus) => void
  onToggleAction: (actionId: string) => void
  onRemoveAction: (actionId: string) => void
  onAddAction: (description: string) => void
  onDelete: () => void
  newActionValue: string
  onNewActionChange: (value: string) => void
  onNewActionSubmit: () => void
}

function RemediationPlanCard({
  plan,
  canEdit,
  onStatusChange,
  onToggleAction,
  onRemoveAction,
  onDelete,
  newActionValue,
  onNewActionChange,
  onNewActionSubmit,
}: RemediationPlanCardProps) {
  const [isExpanded, setIsExpanded] = useState(false)

  // Defensive: ensure actionItems is always an array
  const actionItems = Array.isArray(plan.actionItems) ? plan.actionItems : []
  const completedCount = actionItems.filter(a => a.completed).length
  const totalCount = actionItems.length

  return (
    <div className="p-3 bg-surface-overlay rounded border border-surface-border">
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="flex-1 text-left"
        >
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-medium text-text-primary">{plan.title}</span>
            <span className={`px-1.5 py-0.5 rounded text-xs font-medium ${STATUS_COLORS[plan.status]}`}>
              {plan.status}
            </span>
            <span className={`px-1.5 py-0.5 rounded text-xs font-medium ${PRIORITY_COLORS[plan.priority]}`}>
              {plan.priority}
            </span>
          </div>
          <div className="flex items-center gap-3 mt-1 text-xs text-text-muted">
            <span>Owner: {plan.owner}</span>
            <span>Due: {formatTestDate(plan.deadline)}</span>
            {totalCount > 0 && (
              <span>Actions: {completedCount}/{totalCount}</span>
            )}
          </div>
        </button>
        {canEdit && (
          <button
            onClick={onDelete}
            className="p-1.5 rounded hover:bg-red-500/20 text-text-muted hover:text-red-400 transition-colors"
            title="Delete remediation plan"
          >
            <Trash2 size={14} />
          </button>
        )}
      </div>

      {/* Expanded content */}
      {isExpanded && (
        <div className="mt-3 pt-3 border-t border-surface-border space-y-3">
          {/* Status selector (Risk Manager only) */}
          {canEdit && (
            <div>
              <label className="text-xs text-text-muted block mb-1">Status</label>
              <select
                value={plan.status}
                onChange={(e) => onStatusChange(e.target.value as RemediationStatus)}
                className="w-full px-2 py-1.5 bg-surface-elevated border border-surface-border rounded text-sm text-text-primary focus:outline-none focus:ring-1 focus:ring-accent-500"
              >
                {STATUS_OPTIONS.map(opt => (
                  <option key={opt.value} value={opt.value} className="bg-surface-elevated text-text-primary">{opt.label}</option>
                ))}
              </select>
            </div>
          )}

          {/* Description */}
          {plan.description && (
            <div>
              <span className="text-xs text-text-muted">Description:</span>
              <p className="text-sm text-text-secondary mt-1">{plan.description}</p>
            </div>
          )}

          {/* Action Items */}
          <div>
            <span className="text-xs text-text-muted">Action Items:</span>
            <div className="mt-2 space-y-1">
              {actionItems.length === 0 ? (
                <p className="text-xs text-text-muted italic">No action items</p>
              ) : (
                actionItems.map(item => (
                  <div
                    key={item.id}
                    className="flex items-start gap-2 p-1.5 rounded hover:bg-surface-elevated group"
                  >
                    <button
                      onClick={() => onToggleAction(item.id)}
                      className="flex-shrink-0 mt-0.5"
                    >
                      {item.completed ? (
                        <CheckSquare size={16} className="text-green-400" />
                      ) : (
                        <Square size={16} className="text-text-muted hover:text-accent-400" />
                      )}
                    </button>
                    <span className={`flex-1 text-sm ${item.completed ? 'text-text-muted line-through' : 'text-text-primary'}`}>
                      {item.description}
                    </span>
                    {canEdit && (
                      <button
                        onClick={() => onRemoveAction(item.id)}
                        className="opacity-0 group-hover:opacity-100 p-0.5 rounded hover:bg-red-500/20 text-text-muted hover:text-red-400 transition-all"
                      >
                        <Trash2 size={12} />
                      </button>
                    )}
                  </div>
                ))
              )}
            </div>

            {/* Add new action item */}
            <div className="mt-2 flex gap-2">
              <input
                type="text"
                value={newActionValue}
                onChange={(e) => onNewActionChange(e.target.value)}
                placeholder="Add action item..."
                onKeyDown={(e) => e.key === 'Enter' && onNewActionSubmit()}
                className="flex-1 px-2 py-1 bg-surface-elevated border border-surface-border rounded text-xs text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-1 focus:ring-accent-500"
              />
              <button
                onClick={onNewActionSubmit}
                disabled={!newActionValue.trim()}
                className="p-1 rounded bg-accent-500/20 text-accent-400 hover:bg-accent-500/30 transition-colors disabled:opacity-50"
              >
                <Plus size={14} />
              </button>
            </div>
          </div>

          {/* Dates */}
          <div className="flex gap-4 text-xs text-text-muted">
            <span>Created: {formatTestDate(plan.createdDate)}</span>
            {plan.resolvedDate && <span>Resolved: {formatTestDate(plan.resolvedDate)}</span>}
            {plan.closedDate && <span>Closed: {formatTestDate(plan.closedDate)}</span>}
          </div>
        </div>
      )}
    </div>
  )
}
