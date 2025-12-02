import { useState } from 'react'
import * as Dialog from '@radix-ui/react-dialog'
import { X, UserPlus } from 'lucide-react'
import { toast } from 'sonner'
import { INVITABLE_ROLES, ROLE_LABELS, type Role } from '@/lib/permissions'
import type { SendInvitationRequest, SendInvitationResponse } from '@/lib/supabase/types'

interface InviteUserDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onInvite: (data: SendInvitationRequest) => Promise<SendInvitationResponse>
}

export function InviteUserDialog({ open, onOpenChange, onInvite }: InviteUserDialogProps) {
  const [email, setEmail] = useState('')
  const [role, setRole] = useState<Role | ''>('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!email || !role) {
      toast.error('Please fill in all fields')
      return
    }

    // Basic email validation
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      toast.error('Please enter a valid email address')
      return
    }

    setIsSubmitting(true)

    try {
      const result = await onInvite({
        email: email.toLowerCase().trim(),
        role: role as SendInvitationRequest['role'],
      })

      if (result.success) {
        if (result.emailSent) {
          toast.success('Invitation sent successfully')
        } else if (result.emailError) {
          // Invitation created but email failed - show the actual error
          toast.warning(`Invitation created but email failed: ${result.emailError}`)
        } else {
          // No emailError means email service not configured
          toast.success('Invitation created (email will be sent when configured)')
        }
        setEmail('')
        setRole('')
        onOpenChange(false)
      } else {
        toast.error(result.error || 'Failed to send invitation')
      }
    } catch {
      toast.error('An error occurred while sending the invitation')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      // Reset form when closing
      setEmail('')
      setRole('')
    }
    onOpenChange(newOpen)
  }

  return (
    <Dialog.Root open={open} onOpenChange={handleOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/60 z-40" />
        <Dialog.Content className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[440px] bg-surface-elevated border border-surface-border rounded-lg shadow-xl z-50">
          {/* Header */}
          <div className="flex items-center gap-3 p-4 border-b border-surface-border">
            <div className="p-2 bg-accent-500/10 rounded-lg">
              <UserPlus className="w-5 h-5 text-accent-500" />
            </div>
            <Dialog.Title className="text-lg font-semibold text-text-primary">
              Invite User
            </Dialog.Title>
            <Dialog.Close asChild>
              <button
                className="ml-auto p-2 rounded-lg hover:bg-surface-overlay text-text-secondary hover:text-text-primary"
                disabled={isSubmitting}
              >
                <X size={20} />
              </button>
            </Dialog.Close>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit}>
            <div className="p-4 space-y-4">
              <div className="space-y-2">
                <label htmlFor="invite-email" className="block text-sm font-medium text-text-secondary">
                  Email address
                </label>
                <input
                  id="invite-email"
                  type="email"
                  placeholder="user@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={isSubmitting}
                  className="w-full px-3 py-2 bg-surface-overlay border border-surface-border rounded-lg text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-accent-500 focus:border-accent-500 disabled:opacity-50"
                />
              </div>
              <div className="space-y-2">
                <label htmlFor="invite-role" className="block text-sm font-medium text-text-secondary">
                  Role
                </label>
                <select
                  id="invite-role"
                  value={role}
                  onChange={(e) => setRole(e.target.value as Role)}
                  disabled={isSubmitting}
                  className="w-full px-3 py-2 bg-surface-overlay border border-surface-border rounded-lg text-text-primary focus:outline-none focus:ring-2 focus:ring-accent-500 focus:border-accent-500 disabled:opacity-50"
                >
                  <option value="" disabled>Select a role</option>
                  {INVITABLE_ROLES.map((r) => (
                    <option key={r} value={r}>
                      {ROLE_LABELS[r]}
                    </option>
                  ))}
                </select>
              </div>
              <p className="text-sm text-text-muted">
                The user will receive an email invitation with a link to set up their account.
              </p>
            </div>

            {/* Action buttons */}
            <div className="flex justify-end gap-2 p-4 border-t border-surface-border">
              <button
                type="button"
                onClick={() => onOpenChange(false)}
                disabled={isSubmitting}
                className="px-4 py-2 text-sm text-text-secondary hover:text-text-primary disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting || !email || !role}
                className="flex items-center gap-2 px-4 py-2 bg-accent-500 text-white rounded-lg text-sm font-medium hover:bg-accent-600 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? (
                  <>
                    <span className="animate-spin">...</span>
                    Sending...
                  </>
                ) : (
                  <>
                    <UserPlus size={16} />
                    Send Invitation
                  </>
                )}
              </button>
            </div>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
