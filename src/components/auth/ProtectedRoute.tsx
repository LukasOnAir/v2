import { Navigate, Outlet, useLocation } from 'react-router'
import { useAuth } from '@/contexts/AuthContext'
import { ROLES } from '@/lib/permissions'

export function ProtectedRoute() {
  const { user, role, isLoading } = useAuth()
  const location = useLocation()

  // Show loading state while checking auth
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-surface-base">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent-500" />
      </div>
    )
  }

  // Not authenticated - redirect to login
  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  // AUTH-02: Require email verification before app access
  if (!user.email_confirmed_at) {
    return <Navigate to="/verify-email" state={{ email: user.email }} replace />
  }

  // Role-based landing page redirect:
  // Control Testers should land on /tester (My Controls), not the default /taxonomy
  // Only redirect from root path to avoid interfering with direct navigation
  if (role === ROLES.CONTROL_TESTER && location.pathname === '/') {
    return <Navigate to="/tester" replace />
  }

  return <Outlet />
}
