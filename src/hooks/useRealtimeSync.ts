import { useEffect, useRef } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase/client'
import { useAuth } from '@/contexts/AuthContext'

/**
 * Subscribe to realtime database changes and invalidate React Query cache.
 *
 * This hook sets up Supabase Realtime subscriptions for tables that benefit
 * from cross-user sync. When another user modifies data, the cache is
 * invalidated so React Query refetches fresh data.
 *
 * Tables subscribed:
 * - taxonomy_nodes: Risk and process taxonomy changes
 * - controls: Control definition changes
 * - control_links: Control-to-row link changes
 * - rct_rows: Risk Control Table row changes
 * - pending_changes: Four-eye approval workflow
 *
 * Other tables (tests, remediation, tickets, comments) are less collaborative
 * and can be added later if needed.
 */
export function useRealtimeSync() {
  const queryClient = useQueryClient()
  const { session } = useAuth()
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null)

  useEffect(() => {
    // Skip if not authenticated
    if (!session) {
      // Clean up any existing subscription when logging out
      if (channelRef.current) {
        console.log('[Realtime] Cleaning up subscription (no session)')
        supabase.removeChannel(channelRef.current)
        channelRef.current = null
      }
      return
    }

    // Already subscribed - don't create duplicate
    if (channelRef.current) {
      return
    }

    // Create a single channel for all subscriptions
    const channel = supabase
      .channel('tenant-db-changes')
      // Taxonomy changes
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'taxonomy_nodes' },
        (payload) => {
          console.log('[Realtime] taxonomy_nodes change:', payload.eventType)
          // Get the type from either new or old record
          const type = (payload.new as { type?: string })?.type ||
                       (payload.old as { type?: string })?.type
          if (type) {
            queryClient.invalidateQueries({ queryKey: ['taxonomy', type] })
          } else {
            // Fallback: invalidate both
            queryClient.invalidateQueries({ queryKey: ['taxonomy'] })
          }
        }
      )
      // Control changes
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'controls' },
        (payload) => {
          console.log('[Realtime] controls change:', payload.eventType)
          queryClient.invalidateQueries({ queryKey: ['controls'] })
        }
      )
      // Control link changes
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'control_links' },
        (payload) => {
          console.log('[Realtime] control_links change:', payload.eventType)
          queryClient.invalidateQueries({ queryKey: ['controlLinks'] })
        }
      )
      // RCT row changes
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'rct_rows' },
        (payload) => {
          console.log('[Realtime] rct_rows change:', payload.eventType)
          queryClient.invalidateQueries({ queryKey: ['rctRows'] })
        }
      )
      // Pending changes (for approval workflow)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'pending_changes' },
        (payload) => {
          console.log('[Realtime] pending_changes change:', payload.eventType)
          queryClient.invalidateQueries({ queryKey: ['pendingChanges'] })
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          console.log('[Realtime] Subscribed to tenant database changes')
        } else if (status === 'CHANNEL_ERROR') {
          console.error('[Realtime] Channel error - check Supabase Realtime settings')
        } else if (status === 'TIMED_OUT') {
          console.error('[Realtime] Connection timed out')
        } else if (status === 'CLOSED') {
          console.log('[Realtime] Channel closed')
        }
      })

    channelRef.current = channel

    return () => {
      if (channelRef.current) {
        console.log('[Realtime] Unsubscribing from tenant database changes')
        supabase.removeChannel(channelRef.current)
        channelRef.current = null
      }
    }
  }, [session, queryClient])
}
