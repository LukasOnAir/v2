import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase/client'
import { useAuth } from '@/contexts/AuthContext'
import { useEffectiveTenant } from '@/hooks/useEffectiveTenant'
import type { GlobalFeatureFlagRow, FeatureOverrides } from '@/lib/supabase/types'

/**
 * Known feature flags - extend this as new features are added
 */
export type FeatureKey = 'show_rfi' | 'show_signup'

/**
 * Default feature visibility in demo mode (all features shown)
 */
const DEMO_DEFAULTS: Record<FeatureKey, boolean> = {
  show_rfi: true,
  show_signup: true,
}

/**
 * Hook to check feature visibility
 *
 * Priority: User override > Global flag > Demo default
 *
 * In demo mode (not authenticated), returns DEMO_DEFAULTS
 * In authenticated mode, fetches from database:
 *   1. Global feature flags (affects all tenants)
 *   2. User's feature_overrides from profile (per-user customization)
 *   3. User override wins if set
 *
 * When impersonating, fetches the impersonated user's overrides
 */
export function useFeatureFlags() {
  const { session, user } = useAuth()
  const { effectiveProfileId, isImpersonating } = useEffectiveTenant()
  const isDemoMode = !session

  // Determine which profile ID to use for feature overrides
  // When impersonating with a profile selected, use the impersonated profile's overrides
  const profileIdForOverrides = isImpersonating && effectiveProfileId
    ? effectiveProfileId
    : user?.id

  // Fetch global feature flags (tenant-agnostic)
  const { data: globalFlags = [] } = useQuery({
    queryKey: ['global-feature-flags'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('global_feature_flags')
        .select('feature_key, enabled')

      if (error) {
        console.error('Error fetching global feature flags:', error)
        return []
      }
      return data as Pick<GlobalFeatureFlagRow, 'feature_key' | 'enabled'>[]
    },
    enabled: !isDemoMode,
    staleTime: 5 * 60 * 1000, // 5 minutes - flags don't change often
  })

  // Fetch user's feature overrides from profile
  // When impersonating, fetch the impersonated profile's overrides
  const { data: userOverrides } = useQuery({
    queryKey: ['feature-overrides', profileIdForOverrides],
    queryFn: async () => {
      if (!profileIdForOverrides) return null

      const { data, error } = await supabase
        .from('profiles')
        .select('feature_overrides')
        .eq('id', profileIdForOverrides)
        .single()

      if (error) {
        console.error('Error fetching feature overrides:', error)
        return null
      }
      return data?.feature_overrides as FeatureOverrides | null
    },
    enabled: !isDemoMode && !!profileIdForOverrides,
    staleTime: 5 * 60 * 1000,
  })

  /**
   * Check if a feature is enabled
   * @param key Feature key to check
   * @returns true if feature should be visible
   */
  const isFeatureEnabled = (key: FeatureKey): boolean => {
    // Demo mode: use defaults (all features visible)
    if (isDemoMode) {
      return DEMO_DEFAULTS[key] ?? true
    }

    // Check user override first (highest priority)
    if (userOverrides && key in userOverrides) {
      return userOverrides[key]
    }

    // Check global flag
    const globalFlag = globalFlags.find(f => f.feature_key === key)
    if (globalFlag) {
      return globalFlag.enabled
    }

    // Default to visible if not configured
    return true
  }

  return {
    isFeatureEnabled,
    // Convenience accessors for common features
    showRfi: isFeatureEnabled('show_rfi'),
    showSignup: isFeatureEnabled('show_signup'),
    // Loading state
    isLoading: !isDemoMode && globalFlags.length === 0,
    isDemoMode,
  }
}
