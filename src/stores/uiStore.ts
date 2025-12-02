import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'

/** Available roles in the application */
export type AppRole = 'manager' | 'risk-manager' | 'control-owner' | 'control-tester'

interface UIState {
  // Sidebar
  sidebarCollapsed: boolean
  toggleSidebar: () => void
  setSidebarCollapsed: (collapsed: boolean) => void

  // Role (demo mode)
  selectedRole: AppRole
  setSelectedRole: (role: AppRole) => void

  // Tester identity (demo mode - for impersonating specific tester)
  currentTesterId: string
  setCurrentTesterId: (testerId: string) => void

  // Authentication
  isAuthenticated: boolean
  login: (username: string, password: string) => boolean
  logout: () => void

  // Tickets Summary section visibility
  showStatusStats: boolean
  showPriorityStats: boolean
  showCategoryStats: boolean
  toggleStatusStats: () => void
  togglePriorityStats: () => void
  toggleCategoryStats: () => void
}

export const useUIStore = create<UIState>()(
  persist(
    (set) => ({
      sidebarCollapsed: false,
      toggleSidebar: () => set((state) => ({
        sidebarCollapsed: !state.sidebarCollapsed
      })),
      setSidebarCollapsed: (collapsed) => set({ sidebarCollapsed: collapsed }),

      selectedRole: 'risk-manager',
      setSelectedRole: (role) => set({ selectedRole: role }),

      currentTesterId: 'tester-1',
      setCurrentTesterId: (testerId) => set({ currentTesterId: testerId }),

      isAuthenticated: false,
      login: (username, password) => {
        if (username === 'demo' && password === 'demo') {
          set({ isAuthenticated: true })
          return true
        }
        return false
      },
      logout: () => set({ isAuthenticated: false }),

      // Tickets Summary section visibility (Status visible, Priority/Category hidden by default)
      showStatusStats: true,
      showPriorityStats: false,
      showCategoryStats: false,
      toggleStatusStats: () => set((state) => ({ showStatusStats: !state.showStatusStats })),
      togglePriorityStats: () => set((state) => ({ showPriorityStats: !state.showPriorityStats })),
      toggleCategoryStats: () => set((state) => ({ showCategoryStats: !state.showCategoryStats })),
    }),
    {
      name: 'riskguard-ui',
      storage: createJSONStorage(() => localStorage),
    }
  )
)
