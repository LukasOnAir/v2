import { useState, useEffect } from 'react'
import { Shield, Plus, Loader2 } from 'lucide-react'
import { useControlsStore } from '@/stores/controlsStore'
import { useControls, useAddControl, useMyAssignedControls } from '@/hooks/useControls'
import { useControlLinks } from '@/hooks/useControlLinks'
import { useProfiles } from '@/hooks/useProfiles'
import { useIsDemoMode } from '@/hooks/useTenantData'
import { usePermissions } from '@/hooks/usePermissions'
import { ControlFilters, ControlsTable, ControlDetailPanel } from '@/components/controls'
import type { Control } from '@/types/rct'

export function ControlsPage() {
  const isDemoMode = useIsDemoMode()
  const { canEditControlDefinitions, isControlTester, isControlOwner } = usePermissions()

  // Database hooks (only active when authenticated)
  const { data: dbControls, isLoading } = useControls()
  const { data: myAssignedControls, isLoading: isLoadingMyControls } = useMyAssignedControls()
  const { data: dbControlLinks } = useControlLinks()
  const { data: profiles } = useProfiles()
  const addMutation = useAddControl()

  // Zustand for demo mode
  const storeControls = useControlsStore((s) => s.controls)
  const storeControlLinks = useControlsStore((s) => s.controlLinks)
  const storeAddControl = useControlsStore((s) => s.addControl)

  // Role-based control selection
  // Control Tester and Control Owner see only assigned controls
  // Other roles see all controls
  const shouldFilterByAssignment = !isDemoMode && (isControlTester || isControlOwner)

  // Use appropriate data source
  const allControls = isDemoMode ? storeControls : (dbControls || [])
  const assignedControls = isDemoMode ? storeControls : (myAssignedControls || [])
  const controls = shouldFilterByAssignment ? assignedControls : allControls
  const controlLinks = isDemoMode ? storeControlLinks : (dbControlLinks || [])

  const [filteredControls, setFilteredControls] = useState<Control[]>(controls)
  const [selectedControlId, setSelectedControlId] = useState<string | null>(null)

  // Keep filtered controls in sync with source
  useEffect(() => {
    setFilteredControls(controls)
  }, [controls])

  const handleAddControl = async () => {
    const newControl = {
      name: 'New Control',
      description: '',
      controlType: null,
      netProbability: null,
      netImpact: null,
      comment: '',
      testFrequency: null,
      nextTestDate: null,
      lastTestDate: null,
      testProcedure: '',
      assignedTesterId: null,
    }

    if (isDemoMode) {
      const id = storeAddControl(newControl)
      setSelectedControlId(id)
    } else {
      const result = await addMutation.mutateAsync(newControl)
      setSelectedControlId(result.id)
    }
  }

  // Loading state (only when authenticated)
  if (!isDemoMode && (isLoading || (shouldFilterByAssignment && isLoadingMyControls))) {
    return (
      <div className="h-full flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-accent-500 animate-spin" />
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-6 border-b border-surface-border">
        <div className="flex items-center gap-3">
          <Shield className="w-6 h-6 text-accent-500" />
          <div>
            <h1 className="text-xl font-semibold text-text-primary">Controls Hub</h1>
            <p className="text-sm text-text-secondary">
              {shouldFilterByAssignment
                ? `${controls.length} assigned control${controls.length === 1 ? '' : 's'}`
                : `${controls.length} control${controls.length === 1 ? '' : 's'} total`}
            </p>
          </div>
        </div>
        {canEditControlDefinitions && (
          <button
            onClick={handleAddControl}
            disabled={addMutation.isPending}
            className="flex items-center gap-2 px-4 py-2 bg-accent-500 text-white rounded-lg font-medium hover:bg-accent-600 transition-colors disabled:opacity-50"
          >
            {addMutation.isPending ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <Plus size={16} />
            )}
            Add Control
          </button>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-6 space-y-4">
        <ControlFilters
          controls={controls}
          onFilteredChange={setFilteredControls}
        />

        <ControlsTable
          controls={filteredControls}
          controlLinks={controlLinks}
          profiles={isDemoMode ? [] : (profiles || [])}
          onControlClick={setSelectedControlId}
          isDemoMode={isDemoMode}
        />
      </div>

      {/* Detail Panel */}
      <ControlDetailPanel
        isOpen={selectedControlId !== null}
        onClose={() => setSelectedControlId(null)}
        controlId={selectedControlId}
        isDemoMode={isDemoMode}
      />
    </div>
  )
}
