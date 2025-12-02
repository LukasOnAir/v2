import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase/client'
import { useEffectiveTenant } from '@/hooks/useEffectiveTenant'
import type { ScoreLabel } from '@/stores/rctStore'
import type { ScoreLabelRow, ScoreLabelType } from '@/lib/supabase/types'
import { toast } from 'sonner'

function toScoreLabel(row: ScoreLabelRow): ScoreLabel {
  return {
    score: row.score,
    label: row.label,
    description: row.description || '',
  }
}

export function useScoreLabels(type: ScoreLabelType) {
  const { effectiveTenantId, isImpersonating } = useEffectiveTenant()

  return useQuery({
    queryKey: ['scoreLabels', type, effectiveTenantId],
    queryFn: async () => {
      let query = supabase.from('score_labels').select('*').eq('type', type)

      // When impersonating, add explicit tenant filter
      if (isImpersonating && effectiveTenantId) {
        query = query.eq('tenant_id', effectiveTenantId)
      }

      const { data, error } = await query.order('score')

      if (error) throw error
      return data.map(toScoreLabel)
    },
  })
}

export function useProbabilityLabels() {
  return useScoreLabels('probability')
}

export function useImpactLabels() {
  return useScoreLabels('impact')
}

export function useUpdateScoreLabel() {
  const queryClient = useQueryClient()
  const { isReadOnly } = useEffectiveTenant()

  return useMutation({
    mutationFn: async ({ type, score, label, description }: {
      type: ScoreLabelType
      score: number
      label: string
      description?: string
    }) => {
      if (isReadOnly) {
        toast.error('Cannot modify data while viewing as another user')
        throw new Error('Read-only mode: modifications disabled')
      }

      const { data, error } = await supabase
        .from('score_labels')
        .upsert({
          type,
          score,
          label,
          description: description || null,
        }, {
          onConflict: 'tenant_id,type,score',
        })
        .select()
        .single()

      if (error) throw error
      return toScoreLabel(data)
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['scoreLabels', variables.type] })
    },
  })
}

export function useBulkUpdateScoreLabels() {
  const queryClient = useQueryClient()
  const { isReadOnly } = useEffectiveTenant()

  return useMutation({
    mutationFn: async ({ type, labels }: {
      type: ScoreLabelType
      labels: ScoreLabel[]
    }) => {
      if (isReadOnly) {
        toast.error('Cannot modify data while viewing as another user')
        throw new Error('Read-only mode: modifications disabled')
      }

      const rows = labels.map(label => ({
        type,
        score: label.score,
        label: label.label,
        description: label.description || null,
      }))

      const { data, error } = await supabase
        .from('score_labels')
        .upsert(rows, {
          onConflict: 'tenant_id,type,score',
        })
        .select()

      if (error) throw error
      return data.map(toScoreLabel)
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['scoreLabels', variables.type] })
    },
  })
}
