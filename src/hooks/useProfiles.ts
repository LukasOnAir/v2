import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase/client'
import { useEffectiveTenant } from '@/hooks/useEffectiveTenant'
import type { Profile, UserRole } from '@/lib/supabase/types'

/**
 * Fetch all profiles for the current tenant
 */
export function useProfiles() {
  const { effectiveTenantId, isImpersonating } = useEffectiveTenant()

  return useQuery({
    queryKey: ['profiles', effectiveTenantId],
    queryFn: async () => {
      let query = supabase.from('profiles').select('*').eq('is_active', true)

      // When impersonating, add explicit tenant filter
      if (isImpersonating && effectiveTenantId) {
        query = query.eq('tenant_id', effectiveTenantId)
      }

      const { data, error } = await query.order('full_name')

      if (error) throw error
      return data as Profile[]
    },
  })
}

/**
 * Fetch profiles filtered by role
 */
export function useProfilesByRole(role: UserRole) {
  const { effectiveTenantId, isImpersonating } = useEffectiveTenant()

  return useQuery({
    queryKey: ['profiles', 'role', role, effectiveTenantId],
    queryFn: async () => {
      let query = supabase.from('profiles').select('*').eq('role', role).eq('is_active', true)

      // When impersonating, add explicit tenant filter
      if (isImpersonating && effectiveTenantId) {
        query = query.eq('tenant_id', effectiveTenantId)
      }

      const { data, error } = await query.order('full_name')

      if (error) throw error
      return data as Profile[]
    },
  })
}

/**
 * Fetch control testers (convenience hook)
 */
export function useControlTesters() {
  return useProfilesByRole('control-tester')
}

/**
 * Fetch a single profile by ID
 */
export function useProfileById(id: string | null | undefined) {
  const { effectiveTenantId, isImpersonating } = useEffectiveTenant()

  return useQuery({
    queryKey: ['profiles', 'byId', id, effectiveTenantId],
    queryFn: async () => {
      if (!id) return null
      let query = supabase.from('profiles').select('*').eq('id', id)

      // When impersonating, add explicit tenant filter
      if (isImpersonating && effectiveTenantId) {
        query = query.eq('tenant_id', effectiveTenantId)
      }

      const { data, error } = await query.single()

      if (error) throw error
      return data as Profile
    },
    enabled: !!id,
  })
}
