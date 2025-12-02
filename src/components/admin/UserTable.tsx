import { useState } from 'react'
import { toast } from 'sonner'
import { UserX, UserCheck, Trash2, Clock, Mail } from 'lucide-react'
import { clsx } from 'clsx'
import { ROLE_LABELS, type Role } from '@/lib/permissions'
import type { Profile, PendingInvitation } from '@/lib/supabase/types'
import { useAuth } from '@/contexts/AuthContext'

interface UserTableProps {
  users: Profile[]
  pendingInvitations: PendingInvitation[]
  onToggleActive: (userId: string, currentStatus: boolean) => Promise<void>
  onCancelInvitation: (invitationId: string) => Promise<void>
}

export function UserTable({
  users,
  pendingInvitations,
  onToggleActive,
  onCancelInvitation,
}: UserTableProps) {
  const { user } = useAuth()
  const [loadingId, setLoadingId] = useState<string | null>(null)

  const handleToggleActive = async (userId: string, currentStatus: boolean) => {
    setLoadingId(userId)
    try {
      await onToggleActive(userId, currentStatus)
      toast.success(currentStatus ? 'User deactivated' : 'User reactivated')
    } catch {
      toast.error('Failed to update user status')
    } finally {
      setLoadingId(null)
    }
  }

  const handleCancelInvitation = async (invitationId: string) => {
    setLoadingId(invitationId)
    try {
      await onCancelInvitation(invitationId)
      toast.success('Invitation cancelled')
    } catch {
      toast.error('Failed to cancel invitation')
    } finally {
      setLoadingId(null)
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })
  }

  return (
    <div className="space-y-6">
      {/* Active Users */}
      <div>
        <h3 className="text-lg font-medium text-text-primary mb-4">Users</h3>
        <div className="bg-surface-elevated rounded-lg border border-surface-border overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-surface-border">
                <th className="px-4 py-3 text-left text-xs font-medium text-text-muted uppercase tracking-wider">
                  Name
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-text-muted uppercase tracking-wider">
                  Email
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-text-muted uppercase tracking-wider">
                  Role
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-text-muted uppercase tracking-wider">
                  Status
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-text-muted uppercase tracking-wider">
                  Joined
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-text-muted uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {users.map((profile) => (
                <tr
                  key={profile.id}
                  className="border-b border-surface-border last:border-0 hover:bg-surface-overlay/50"
                >
                  <td className="px-4 py-3">
                    <span className="font-medium text-text-primary">
                      {profile.full_name || 'No name'}
                    </span>
                    {profile.id === user?.id && (
                      <span className="ml-2 px-1.5 py-0.5 text-xs rounded border border-surface-border text-text-muted">
                        You
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-text-secondary">
                    {/* Note: email is not in profiles table - would need join with auth.users */}
                    -
                  </td>
                  <td className="px-4 py-3">
                    <span className="px-2 py-0.5 rounded text-xs font-medium bg-accent-500/20 text-accent-400">
                      {ROLE_LABELS[profile.role as Role] || profile.role}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {profile.is_active ? (
                      <span className="px-2 py-0.5 rounded text-xs font-medium bg-green-500/20 text-green-400">
                        Active
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded text-xs font-medium bg-red-500/20 text-red-400">
                        Inactive
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-text-muted text-sm">
                    {formatDate(profile.created_at)}
                  </td>
                  <td className="px-4 py-3 text-right">
                    {profile.id !== user?.id && (
                      <button
                        onClick={() => handleToggleActive(profile.id, profile.is_active)}
                        disabled={loadingId === profile.id}
                        className={clsx(
                          'inline-flex items-center gap-1 px-3 py-1.5 rounded text-sm font-medium transition-colors disabled:opacity-50',
                          profile.is_active
                            ? 'text-red-400 hover:bg-red-500/10'
                            : 'text-green-400 hover:bg-green-500/10'
                        )}
                      >
                        {profile.is_active ? (
                          <>
                            <UserX className="h-4 w-4" />
                            Deactivate
                          </>
                        ) : (
                          <>
                            <UserCheck className="h-4 w-4" />
                            Reactivate
                          </>
                        )}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
              {users.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-text-muted">
                    No users found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pending Invitations */}
      {pendingInvitations.length > 0 && (
        <div>
          <h3 className="text-lg font-medium text-text-primary mb-4 flex items-center gap-2">
            <Clock className="h-5 w-5 text-amber-500" />
            Pending Invitations
          </h3>
          <div className="bg-surface-elevated rounded-lg border border-surface-border overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-surface-border">
                  <th className="px-4 py-3 text-left text-xs font-medium text-text-muted uppercase tracking-wider">
                    Email
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-text-muted uppercase tracking-wider">
                    Role
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-text-muted uppercase tracking-wider">
                    Expires
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-text-muted uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {pendingInvitations.map((invitation) => (
                  <tr
                    key={invitation.id}
                    className="border-b border-surface-border last:border-0 hover:bg-surface-overlay/50"
                  >
                    <td className="px-4 py-3">
                      <span className="flex items-center gap-2 font-medium text-text-primary">
                        <Mail className="h-4 w-4 text-text-muted" />
                        {invitation.email}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="px-2 py-0.5 rounded text-xs font-medium bg-accent-500/20 text-accent-400">
                        {ROLE_LABELS[invitation.role as Role] || invitation.role}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-text-muted text-sm">
                      {formatDate(invitation.expires_at)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => handleCancelInvitation(invitation.id)}
                        disabled={loadingId === invitation.id}
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded text-sm font-medium text-red-400 hover:bg-red-500/10 transition-colors disabled:opacity-50"
                      >
                        <Trash2 className="h-4 w-4" />
                        Cancel
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
