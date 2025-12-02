import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase/client'
import { useEffectiveTenant } from '@/hooks/useEffectiveTenant'
import type { TaxonomyWeights } from '@/types/taxonomy'
import type { TaxonomyWeight, TaxonomyType } from '@/lib/supabase/types'
import { toast } from 'sonner'

/**
 * Convert database rows to TaxonomyWeights shape.
 * Separates level defaults from node-specific overrides.
 */
function buildWeights(rows: TaxonomyWeight[]): TaxonomyWeights {
  const weights: TaxonomyWeights = {
    levelDefaults: { l1: 1, l2: 1, l3: 1, l4: 1, l5: 1 },
    nodeOverrides: {},
  }

  for (const row of rows) {
    if (row.node_id === null && row.level !== null) {
      // Level default weight
      const key = `l${row.level}` as keyof TaxonomyWeights['levelDefaults']
      if (key in weights.levelDefaults) {
        weights.levelDefaults[key] = Number(row.weight)
      }
    } else if (row.node_id !== null) {
      // Node-specific override
      weights.nodeOverrides[row.node_id] = Number(row.weight)
    }
  }

  return weights
}

/**
 * Query taxonomy weights for a given type (risk or process).
 * Returns TaxonomyWeights structure with level defaults and node overrides.
 */
export function useTaxonomyWeights(type: TaxonomyType) {
  const { effectiveTenantId, isImpersonating } = useEffectiveTenant()

  return useQuery({
    queryKey: ['taxonomyWeights', type, effectiveTenantId],
    queryFn: async () => {
      let query = supabase.from('taxonomy_weights').select('*').eq('type', type)

      // When impersonating, add explicit tenant filter
      if (isImpersonating && effectiveTenantId) {
        query = query.eq('tenant_id', effectiveTenantId)
      }

      const { data, error } = await query

      if (error) throw error
      return buildWeights(data)
    },
  })
}

/**
 * Set a level default weight.
 * Upserts the weight for the given level (creates or updates).
 */
export function useSetLevelWeight(type: TaxonomyType) {
  const queryClient = useQueryClient()
  const { isReadOnly } = useEffectiveTenant()

  return useMutation({
    mutationFn: async ({ level, weight }: { level: 1 | 2 | 3 | 4 | 5; weight: number }) => {
      if (isReadOnly) {
        toast.error('Cannot modify data while viewing as another user')
        throw new Error('Read-only mode: modifications disabled')
      }

      // Clamp weight to valid range (0.1 - 5.0) with one decimal precision
      const clampedWeight = Math.round(Math.max(0.1, Math.min(5.0, weight)) * 10) / 10

      // Use RPC to upsert weight since we need to match on composite key
      // The unique constraint is on (tenant_id, type, node_id, level)
      const { data, error } = await supabase
        .from('taxonomy_weights')
        .upsert(
          {
            type,
            node_id: null,
            level,
            weight: clampedWeight,
          },
          {
            onConflict: 'tenant_id,type,node_id,level',
            ignoreDuplicates: false,
          }
        )
        .select()
        .single()

      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['taxonomyWeights', type] })
    },
  })
}

/**
 * Set a node-specific weight override.
 * Pass null to remove the override (falls back to level default).
 */
export function useSetNodeWeight(type: TaxonomyType) {
  const queryClient = useQueryClient()
  const { isReadOnly } = useEffectiveTenant()

  return useMutation({
    mutationFn: async ({ nodeId, weight }: { nodeId: string; weight: number | null }) => {
      if (isReadOnly) {
        toast.error('Cannot modify data while viewing as another user')
        throw new Error('Read-only mode: modifications disabled')
      }

      if (weight === null) {
        // Remove override - delete the weight record
        const { error } = await supabase
          .from('taxonomy_weights')
          .delete()
          .eq('type', type)
          .eq('node_id', nodeId)

        if (error) throw error
        return null
      }

      // Clamp weight to valid range
      const clampedWeight = Math.round(Math.max(0.1, Math.min(5.0, weight)) * 10) / 10

      // Upsert node weight
      const { data, error } = await supabase
        .from('taxonomy_weights')
        .upsert(
          {
            type,
            node_id: nodeId,
            level: null,
            weight: clampedWeight,
          },
          {
            onConflict: 'tenant_id,type,node_id,level',
            ignoreDuplicates: false,
          }
        )
        .select()
        .single()

      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['taxonomyWeights', type] })
    },
  })
}

/**
 * Reset all weights to defaults (delete all weight records).
 * Level defaults revert to 1.0, node overrides are removed.
 */
export function useResetWeights(type: TaxonomyType) {
  const queryClient = useQueryClient()
  const { isReadOnly } = useEffectiveTenant()

  return useMutation({
    mutationFn: async () => {
      if (isReadOnly) {
        toast.error('Cannot modify data while viewing as another user')
        throw new Error('Read-only mode: modifications disabled')
      }

      const { error } = await supabase
        .from('taxonomy_weights')
        .delete()
        .eq('type', type)

      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['taxonomyWeights', type] })
    },
  })
}

/**
 * Get effective weight for a node.
 * Returns node override if present, otherwise level default.
 * This is a pure function, not a hook - use with useTaxonomyWeights data.
 */
export function getEffectiveWeight(
  weights: TaxonomyWeights,
  nodeId: string,
  level: number
): number {
  // Check for node-specific override
  if (nodeId in weights.nodeOverrides) {
    return weights.nodeOverrides[nodeId]
  }

  // Fall back to level default
  const levelKey = `l${level}` as keyof TaxonomyWeights['levelDefaults']
  if (levelKey in weights.levelDefaults) {
    return weights.levelDefaults[levelKey]
  }

  // Ultimate fallback
  return 1.0
}

/**
 * Batch update multiple weights at once.
 * Useful for importing weight configurations.
 */
export function useBatchSetWeights(type: TaxonomyType) {
  const queryClient = useQueryClient()
  const { isReadOnly } = useEffectiveTenant()

  return useMutation({
    mutationFn: async (updates: {
      levelDefaults?: Partial<TaxonomyWeights['levelDefaults']>
      nodeOverrides?: Record<string, number>
    }) => {
      if (isReadOnly) {
        toast.error('Cannot modify data while viewing as another user')
        throw new Error('Read-only mode: modifications disabled')
      }

      const inserts: Array<{
        type: TaxonomyType
        node_id: string | null
        level: number | null
        weight: number
      }> = []

      // Add level default updates
      if (updates.levelDefaults) {
        for (const [key, weight] of Object.entries(updates.levelDefaults)) {
          if (weight !== undefined) {
            const level = parseInt(key.substring(1)) as 1 | 2 | 3 | 4 | 5
            const clampedWeight = Math.round(Math.max(0.1, Math.min(5.0, weight)) * 10) / 10
            inserts.push({
              type,
              node_id: null,
              level,
              weight: clampedWeight,
            })
          }
        }
      }

      // Add node override updates
      if (updates.nodeOverrides) {
        for (const [nodeId, weight] of Object.entries(updates.nodeOverrides)) {
          const clampedWeight = Math.round(Math.max(0.1, Math.min(5.0, weight)) * 10) / 10
          inserts.push({
            type,
            node_id: nodeId,
            level: null,
            weight: clampedWeight,
          })
        }
      }

      if (inserts.length === 0) return []

      const { data, error } = await supabase
        .from('taxonomy_weights')
        .upsert(inserts, {
          onConflict: 'tenant_id,type,node_id,level',
          ignoreDuplicates: false,
        })
        .select()

      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['taxonomyWeights', type] })
    },
  })
}
