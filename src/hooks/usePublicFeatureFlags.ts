import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase/client'

/**
 * Feature flags for unauthenticated pages (login, signup)
 * Uses anonymous Supabase access to read global feature flags
 *
 * Note: This hook does NOT check user session - it's for public pages only
 *
 * Design decisions:
 * - Default to true (show signup) when loading or on error - backwards compatible
 * - No dependency on AuthContext (avoids circular dependency issues on login page)
 * - Simple return type focused on what public pages need
 */
export function usePublicFeatureFlags() {
  const { data: flags = [], isLoading } = useQuery({
    queryKey: ['public-feature-flags'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('global_feature_flags')
        .select('feature_key, enabled')

      if (error) {
        console.error('Error fetching public feature flags:', error)
        return []
      }
      return data ?? []
    },
    staleTime: 5 * 60 * 1000, // 5 minutes - flags don't change often
    gcTime: 30 * 60 * 1000, // 30 minutes cache
  })

  const showSignup = flags.find(f => f.feature_key === 'show_signup')?.enabled ?? true

  return {
    showSignup,
    isLoading,
  }
}
