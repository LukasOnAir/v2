import { useState } from 'react'
import { formatDistanceToNow } from 'date-fns'
import {
  Shield,
  AlertTriangle,
  Folder,
  ChevronDown,
  ChevronRight,
  Check,
  X,
} from 'lucide-react'
import { clsx } from 'clsx'
import { DiffViewer } from './DiffViewer'
import type { PendingChange, PendingChangeEntityType } from '@/types/approval'

interface ApprovalQueueRowProps {
  change: PendingChange
  onApprove: (id: string) => void
  onReject: (id: string, reason?: string) => void
}

const entityTypeIcons: Record<PendingChangeEntityType, typeof Shield> = {
  control: Shield,
  risk: AlertTriangle,
  process: Folder,
}

const changeTypeColors: Record<string, string> = {
  create: 'bg-green-500/20 text-green-400',
  update: 'bg-blue-500/20 text-blue-400',
  delete: 'bg-red-500/20 text-red-400',
}

/**
 * Expandable row component for approval queue
 * Alternative to dialog pattern - shows DiffViewer inline when expanded
 */
export function ApprovalQueueRow({ change, onApprove, onReject }: ApprovalQueueRowProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  const [showRejectInput, setShowRejectInput] = useState(false)
  const [rejectReason, setRejectReason] = useState('')

  const Icon = entityTypeIcons[change.entityType]
  const isPending = change.status === 'pending'

  const handleReject = () => {
    onReject(change.id, rejectReason || undefined)
    setShowRejectInput(false)
    setRejectReason('')
  }

  return (
    <div className="border-b border-surface-border last:border-0">
      {/* Main row */}
      <div
        className={clsx(
          'flex items-center gap-4 px-4 py-3 hover:bg-surface-overlay/50 cursor-pointer',
          isExpanded && 'bg-surface-overlay/30'
        )}
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <button className="p-1 text-text-muted hover:text-text-primary">
          {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
        </button>

        <span className="flex items-center gap-1.5 w-24 capitalize text-sm">
          <Icon size={14} className="text-text-muted" />
          {change.entityType}
        </span>

        <span className="flex-1 font-medium text-text-primary text-sm">
          {change.entityName}
        </span>

        <span
          className={clsx(
            'px-2 py-0.5 rounded text-xs font-medium capitalize w-20 text-center',
            changeTypeColors[change.changeType]
          )}
        >
          {change.changeType}
        </span>

        <span className="text-text-secondary text-sm w-28 capitalize">
          {change.submittedBy}
        </span>

        <span className="text-text-muted text-sm w-32">
          {formatDistanceToNow(new Date(change.submittedAt), { addSuffix: true })}
        </span>

        {isPending && (
          <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={() => onApprove(change.id)}
              className="p-1.5 rounded hover:bg-green-500/10 text-green-400 hover:text-green-300"
              title="Approve"
            >
              <Check size={16} />
            </button>
            <button
              onClick={() => setShowRejectInput(!showRejectInput)}
              className="p-1.5 rounded hover:bg-red-500/10 text-red-400 hover:text-red-300"
              title="Reject"
            >
              <X size={16} />
            </button>
          </div>
        )}
      </div>

      {/* Expanded content */}
      {isExpanded && (
        <div className="px-4 pb-4 pl-12 bg-surface-overlay/20">
          <div className="p-4 bg-surface-base rounded-lg border border-surface-border">
            <h4 className="text-sm font-medium text-text-secondary mb-3">Proposed Changes</h4>
            <DiffViewer
              currentValues={change.currentValues}
              proposedValues={change.proposedValues}
            />

            {change.status === 'rejected' && change.rejectionReason && (
              <div className="mt-4 pt-4 border-t border-surface-border">
                <h4 className="text-sm font-medium text-red-400 mb-2">Rejection Reason</h4>
                <p className="text-sm text-text-secondary">{change.rejectionReason}</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Inline reject input */}
      {showRejectInput && isPending && (
        <div className="px-4 pb-4 pl-12" onClick={(e) => e.stopPropagation()}>
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="Reason for rejection (optional)"
              className="flex-1 px-3 py-1.5 text-sm bg-surface-overlay border border-surface-border rounded text-text-primary placeholder:text-text-muted"
              autoFocus
            />
            <button
              onClick={handleReject}
              className="px-3 py-1.5 text-sm bg-red-500/20 text-red-400 rounded hover:bg-red-500/30"
            >
              Reject
            </button>
            <button
              onClick={() => {
                setShowRejectInput(false)
                setRejectReason('')
              }}
              className="px-3 py-1.5 text-sm text-text-muted hover:text-text-primary"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
