import { useState } from 'react'
import { Navigate } from 'react-router'
import { Settings2, Users, ToggleLeft, ToggleRight, Plus, X } from 'lucide-react'
import { usePermissions } from '@/hooks/usePermissions'
import { useFeatureFlagAdmin } from '@/hooks/useFeatureFlagAdmin'

/**
 * Feature Flags admin page (Director-only)
 * Allows toggling feature visibility globally and per-user
 */
export function FeatureFlagsPage() {
  const { isDirector, isDemoMode } = usePermissions()
  const {
    featureFlags,
    profiles,
    isLoading,
    error,
    toggleGlobalFlag,
    setUserOverride,
    isToggling,
    isSettingOverride,
  } = useFeatureFlagAdmin()

  const [selectedFlag, setSelectedFlag] = useState<string | null>(null)
  const [showAddOverride, setShowAddOverride] = useState(false)
  const [selectedUserId, setSelectedUserId] = useState('')
  const [overrideValue, setOverrideValue] = useState<'true' | 'false'>('true')

  // Redirect non-Directors (same pattern as UserManagementPage)
  if (!isDirector) {
    return <Navigate to="/" replace />
  }

  // Demo mode message
  if (isDemoMode) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-semibold text-text-primary flex items-center gap-3">
            <Settings2 className="h-7 w-7" />
            Feature Flags
          </h1>
          <p className="text-text-muted mt-1">
            Control feature visibility for your organization
          </p>
        </div>
        <div className="bg-surface-elevated rounded-lg border border-surface-border p-8 text-center">
          <p className="text-text-muted">
            Feature flag management is available in authenticated mode only.
          </p>
        </div>
      </div>
    )
  }

  const handleToggleGlobal = async (flagId: string, currentEnabled: boolean) => {
    try {
      await toggleGlobalFlag({ flagId, enabled: !currentEnabled })
    } catch (err) {
      console.error('Failed to toggle flag:', err)
    }
  }

  const handleAddOverride = async () => {
    if (!selectedFlag || !selectedUserId) return

    try {
      await setUserOverride({
        userId: selectedUserId,
        featureKey: selectedFlag,
        enabled: overrideValue === 'true',
      })
      setShowAddOverride(false)
      setSelectedUserId('')
    } catch (err) {
      console.error('Failed to add override:', err)
    }
  }

  const handleRemoveOverride = async (userId: string, featureKey: string) => {
    try {
      await setUserOverride({ userId, featureKey, enabled: null })
    } catch (err) {
      console.error('Failed to remove override:', err)
    }
  }

  const selectedFlagData = featureFlags.find(f => f.id === selectedFlag)

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div>
        <h1 className="text-2xl font-semibold text-text-primary flex items-center gap-3">
          <Settings2 className="h-7 w-7" />
          Feature Flags
        </h1>
        <p className="text-text-muted mt-1">
          Control feature visibility for your organization
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Global Flags Section */}
        <section className="bg-surface-elevated rounded-lg border border-surface-border p-6">
          <h2 className="text-lg font-medium text-text-primary mb-4">Global Settings</h2>
          <p className="text-sm text-text-muted mb-4">
            Toggle features on/off for all users in your organization.
          </p>

          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent-500" />
            </div>
          ) : error ? (
            <div className="text-center py-8 text-red-400">Error: {error}</div>
          ) : featureFlags.length === 0 ? (
            <div className="text-center py-8 text-text-muted">
              No feature flags configured.
            </div>
          ) : (
            <div className="space-y-3">
              {featureFlags.map((flag) => (
                <div
                  key={flag.id}
                  className={`flex items-center justify-between p-3 rounded-lg border transition-colors cursor-pointer ${
                    selectedFlag === flag.id
                      ? 'border-accent-500 bg-accent-500/10'
                      : 'border-surface-border hover:bg-surface-overlay'
                  }`}
                  onClick={() => setSelectedFlag(flag.id)}
                >
                  <div className="flex-1">
                    <div className="font-medium text-text-primary">
                      {flag.feature_key}
                    </div>
                    {flag.description && (
                      <div className="text-sm text-text-muted">{flag.description}</div>
                    )}
                    {flag.userOverrides.length > 0 && (
                      <div className="text-xs text-amber-500 mt-1">
                        {flag.userOverrides.length} user override(s)
                      </div>
                    )}
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      handleToggleGlobal(flag.id, flag.enabled)
                    }}
                    disabled={isToggling}
                    className="p-1 hover:bg-surface-overlay rounded transition-colors"
                    title={flag.enabled ? 'Disable globally' : 'Enable globally'}
                  >
                    {flag.enabled ? (
                      <ToggleRight className="w-8 h-8 text-green-500" />
                    ) : (
                      <ToggleLeft className="w-8 h-8 text-text-muted" />
                    )}
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Per-User Overrides Section */}
        <section className="bg-surface-elevated rounded-lg border border-surface-border p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-lg font-medium text-text-primary flex items-center gap-2">
                <Users className="h-5 w-5" />
                User Overrides
              </h2>
              <p className="text-sm text-text-muted mt-1">
                {selectedFlagData
                  ? `Overrides for "${selectedFlagData.feature_key}"`
                  : 'Select a flag to manage user overrides'}
              </p>
            </div>
            {selectedFlagData && (
              <button
                onClick={() => setShowAddOverride(true)}
                className="flex items-center gap-1 px-3 py-1.5 text-sm bg-accent-500 text-white rounded-md hover:bg-accent-600 transition-colors"
              >
                <Plus className="w-4 h-4" />
                Add Override
              </button>
            )}
          </div>

          {!selectedFlagData ? (
            <div className="text-center py-8 text-text-muted">
              Select a feature flag from the left to manage user overrides.
            </div>
          ) : selectedFlagData.userOverrides.length === 0 ? (
            <div className="text-center py-8 text-text-muted">
              No user overrides. All users follow the global setting.
            </div>
          ) : (
            <div className="space-y-2">
              {selectedFlagData.userOverrides.map((override) => (
                <div
                  key={override.userId}
                  className="flex items-center justify-between p-3 rounded-lg border border-surface-border"
                >
                  <div>
                    <div className="font-medium text-text-primary">
                      {override.userName || 'Unnamed User'}
                    </div>
                    <div className={`text-sm ${override.enabled ? 'text-green-500' : 'text-red-400'}`}>
                      {override.enabled ? 'Enabled' : 'Disabled'}
                    </div>
                  </div>
                  <button
                    onClick={() => handleRemoveOverride(override.userId, selectedFlagData.feature_key)}
                    disabled={isSettingOverride}
                    className="p-1.5 text-text-muted hover:text-red-400 hover:bg-red-500/10 rounded transition-colors"
                    title="Remove override"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Add Override Form */}
          {showAddOverride && selectedFlagData && (
            <div className="mt-4 p-4 bg-surface-overlay rounded-lg border border-surface-border">
              <h3 className="text-sm font-medium text-text-primary mb-3">Add User Override</h3>
              <div className="space-y-3">
                <div>
                  <label className="block text-sm text-text-muted mb-1">User</label>
                  <select
                    value={selectedUserId}
                    onChange={(e) => setSelectedUserId(e.target.value)}
                    className="w-full bg-surface-elevated text-text-primary border border-surface-border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent-500"
                  >
                    <option value="">Select a user...</option>
                    {profiles
                      .filter(p => !selectedFlagData.userOverrides.some(o => o.userId === p.id))
                      .map((profile) => (
                        <option key={profile.id} value={profile.id}>
                          {profile.full_name || profile.id} ({profile.role})
                        </option>
                      ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm text-text-muted mb-1">Override Value</label>
                  <select
                    value={overrideValue}
                    onChange={(e) => setOverrideValue(e.target.value as 'true' | 'false')}
                    className="w-full bg-surface-elevated text-text-primary border border-surface-border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent-500"
                  >
                    <option value="true">Enabled (show feature)</option>
                    <option value="false">Disabled (hide feature)</option>
                  </select>
                </div>
                <div className="flex gap-2 pt-2">
                  <button
                    onClick={handleAddOverride}
                    disabled={!selectedUserId || isSettingOverride}
                    className="flex-1 px-3 py-2 bg-accent-500 text-white rounded-md text-sm font-medium hover:bg-accent-600 transition-colors disabled:opacity-50"
                  >
                    Add Override
                  </button>
                  <button
                    onClick={() => {
                      setShowAddOverride(false)
                      setSelectedUserId('')
                    }}
                    className="px-3 py-2 border border-surface-border text-text-secondary rounded-md text-sm hover:bg-surface-overlay transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          )}
        </section>
      </div>
    </div>
  )
}
