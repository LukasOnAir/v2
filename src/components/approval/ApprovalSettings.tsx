import { useApprovalStore } from '@/stores/approvalStore'
import { usePermissions } from '@/hooks/usePermissions'

/**
 * Configuration panel for four-eye approval settings
 * Only visible to Manager role
 */
export function ApprovalSettings() {
  const { canToggleFourEye } = usePermissions()
  const settings = useApprovalStore((state) => state.settings)
  const updateSettings = useApprovalStore((state) => state.updateSettings)

  if (!canToggleFourEye) {
    return null
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-sm font-medium text-text-primary mb-4">
          Four-Eye Approval Settings
        </h3>
        <p className="text-sm text-text-muted mb-4">
          When enabled, changes made by non-Manager roles require Manager approval before taking effect.
        </p>
      </div>

      {/* Global toggle */}
      <div className="flex items-center justify-between py-3 border-b border-surface-border">
        <div>
          <label className="text-sm font-medium text-text-primary">
            Enable Four-Eye Approval
          </label>
          <p className="text-xs text-text-muted mt-0.5">
            Master toggle for the approval workflow
          </p>
        </div>
        <ToggleSwitch
          checked={settings.globalEnabled}
          onChange={(checked) => updateSettings({ globalEnabled: checked })}
        />
      </div>

      {/* Per-entity toggles - only show when global is enabled */}
      {settings.globalEnabled && (
        <div className="space-y-3 pt-2">
          <h4 className="text-xs font-medium text-text-muted uppercase tracking-wider">
            Require Approval For
          </h4>

          <div className="flex items-center justify-between py-2">
            <label className="text-sm text-text-secondary">New Controls</label>
            <ToggleSwitch
              checked={settings.requireForNewControls}
              onChange={(checked) => updateSettings({ requireForNewControls: checked })}
            />
          </div>

          <div className="flex items-center justify-between py-2">
            <label className="text-sm text-text-secondary">New Risks</label>
            <ToggleSwitch
              checked={settings.requireForNewRisks}
              onChange={(checked) => updateSettings({ requireForNewRisks: checked })}
            />
          </div>

          <div className="flex items-center justify-between py-2">
            <label className="text-sm text-text-secondary">New Processes</label>
            <ToggleSwitch
              checked={settings.requireForNewProcesses}
              onChange={(checked) => updateSettings({ requireForNewProcesses: checked })}
            />
          </div>
        </div>
      )}

      {!settings.globalEnabled && (
        <p className="text-sm text-text-muted italic">
          Enable four-eye approval to configure entity-specific requirements.
        </p>
      )}
    </div>
  )
}

interface ToggleSwitchProps {
  checked: boolean
  onChange: (checked: boolean) => void
}

function ToggleSwitch({ checked, onChange }: ToggleSwitchProps) {
  return (
    <button
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={`
        relative inline-flex h-6 w-11 items-center rounded-full transition-colors
        ${checked ? 'bg-accent-500' : 'bg-surface-overlay'}
      `}
    >
      <span
        className={`
          inline-block h-4 w-4 transform rounded-full bg-white transition-transform
          ${checked ? 'translate-x-6' : 'translate-x-1'}
        `}
      />
    </button>
  )
}
