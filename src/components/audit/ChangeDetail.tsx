import type { FieldChange, ChangeType } from '@/types/audit'

interface ChangeDetailProps {
  fieldChanges: FieldChange[]
  changeType: ChangeType
}

/**
 * Format a value for display
 * Handles null/undefined, dates, arrays, and objects
 */
function formatValue(value: unknown): string {
  if (value === null || value === undefined) {
    return '\u2014' // em-dash
  }

  if (typeof value === 'boolean') {
    return value ? 'Yes' : 'No'
  }

  if (typeof value === 'number') {
    return String(value)
  }

  if (typeof value === 'string') {
    // Check if it looks like an ISO date
    if (/^\d{4}-\d{2}-\d{2}T/.test(value)) {
      try {
        const date = new Date(value)
        return date.toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'short',
          day: 'numeric',
        })
      } catch {
        return value
      }
    }
    return value
  }

  if (Array.isArray(value)) {
    if (value.length === 0) return '(empty)'
    return `${value.length} item${value.length !== 1 ? 's' : ''}`
  }

  if (typeof value === 'object') {
    return JSON.stringify(value)
  }

  return String(value)
}

/**
 * Truncate long text with ellipsis
 */
function truncateText(text: string, maxLength: number = 50): string {
  if (text.length <= maxLength) return text
  return text.slice(0, maxLength) + '...'
}

/**
 * Get color class based on change type and whether it's before/after
 */
function getValueColor(
  changeType: ChangeType,
  column: 'before' | 'after'
): string {
  if (changeType === 'create' && column === 'after') {
    return 'text-green-400'
  }
  if (changeType === 'delete' && column === 'before') {
    return 'text-red-400'
  }
  if (changeType === 'update') {
    return column === 'before' ? 'text-red-400' : 'text-green-400'
  }
  return 'text-text-secondary'
}

/**
 * Before/after comparison table for field changes
 */
export function ChangeDetail({ fieldChanges, changeType }: ChangeDetailProps) {
  if (fieldChanges.length === 0) {
    return (
      <p className="text-sm text-text-muted italic">No field changes recorded</p>
    )
  }

  const showBefore = changeType !== 'create'
  const showAfter = changeType !== 'delete'

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-text-muted border-b border-surface-border">
            <th className="pb-2 pr-4 font-medium">Field</th>
            {showBefore && (
              <th className="pb-2 pr-4 font-medium">Before</th>
            )}
            {showAfter && <th className="pb-2 font-medium">After</th>}
          </tr>
        </thead>
        <tbody className="divide-y divide-surface-border">
          {fieldChanges.map((change, idx) => {
            const beforeFormatted = formatValue(change.oldValue)
            const afterFormatted = formatValue(change.newValue)

            return (
              <tr key={idx}>
                <td className="py-2 pr-4 text-text-primary font-medium">
                  {formatFieldName(change.field)}
                </td>
                {showBefore && (
                  <td
                    className={`py-2 pr-4 ${getValueColor(changeType, 'before')}`}
                    title={beforeFormatted.length > 50 ? beforeFormatted : undefined}
                  >
                    {truncateText(beforeFormatted)}
                  </td>
                )}
                {showAfter && (
                  <td
                    className={`py-2 ${getValueColor(changeType, 'after')}`}
                    title={afterFormatted.length > 50 ? afterFormatted : undefined}
                  >
                    {truncateText(afterFormatted)}
                  </td>
                )}
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

/**
 * Format field name for display (camelCase to Title Case)
 */
function formatFieldName(field: string): string {
  // Handle nested paths like 'controls[0].name'
  const baseName = field.split('.').pop() || field

  // Convert camelCase to Title Case
  return baseName
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, (str) => str.toUpperCase())
    .trim()
}
