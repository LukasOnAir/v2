import { useState } from 'react'
import { format } from 'date-fns'
import { ChevronDown, ChevronRight, History, ExternalLink } from 'lucide-react'
import { Link } from 'react-router'
import type { EntityType } from '@/types/audit'
import { useEntityHistory, CHANGE_TYPE_LABELS, CHANGE_TYPE_COLORS } from '@/hooks/useAuditLog'

interface EntityHistoryPanelProps {
  entityId: string
  entityType: EntityType
  title?: string
}

/** Maximum entries to show in compact view */
const HISTORY_LIMIT = 20

/**
 * Collapsible panel showing history for a specific entity
 * For use in ControlPanel, RiskPanel, etc.
 */
export function EntityHistoryPanel({
  entityId,
  entityType,
  title = 'Change History',
}: EntityHistoryPanelProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  const entries = useEntityHistory(entityId, HISTORY_LIMIT)

  // Build link to audit page with pre-filter
  const auditLink = `/audit?search=${encodeURIComponent(entityId)}`

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
        <History size={16} className="text-text-muted" />
        <span className="text-sm font-medium text-text-primary">{title}</span>
        <span className="text-xs text-text-muted">({entries.length})</span>
      </button>

      {/* Expanded content */}
      {isExpanded && (
        <div className="mt-3 pl-6 space-y-3">
          {entries.length === 0 ? (
            <p className="text-sm text-text-muted">No history recorded yet.</p>
          ) : (
            <>
              {/* Compact timeline */}
              <div className="space-y-2 max-h-[300px] overflow-auto">
                {entries.map((entry) => (
                  <div
                    key={entry.id}
                    className="flex items-start gap-3 p-2 bg-surface-overlay rounded border border-surface-border"
                  >
                    <span
                      className={`inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium ${CHANGE_TYPE_COLORS[entry.changeType]}`}
                    >
                      {CHANGE_TYPE_LABELS[entry.changeType]}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-text-secondary truncate">
                        {entry.fieldChanges.length > 0
                          ? `${entry.fieldChanges.length} field${entry.fieldChanges.length !== 1 ? 's' : ''} changed`
                          : entry.summary || 'No details'}
                      </p>
                      <p className="text-xs text-text-muted mt-0.5">
                        {format(new Date(entry.timestamp), 'MMM d, yyyy h:mm a')}
                      </p>
                    </div>
                  </div>
                ))}
              </div>

              {/* View all link */}
              <Link
                to={auditLink}
                className="inline-flex items-center gap-1 text-sm text-accent-400 hover:text-accent-300 transition-colors"
              >
                <ExternalLink size={14} />
                View all in Audit Log
              </Link>
            </>
          )}
        </div>
      )}
    </div>
  )
}
