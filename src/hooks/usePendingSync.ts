import { useState, useEffect, useRef } from 'react'
import { toast } from 'sonner'
import { useNetworkStatus } from './useNetworkStatus'
import { useRecordTest } from './useControlTests'
import { getPendingTests, clearPendingTest, getPendingCount } from '@/lib/offlineQueue'

/**
 * Hook to automatically sync pending test submissions when back online
 * @returns Object with pendingCount and isSyncing state
 */
export function usePendingSync() {
  const isOnline = useNetworkStatus()
  const recordTest = useRecordTest()
  const [isSyncing, setIsSyncing] = useState(false)
  const [pendingCount, setPendingCount] = useState(0)
  const wasOfflineRef = useRef(!isOnline)

  // Update pending count on mount and after syncs
  useEffect(() => {
    const updateCount = async () => {
      try {
        const count = await getPendingCount()
        setPendingCount(count)
      } catch (error) {
        console.error('Failed to get pending count:', error)
      }
    }
    updateCount()
  }, [])

  // Sync pending tests when coming back online
  useEffect(() => {
    const syncPending = async () => {
      // Only sync if we were offline and are now online
      if (!isOnline || !wasOfflineRef.current) {
        wasOfflineRef.current = !isOnline
        return
      }

      wasOfflineRef.current = false
      setIsSyncing(true)

      try {
        const pendingTests = await getPendingTests()
        if (pendingTests.length === 0) {
          setIsSyncing(false)
          return
        }

        toast.info(`Syncing ${pendingTests.length} pending test(s)...`)

        let syncedCount = 0
        for (const pending of pendingTests) {
          try {
            // Extract test data without IndexedDB-specific fields
            const { id: pendingId, queuedAt, ...testData } = pending
            await recordTest.mutateAsync(testData)
            await clearPendingTest(pendingId)
            syncedCount++
          } catch (error) {
            console.error(`Failed to sync test ${pending.id}:`, error)
            // Continue with next test, don't clear failed ones
          }
        }

        if (syncedCount > 0) {
          toast.success(`Synced ${syncedCount} test(s) successfully`)
        }

        // Update pending count
        const remainingCount = await getPendingCount()
        setPendingCount(remainingCount)

        if (remainingCount > 0) {
          toast.warning(`${remainingCount} test(s) failed to sync`)
        }
      } catch (error) {
        console.error('Sync failed:', error)
        toast.error('Failed to sync pending tests')
      } finally {
        setIsSyncing(false)
      }
    }

    syncPending()
  }, [isOnline, recordTest])

  return { pendingCount, isSyncing }
}
