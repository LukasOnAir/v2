import { WifiOff, CloudOff } from 'lucide-react'
import { useNetworkStatus } from '@/hooks/useNetworkStatus'
import { usePendingSync } from '@/hooks/usePendingSync'

/**
 * Visual indicator for offline status and pending sync count
 * Shows red badge when offline, amber badge when online with pending items
 * Returns null when online with no pending items (invisible)
 */
export function OfflineIndicator() {
  const isOnline = useNetworkStatus()
  const { pendingCount } = usePendingSync()

  // Offline state - show red badge
  if (!isOnline) {
    return (
      <div className="inline-flex items-center gap-2 min-h-[44px] px-3 py-2 rounded-full bg-red-500/20 text-red-600">
        <WifiOff className="h-4 w-4" />
        <span className="text-sm font-medium">Offline</span>
      </div>
    )
  }

  // Online but has pending items - show amber badge
  if (pendingCount > 0) {
    return (
      <div className="inline-flex items-center gap-2 min-h-[44px] px-3 py-2 rounded-full bg-amber-500/20 text-amber-600">
        <CloudOff className="h-4 w-4" />
        <span className="text-sm font-medium">{pendingCount} pending</span>
      </div>
    )
  }

  // Online with no pending - invisible
  return null
}
