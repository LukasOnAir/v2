import { motion } from 'motion/react'
import { Link } from 'react-router'
import { Shield, UserPlus, Mail } from 'lucide-react'

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

/**
 * SignupPage - Invitation Required Notice
 *
 * Direct signup is disabled for security and multi-tenant isolation.
 * Users must be invited by a Director within their organization.
 *
 * This prevents:
 * - Users creating accounts without proper tenant assignment
 * - Users without roles accessing the system
 * - Data visibility issues from missing tenant_id in JWT
 */
export function SignupPage() {
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

      {/* Info card */}
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
                <Shield className="w-8 h-8 text-accent-500" />
              </motion.div>
              <h1 className="text-2xl font-bold text-text-primary">
                Invitation Required
              </h1>
            </motion.div>

            {/* Explanation */}
            <motion.div variants={itemVariants} className="space-y-4">
              <div className="flex items-start gap-3 p-4 bg-surface-base rounded-lg border border-surface-border">
                <UserPlus className="w-5 h-5 text-accent-500 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-text-primary font-medium">Access by Invitation Only</p>
                  <p className="text-text-secondary text-sm mt-1">
                    RiskLytix uses a secure invitation system. To join, you need to be invited by a Director within your organization.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-4 bg-surface-base rounded-lg border border-surface-border">
                <Mail className="w-5 h-5 text-accent-500 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-text-primary font-medium">Already Invited?</p>
                  <p className="text-text-secondary text-sm mt-1">
                    Check your email for an invitation link. Click the link to set up your account and join your team.
                  </p>
                </div>
              </div>
            </motion.div>

            {/* Actions */}
            <motion.div variants={itemVariants} className="space-y-3 pt-2">
              <Link
                to="/login"
                className="block w-full py-3 bg-accent-500 hover:bg-accent-600 text-white font-medium rounded-lg transition-colors text-center"
              >
                Go to Login
              </Link>
              <p className="text-center text-text-muted text-sm">
                Contact your organization's Director if you need access.
              </p>
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
          Risk Management Demo
        </motion.p>
      </motion.div>
    </div>
  )
}
