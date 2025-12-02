import { supabase } from '@/lib/supabase/client'
import { useAuth } from '@/contexts/AuthContext'

// Re-export for backwards compatibility
export { logAuthEventStandalone } from '@/lib/authEventLogger'

type AuthEventType =
  | 'login'
  | 'logout'
  | 'login_failed'
  | 'signup'
  | 'password_reset_request'
  | 'password_reset_complete'
  | 'email_verified'

interface LogAuthEventParams {
  eventType: AuthEventType
  email?: string
  metadata?: Record<string, unknown>
}

export function useAuthEvents() {
  const { tenantId, user } = useAuth()

  const logAuthEvent = async ({ eventType, email, metadata = {} }: LogAuthEventParams) => {
    try {
      // Get browser info
      const userAgent = navigator.userAgent

      await supabase.from('auth_events').insert({
        tenant_id: tenantId,
        user_id: user?.id || null,
        event_type: eventType,
        email: email || user?.email || null,
        user_agent: userAgent,
        // Note: IP address not available client-side, would need Edge Function
        ip_address: null,
        metadata,
      })
    } catch (error) {
      // Don't throw - logging should not break auth flow
      console.error('Failed to log auth event:', error)
    }
  }

  return { logAuthEvent }
}
