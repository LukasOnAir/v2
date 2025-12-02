import { useCallback } from 'react'
import { supabase } from '@/lib/supabase/client'

type NotificationType = 'approval-request' | 'approval-result' | 'test-assigned'

interface NotificationData {
  // For approval-request
  entityType?: string
  entityName?: string
  changeType?: string
  submitterName?: string
  // For approval-result
  result?: 'approved' | 'rejected'
  reviewerName?: string
  rejectionReason?: string
  // For test-assigned
  controlName?: string
  dueDate?: string
}

interface SendNotificationOptions {
  type: NotificationType
  recipientId: string
  data: NotificationData
}

interface SendNotificationResult {
  success: boolean
  emailSent?: boolean
  error?: string
}

/**
 * Hook for sending notifications via the send-notification Edge Function.
 *
 * Used to trigger email notifications for:
 * - approval-request: Notify Managers when a pending change is submitted
 * - approval-result: Notify submitter when change is approved/rejected
 * - test-assigned: Notify tester when assigned to a control
 *
 * All calls are non-blocking (fire-and-forget pattern).
 */
export function useSendNotification() {
  const sendNotification = useCallback(async (
    options: SendNotificationOptions
  ): Promise<SendNotificationResult> => {
    try {
      // Get current session for auth header
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        console.warn('[Notification] No session available for notification')
        return { success: false, error: 'Not authenticated' }
      }

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-notification`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`,
          },
          body: JSON.stringify(options),
        }
      )

      const result = await response.json()

      if (!response.ok) {
        console.error('[Notification] Failed:', result)
        return { success: false, error: result.error }
      }

      return { success: true, emailSent: result.emailSent }
    } catch (error) {
      console.error('[Notification] Error:', error)
      return { success: false, error: 'Network error' }
    }
  }, [])

  return { sendNotification }
}
