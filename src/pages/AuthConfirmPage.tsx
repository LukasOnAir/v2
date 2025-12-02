import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams, Link } from 'react-router'
import { motion } from 'motion/react'
import { CheckCircle, XCircle, Loader2, ArrowLeft, RefreshCw } from 'lucide-react'
import { supabase } from '@/lib/supabase/client'

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

type VerificationStatus = 'verifying' | 'success' | 'error'

export function AuthConfirmPage() {
  const [searchParams] = useSearchParams()
  const [status, setStatus] = useState<VerificationStatus>('verifying')
  const [error, setError] = useState<string | null>(null)
  const navigate = useNavigate()

  useEffect(() => {
    const verifyEmail = async () => {
      // Supabase email links can use different formats
      // Check for token_hash (new format) or access_token (PKCE flow)
      const tokenHash = searchParams.get('token_hash')
      const type = searchParams.get('type')

      if (tokenHash && type === 'email') {
        // Email verification via token_hash
        const { error } = await supabase.auth.verifyOtp({
          token_hash: tokenHash,
          type: 'email',
        })

        if (error) {
          setStatus('error')
          setError(error.message)
          return
        }

        setStatus('success')
        // Redirect to app after short delay
        setTimeout(() => navigate('/', { replace: true }), 2000)
        return
      }

      // Check for signup type (email confirmation)
      if (tokenHash && type === 'signup') {
        const { error } = await supabase.auth.verifyOtp({
          token_hash: tokenHash,
          type: 'signup',
        })

        if (error) {
          setStatus('error')
          setError(error.message)
          return
        }

        setStatus('success')
        setTimeout(() => navigate('/', { replace: true }), 2000)
        return
      }

      // If no token_hash, Supabase might handle it automatically via URL hash
      // Check if we have an active session with confirmed email
      const { data: { session } } = await supabase.auth.getSession()
      if (session?.user?.email_confirmed_at) {
        setStatus('success')
        setTimeout(() => navigate('/', { replace: true }), 2000)
        return
      }

      // If nothing worked, show error
      setStatus('error')
      setError('Invalid or expired verification link')
    }

    verifyEmail()
  }, [searchParams, navigate])

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
          <div className="space-y-6">
            {/* Verifying state */}
            {status === 'verifying' && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-center space-y-4"
              >
                <motion.div
                  className="mx-auto w-16 h-16 bg-accent-500/20 rounded-2xl flex items-center justify-center"
                  animate={{ rotate: 360 }}
                  transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
                >
                  <Loader2 className="w-8 h-8 text-accent-500" />
                </motion.div>
                <h1 className="text-2xl font-bold text-text-primary">
                  Verifying your email...
                </h1>
                <p className="text-text-secondary text-sm">
                  Please wait while we confirm your email address
                </p>
              </motion.div>
            )}

            {/* Success state */}
            {status === 'success' && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="text-center space-y-4"
              >
                <motion.div
                  className="mx-auto w-16 h-16 bg-green-500/20 rounded-2xl flex items-center justify-center"
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: 'spring', stiffness: 300, delay: 0.2 }}
                >
                  <CheckCircle className="w-8 h-8 text-green-500" />
                </motion.div>
                <h1 className="text-2xl font-bold text-text-primary">
                  Email verified!
                </h1>
                <p className="text-text-secondary text-sm">
                  Your email has been confirmed successfully
                </p>
                <div className="flex items-center justify-center gap-2 text-accent-500 text-sm">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Redirecting to app...
                </div>
              </motion.div>
            )}

            {/* Error state */}
            {status === 'error' && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-center space-y-4"
              >
                <motion.div
                  className="mx-auto w-16 h-16 bg-red-500/20 rounded-2xl flex items-center justify-center"
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: 'spring', stiffness: 300 }}
                >
                  <XCircle className="w-8 h-8 text-red-500" />
                </motion.div>
                <h1 className="text-2xl font-bold text-text-primary">
                  Verification failed
                </h1>
                <p className="text-red-400 text-sm">
                  {error || 'Something went wrong during verification'}
                </p>

                <div className="space-y-3 pt-4">
                  <Link
                    to="/verify-email"
                    className="w-full py-3 bg-surface-base hover:bg-surface-border text-text-primary font-medium rounded-lg transition-colors flex items-center justify-center gap-2 border border-surface-border"
                  >
                    <RefreshCw className="w-5 h-5" />
                    Request new verification link
                  </Link>
                  <Link
                    to="/login"
                    className="w-full py-3 text-text-secondary hover:text-accent-500 text-sm transition-colors flex items-center justify-center gap-2"
                  >
                    <ArrowLeft className="w-4 h-4" />
                    Back to login
                  </Link>
                </div>
              </motion.div>
            )}
          </div>
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
