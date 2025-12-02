import { useState } from 'react'
import { Link, useLocation } from 'react-router'
import { motion } from 'motion/react'
import { Mail, RefreshCw, ArrowLeft, CheckCircle, Shield, AlertCircle } from 'lucide-react'
import { supabase } from '@/lib/supabase/client'
import { useAuth } from '@/contexts/AuthContext'

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

export function VerifyEmailPage() {
  const location = useLocation()
  const { user } = useAuth()
  const [isResending, setIsResending] = useState(false)
  const [resendSuccess, setResendSuccess] = useState(false)
  const [error, setError] = useState('')

  // Get email from location state or current user
  const email = (location.state as { email?: string })?.email || user?.email || ''

  const handleResend = async () => {
    if (!email) return

    setIsResending(true)
    setError('')
    setResendSuccess(false)

    const { error } = await supabase.auth.resend({
      type: 'signup',
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/confirm`,
      },
    })

    setIsResending(false)

    if (error) {
      setError(error.message)
      return
    }

    setResendSuccess(true)
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

      {/* Content card */}
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
            className="space-y-6"
          >
            {/* Logo and branding */}
            <motion.div variants={itemVariants} className="text-center space-y-3">
              <motion.div
                className="mx-auto w-16 h-16 bg-accent-500/20 rounded-2xl flex items-center justify-center"
                whileHover={{ scale: 1.05, rotate: 5 }}
                transition={{ type: 'spring', stiffness: 300 }}
              >
                <Mail className="w-8 h-8 text-accent-500" />
              </motion.div>
              <h1 className="text-2xl font-bold text-text-primary">
                Verify your email
              </h1>
              <p className="text-text-secondary text-sm">
                We sent a verification link to
              </p>
              {email && (
                <p className="text-accent-500 font-medium break-all">
                  {email}
                </p>
              )}
            </motion.div>

            {/* Instructions */}
            <motion.div variants={itemVariants} className="space-y-4">
              <div className="bg-surface-base rounded-lg p-4 space-y-3">
                <div className="flex items-start gap-3">
                  <CheckCircle className="w-5 h-5 text-accent-500 mt-0.5 flex-shrink-0" />
                  <p className="text-text-secondary text-sm">
                    Click the link in your email to verify your account
                  </p>
                </div>
                <div className="flex items-start gap-3">
                  <Shield className="w-5 h-5 text-accent-500 mt-0.5 flex-shrink-0" />
                  <p className="text-text-secondary text-sm">
                    Once verified, you can access all features
                  </p>
                </div>
              </div>
            </motion.div>

            {/* Success message */}
            {resendSuccess && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-center gap-2 p-3 bg-green-500/10 border border-green-500/30 rounded-lg text-green-400 text-sm"
              >
                <CheckCircle className="w-4 h-4 flex-shrink-0" />
                Verification email sent! Check your inbox.
              </motion.div>
            )}

            {/* Error message */}
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm"
              >
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                {error}
              </motion.div>
            )}

            {/* Resend button */}
            <motion.div variants={itemVariants}>
              <motion.button
                onClick={handleResend}
                disabled={isResending || !email}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="w-full py-3 bg-surface-base hover:bg-surface-border text-text-primary font-medium rounded-lg transition-colors disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2 border border-surface-border"
              >
                {isResending ? (
                  <>
                    <RefreshCw className="w-5 h-5 animate-spin" />
                    Sending...
                  </>
                ) : (
                  <>
                    <RefreshCw className="w-5 h-5" />
                    Resend verification email
                  </>
                )}
              </motion.button>
            </motion.div>

            {/* Back to login link */}
            <motion.div variants={itemVariants} className="text-center">
              <Link
                to="/login"
                className="inline-flex items-center gap-2 text-text-secondary hover:text-accent-500 text-sm transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
                Back to login
              </Link>
            </motion.div>
          </motion.div>
        </div>

        {/* Subtle footer */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8 }}
          className="text-center text-text-muted text-xs mt-6"
        >
          RiskGuard ERM - Enterprise Risk Management
        </motion.p>
      </motion.div>
    </div>
  )
}
