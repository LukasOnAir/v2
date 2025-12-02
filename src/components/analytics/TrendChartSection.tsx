import { useState, useMemo, type ReactNode } from 'react'
import { subDays, format, parseISO, isValid } from 'date-fns'

interface DateRange {
  start: Date
  end: Date
}

interface TrendChartSectionProps {
  /** Section title */
  title: string
  /** Render props pattern: children receives dateRange */
  children: (dateRange: DateRange) => ReactNode
}

/**
 * Container for trend charts with title and date range filtering
 * Uses render props pattern to pass dateRange to children
 */
export function TrendChartSection({ title, children }: TrendChartSectionProps) {
  // Default range: last 90 days
  const defaultRange = useMemo(() => {
    const end = new Date()
    const start = subDays(end, 90)
    return { start, end }
  }, [])

  const [dateRange, setDateRange] = useState<DateRange>(defaultRange)

  // Format date for input value (YYYY-MM-DD)
  const formatDateForInput = (date: Date): string => {
    return format(date, 'yyyy-MM-dd')
  }

  // Handle start date change
  const handleStartChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    if (value) {
      const parsed = parseISO(value)
      if (isValid(parsed)) {
        setDateRange((prev) => ({ ...prev, start: parsed }))
      }
    }
  }

  // Handle end date change
  const handleEndChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    if (value) {
      const parsed = parseISO(value)
      if (isValid(parsed)) {
        setDateRange((prev) => ({ ...prev, end: parsed }))
      }
    }
  }

  return (
    <div className="bg-surface-elevated rounded-lg p-4">
      {/* Header with title and date range */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-medium text-text-primary">{title}</h3>

        {/* Date range selector */}
        <div className="flex items-center gap-2 text-sm">
          <label className="text-text-muted">From:</label>
          <input
            type="date"
            value={formatDateForInput(dateRange.start)}
            onChange={handleStartChange}
            className="bg-surface-overlay border border-surface-border rounded px-2 py-1 text-text-primary text-sm focus:outline-none focus:ring-1 focus:ring-accent-500"
          />
          <label className="text-text-muted">To:</label>
          <input
            type="date"
            value={formatDateForInput(dateRange.end)}
            onChange={handleEndChange}
            className="bg-surface-overlay border border-surface-border rounded px-2 py-1 text-text-primary text-sm focus:outline-none focus:ring-1 focus:ring-accent-500"
          />
        </div>
      </div>

      {/* Chart content via render props */}
      {children(dateRange)}
    </div>
  )
}
