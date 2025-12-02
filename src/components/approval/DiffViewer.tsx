interface DiffViewerProps {
  currentValues: Record<string, unknown>
  proposedValues: Record<string, unknown>
  fieldLabels?: Record<string, string>
}

function formatValue(value: unknown): string {
  if (value === null || value === undefined) {
    return '-'
  }
  if (typeof value === 'boolean') {
    return value ? 'Yes' : 'No'
  }
  if (typeof value === 'object') {
    return JSON.stringify(value)
  }
  return String(value)
}

export function DiffViewer({
  currentValues,
  proposedValues,
  fieldLabels = {},
}: DiffViewerProps) {
  // Filter out internal metadata fields (prefixed with _)
  // These are used for implementation details like _linkId for per-link tracking
  // and should not be shown to users in the approval diff
  const fields = Object.keys(proposedValues).filter(field => !field.startsWith('_'))

  if (fields.length === 0) {
    return (
      <p className="text-sm text-text-secondary">No changes to display.</p>
    )
  }

  return (
    <div className="space-y-3">
      {fields.map((field) => {
        const label = fieldLabels[field] ?? field
        const current = formatValue(currentValues[field])
        const proposed = formatValue(proposedValues[field])
        const hasChanged = current !== proposed

        return (
          <div key={field} className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <span className="text-xs text-text-muted block">{label} (Current)</span>
              <div
                className={`px-3 py-2 rounded-lg text-sm ${
                  hasChanged
                    ? 'bg-red-500/10 border border-red-500/20 text-text-secondary'
                    : 'bg-surface-overlay border border-surface-border text-text-secondary'
                }`}
              >
                {current}
              </div>
            </div>
            <div className="space-y-1">
              <span className="text-xs text-text-muted block">{label} (Proposed)</span>
              <div
                className={`px-3 py-2 rounded-lg text-sm ${
                  hasChanged
                    ? 'bg-green-500/10 border border-green-500/20 text-text-primary'
                    : 'bg-surface-overlay border border-surface-border text-text-secondary'
                }`}
              >
                {proposed}
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}
