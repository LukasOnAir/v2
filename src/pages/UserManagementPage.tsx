import { useState } from 'react'
import { Navigate } from 'react-router'
import { UserPlus, Users } from 'lucide-react'
import { usePermissions } from '@/hooks/usePermissions'
import { useUserManagement } from '@/hooks/useUserManagement'
import { InviteUserDialog } from '@/components/admin/InviteUserDialog'
import { UserTable } from '@/components/admin/UserTable'

/**
 * User Management page for Directors
 * Allows inviting users, viewing all users, and managing user status
 */
export function UserManagementPage() {
  const { canViewUserManagement } = usePermissions()
  const {
    users,
    pendingInvitations,
    isLoading,
    error,
    inviteUser,
    toggleUserActive,
    cancelInvitation,
  } = useUserManagement()
  const [showInviteDialog, setShowInviteDialog] = useState(false)

  // Redirect non-Directors
  if (!canViewUserManagement) {
    return <Navigate to="/" replace />
  }

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-text-primary flex items-center gap-3">
            <Users className="h-7 w-7" />
            User Management
          </h1>
          <p className="text-text-muted mt-1">
            Manage users in your organization
          </p>
        </div>
        <button
          onClick={() => setShowInviteDialog(true)}
          className="flex items-center gap-2 px-4 py-2 bg-accent-500 text-white rounded-lg text-sm font-medium hover:bg-accent-600 transition-colors"
        >
          <UserPlus className="h-4 w-4" />
          Invite User
        </button>
      </div>

      {/* Content */}
      <section className="bg-surface-elevated rounded-lg border border-surface-border p-6">
        <div className="mb-4">
          <h2 className="text-lg font-medium text-text-primary">Organization Users</h2>
          <p className="text-sm text-text-muted mt-1">
            View and manage all users in your organization. You can invite new users,
            deactivate accounts, and manage pending invitations.
          </p>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent-500" />
          </div>
        ) : error ? (
          <div className="text-center py-12 text-red-400">
            Error: {error}
          </div>
        ) : (
          <UserTable
            users={users}
            pendingInvitations={pendingInvitations}
            onToggleActive={toggleUserActive}
            onCancelInvitation={cancelInvitation}
          />
        )}
      </section>

      {/* Invite Dialog */}
      <InviteUserDialog
        open={showInviteDialog}
        onOpenChange={setShowInviteDialog}
        onInvite={inviteUser}
      />
    </div>
  )
}
