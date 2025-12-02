import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase/client'
import { useAuth } from '@/contexts/AuthContext'
import type {
  Profile,
  PendingInvitation,
  SendInvitationRequest,
  SendInvitationResponse,
} from '@/lib/supabase/types'

interface UseUserManagementReturn {
  // Data
  users: Profile[]
  pendingInvitations: PendingInvitation[]
  isLoading: boolean
  error: string | null

  // Actions
  inviteUser: (data: SendInvitationRequest) => Promise<SendInvitationResponse>
  toggleUserActive: (userId: string, currentStatus: boolean) => Promise<void>
  cancelInvitation: (invitationId: string) => Promise<void>
  refreshUsers: () => Promise<void>
}

export function useUserManagement(): UseUserManagementReturn {
  const { tenantId, session } = useAuth()
  const [users, setUsers] = useState<Profile[]>([])
  const [pendingInvitations, setPendingInvitations] = useState<PendingInvitation[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Fetch users and pending invitations
  const refreshUsers = useCallback(async () => {
    if (!tenantId) return

    setIsLoading(true)
    setError(null)

    try {
      // Fetch active and inactive users
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('*')
        .eq('tenant_id', tenantId)
        .order('created_at', { ascending: false })

      if (profilesError) throw profilesError
      setUsers(profilesData || [])

      // Fetch pending invitations (not yet accepted, not expired)
      const { data: invitationsData, error: invitationsError } = await supabase
        .from('pending_invitations')
        .select('*')
        .eq('tenant_id', tenantId)
        .is('accepted_at', null)
        .gt('expires_at', new Date().toISOString())
        .order('created_at', { ascending: false })

      if (invitationsError) throw invitationsError
      setPendingInvitations(invitationsData || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load users')
    } finally {
      setIsLoading(false)
    }
  }, [tenantId])

  // Load on mount and when tenantId changes
  useEffect(() => {
    refreshUsers()
  }, [refreshUsers])

  // Invite a new user
  const inviteUser = async (data: SendInvitationRequest): Promise<SendInvitationResponse> => {
    if (!session?.access_token) {
      return { success: false, error: 'Not authenticated' }
    }

    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-invitation`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
            'Authorization': `Bearer ${session.access_token}`,
          },
          body: JSON.stringify(data),
        }
      )

      const result: SendInvitationResponse = await response.json()

      if (result.success) {
        // Refresh list to show new pending invitation
        await refreshUsers()
      }

      return result
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err.message : 'Failed to send invitation',
      }
    }
  }

  // Toggle user active status
  const toggleUserActive = async (userId: string, currentStatus: boolean): Promise<void> => {
    const { error: updateError } = await supabase
      .from('profiles')
      .update({ is_active: !currentStatus, updated_at: new Date().toISOString() })
      .eq('id', userId)

    if (updateError) {
      throw new Error(updateError.message)
    }

    // Update local state
    setUsers(prev =>
      prev.map(u => (u.id === userId ? { ...u, is_active: !currentStatus } : u))
    )
  }

  // Cancel a pending invitation
  const cancelInvitation = async (invitationId: string): Promise<void> => {
    const { error: deleteError } = await supabase
      .from('pending_invitations')
      .delete()
      .eq('id', invitationId)

    if (deleteError) {
      throw new Error(deleteError.message)
    }

    // Update local state
    setPendingInvitations(prev => prev.filter(i => i.id !== invitationId))
  }

  return {
    users,
    pendingInvitations,
    isLoading,
    error,
    inviteUser,
    toggleUserActive,
    cancelInvitation,
    refreshUsers,
  }
}
