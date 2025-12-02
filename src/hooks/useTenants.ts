import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase/client'

interface Tenant {
  id: string
  name: string
  createdAt: string
}

/**
 * Fetch all tenants (super-admin only)
 * RLS policy restricts access to is_super_admin() = true
 */
export function useTenants() {
  return useQuery({
    queryKey: ['tenants'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('tenants')
        .select('id, name, created_at')
        .order('name')

      if (error) throw error
      return data.map(t => ({
        id: t.id,
        name: t.name,
        createdAt: t.created_at,
      })) as Tenant[]
    },
  })
}

interface Profile {
  id: string
  name: string
  role: string
  isActive: boolean
}

/**
 * Fetch all profiles within a specific tenant (super-admin only)
 * RLS policy restricts access to is_super_admin() = true
 * Note: email is in auth.users, not profiles - we use full_name or ID for display
 */
export function useProfilesByTenant(tenantId: string | null) {
  return useQuery({
    queryKey: ['profiles', 'tenant', tenantId],
    queryFn: async () => {
      if (!tenantId) return []

      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, role, is_active')
        .eq('tenant_id', tenantId)
        .order('full_name')

      if (error) throw error
      return data.map(p => ({
        id: p.id,
        name: p.full_name || `User ${p.id.slice(0, 8)}`,
        role: p.role,
        isActive: p.is_active,
      })) as Profile[]
    },
    enabled: !!tenantId,
  })
}
