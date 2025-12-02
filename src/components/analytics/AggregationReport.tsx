import { useState } from 'react'
import { useAggregationByCategory } from '@/hooks/useAnalyticsData'
import { getHeatmapColor, getContrastingText } from '@/utils/heatmapColors'
import { usePermissions } from '@/hooks/usePermissions'
import { useAggregationByCategoryDb } from '@/hooks/useAnalyticsDataDb'

type GroupBy = 'riskL1' | 'processL1'

/**
 * Risk aggregation table by L1 category
 * Shows average gross and net scores grouped by risk or process taxonomy
 */
export function AggregationReport() {
  const [groupBy, setGroupBy] = useState<GroupBy>('riskL1')
  const { isDemoMode } = usePermissions()

  // Store data (demo mode)
  const storeAggregations = useAggregationByCategory(groupBy)

  // Database data (authenticated mode)
  const { data: dbAggregations, isLoading } = useAggregationByCategoryDb(groupBy)

  // Dual-source selection
  const aggregations = isDemoMode ? storeAggregations : (dbAggregations || [])

  return (
    <div className="space-y-4">
      {/* Header with toggle buttons */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium text-text-primary">
          Risk Aggregation by Category
        </h3>
        <div className="flex rounded-lg border border-surface-border overflow-hidden">
          <button
            onClick={() => setGroupBy('riskL1')}
            className={`px-3 py-1.5 text-sm font-medium transition-colors ${
              groupBy === 'riskL1'
                ? 'bg-accent text-white'
                : 'bg-surface text-text-secondary hover:bg-surface-elevated'
            }`}
          >
            By Risk
          </button>
          <button
            onClick={() => setGroupBy('processL1')}
            className={`px-3 py-1.5 text-sm font-medium transition-colors ${
              groupBy === 'processL1'
                ? 'bg-accent text-white'
                : 'bg-surface text-text-secondary hover:bg-surface-elevated'
            }`}
          >
            By Process
          </button>
        </div>
      </div>

      {/* Loading state (authenticated mode only) */}
      {!isDemoMode && isLoading ? (
        <div className="flex items-center justify-center p-8">
          <div className="animate-spin rounded-full h-6 w-6 border-2 border-accent-500 border-t-transparent" />
        </div>
      ) : /* Empty state */
      aggregations.length === 0 ? (
        <div className="bg-surface-elevated rounded-lg p-6 text-center">
          <p className="text-text-secondary">
            No data available. Add risks and processes to see aggregations.
          </p>
        </div>
      ) : (
        /* Data table */
        <div className="overflow-x-auto rounded-lg border border-surface-border">
          <table className="w-full">
            <thead className="sticky top-0 bg-surface-elevated border-b border-surface-border">
              <tr>
                <th className="text-left px-4 py-3 text-sm font-medium text-text-primary">
                  Category
                </th>
                <th className="text-right px-4 py-3 text-sm font-medium text-text-primary">
                  Rows
                </th>
                <th className="text-right px-4 py-3 text-sm font-medium text-text-primary">
                  Controls
                </th>
                <th className="text-right px-4 py-3 text-sm font-medium text-text-primary">
                  Avg Gross Score
                </th>
                <th className="text-right px-4 py-3 text-sm font-medium text-text-primary">
                  Avg Net Score
                </th>
              </tr>
            </thead>
            <tbody>
              {aggregations.map((agg, index) => {
                const grossBgColor = getHeatmapColor(agg.avgGrossScore)
                const grossTextColor = getContrastingText(grossBgColor)
                const netBgColor = getHeatmapColor(agg.avgNetScore)
                const netTextColor = getContrastingText(netBgColor)

                return (
                  <tr
                    key={agg.categoryId}
                    className={index % 2 === 0 ? 'bg-surface' : 'bg-surface-elevated'}
                  >
                    <td className="px-4 py-3">
                      <div>
                        <p className="text-text-primary font-medium">
                          {agg.categoryName}
                        </p>
                        <p className="text-text-muted text-xs">
                          {agg.categoryId}
                        </p>
                      </div>
                    </td>
                    <td className="text-right px-4 py-3 text-text-secondary">
                      {agg.rowCount}
                    </td>
                    <td className="text-right px-4 py-3 text-text-secondary">
                      {agg.controlCount}
                    </td>
                    <td className="text-right px-4 py-3">
                      <span
                        className="inline-block min-w-[3rem] px-2 py-0.5 rounded text-center font-medium"
                        style={{
                          backgroundColor: grossBgColor,
                          color: grossTextColor,
                        }}
                      >
                        {agg.avgGrossScore !== null
                          ? agg.avgGrossScore.toFixed(1)
                          : '—'}
                      </span>
                    </td>
                    <td className="text-right px-4 py-3">
                      <span
                        className="inline-block min-w-[3rem] px-2 py-0.5 rounded text-center font-medium"
                        style={{
                          backgroundColor: netBgColor,
                          color: netTextColor,
                        }}
                      >
                        {agg.avgNetScore !== null
                          ? agg.avgNetScore.toFixed(1)
                          : '—'}
                      </span>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
