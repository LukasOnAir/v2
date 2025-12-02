import { useState } from 'react'
import { format } from 'date-fns'
import { ChevronDown, ChevronRight, User } from 'lucide-react'
import type { AuditEntry, EntityType } from '@/types/audit'
import {
  ENTITY_TYPE_LABELS,
  CHANGE_TYPE_LABELS,
  CHANGE_TYPE_COLORS,
  ENTITY_TYPE_COLORS,
} from '@/hooks/useAuditLog'
import { ChangeDetail } from './ChangeDetail'

interface AuditTimelineProps {
  entries: AuditEntry[]
  onEntityClick?: (entityId: string, entityType: EntityType) => void
}

/** Initial number of entries to show */
const INITIAL_LIMIT = 100
/** Number to load on "Load more" */
const LOAD_MORE_AMOUNT = 100

/**
 * Role badge colors
 */
const ROLE_COLORS: Record<string, string> = {
  'risk-manager': 'bg-amber-500/20 text-amber-400',
  'control-owner': 'bg-blue-500/20 text-blue-400',
}

/**
 * Vertical timeline showing chronological audit changes
 */
export function AuditTimeline({ entries, onEntityClick }: AuditTimelineProps) {
  const [limit, setLimit] = useState(INITIAL_LIMIT)
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set())

  const visibleEntries = entries.slice(0, limit)
  const hasMore = entries.length > limit

  const toggleExpanded = (id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }

  const handleLoadMore = () => {
    setLimit((prev) => prev + LOAD_MORE_AMOUNT)
  }

  if (entries.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-text-muted">No audit entries found</p>
        <p className="text-sm text-text-muted mt-1">
          Try adjusting your filters or check back later
        </p>
      </div>
    )
  }

  return (
    <div className="relative">
      {/* Timeline line */}
      <div className="absolute left-4 top-0 bottom-0 w-px bg-surface-border" />

      {/* Timeline entries */}
      <div className="space-y-4">
        {visibleEntries.map((entry) => (
          <TimelineEntry
            key={entry.id}
            entry={entry}
            isExpanded={expandedIds.has(entry.id)}
            onToggle={() => toggleExpanded(entry.id)}
            onEntityClick={onEntityClick}
          />
        ))}
      </div>

      {/* Load more button */}
      {hasMore && (
        <div className="mt-6 text-center">
          <button
            onClick={handleLoadMore}
            className="px-4 py-2 text-sm text-accent-400 hover:text-accent-300 bg-surface-elevated border border-surface-border rounded-md hover:bg-surface-overlay transition-colors"
          >
            Load more ({entries.length - limit} remaining)
          </button>
        </div>
      )}
    </div>
  )
}

interface TimelineEntryProps {
  entry: AuditEntry
  isExpanded: boolean
  onToggle: () => void
  onEntityClick?: (entityId: string, entityType: EntityType) => void
}

function TimelineEntry({
  entry,
  isExpanded,
  onToggle,
  onEntityClick,
}: TimelineEntryProps) {
  const formattedTime = format(new Date(entry.timestamp), 'PPpp')
  const roleColor = ROLE_COLORS[entry.user] || 'bg-zinc-500/20 text-zinc-400'

  const handleEntityClick = () => {
    if (onEntityClick && entry.entityId) {
      onEntityClick(entry.entityId, entry.entityType)
    }
  }

  return (
    <div className="relative pl-10">
      {/* Timeline dot */}
      <div className="absolute left-2.5 top-2 w-3 h-3 rounded-full bg-surface-elevated border-2 border-accent-500" />

      <div className="bg-surface-elevated rounded-lg border border-surface-border p-4">
        {/* Header row */}
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            {/* Entity info */}
            <div className="flex items-center gap-2 flex-wrap">
              {/* Entity type badge */}
              <span
                className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${ENTITY_TYPE_COLORS[entry.entityType]}`}
              >
                {ENTITY_TYPE_LABELS[entry.entityType]}
              </span>

              {/* Change type badge */}
              <span
                className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${CHANGE_TYPE_COLORS[entry.changeType]}`}
              >
                {CHANGE_TYPE_LABELS[entry.changeType]}
              </span>
            </div>

            {/* Entity name / summary */}
            <div className="mt-1">
              {entry.entityName ? (
                <button
                  onClick={handleEntityClick}
                  className="text-text-primary font-medium hover:text-accent-400 transition-colors text-left"
                  disabled={!onEntityClick || !entry.entityId}
                >
                  {entry.entityName}
                </button>
              ) : entry.summary ? (
                <p className="text-text-primary font-medium">{entry.summary}</p>
              ) : (
                <p className="text-text-muted italic">No details</p>
              )}
            </div>

            {/* Timestamp and user */}
            <div className="flex items-center gap-3 mt-2 text-xs text-text-muted">
              <span>{formattedTime}</span>
              <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded ${roleColor}`}>
                <User size={12} />
                {entry.user}
              </span>
            </div>
          </div>

          {/* Expand button */}
          {entry.fieldChanges.length > 0 && (
            <button
              onClick={onToggle}
              className="p-1 text-text-muted hover:text-text-primary transition-colors"
              aria-label={isExpanded ? 'Collapse details' : 'Expand details'}
            >
              {isExpanded ? (
                <ChevronDown size={20} />
              ) : (
                <ChevronRight size={20} />
              )}
            </button>
          )}
        </div>

        {/* Expanded details */}
        {isExpanded && entry.fieldChanges.length > 0 && (
          <div className="mt-4 pt-4 border-t border-surface-border">
            <ChangeDetail
              fieldChanges={entry.fieldChanges}
              changeType={entry.changeType}
            />
          </div>
        )}
      </div>
    </div>
  )
}
