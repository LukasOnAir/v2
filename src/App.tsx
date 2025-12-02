import { useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router'
import { Toaster } from 'sonner'
import { ErrorBoundary } from 'react-error-boundary'
import { QueryProvider } from '@/providers/QueryProvider'
import { AuthProvider } from '@/contexts/AuthContext'
import { ImpersonationProvider } from '@/contexts/ImpersonationContext'
import { RealtimeProvider } from '@/providers/RealtimeProvider'
import { ErrorFallback } from '@/components/error/ErrorFallback'
import { Layout } from './components/layout/Layout'
import { TesterLayout } from './components/layout/TesterLayout'
import { ProtectedRoute } from '@/components/auth/ProtectedRoute'
import { TaxonomyPage } from './pages/TaxonomyPage'
import { RCTPage } from './pages/RCTPage'
import { MatrixPage } from './pages/MatrixPage'
import { SunburstPage } from './pages/SunburstPage'
import { RemediationPage } from './pages/RemediationPage'
import { TicketsPage } from './pages/TicketsPage'
import { AuditPage } from './pages/AuditPage'
import { AnalyticsPage } from './pages/AnalyticsPage'
import { KnowledgeBasePage } from './pages/KnowledgeBasePage'
import { ControlsPage } from './pages/ControlsPage'
import { ApprovalPage } from './pages/ApprovalPage'
import { LoginPage } from './pages/LoginPage'
import { SignupPage } from './pages/SignupPage'
import { ForgotPasswordPage } from './pages/ForgotPasswordPage'
import { ResetPasswordPage } from './pages/ResetPasswordPage'
import { VerifyEmailPage } from './pages/VerifyEmailPage'
import { AuthConfirmPage } from './pages/AuthConfirmPage'
import { AcceptInvitePage } from './pages/AcceptInvitePage'
import { ProfilePage } from './pages/ProfilePage'
import { TesterDashboardPage } from './pages/TesterDashboardPage'
import { UserManagementPage } from './pages/UserManagementPage'
import { FeatureFlagsPage } from './pages/FeatureFlagsPage'
import { TenantSetupPage } from './pages/TenantSetupPage'
import { AdminLayout } from '@/components/admin/AdminLayout'
import { AdminFeatureFlagsPage } from '@/pages/admin/AdminFeatureFlagsPage'
import { AdminTenantsPage } from '@/pages/admin/AdminTenantsPage'
import { runMigrationIfNeeded } from '@/utils/controlMigration'

function App() {
  // Run migration on app startup
  useEffect(() => {
    runMigrationIfNeeded()
  }, [])

  const handleError = (error: Error, info: { componentStack?: string | null }) => {
    console.error(JSON.stringify({
      level: 'error',
      type: 'react_error_boundary',
      error: error.message,
      stack: error.stack,
      componentStack: info.componentStack,
      timestamp: new Date().toISOString(),
    }))
  }

  return (
    <ErrorBoundary FallbackComponent={ErrorFallback} onError={handleError}>
      <QueryProvider>
        <AuthProvider>
          <ImpersonationProvider>
            <RealtimeProvider>
            <BrowserRouter>
              <Routes>
                {/* Public auth routes - outside protected area */}
                <Route path="login" element={<LoginPage />} />
                <Route path="signup" element={<SignupPage />} />
                <Route path="forgot-password" element={<ForgotPasswordPage />} />
                <Route path="verify-email" element={<VerifyEmailPage />} />
                <Route path="accept-invite" element={<AcceptInvitePage />} />

                {/* Auth callback routes */}
                <Route path="auth/confirm" element={<AuthConfirmPage />} />
                <Route path="auth/reset-password" element={<ResetPasswordPage />} />

                {/* Protected routes wrapped with ProtectedRoute */}
                <Route element={<ProtectedRoute />}>
                  {/* Tenant setup page (standalone, no layout) */}
                  <Route path="tenant-setup" element={<TenantSetupPage />} />

                  {/* Main app for Manager, Risk Manager, Control Owner */}
                  <Route element={<Layout />}>
                    <Route index element={<Navigate to="/taxonomy" replace />} />
                    <Route path="taxonomy" element={<TaxonomyPage />} />
                    <Route path="rct" element={<RCTPage />} />
                    <Route path="controls" element={<ControlsPage />} />
                    <Route path="matrix" element={<MatrixPage />} />
                    <Route path="sunburst" element={<SunburstPage />} />
                    <Route path="remediation" element={<RemediationPage />} />
                    <Route path="tickets" element={<TicketsPage />} />
                    <Route path="audit" element={<AuditPage />} />
                    <Route path="approval" element={<ApprovalPage />} />
                    <Route path="analytics" element={<AnalyticsPage />} />
                    <Route path="knowledge-base" element={<KnowledgeBasePage />} />
                    <Route path="profile" element={<ProfilePage />} />
                    <Route path="users" element={<UserManagementPage />} />
                    <Route path="feature-flags" element={<FeatureFlagsPage />} />
                  </Route>

                  {/* Simplified interface for Control Tester */}
                  <Route element={<TesterLayout />}>
                    <Route path="tester" element={<TesterDashboardPage />} />
                  </Route>
                </Route>

                {/* Super-admin routes (outside ProtectedRoute - AdminLayout handles auth) */}
                <Route path="admin" element={<AdminLayout />}>
                  <Route index element={<Navigate to="/admin/feature-flags" replace />} />
                  <Route path="feature-flags" element={<AdminFeatureFlagsPage />} />
                  <Route path="tenants" element={<AdminTenantsPage />} />
                </Route>
              </Routes>
            </BrowserRouter>
            <Toaster
              theme="dark"
              position="bottom-right"
              toastOptions={{
                className: 'bg-surface-elevated border-surface-border',
              }}
            />
            </RealtimeProvider>
          </ImpersonationProvider>
        </AuthProvider>
      </QueryProvider>
    </ErrorBoundary>
  )
}

export default App
