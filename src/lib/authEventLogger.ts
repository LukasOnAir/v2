import { supabase } from '@/lib/supabase/client'

type AuthEventType =
  | 'login'
  | 'logout'
  | 'login_failed'
  | 'signup'
  | 'password_reset_request'
  | 'password_reset_complete'
  | 'email_verified'

/**
 * Standalone function for logging auth events
 * Used by AuthContext - kept separate to avoid circular dependency
 */
export async function logAuthEventStandalone({
  eventType,
  email,
  tenantId,
  userId,
  metadata = {},
}: {
  eventType: AuthEventType
  email?: string
  tenantId?: string | null
  userId?: string | null
  metadata?: Record<string, unknown>
}) {
  try {
    await supabase.from('auth_events').insert({
      tenant_id: tenantId || null,
      user_id: userId || null,
      event_type: eventType,
      email: email || null,
      user_agent: navigator.userAgent,
      ip_address: null,
      metadata,
    })
  } catch (error) {
    console.error('Failed to log auth event:', error)
  }
}
