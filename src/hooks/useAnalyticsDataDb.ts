import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase/client'
import type { TrendDataPoint, CategoryAggregation } from '@/hooks/useAnalyticsData'
import type { TaxonomyNode } from '@/lib/supabase/types'

/**
 * Query control_tests table for effectiveness trends.
 * Returns data points sorted by test_date ascending.
 */
export function useControlTestTrendsDb(
  controlId?: string,
  dateRange?: { start: Date; end: Date }
) {
  return useQuery({
    queryKey: ['analytics', 'controlTestTrends', controlId, dateRange?.start?.toISOString(), dateRange?.end?.toISOString()],
    queryFn: async (): Promise<TrendDataPoint[]> => {
      let query = supabase
        .from('control_tests')
        .select('test_date, result, effectiveness')
        .order('test_date', { ascending: true })

      // Filter by controlId if provided
      if (controlId) {
        query = query.eq('control_id', controlId)
      }

      // Filter by date range if provided
      if (dateRange?.start) {
        query = query.gte('test_date', dateRange.start.toISOString().split('T')[0])
      }
      if (dateRange?.end) {
        query = query.lte('test_date', dateRange.end.toISOString().split('T')[0])
      }

      const { data, error } = await query

      if (error) throw error

      // Map to TrendDataPoint
      return (data || []).map((test) => {
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

        const testDate = new Date(test.test_date)
        return {
          date: test.test_date,
          timestamp: testDate.getTime(),
          value,
          label: test.result,
        }
      })
    },
  })
}

/**
 * Aggregation by L1 category from database.
 * Joins rct_rows with taxonomy_nodes to get L1 grouping.
 */
export function useAggregationByCategoryDb(groupBy: 'riskL1' | 'processL1' = 'riskL1') {
  return useQuery({
    queryKey: ['analytics', 'aggregation', groupBy],
    queryFn: async (): Promise<CategoryAggregation[]> => {
      // Fetch RCT rows with taxonomy joins
      const { data: rctRows, error: rctError } = await supabase
        .from('rct_rows')
        .select(`
          id,
          gross_probability,
          gross_impact,
          gross_score,
          risk_id,
          process_id
        `)

      if (rctError) throw rctError

      // Fetch taxonomy nodes to get L1 info
      const { data: taxonomyNodes, error: taxError } = await supabase
        .from('taxonomy_nodes')
        .select('id, name, path, type')

      if (taxError) throw taxError

      // Build lookup maps
      const nodeMap = new Map<string, TaxonomyNode>()
      for (const node of taxonomyNodes || []) {
        nodeMap.set(node.id, node as TaxonomyNode)
      }

      // Fetch control links to count controls per row
      const { data: controlLinks, error: linkError } = await supabase
        .from('control_links')
        .select('rct_row_id')

      if (linkError) throw linkError

      // Count controls per row
      const controlCountByRow = new Map<string, number>()
      for (const link of controlLinks || []) {
        const count = controlCountByRow.get(link.rct_row_id) || 0
        controlCountByRow.set(link.rct_row_id, count + 1)
      }

      // Helper to get L1 node from path
      const getL1Node = (nodeId: string): { id: string; name: string } | null => {
        const node = nodeMap.get(nodeId)
        if (!node || !node.path || node.path.length === 0) return null

        // path[0] is the L1 node ID
        const l1Id = node.path[0]
        const l1Node = nodeMap.get(l1Id)
        if (!l1Node) return null

        return { id: l1Node.id, name: l1Node.name }
      }

      // Group rows by L1 category
      const groups = new Map<string, {
        categoryId: string
        categoryName: string
        grossScores: number[]
        netScores: number[]
        rowCount: number
        controlCount: number
      }>()

      for (const row of rctRows || []) {
        const nodeId = groupBy === 'riskL1' ? row.risk_id : row.process_id
        const l1 = getL1Node(nodeId)
        if (!l1) continue

        let group = groups.get(l1.id)
        if (!group) {
          group = {
            categoryId: l1.id,
            categoryName: l1.name,
            grossScores: [],
            netScores: [],
            rowCount: 0,
            controlCount: 0,
          }
          groups.set(l1.id, group)
        }

        group.rowCount++
        group.controlCount += controlCountByRow.get(row.id) || 0

        if (row.gross_score !== null) {
          group.grossScores.push(row.gross_score)
        }
        // Note: net_score would need to be calculated from controls
        // For now, we'll use gross_score as placeholder
      }

      // Convert to CategoryAggregation array
      const result: CategoryAggregation[] = []
      for (const group of groups.values()) {
        const avgGrossScore =
          group.grossScores.length > 0
            ? group.grossScores.reduce((a, b) => a + b, 0) / group.grossScores.length
            : null

        result.push({
          categoryId: group.categoryId,
          categoryName: group.categoryName,
          avgGrossScore,
          avgNetScore: null, // Would need separate calculation
          rowCount: group.rowCount,
          controlCount: group.controlCount,
        })
      }

      return result
    },
  })
}
