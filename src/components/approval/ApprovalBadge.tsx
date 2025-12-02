import { Clock, X } from 'lucide-react'

interface ApprovalBadgeProps {
  status: 'pending' | 'rejected'
  compact?: boolean
}

export function ApprovalBadge({ status, compact = false }: ApprovalBadgeProps) {
  if (status === 'pending') {
    return (
      <span
        className={`inline-flex items-center gap-1 rounded-full ${
          compact
            ? 'p-1 bg-amber-500/20'
            : 'px-2 py-0.5 bg-amber-500/20 text-amber-400 text-xs font-medium'
        }`}
        title="Pending approval"
      >
        <Clock size={compact ? 12 : 14} className="text-amber-400" />
        {!compact && <span>Pending</span>}
      </span>
    )
  }

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full ${
        compact
          ? 'p-1 bg-red-500/20'
          : 'px-2 py-0.5 bg-red-500/20 text-red-400 text-xs font-medium'
      }`}
      title="Rejected"
    >
      <X size={compact ? 12 : 14} className="text-red-400" />
      {!compact && <span>Rejected</span>}
    </span>
  )
}
