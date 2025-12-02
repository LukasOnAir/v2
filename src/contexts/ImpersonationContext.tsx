import { createContext, useContext, useState, useCallback, type ReactNode } from 'react'

const STORAGE_KEY = 'risklytix-impersonation'

interface ImpersonationState {
  tenantId: string | null
  tenantName: string | null
  profileId: string | null
  profileName: string | null
  profileRole: string | null
}

interface ImpersonationContextType {
  impersonation: ImpersonationState
  isImpersonating: boolean
  isReadOnly: boolean
  startTenantImpersonation: (tenantId: string, tenantName: string) => void
  selectProfile: (profileId: string, profileName: string, profileRole: string) => void
  exitImpersonation: () => void
}

const defaultState: ImpersonationState = {
  tenantId: null,
  tenantName: null,
  profileId: null,
  profileName: null,
  profileRole: null,
}

const ImpersonationContext = createContext<ImpersonationContextType | undefined>(undefined)

export function ImpersonationProvider({ children }: { children: ReactNode }) {
  // Lazy initializer to restore from sessionStorage on mount
  const [impersonation, setImpersonation] = useState<ImpersonationState>(() => {
    try {
      const saved = sessionStorage.getItem(STORAGE_KEY)
      if (saved) {
        return JSON.parse(saved) as ImpersonationState
      }
    } catch {
      // Ignore parse errors, use default state
    }
    return defaultState
  })

  // Helper to persist to sessionStorage AND update state
  const persist = useCallback((state: ImpersonationState) => {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(state))
    setImpersonation(state)
  }, [])

  // Start impersonating a tenant (clears any profile selection)
  const startTenantImpersonation = useCallback((tenantId: string, tenantName: string) => {
    persist({
      tenantId,
      tenantName,
      profileId: null,
      profileName: null,
      profileRole: null,
    })
  }, [persist])

  // Select a profile within the currently impersonated tenant
  const selectProfile = useCallback((profileId: string, profileName: string, profileRole: string) => {
    persist({
      ...impersonation,
      profileId,
      profileName,
      profileRole,
    })
  }, [impersonation, persist])

  // Exit impersonation mode entirely
  const exitImpersonation = useCallback(() => {
    sessionStorage.removeItem(STORAGE_KEY)
    setImpersonation(defaultState)
  }, [])

  const isImpersonating = !!impersonation.tenantId
  const isReadOnly = isImpersonating // Always read-only when impersonating

  return (
    <ImpersonationContext.Provider value={{
      impersonation,
      isImpersonating,
      isReadOnly,
      startTenantImpersonation,
      selectProfile,
      exitImpersonation,
    }}>
      {children}
    </ImpersonationContext.Provider>
  )
}

export function useImpersonation() {
  const context = useContext(ImpersonationContext)
  if (!context) {
    throw new Error('useImpersonation must be used within ImpersonationProvider')
  }
  return context
}
