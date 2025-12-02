import { Outlet, Navigate, Link, useLocation } from 'react-router'
import { useQuery } from '@tanstack/react-query'
import { Settings2, Building2, Flag } from 'lucide-react'
import { supabase } from '@/lib/supabase/client'
import { useAuth } from '@/contexts/AuthContext'
import { ImpersonationBanner } from '@/components/admin/ImpersonationBanner'

/**
 * Admin layout - only accessible to super-admins
 */
export function AdminLayout() {
  const { session, user, isLoading: isAuthLoading } = useAuth()

  // Check if current user is super-admin
  const { data: isSuperAdmin, isLoading: isSuperAdminLoading } = useQuery({
    queryKey: ['is-super-admin', user?.id],
    queryFn: async () => {
      if (!user?.id) return false

      const { data, error } = await supabase
        .from('profiles')
        .select('is_super_admin')
        .eq('id', user.id)
        .single()

      if (error) {
        console.error('Error checking super-admin status:', error)
        return false
      }
      return data?.is_super_admin ?? false
    },
    enabled: !!user?.id,
  })

  // Still loading auth - show spinner (don't redirect yet)
  if (isAuthLoading) {
    return (
      <div className="min-h-screen bg-surface-base flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent-500" />
      </div>
    )
  }

  // Not authenticated - redirect to login
  if (!session) {
    return <Navigate to="/login" replace />
  }

  // Still loading super-admin check - show spinner
  if (isSuperAdminLoading) {
    return (
      <div className="min-h-screen bg-surface-base flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent-500" />
      </div>
    )
  }

  // Not super-admin - redirect to main app
  if (!isSuperAdmin) {
    return <Navigate to="/" replace />
  }

  return (
    <div className="min-h-screen bg-surface-base">
      <ImpersonationBanner />

      {/* Admin Header */}
      <header className="h-14 bg-surface-elevated border-b border-surface-border flex items-center px-4 justify-between">
        <div className="flex items-center gap-3">
          <Settings2 className="h-6 w-6 text-accent-500" />
          <h1 className="text-lg font-semibold text-text-primary">
            RiskLytix Admin
          </h1>
        </div>

        {/* Navigation */}
        <nav className="flex items-center gap-4">
          <NavLink to="/admin/feature-flags" icon={Flag} label="Feature Flags" />
          <NavLink to="/admin/tenants" icon={Building2} label="Tenants" />
        </nav>
      </header>

      {/* Admin Content */}
      <main className="p-6">
        <Outlet />
      </main>
    </div>
  )
}

function NavLink({ to, icon: Icon, label }: { to: string; icon: React.ComponentType<{ className?: string }>; label: string }) {
  const location = useLocation()
  const isActive = location.pathname === to

  return (
    <Link
      to={to}
      className={`flex items-center gap-2 px-3 py-1.5 rounded-lg transition-colors ${
        isActive
          ? 'bg-accent-500/20 text-accent-400'
          : 'text-text-secondary hover:text-text-primary hover:bg-surface-elevated'
      }`}
    >
      <Icon className="w-4 h-4" />
      <span className="text-sm">{label}</span>
    </Link>
  )
}
