import { type ReactNode } from 'react'
import { useRealtimeSync } from '@/hooks/useRealtimeSync'

/**
 * Provider component that initializes realtime subscriptions.
 *
 * Must be rendered inside:
 * - QueryProvider (needs queryClient for cache invalidation)
 * - AuthProvider (needs session for user context)
 *
 * The actual subscription logic is in useRealtimeSync hook.
 * This provider just ensures it's called once at the app level.
 */
export function RealtimeProvider({ children }: { children: ReactNode }) {
  useRealtimeSync()
  return <>{children}</>
}
