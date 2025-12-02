import { useState, useEffect, type FormEvent } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { User, Lock, Eye, EyeOff, Loader2, AlertCircle, CheckCircle, Mail, Shield, Bell } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { useProfileUpdate } from '@/hooks/useProfileUpdate'
import { supabase } from '@/lib/supabase/client'
import { ROLE_LABELS, type Role } from '@/lib/permissions'
import type { EmailPreferences } from '@/lib/supabase/types'

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.1,
    },
  },
}

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.4,
      ease: 'easeOut',
    },
  },
}

export function ProfilePage() {
  const { user, role } = useAuth()
  const { isUpdating, updateName, updatePassword } = useProfileUpdate()

  const [fullName, setFullName] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)

  const [nameError, setNameError] = useState<string | null>(null)
  const [nameSuccess, setNameSuccess] = useState(false)
  const [passwordError, setPasswordError] = useState<string | null>(null)
  const [passwordSuccess, setPasswordSuccess] = useState(false)

  // Email preferences state
  const [emailPreferences, setEmailPreferences] = useState<EmailPreferences>({
    test_reminders: true,
    approval_notifications: true,
  })
  const [prefsLoading, setPrefsLoading] = useState(false)
  const [prefsSaved, setPrefsSaved] = useState(false)

  // Load current profile data
  useEffect(() => {
    if (!user) return

    const loadProfile = async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('full_name, email_preferences')
        .eq('id', user.id)
        .single()

      if (error) {
        console.error('Failed to load profile:', error)
        return
      }

      if (data) {
        setFullName(data.full_name || '')
        // Load email preferences - use saved values or defaults
        const prefs = data.email_preferences as EmailPreferences | null
        if (prefs) {
          setEmailPreferences({
            test_reminders: prefs.test_reminders ?? true,
            approval_notifications: prefs.approval_notifications ?? true,
          })
        }
        // If email_preferences is null, keep the default state (all enabled)
      }
    }

    loadProfile()
  }, [user])

  const handleUpdateName = async (e: FormEvent) => {
    e.preventDefault()
    setNameError(null)
    setNameSuccess(false)

    const result = await updateName(fullName)

    if (result.success) {
      setNameSuccess(true)
      setTimeout(() => setNameSuccess(false), 3000)
    } else {
      setNameError(result.error || 'Failed to update name')
    }
  }

  const handleUpdatePassword = async (e: FormEvent) => {
    e.preventDefault()
    setPasswordError(null)
    setPasswordSuccess(false)

    if (newPassword !== confirmPassword) {
      setPasswordError('Passwords do not match')
      return
    }

    if (newPassword.length < 8) {
      setPasswordError('Password must be at least 8 characters')
      return
    }

    const result = await updatePassword(newPassword)

    if (result.success) {
      setPasswordSuccess(true)
      setNewPassword('')
      setConfirmPassword('')
      setTimeout(() => setPasswordSuccess(false), 3000)
    } else {
      setPasswordError(result.error || 'Failed to update password')
    }
  }

  // Error state for preferences
  const [prefsError, setPrefsError] = useState<string | null>(null)

  const updateEmailPreference = async (key: keyof EmailPreferences, value: boolean) => {
    if (!user) return

    const newPreferences = { ...emailPreferences, [key]: value }
    setEmailPreferences(newPreferences)
    setPrefsLoading(true)
    setPrefsSaved(false)
    setPrefsError(null)

    const { error } = await supabase
      .from('profiles')
      .update({ email_preferences: newPreferences })
      .eq('id', user.id)

    setPrefsLoading(false)

    if (error) {
      console.error('Failed to update email preferences:', error)
      setPrefsError(error.message)
      // Revert the optimistic update on error
      setEmailPreferences(emailPreferences)
    } else {
      setPrefsSaved(true)
      setTimeout(() => setPrefsSaved(false), 2000)
    }
  }

  return (
    <div className="container mx-auto py-6 px-4 max-w-2xl">
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="space-y-6"
      >
        {/* Page Header */}
        <motion.div variants={itemVariants} className="flex items-center gap-4">
          <div className="w-12 h-12 bg-accent-500/20 rounded-xl flex items-center justify-center">
            <User className="w-6 h-6 text-accent-500" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-text-primary">My Profile</h1>
            <p className="text-text-secondary text-sm">Manage your account settings</p>
          </div>
        </motion.div>

        {/* Account Information Card */}
        <motion.div
          variants={itemVariants}
          className="bg-surface-elevated rounded-xl border border-surface-border p-6"
        >
          <div className="flex items-center gap-2 mb-4">
            <Shield className="w-5 h-5 text-accent-500" />
            <h2 className="text-lg font-semibold text-text-primary">Account Information</h2>
          </div>
          <p className="text-text-muted text-sm mb-4">
            Your account details (some fields cannot be changed)
          </p>

          <div className="space-y-4">
            <div className="flex items-center gap-3 p-3 bg-surface-base rounded-lg">
              <Mail className="w-5 h-5 text-text-muted" />
              <div>
                <p className="text-text-muted text-xs">Email</p>
                <p className="text-text-primary">{user?.email}</p>
              </div>
            </div>

            <div className="flex items-center gap-3 p-3 bg-surface-base rounded-lg">
              <Shield className="w-5 h-5 text-text-muted" />
              <div>
                <p className="text-text-muted text-xs">Role</p>
                <p className="text-text-primary">{role ? ROLE_LABELS[role as Role] : 'Unknown'}</p>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Update Name Card */}
        <motion.div
          variants={itemVariants}
          className="bg-surface-elevated rounded-xl border border-surface-border p-6"
        >
          <div className="flex items-center gap-2 mb-4">
            <User className="w-5 h-5 text-accent-500" />
            <h2 className="text-lg font-semibold text-text-primary">Profile</h2>
          </div>
          <p className="text-text-muted text-sm mb-4">Update your display name</p>

          <form onSubmit={handleUpdateName} className="space-y-4">
            <div>
              <label
                htmlFor="fullName"
                className="block text-sm font-medium text-text-secondary mb-2"
              >
                Full Name
              </label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-text-muted" />
                <motion.input
                  id="fullName"
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Your full name"
                  className="w-full pl-10 pr-4 py-3 bg-surface-base border border-surface-border rounded-lg text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-accent-500 focus:border-transparent transition-all"
                  whileFocus={{ scale: 1.005 }}
                  disabled={isUpdating}
                />
              </div>
            </div>

            {/* Name Error */}
            <AnimatePresence mode="wait">
              {nameError && (
                <motion.div
                  initial={{ opacity: 0, y: -10, height: 0 }}
                  animate={{ opacity: 1, y: 0, height: 'auto' }}
                  exit={{ opacity: 0, y: -10, height: 0 }}
                  transition={{ duration: 0.2 }}
                  className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm"
                >
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  {nameError}
                </motion.div>
              )}
            </AnimatePresence>

            {/* Name Success */}
            <AnimatePresence mode="wait">
              {nameSuccess && (
                <motion.div
                  initial={{ opacity: 0, y: -10, height: 0 }}
                  animate={{ opacity: 1, y: 0, height: 'auto' }}
                  exit={{ opacity: 0, y: -10, height: 0 }}
                  transition={{ duration: 0.2 }}
                  className="flex items-center gap-2 p-3 bg-green-500/10 border border-green-500/30 rounded-lg text-green-400 text-sm"
                >
                  <CheckCircle className="w-4 h-4 flex-shrink-0" />
                  Name updated successfully
                </motion.div>
              )}
            </AnimatePresence>

            <motion.button
              type="submit"
              disabled={isUpdating}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="px-6 py-2.5 bg-accent-500 hover:bg-accent-600 text-white font-medium rounded-lg transition-colors disabled:opacity-70 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {isUpdating ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Saving...
                </>
              ) : (
                'Save Name'
              )}
            </motion.button>
          </form>
        </motion.div>

        {/* Change Password Card */}
        <motion.div
          variants={itemVariants}
          className="bg-surface-elevated rounded-xl border border-surface-border p-6"
        >
          <div className="flex items-center gap-2 mb-4">
            <Lock className="w-5 h-5 text-accent-500" />
            <h2 className="text-lg font-semibold text-text-primary">Change Password</h2>
          </div>
          <p className="text-text-muted text-sm mb-4">Update your password</p>

          <form onSubmit={handleUpdatePassword} className="space-y-4">
            <div>
              <label
                htmlFor="newPassword"
                className="block text-sm font-medium text-text-secondary mb-2"
              >
                New Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-text-muted" />
                <motion.input
                  id="newPassword"
                  type={showNewPassword ? 'text' : 'password'}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="At least 8 characters"
                  className="w-full pl-10 pr-12 py-3 bg-surface-base border border-surface-border rounded-lg text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-accent-500 focus:border-transparent transition-all"
                  whileFocus={{ scale: 1.005 }}
                  disabled={isUpdating}
                />
                <button
                  type="button"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-secondary transition-colors"
                >
                  {showNewPassword ? (
                    <EyeOff className="w-5 h-5" />
                  ) : (
                    <Eye className="w-5 h-5" />
                  )}
                </button>
              </div>
            </div>

            <div>
              <label
                htmlFor="confirmNewPassword"
                className="block text-sm font-medium text-text-secondary mb-2"
              >
                Confirm New Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-text-muted" />
                <motion.input
                  id="confirmNewPassword"
                  type={showConfirmPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirm new password"
                  className="w-full pl-10 pr-12 py-3 bg-surface-base border border-surface-border rounded-lg text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-accent-500 focus:border-transparent transition-all"
                  whileFocus={{ scale: 1.005 }}
                  disabled={isUpdating}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-secondary transition-colors"
                >
                  {showConfirmPassword ? (
                    <EyeOff className="w-5 h-5" />
                  ) : (
                    <Eye className="w-5 h-5" />
                  )}
                </button>
              </div>
            </div>

            {/* Password Error */}
            <AnimatePresence mode="wait">
              {passwordError && (
                <motion.div
                  initial={{ opacity: 0, y: -10, height: 0 }}
                  animate={{ opacity: 1, y: 0, height: 'auto' }}
                  exit={{ opacity: 0, y: -10, height: 0 }}
                  transition={{ duration: 0.2 }}
                  className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm"
                >
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  {passwordError}
                </motion.div>
              )}
            </AnimatePresence>

            {/* Password Success */}
            <AnimatePresence mode="wait">
              {passwordSuccess && (
                <motion.div
                  initial={{ opacity: 0, y: -10, height: 0 }}
                  animate={{ opacity: 1, y: 0, height: 'auto' }}
                  exit={{ opacity: 0, y: -10, height: 0 }}
                  transition={{ duration: 0.2 }}
                  className="flex items-center gap-2 p-3 bg-green-500/10 border border-green-500/30 rounded-lg text-green-400 text-sm"
                >
                  <CheckCircle className="w-4 h-4 flex-shrink-0" />
                  Password updated successfully
                </motion.div>
              )}
            </AnimatePresence>

            <motion.button
              type="submit"
              disabled={isUpdating || !newPassword}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="px-6 py-2.5 bg-accent-500 hover:bg-accent-600 text-white font-medium rounded-lg transition-colors disabled:opacity-70 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {isUpdating ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Updating...
                </>
              ) : (
                'Update Password'
              )}
            </motion.button>
          </form>
        </motion.div>

        {/* Email Preferences Card */}
        <motion.div
          variants={itemVariants}
          className="bg-surface-elevated rounded-xl border border-surface-border p-6"
        >
          <div className="flex items-center gap-2 mb-4">
            <Bell className="w-5 h-5 text-accent-500" />
            <h2 className="text-lg font-semibold text-text-primary">Email Preferences</h2>
            {prefsLoading && <Loader2 className="w-4 h-4 animate-spin text-accent-500" />}
            <AnimatePresence>
              {prefsSaved && (
                <motion.span
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -10 }}
                  className="text-green-400 text-sm flex items-center gap-1"
                >
                  <CheckCircle className="w-3 h-3" />
                  Saved
                </motion.span>
              )}
            </AnimatePresence>
          </div>
          <p className="text-text-muted text-sm mb-4">
            Manage which email notifications you receive
          </p>

          {/* Preferences Error */}
          <AnimatePresence mode="wait">
            {prefsError && (
              <motion.div
                initial={{ opacity: 0, y: -10, height: 0 }}
                animate={{ opacity: 1, y: 0, height: 'auto' }}
                exit={{ opacity: 0, y: -10, height: 0 }}
                transition={{ duration: 0.2 }}
                className="flex items-center gap-2 p-3 mb-4 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm"
              >
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                Failed to save: {prefsError}
              </motion.div>
            )}
          </AnimatePresence>

          <div className="space-y-4">
            {/* Test Reminders Toggle */}
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={emailPreferences.test_reminders}
                onChange={(e) => updateEmailPreference('test_reminders', e.target.checked)}
                disabled={prefsLoading}
                className="mt-1 w-4 h-4 rounded border-surface-border bg-surface-base text-accent-500 focus:ring-accent-500 focus:ring-offset-0 cursor-pointer"
              />
              <div>
                <span className="text-text-primary font-medium">Test Reminders</span>
                <p className="text-text-muted text-sm">
                  Receive reminders about upcoming and overdue control tests
                </p>
              </div>
            </label>

            {/* Approval Notifications Toggle */}
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={emailPreferences.approval_notifications}
                onChange={(e) => updateEmailPreference('approval_notifications', e.target.checked)}
                disabled={prefsLoading}
                className="mt-1 w-4 h-4 rounded border-surface-border bg-surface-base text-accent-500 focus:ring-accent-500 focus:ring-offset-0 cursor-pointer"
              />
              <div>
                <span className="text-text-primary font-medium">Approval Notifications</span>
                <p className="text-text-muted text-sm">
                  Receive notifications about approval requests and results
                </p>
              </div>
            </label>
          </div>
        </motion.div>
      </motion.div>
    </div>
  )
}
