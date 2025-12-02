import { createContext, useContext, useEffect, useState, useRef, type ReactNode } from 'react'
import type { Session, User, AuthError } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase/client'
import { logAuthEventStandalone } from '@/lib/authEventLogger'

interface AuthContextType {
  session: Session | null
  user: User | null
  tenantId: string | null
  role: string | null
  isLoading: boolean
  signIn: (email: string, password: string) => Promise<{ error: AuthError | null }>
  signUp: (email: string, password: string) => Promise<{ error: AuthError | null }>
  signOut: () => Promise<void>
  resetPassword: (email: string) => Promise<{ error: AuthError | null }>
  updatePassword: (newPassword: string) => Promise<{ error: AuthError | null }>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  // Track if email was previously verified to detect email_verified event
  const prevEmailVerifiedRef = useRef<boolean | null>(null)

  // Extract tenant_id and role from app_metadata (NOT user_metadata - security critical)
  const tenantId = session?.user?.app_metadata?.tenant_id ?? null
  const role = session?.user?.app_metadata?.role ?? null

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      prevEmailVerifiedRef.current = !!session?.user?.email_confirmed_at
      setIsLoading(false)
    })

    // Subscribe to auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setSession(session)

        // Detect email verification (USER_UPDATED with email_confirmed_at changing from null to timestamp)
        if (
          event === 'USER_UPDATED' &&
          session?.user?.email_confirmed_at &&
          prevEmailVerifiedRef.current === false
        ) {
          // Email was just verified
          await logAuthEventStandalone({
            eventType: 'email_verified',
            email: session.user.email,
            tenantId: session.user.app_metadata?.tenant_id,
            userId: session.user.id,
          })
        }

        // Update ref for next comparison
        prevEmailVerifiedRef.current = !!session?.user?.email_confirmed_at
      }
    )

    return () => subscription.unsubscribe()
  }, [])

  const signIn = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })

    if (error) {
      // Log failed login attempt
      await logAuthEventStandalone({
        eventType: 'login_failed',
        email,
        metadata: { error: error.message },
      })
      return { error }
    }

    // Log successful login
    await logAuthEventStandalone({
      eventType: 'login',
      email,
      tenantId: data.user?.app_metadata?.tenant_id,
      userId: data.user?.id,
    })

    return { error: null }
  }

  const signUp = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/confirm`,
      },
    })

    if (!error && data.user) {
      // Log successful signup
      await logAuthEventStandalone({
        eventType: 'signup',
        email,
        tenantId: data.user.app_metadata?.tenant_id,
        userId: data.user.id,
      })
    }

    return { error }
  }

  const signOut = async () => {
    // Log before signing out (we still have session context)
    if (session?.user) {
      await logAuthEventStandalone({
        eventType: 'logout',
        email: session.user.email,
        tenantId: session.user.app_metadata?.tenant_id,
        userId: session.user.id,
      })
    }
    await supabase.auth.signOut()
  }

  const resetPassword = async (email: string) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/reset-password`,
    })

    if (!error) {
      // Log password reset request
      await logAuthEventStandalone({
        eventType: 'password_reset_request',
        email,
      })
    }

    return { error }
  }

  const updatePassword = async (newPassword: string) => {
    const { error } = await supabase.auth.updateUser({ password: newPassword })

    if (!error && session?.user) {
      // Log password reset completion
      await logAuthEventStandalone({
        eventType: 'password_reset_complete',
        email: session.user.email,
        tenantId: session.user.app_metadata?.tenant_id,
        userId: session.user.id,
      })
    }

    return { error }
  }

  return (
    <AuthContext.Provider value={{
      session,
      user: session?.user ?? null,
      tenantId,
      role,
      isLoading,
      signIn,
      signUp,
      signOut,
      resetPassword,
      updatePassword,
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider')
  }
  return context
}
