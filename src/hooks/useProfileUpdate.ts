import { useState } from 'react'
import { supabase } from '@/lib/supabase/client'
import { useAuth } from '@/contexts/AuthContext'

interface UseProfileUpdateReturn {
  isUpdating: boolean
  updateName: (fullName: string) => Promise<{ success: boolean; error?: string }>
  updatePassword: (newPassword: string) => Promise<{ success: boolean; error?: string }>
}

export function useProfileUpdate(): UseProfileUpdateReturn {
  const { user } = useAuth()
  const [isUpdating, setIsUpdating] = useState(false)

  const updateName = async (fullName: string): Promise<{ success: boolean; error?: string }> => {
    if (!user) {
      return { success: false, error: 'Not authenticated' }
    }

    setIsUpdating(true)

    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          full_name: fullName.trim(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', user.id)

      if (error) {
        return { success: false, error: error.message }
      }

      return { success: true }
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err.message : 'Failed to update name',
      }
    } finally {
      setIsUpdating(false)
    }
  }

  const updatePassword = async (newPassword: string): Promise<{ success: boolean; error?: string }> => {
    if (!user) {
      return { success: false, error: 'Not authenticated' }
    }

    if (newPassword.length < 8) {
      return { success: false, error: 'Password must be at least 8 characters' }
    }

    setIsUpdating(true)

    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword })

      if (error) {
        return { success: false, error: error.message }
      }

      return { success: true }
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err.message : 'Failed to update password',
      }
    } finally {
      setIsUpdating(false)
    }
  }

  return {
    isUpdating,
    updateName,
    updatePassword,
  }
}
