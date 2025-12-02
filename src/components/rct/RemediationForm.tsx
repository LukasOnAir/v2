import { useState } from 'react'
import { format, addDays } from 'date-fns'
import { useRCTStore } from '@/stores/rctStore'
import { useIsDemoMode } from '@/hooks/useTenantData'
import { useCreateRemediationPlan } from '@/hooks/useRemediationPlans'
import type { ControlTest } from '@/types/rct'

interface RemediationFormProps {
  rowId: string
  controlId: string
  test: ControlTest  // The triggering test with findings
  grossScore: number | null
  onComplete: () => void
}

export function RemediationForm({ rowId, controlId, test, grossScore, onComplete }: RemediationFormProps) {
  const isDemoMode = useIsDemoMode()

  // Store mutation (demo mode)
  const storeCreatePlan = useRCTStore((state) => state.createRemediationPlan)

  // Database mutation (auth mode)
  const createMutation = useCreateRemediationPlan()

  // Default title: "Remediate: " + first 50 chars of findings
  const defaultTitle = test.findings
    ? `Remediate: ${test.findings.slice(0, 50)}${test.findings.length > 50 ? '...' : ''}`
    : 'Remediate control deficiency'

  const [title, setTitle] = useState(defaultTitle)
  const [owner, setOwner] = useState('')
  const [deadline, setDeadline] = useState(format(addDays(new Date(), 30), 'yyyy-MM-dd'))
  const [description, setDescription] = useState(test.findings || '')

  const isValid = title.trim() && owner.trim() && deadline

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!isValid) return

    // Build initial action items from recommendations if present
    const actionItems = test.recommendations
      ? [{ id: `ai-${Date.now()}`, description: test.recommendations, completed: false }]
      : []

    const planData = {
      controlTestId: test.id,
      controlId,
      rowId,
      title: title.trim(),
      description: description.trim() || undefined,
      owner: owner.trim(),
      deadline,
      status: 'open' as const,
      actionItems,
    }

    if (isDemoMode) {
      storeCreatePlan(planData, grossScore)
    } else {
      createMutation.mutate({
        ...planData,
        priority: grossScore && grossScore >= 15 ? 'critical' : grossScore && grossScore >= 10 ? 'high' : grossScore && grossScore >= 5 ? 'medium' : 'low',
      })
    }

    onComplete()
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      {/* Title */}
      <div>
        <label className="text-xs text-text-muted block mb-1">Title *</label>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
          placeholder="Short description of the issue"
          className="w-full px-2 py-1.5 bg-surface-elevated border border-surface-border rounded text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-1 focus:ring-accent-500"
        />
      </div>

      {/* Owner */}
      <div>
        <label className="text-xs text-text-muted block mb-1">Owner *</label>
        <input
          type="text"
          value={owner}
          onChange={(e) => setOwner(e.target.value)}
          required
          placeholder="Person responsible for remediation"
          className="w-full px-2 py-1.5 bg-surface-elevated border border-surface-border rounded text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-1 focus:ring-accent-500"
        />
      </div>

      {/* Deadline */}
      <div>
        <label className="text-xs text-text-muted block mb-1">Deadline *</label>
        <input
          type="date"
          value={deadline}
          onChange={(e) => setDeadline(e.target.value)}
          required
          className="w-full px-2 py-1.5 bg-surface-elevated border border-surface-border rounded text-sm text-text-primary focus:outline-none focus:ring-1 focus:ring-accent-500"
        />
      </div>

      {/* Description */}
      <div>
        <label className="text-xs text-text-muted block mb-1">Description</label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Detailed description of the issue..."
          rows={3}
          className="w-full px-2 py-1.5 bg-surface-elevated border border-surface-border rounded text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-1 focus:ring-accent-500 resize-y min-h-[64px]"
        />
      </div>

      {/* Buttons */}
      <div className="flex justify-end gap-2 pt-2">
        <button
          type="button"
          onClick={onComplete}
          className="px-3 py-1.5 text-sm text-text-secondary hover:text-text-primary transition-colors"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={!isValid}
          className="px-3 py-1.5 text-sm bg-accent-500 text-white rounded hover:bg-accent-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Create
        </button>
      </div>
    </form>
  )
}
