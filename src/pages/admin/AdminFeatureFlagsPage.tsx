import { Settings2, ToggleLeft, ToggleRight, Plus, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { useGlobalFeatureFlagAdmin } from '@/hooks/useGlobalFeatureFlagAdmin'

/**
 * Super-admin page for managing global feature flags
 */
export function AdminFeatureFlagsPage() {
  const {
    featureFlags,
    isLoading,
    error,
    toggleFlag,
    createFlag,
    deleteFlag,
    isToggling,
  } = useGlobalFeatureFlagAdmin()

  const [showAddForm, setShowAddForm] = useState(false)
  const [newFeatureKey, setNewFeatureKey] = useState('')
  const [newDescription, setNewDescription] = useState('')

  const handleToggle = async (flagId: string, currentEnabled: boolean) => {
    try {
      await toggleFlag({ flagId, enabled: !currentEnabled })
    } catch (err) {
      console.error('Failed to toggle flag:', err)
    }
  }

  const handleCreate = async () => {
    if (!newFeatureKey.trim()) return

    try {
      await createFlag({
        featureKey: newFeatureKey.trim(),
        enabled: true,
        description: newDescription.trim() || undefined,
      })
      setShowAddForm(false)
      setNewFeatureKey('')
      setNewDescription('')
    } catch (err) {
      console.error('Failed to create flag:', err)
    }
  }

  const handleDelete = async (flagId: string) => {
    if (!confirm('Are you sure you want to delete this feature flag?')) return

    try {
      await deleteFlag(flagId)
    } catch (err) {
      console.error('Failed to delete flag:', err)
    }
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-text-primary flex items-center gap-3">
            <Settings2 className="h-7 w-7" />
            Global Feature Flags
          </h1>
          <p className="text-text-muted mt-1">
            Control feature visibility across ALL tenants
          </p>
        </div>
        <button
          onClick={() => setShowAddForm(true)}
          className="flex items-center gap-1 px-3 py-1.5 text-sm bg-accent-500 text-white rounded-md hover:bg-accent-600 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Add Flag
        </button>
      </div>

      {/* Add Flag Form */}
      {showAddForm && (
        <div className="bg-surface-elevated rounded-lg border border-surface-border p-4">
          <h3 className="text-sm font-medium text-text-primary mb-3">New Feature Flag</h3>
          <div className="space-y-3">
            <div>
              <label className="block text-sm text-text-muted mb-1">Feature Key</label>
              <input
                type="text"
                value={newFeatureKey}
                onChange={(e) => setNewFeatureKey(e.target.value)}
                placeholder="e.g., show_analytics"
                className="w-full bg-surface-base text-text-primary border border-surface-border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent-500"
              />
            </div>
            <div>
              <label className="block text-sm text-text-muted mb-1">Description (optional)</label>
              <input
                type="text"
                value={newDescription}
                onChange={(e) => setNewDescription(e.target.value)}
                placeholder="What does this flag control?"
                className="w-full bg-surface-base text-text-primary border border-surface-border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent-500"
              />
            </div>
            <div className="flex gap-2 pt-2">
              <button
                onClick={handleCreate}
                disabled={!newFeatureKey.trim()}
                className="flex-1 px-3 py-2 bg-accent-500 text-white rounded-md text-sm font-medium hover:bg-accent-600 transition-colors disabled:opacity-50"
              >
                Create Flag
              </button>
              <button
                onClick={() => {
                  setShowAddForm(false)
                  setNewFeatureKey('')
                  setNewDescription('')
                }}
                className="px-3 py-2 border border-surface-border text-text-secondary rounded-md text-sm hover:bg-surface-overlay transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Flags List */}
      <section className="bg-surface-elevated rounded-lg border border-surface-border p-6">
        <h2 className="text-lg font-medium text-text-primary mb-4">Active Flags</h2>

        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent-500" />
          </div>
        ) : error ? (
          <div className="text-center py-8 text-red-400">Error: {error}</div>
        ) : featureFlags.length === 0 ? (
          <div className="text-center py-8 text-text-muted">
            No feature flags configured. Click "Add Flag" to create one.
          </div>
        ) : (
          <div className="space-y-3">
            {featureFlags.map((flag) => (
              <div
                key={flag.id}
                className="flex items-center justify-between p-3 rounded-lg border border-surface-border hover:bg-surface-overlay transition-colors"
              >
                <div className="flex-1">
                  <div className="font-medium text-text-primary">
                    {flag.feature_key}
                  </div>
                  {flag.description && (
                    <div className="text-sm text-text-muted">{flag.description}</div>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleToggle(flag.id, flag.enabled)}
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
                  <button
                    onClick={() => handleDelete(flag.id)}
                    className="p-1.5 text-text-muted hover:text-red-400 hover:bg-red-500/10 rounded transition-colors"
                    title="Delete flag"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Info Box */}
      <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4 text-sm text-blue-300">
        <strong>Note:</strong> Changes to global flags affect all tenants immediately.
        Individual users can still have per-user overrides set by their tenant Directors.
      </div>
    </div>
  )
}
