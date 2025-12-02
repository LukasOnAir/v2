import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase/client'
import type { GlobalFeatureFlagRow } from '@/lib/supabase/types'

/**
 * Admin hook for managing global feature flags (super-admin only)
 */
export function useGlobalFeatureFlagAdmin() {
  const queryClient = useQueryClient()

  // Fetch all global feature flags
  const {
    data: featureFlags = [],
    isLoading,
    error,
  } = useQuery({
    queryKey: ['global-feature-flags-admin'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('global_feature_flags')
        .select('*')
        .order('feature_key')

      if (error) throw error
      return data as GlobalFeatureFlagRow[]
    },
  })

  // Toggle global flag
  const toggleFlag = useMutation({
    mutationFn: async ({ flagId, enabled }: { flagId: string; enabled: boolean }) => {
      const { error } = await supabase
        .from('global_feature_flags')
        .update({ enabled, updated_at: new Date().toISOString() })
        .eq('id', flagId)

      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['global-feature-flags-admin'] })
      queryClient.invalidateQueries({ queryKey: ['global-feature-flags'] })
    },
  })

  // Create new global feature flag
  const createFlag = useMutation({
    mutationFn: async ({
      featureKey,
      enabled,
      description,
    }: {
      featureKey: string
      enabled: boolean
      description?: string
    }) => {
      const { error } = await supabase
        .from('global_feature_flags')
        .insert({ feature_key: featureKey, enabled, description })

      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['global-feature-flags-admin'] })
    },
  })

  // Delete global feature flag
  const deleteFlag = useMutation({
    mutationFn: async (flagId: string) => {
      const { error } = await supabase
        .from('global_feature_flags')
        .delete()
        .eq('id', flagId)

      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['global-feature-flags-admin'] })
      queryClient.invalidateQueries({ queryKey: ['global-feature-flags'] })
    },
  })

  return {
    featureFlags,
    isLoading,
    error: error?.message ?? null,
    toggleFlag: toggleFlag.mutateAsync,
    createFlag: createFlag.mutateAsync,
    deleteFlag: deleteFlag.mutateAsync,
    isToggling: toggleFlag.isPending,
  }
}
