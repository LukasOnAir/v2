import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  type TooltipProps,
} from 'recharts'
import { format } from 'date-fns'
import { useControlTestTrends, type TrendDataPoint } from '@/hooks/useAnalyticsData'
import { usePermissions } from '@/hooks/usePermissions'
import { useControlTestTrendsDb } from '@/hooks/useAnalyticsDataDb'

/**
 * Chart colors matching dark theme
 */
const CHART_COLORS = {
  primary: 'rgb(251, 191, 36)', // amber-400 (accent)
  secondary: 'rgb(34, 197, 94)', // green-500
  grid: '#27272a', // zinc-800 (surface-border)
  text: '#a1a1aa', // zinc-400 (text-secondary)
  background: '#18181b', // zinc-900 (surface-elevated)
}

/**
 * Custom tooltip component for dark theme styling
 */
function CustomTooltip({
  active,
  payload,
  label,
}: TooltipProps<number, string>) {
  if (!active || !payload || payload.length === 0) {
    return null
  }

  const data = payload[0].payload as TrendDataPoint
  const dateStr = data.date
  const value = data.value
  const resultLabel = data.label

  return (
    <div className="bg-surface-elevated border border-surface-border rounded-lg p-3 shadow-lg">
      <p className="text-text-primary text-sm font-medium mb-1">
        {format(new Date(dateStr), 'MMM d, yyyy')}
      </p>
      <p className="text-text-secondary text-sm">
        Effectiveness: <span className="text-accent-400 font-medium">{value}</span>
      </p>
      {resultLabel && (
        <p className="text-text-muted text-xs mt-1">Result: {resultLabel}</p>
      )}
    </div>
  )
}

interface ControlTestTrendChartProps {
  /** Optional filter for specific control */
  controlId?: string
  /** Optional date range filter */
  dateRange?: { start: Date; end: Date }
  /** Chart height in pixels */
  height?: number
}

/**
 * Line chart for control test effectiveness trends over time
 */
export function ControlTestTrendChart({
  controlId,
  dateRange,
  height = 300,
}: ControlTestTrendChartProps) {
  const { isDemoMode } = usePermissions()

  // Store data (demo mode)
  const storeData = useControlTestTrends(controlId, dateRange)

  // Database data (authenticated mode)
  const { data: dbData, isLoading } = useControlTestTrendsDb(controlId, dateRange)

  // Dual-source selection
  const data = isDemoMode ? storeData : (dbData || [])

  // Handle loading state (authenticated mode only)
  if (!isDemoMode && isLoading) {
    return (
      <div
        className="flex items-center justify-center text-text-muted"
        style={{ height }}
      >
        <div className="animate-spin rounded-full h-6 w-6 border-2 border-accent-500 border-t-transparent" />
      </div>
    )
  }

  // Handle empty state
  if (data.length === 0) {
    return (
      <div
        className="flex items-center justify-center text-text-muted"
        style={{ height }}
      >
        No test data available
      </div>
    )
  }

  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart
        data={data}
        margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
      >
        <CartesianGrid
          strokeDasharray="3 3"
          stroke={CHART_COLORS.grid}
          vertical={false}
        />
        <XAxis
          dataKey="timestamp"
          type="number"
          domain={['dataMin', 'dataMax']}
          tickFormatter={(value) => format(new Date(value), 'MMM d')}
          stroke={CHART_COLORS.text}
          tick={{ fill: CHART_COLORS.text, fontSize: 12 }}
          axisLine={{ stroke: CHART_COLORS.grid }}
          tickLine={{ stroke: CHART_COLORS.grid }}
        />
        <YAxis
          domain={[1, 5]}
          stroke={CHART_COLORS.text}
          tick={{ fill: CHART_COLORS.text, fontSize: 12 }}
          axisLine={{ stroke: CHART_COLORS.grid }}
          tickLine={{ stroke: CHART_COLORS.grid }}
          width={40}
        />
        <Tooltip content={<CustomTooltip />} />
        <Line
          type="monotone"
          dataKey="value"
          stroke={CHART_COLORS.primary}
          strokeWidth={2}
          dot={{ fill: CHART_COLORS.primary, strokeWidth: 0, r: 4 }}
          activeDot={{ r: 6, fill: CHART_COLORS.primary }}
        />
      </LineChart>
    </ResponsiveContainer>
  )
}
