import { useState, useEffect, type FormEvent } from 'react'
import { useSearchParams, useNavigate, Link } from 'react-router'
import { motion, AnimatePresence } from 'motion/react'
import { Shield, AlertCircle, CheckCircle, Lock, Eye, EyeOff, Loader2, User } from 'lucide-react'
import type { AcceptInvitationRequest, AcceptInvitationResponse } from '@/lib/supabase/types'

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.2,
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

const cardVariants = {
  hidden: { opacity: 0, y: 30, scale: 0.95 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      duration: 0.5,
      ease: 'easeOut',
    },
  },
}

export function AcceptInvitePage() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const token = searchParams.get('token')

  const [fullName, setFullName] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  // Validate token exists
  useEffect(() => {
    if (!token) {
      setError('Invalid invitation link. Please check your email for the correct link.')
    }
  }, [token])

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!token) {
      setError('Invalid invitation link')
      return
    }

    if (password.length < 8) {
      setError('Password must be at least 8 characters')
      return
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match')
      return
    }

    setIsSubmitting(true)

    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/accept-invitation`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
          },
          body: JSON.stringify({
            token,
            password,
            fullName: fullName.trim() || undefined,
          } as AcceptInvitationRequest),
        }
      )

      const result: AcceptInvitationResponse = await response.json()

      if (result.success) {
        setSuccess(true)
        // Redirect to login after short delay
        setTimeout(() => {
          navigate('/login', { state: { message: 'Account created. Please log in.' } })
        }, 2000)
      } else {
        setError(result.error || 'Failed to accept invitation')
      }
    } catch (err) {
      setError('An error occurred. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  // Success state
  if (success) {
    return (
      <div className="min-h-screen bg-surface-base flex items-center justify-center p-4 relative overflow-hidden">
        {/* Animated background gradient */}
        <div className="absolute inset-0 overflow-hidden">
          <motion.div
            className="absolute -top-1/2 -left-1/2 w-full h-full bg-gradient-to-br from-accent-500/10 to-transparent rounded-full blur-3xl"
            animate={{
              scale: [1, 1.2, 1],
              rotate: [0, 90, 0],
            }}
            transition={{
              duration: 20,
              repeat: Infinity,
              ease: 'linear',
            }}
          />
          <motion.div
            className="absolute -bottom-1/2 -right-1/2 w-full h-full bg-gradient-to-tl from-accent-600/10 to-transparent rounded-full blur-3xl"
            animate={{
              scale: [1.2, 1, 1.2],
              rotate: [0, -90, 0],
            }}
            transition={{
              duration: 25,
              repeat: Infinity,
              ease: 'linear',
            }}
          />
        </div>

        <motion.div
          variants={cardVariants}
          initial="hidden"
          animate="visible"
          className="relative w-full max-w-md"
        >
          <div className="bg-surface-elevated rounded-2xl shadow-2xl border border-surface-border p-8">
            <motion.div
              variants={containerVariants}
              initial="hidden"
              animate="visible"
              className="space-y-6 text-center"
            >
              <motion.div variants={itemVariants}>
                <motion.div
                  className="mx-auto w-16 h-16 bg-green-500/20 rounded-2xl flex items-center justify-center"
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: 'spring', stiffness: 300, delay: 0.2 }}
                >
                  <CheckCircle className="w-8 h-8 text-green-500" />
                </motion.div>
              </motion.div>

              <motion.div variants={itemVariants} className="space-y-2">
                <h1 className="text-2xl font-bold text-text-primary">
                  Account Created!
                </h1>
                <p className="text-text-secondary">
                  Your account has been created successfully.
                </p>
              </motion.div>

              <motion.div variants={itemVariants}>
                <p className="text-text-muted text-sm">
                  Redirecting to login...
                </p>
              </motion.div>

              <motion.div variants={itemVariants}>
                <Loader2 className="w-6 h-6 animate-spin text-accent-500 mx-auto" />
              </motion.div>

              <motion.div variants={itemVariants} className="pt-2">
                <Link
                  to="/login"
                  className="text-accent-500 hover:text-accent-400 transition-colors font-medium"
                >
                  Go to Login
                </Link>
              </motion.div>
            </motion.div>
          </div>
        </motion.div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-surface-base flex items-center justify-center p-4 relative overflow-hidden">
      {/* Animated background gradient */}
      <div className="absolute inset-0 overflow-hidden">
        <motion.div
          className="absolute -top-1/2 -left-1/2 w-full h-full bg-gradient-to-br from-accent-500/10 to-transparent rounded-full blur-3xl"
          animate={{
            scale: [1, 1.2, 1],
            rotate: [0, 90, 0],
          }}
          transition={{
            duration: 20,
            repeat: Infinity,
            ease: 'linear',
          }}
        />
        <motion.div
          className="absolute -bottom-1/2 -right-1/2 w-full h-full bg-gradient-to-tl from-accent-600/10 to-transparent rounded-full blur-3xl"
          animate={{
            scale: [1.2, 1, 1.2],
            rotate: [0, -90, 0],
          }}
          transition={{
            duration: 25,
            repeat: Infinity,
            ease: 'linear',
          }}
        />
      </div>

      {/* Accept Invite card */}
      <motion.div
        variants={cardVariants}
        initial="hidden"
        animate="visible"
        className="relative w-full max-w-md"
      >
        <div className="bg-surface-elevated rounded-2xl shadow-2xl border border-surface-border p-8">
          {!token ? (
            <motion.div
              variants={containerVariants}
              initial="hidden"
              animate="visible"
              className="space-y-6 text-center"
            >
              <motion.div variants={itemVariants}>
                <motion.div
                  className="mx-auto w-16 h-16 bg-red-500/20 rounded-2xl flex items-center justify-center"
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: 'spring', stiffness: 300, delay: 0.2 }}
                >
                  <AlertCircle className="w-8 h-8 text-red-500" />
                </motion.div>
              </motion.div>

              <motion.div variants={itemVariants} className="space-y-2">
                <h1 className="text-2xl font-bold text-text-primary">
                  Invalid Invitation
                </h1>
                <p className="text-text-secondary">
                  This invitation link appears to be invalid or has expired.
                </p>
              </motion.div>

              <motion.div variants={itemVariants}>
                <p className="text-text-muted text-sm">
                  Please check your email for the correct link, or contact your administrator.
                </p>
              </motion.div>

              <motion.div variants={itemVariants} className="pt-4">
                <Link
                  to="/login"
                  className="inline-flex items-center justify-center px-4 py-2 bg-surface-overlay hover:bg-surface-border text-text-primary rounded-lg transition-colors"
                >
                  Go to Login
                </Link>
              </motion.div>
            </motion.div>
          ) : (
            <motion.form
              variants={containerVariants}
              initial="hidden"
              animate="visible"
              onSubmit={handleSubmit}
              className="space-y-6"
            >
              {/* Logo and branding */}
              <motion.div variants={itemVariants} className="text-center space-y-3">
                <motion.div
                  className="mx-auto w-16 h-16 bg-accent-500/20 rounded-2xl flex items-center justify-center"
                  whileHover={{ scale: 1.05, rotate: 5 }}
                  transition={{ type: 'spring', stiffness: 300 }}
                >
                  <Shield className="w-8 h-8 text-accent-500" />
                </motion.div>
                <h1 className="text-2xl font-bold text-text-primary">
                  Accept Invitation
                </h1>
                <p className="text-text-secondary text-sm">
                  Complete your account setup to join RiskGuard
                </p>
              </motion.div>

              {/* Full Name field (optional) */}
              <motion.div variants={itemVariants}>
                <label
                  htmlFor="fullName"
                  className="block text-sm font-medium text-text-secondary mb-2"
                >
                  Full Name (optional)
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-text-muted" />
                  <motion.input
                    id="fullName"
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="John Doe"
                    className="w-full pl-10 pr-4 py-3 bg-surface-base border border-surface-border rounded-lg text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-accent-500 focus:border-transparent transition-all"
                    whileFocus={{ scale: 1.01 }}
                    disabled={isSubmitting}
                  />
                </div>
              </motion.div>

              {/* Password field */}
              <motion.div variants={itemVariants}>
                <label
                  htmlFor="password"
                  className="block text-sm font-medium text-text-secondary mb-2"
                >
                  Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-text-muted" />
                  <motion.input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="At least 8 characters"
                    className="w-full pl-10 pr-12 py-3 bg-surface-base border border-surface-border rounded-lg text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-accent-500 focus:border-transparent transition-all"
                    whileFocus={{ scale: 1.01 }}
                    disabled={isSubmitting}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-secondary transition-colors"
                  >
                    {showPassword ? (
                      <EyeOff className="w-5 h-5" />
                    ) : (
                      <Eye className="w-5 h-5" />
                    )}
                  </button>
                </div>
              </motion.div>

              {/* Confirm Password field */}
              <motion.div variants={itemVariants}>
                <label
                  htmlFor="confirmPassword"
                  className="block text-sm font-medium text-text-secondary mb-2"
                >
                  Confirm Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-text-muted" />
                  <motion.input
                    id="confirmPassword"
                    type={showConfirmPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Confirm your password"
                    className="w-full pl-10 pr-12 py-3 bg-surface-base border border-surface-border rounded-lg text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-accent-500 focus:border-transparent transition-all"
                    whileFocus={{ scale: 1.01 }}
                    disabled={isSubmitting}
                    required
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
              </motion.div>

              {/* Error message */}
              <AnimatePresence mode="wait">
                {error && (
                  <motion.div
                    initial={{ opacity: 0, y: -10, height: 0 }}
                    animate={{ opacity: 1, y: 0, height: 'auto' }}
                    exit={{ opacity: 0, y: -10, height: 0 }}
                    transition={{ duration: 0.2 }}
                    className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm"
                  >
                    <AlertCircle className="w-4 h-4 flex-shrink-0" />
                    {error}
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Submit button */}
              <motion.div variants={itemVariants}>
                <motion.button
                  type="submit"
                  disabled={isSubmitting}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="w-full py-3 bg-accent-500 hover:bg-accent-600 text-white font-medium rounded-lg transition-colors disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Creating Account...
                    </>
                  ) : (
                    'Create Account'
                  )}
                </motion.button>
              </motion.div>

              {/* Login link */}
              <motion.div variants={itemVariants} className="text-center">
                <span className="text-text-muted text-sm">
                  Already have an account?{' '}
                  <Link
                    to="/login"
                    className="text-accent-500 hover:text-accent-400 transition-colors font-medium"
                  >
                    Log in
                  </Link>
                </span>
              </motion.div>
            </motion.form>
          )}
        </div>

        {/* Subtle footer */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8 }}
          className="text-center text-text-muted text-xs mt-6"
        >
          Holland Casino Risk Management Demo
        </motion.p>
      </motion.div>
    </div>
  )
}
