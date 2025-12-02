import { useEffect } from 'react'
import { useNavigate } from 'react-router'
import { LogOut, ClipboardCheck } from 'lucide-react'
import { useUIStore, type AppRole } from '@/stores/uiStore'
import { useControlTesters } from '@/hooks/useProfiles'
import { usePermissions } from '@/hooks/usePermissions'

export function TesterHeader() {
  const { selectedRole, setSelectedRole, currentTesterId, setCurrentTesterId, logout } = useUIStore()
  const navigate = useNavigate()
  const { isControlTester } = usePermissions()
  const { data: testers = [], isLoading: testersLoading } = useControlTesters()

  // Auto-select first tester when testers load and no valid tester is selected
  // Only relevant for managers viewing as tester
  useEffect(() => {
    if (!isControlTester && testers.length > 0 && !testers.find(t => t.id === currentTesterId)) {
      setCurrentTesterId(testers[0].id)
    }
  }, [testers, currentTesterId, setCurrentTesterId, isControlTester])

  // For actual control testers: show minimal header
  // For managers viewing as tester: show selectors
  const showSelectors = !isControlTester

  return (
    <header className="h-12 bg-surface-elevated border-b border-surface-border flex items-center justify-between px-3">
      {/* Compact title with icon */}
      <div className="flex items-center gap-2">
        <ClipboardCheck className="w-5 h-5 text-accent-400" />
        <span className="text-base font-medium text-text-primary">Testing</span>
      </div>

      <div className="flex items-center gap-2">
        {/* Only show selectors for managers viewing as tester */}
        {showSelectors && (
          <>
            {/* Tester selector */}
            <select
              value={currentTesterId}
              onChange={(e) => setCurrentTesterId(e.target.value)}
              className="bg-surface-elevated text-text-primary border border-surface-border rounded-md px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-accent-500 max-w-[120px]"
              disabled={testersLoading}
            >
              {testersLoading ? (
                <option value="">...</option>
              ) : testers.length === 0 ? (
                <option value="">No testers</option>
              ) : (
                testers.map((tester) => (
                  <option key={tester.id} value={tester.id}>
                    {tester.full_name || 'Unnamed'}
                  </option>
                ))
              )}
            </select>

            {/* Role selector */}
            <select
              value={selectedRole}
              onChange={(e) => {
                setSelectedRole(e.target.value as AppRole)
                if (e.target.value !== 'control-tester') {
                  navigate('/taxonomy')
                }
              }}
              className="bg-surface-elevated text-text-primary border border-surface-border rounded-md px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-accent-500"
            >
              <option value="manager">Manager</option>
              <option value="risk-manager">Risk Mgr</option>
              <option value="control-owner">Owner</option>
              <option value="control-tester">Tester</option>
            </select>
          </>
        )}

        {/* Logout */}
        <button
          onClick={() => {
            logout()
            navigate('/login')
          }}
          className="p-2 rounded-lg hover:bg-surface-overlay text-text-secondary hover:text-text-primary transition-colors"
          title="Logout"
        >
          <LogOut className="w-5 h-5" />
        </button>
      </div>
    </header>
  )
}
