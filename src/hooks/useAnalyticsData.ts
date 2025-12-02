import { useMemo } from 'react'
import { useRCTStore } from '@/stores/rctStore'
import { useAuditStore } from '@/stores/auditStore'
import { startOfDay } from 'date-fns'

/**
 * Data point for trend charts
 */
export interface TrendDataPoint {
  /** ISO date string or formatted string for label */
  date: string
  /** Unix timestamp for XAxis type="number" */
  timestamp: number
  /** The value to plot */
  value: number
  /** Optional label for tooltip */
  label?: string
}

/**
 * Aggregation data grouped by category
 */
export interface CategoryAggregation {
  /** ID of the category (L1 risk or process ID) */
  categoryId: string
  /** Display name of the category */
  categoryName: string
  /** Average gross score across rows (null if no data) */
  avgGrossScore: number | null
  /** Average net score across rows (null if no data) */
  avgNetScore: number | null
  /** Number of RCT rows in this category */
  rowCount: number
  /** Total number of controls across all rows */
  controlCount: number
}

/**
 * Hook to get control test effectiveness trends over time
 * @param controlId - Optional filter for specific control
 * @param dateRange - Optional date range filter
 * @returns Array of trend data points sorted by timestamp ascending
 */
export function useControlTestTrends(
  controlId?: string,
  dateRange?: { start: Date; end: Date }
): TrendDataPoint[] {
  const controlTests = useRCTStore((state) => state.controlTests)

  return useMemo(() => {
    let filtered = [...controlTests]

    // Filter by controlId if provided
    if (controlId) {
      filtered = filtered.filter((test) => test.controlId === controlId)
    }

    // Filter by date range if provided
    if (dateRange) {
      const startTime = dateRange.start.getTime()
      const endTime = dateRange.end.getTime()
      filtered = filtered.filter((test) => {
        const testTime = new Date(test.testDate).getTime()
        return testTime >= startTime && testTime <= endTime
      })
    }

    // Map to TrendDataPoint
    // value = effectiveness if present, otherwise derive from result:
    // pass = 5, partial = 3, fail/not-tested = 1
    const dataPoints: TrendDataPoint[] = filtered.map((test) => {
      let value: number
      if (test.effectiveness !== null && test.effectiveness !== undefined) {
        value = test.effectiveness
      } else {
        switch (test.result) {
          case 'pass':
            value = 5
            break
          case 'partial':
            value = 3
            break
          case 'fail':
          case 'not-tested':
          default:
            value = 1
            break
        }
      }

      const testDate = new Date(test.testDate)
      return {
        date: test.testDate,
        timestamp: testDate.getTime(),
        value,
        label: test.result,
      }
    })

    // Sort by timestamp ascending
    dataPoints.sort((a, b) => a.timestamp - b.timestamp)

    return dataPoints
  }, [controlTests, controlId, dateRange?.start?.getTime(), dateRange?.end?.getTime()])
}

/**
 * Hook to get risk score history from audit trail
 * @param rowId - Optional filter for specific RCT row
 * @param dateRange - Optional date range filter
 * @returns Array of trend data points (one per day, latest value) sorted ascending
 */
export function useRiskScoreHistory(
  rowId?: string,
  dateRange?: { start: Date; end: Date }
): TrendDataPoint[] {
  const entries = useAuditStore((state) => state.entries)

  return useMemo(() => {
    // Filter to RCT row entries
    let filtered = entries.filter((entry) => entry.entityType === 'rctRow')

    // Filter by rowId if provided
    if (rowId) {
      filtered = filtered.filter((entry) => entry.entityId === rowId)
    }

    // Filter by date range if provided
    if (dateRange) {
      const startTime = dateRange.start.getTime()
      const endTime = dateRange.end.getTime()
      filtered = filtered.filter((entry) => {
        const entryTime = new Date(entry.timestamp).getTime()
        return entryTime >= startTime && entryTime <= endTime
      })
    }

    // Filter to entries with score changes
    filtered = filtered.filter((entry) =>
      entry.fieldChanges.some(
        (change) => change.field === 'grossScore' || change.field === 'netScore'
      )
    )

    // Map to TrendDataPoint
    const dataPoints: TrendDataPoint[] = []
    for (const entry of filtered) {
      const scoreChange = entry.fieldChanges.find(
        (change) => change.field === 'grossScore' || change.field === 'netScore'
      )
      if (scoreChange && typeof scoreChange.newValue === 'number') {
        const entryDate = new Date(entry.timestamp)
        dataPoints.push({
          date: entry.timestamp.split('T')[0], // ISO date portion
          timestamp: entryDate.getTime(),
          value: scoreChange.newValue,
          label: scoreChange.field,
        })
      }
    }

    // Aggregate by day (keep latest value per day)
    const byDay = new Map<number, TrendDataPoint>()
    for (const point of dataPoints) {
      const dayStart = startOfDay(new Date(point.timestamp)).getTime()
      const existing = byDay.get(dayStart)
      if (!existing || point.timestamp > existing.timestamp) {
        byDay.set(dayStart, point)
      }
    }

    // Convert to array and sort ascending
    const result = Array.from(byDay.values())
    result.sort((a, b) => a.timestamp - b.timestamp)

    return result
  }, [entries, rowId, dateRange?.start?.getTime(), dateRange?.end?.getTime()])
}

/**
 * Hook to get aggregated scores by category (risk L1 or process L1)
 * @param groupBy - Field to group by ('riskL1' or 'processL1')
 * @returns Array of category aggregations
 */
export function useAggregationByCategory(
  groupBy: 'riskL1' | 'processL1' = 'riskL1'
): CategoryAggregation[] {
  const rows = useRCTStore((state) => state.rows)

  return useMemo(() => {
    // Group rows by L1 category
    const groups = new Map<
      string,
      {
        categoryId: string
        categoryName: string
        grossScores: number[]
        netScores: number[]
        rowCount: number
        controlCount: number
      }
    >()

    for (const row of rows) {
      const categoryId = groupBy === 'riskL1' ? row.riskL1Id : row.processL1Id
      const categoryName = groupBy === 'riskL1' ? row.riskL1Name : row.processL1Name

      let group = groups.get(categoryId)
      if (!group) {
        group = {
          categoryId,
          categoryName,
          grossScores: [],
          netScores: [],
          rowCount: 0,
          controlCount: 0,
        }
        groups.set(categoryId, group)
      }

      group.rowCount++
      group.controlCount += row.controls.length

      if (row.grossScore !== null) {
        group.grossScores.push(row.grossScore)
      }
      if (row.netScore !== null) {
        group.netScores.push(row.netScore)
      }
    }

    // Convert to CategoryAggregation array
    const result: CategoryAggregation[] = []
    for (const group of groups.values()) {
      const avgGrossScore =
        group.grossScores.length > 0
          ? group.grossScores.reduce((a, b) => a + b, 0) / group.grossScores.length
          : null
      const avgNetScore =
        group.netScores.length > 0
          ? group.netScores.reduce((a, b) => a + b, 0) / group.netScores.length
          : null

      result.push({
        categoryId: group.categoryId,
        categoryName: group.categoryName,
        avgGrossScore,
        avgNetScore,
        rowCount: group.rowCount,
        controlCount: group.controlCount,
      })
    }

    return result
  }, [rows, groupBy])
}
