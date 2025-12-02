/**
 * Auth storage utilities for non-React contexts (e.g., Zustand store partialize).
 *
 * These functions check localStorage directly for Supabase session data,
 * which is needed in contexts where React hooks (useAuth) cannot be used.
 *
 * IMPORTANT: Supabase stores session data under a key formatted as:
 * `sb-<project-ref>-auth-token` where project-ref is the unique project ID.
 * The project ref is NOT a constant - it varies per Supabase project.
 */

/**
 * Check if there's a Supabase auth session in localStorage.
 *
 * This function searches for any localStorage key matching the Supabase
 * session key pattern: `sb-*-auth-token`
 *
 * @returns true if a Supabase session exists in localStorage
 */
export function hasSupabaseSession(): boolean {
  // Iterate through localStorage keys to find Supabase session
  // Pattern: sb-<project-ref>-auth-token
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i)
    if (key && key.startsWith('sb-') && key.endsWith('-auth-token')) {
      const value = localStorage.getItem(key)
      if (value) {
        try {
          // Verify it's valid JSON (Supabase stores JSON session data)
          JSON.parse(value)
          return true
        } catch {
          // Invalid JSON, not a valid session
          continue
        }
      }
    }
  }
  return false
}

/**
 * Check if we're in demo mode (no authenticated session).
 *
 * Use this function in Zustand store partialize() functions to determine
 * whether to persist data to localStorage (demo mode) or not (authenticated).
 *
 * @returns true if in demo mode (no auth session), false if authenticated
 */
export function isDemoMode(): boolean {
  return !hasSupabaseSession()
}
