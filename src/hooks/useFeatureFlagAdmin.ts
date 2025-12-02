import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase/client'
import type { FeatureFlagRow, Profile, FeatureOverrides } from '@/lib/supabase/types'

interface FeatureFlagWithOverrides extends FeatureFlagRow {
  userOverrides: Array<{
    userId: string
    userName: string | null
    enabled: boolean
  }>
}

/**
 * Admin hook for managing feature flags (Director-only)
 */
export function useFeatureFlagAdmin() {
  const queryClient = useQueryClient()

  // Fetch all feature flags with user overrides
  const {
    data: featureFlags = [],
    isLoading,
    error,
  } = useQuery({
    queryKey: ['feature-flags-admin'],
    queryFn: async () => {
      // Fetch all flags
      const { data: flags, error: flagsError } = await supabase
        .from('feature_flags')
        .select('*')
        .order('feature_key')

      if (flagsError) throw flagsError

      // Fetch all profiles to get user overrides
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, full_name, feature_overrides')

      if (profilesError) throw profilesError

      // Combine flags with user overrides
      return (flags || []).map((flag): FeatureFlagWithOverrides => {
        const userOverrides = (profiles || [])
          .filter(p => p.feature_overrides && flag.feature_key in (p.feature_overrides as FeatureOverrides))
          .map(p => ({
            userId: p.id,
            userName: p.full_name,
            enabled: (p.feature_overrides as FeatureOverrides)[flag.feature_key],
          }))

        return { ...flag, userOverrides }
      })
    },
  })

  // Fetch profiles for user override dropdown
  const { data: profiles = [] } = useQuery({
    queryKey: ['profiles-for-flags'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, role, feature_overrides')
        .order('full_name')

      if (error) throw error
      return data as Profile[]
    },
  })

  // Toggle global flag
  const toggleGlobalFlag = useMutation({
    mutationFn: async ({ flagId, enabled }: { flagId: string; enabled: boolean }) => {
      const { error } = await supabase
        .from('feature_flags')
        .update({ enabled, updated_at: new Date().toISOString() })
        .eq('id', flagId)

      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['feature-flags-admin'] })
      queryClient.invalidateQueries({ queryKey: ['feature-flags'] })
    },
  })

  // Set user override
  const setUserOverride = useMutation({
    mutationFn: async ({
      userId,
      featureKey,
      enabled,
    }: {
      userId: string
      featureKey: string
      enabled: boolean | null // null removes override
    }) => {
      // Fetch current overrides
      const { data: profile, error: fetchError } = await supabase
        .from('profiles')
        .select('feature_overrides')
        .eq('id', userId)
        .single()

      if (fetchError) throw fetchError

      const currentOverrides = (profile?.feature_overrides as FeatureOverrides) || {}
      let newOverrides: FeatureOverrides

      if (enabled === null) {
        // Remove override
        const { [featureKey]: _, ...rest } = currentOverrides
        newOverrides = rest
      } else {
        // Set/update override
        newOverrides = { ...currentOverrides, [featureKey]: enabled }
      }

      const { error: updateError } = await supabase
        .from('profiles')
        .update({ feature_overrides: newOverrides })
        .eq('id', userId)

      if (updateError) throw updateError
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['feature-flags-admin'] })
      queryClient.invalidateQueries({ queryKey: ['feature-overrides'] })
    },
  })

  // Create new feature flag
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
        .from('feature_flags')
        .insert({ feature_key: featureKey, enabled, description })

      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['feature-flags-admin'] })
    },
  })

  return {
    featureFlags,
    profiles,
    isLoading,
    error: error?.message ?? null,
    toggleGlobalFlag: toggleGlobalFlag.mutateAsync,
    setUserOverride: setUserOverride.mutateAsync,
    createFlag: createFlag.mutateAsync,
    isToggling: toggleGlobalFlag.isPending,
    isSettingOverride: setUserOverride.isPending,
  }
}
