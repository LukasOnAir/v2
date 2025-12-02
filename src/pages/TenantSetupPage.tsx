// src/pages/TenantSetupPage.tsx
import { useState } from 'react'
import { useNavigate } from 'react-router'
import { Loader2, Sparkles } from 'lucide-react'
import { clsx } from 'clsx'
import { PresetSelector } from '@/components/admin/PresetSelector'
import { useTaxonomyStore } from '@/stores/taxonomyStore'
import { useRCTStore } from '@/stores/rctStore'
import { useControlsStore } from '@/stores/controlsStore'
import { supabase } from '@/lib/supabase/client'
import { useAuth } from '@/contexts/AuthContext'

export function TenantSetupPage() {
  const navigate = useNavigate()
  const { tenantId } = useAuth()
  const [selectedPreset, setSelectedPreset] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const setRisks = useTaxonomyStore((state) => state.setRisks)
  const setProcesses = useTaxonomyStore((state) => state.setProcesses)
  const setRows = useRCTStore((state) => state.setRows)
  const importControls = useControlsStore((state) => state.importControls)

  const handleSetup = async () => {
    if (!selectedPreset || !tenantId) return

    setIsLoading(true)
    setError(null)

    try {
      const { data, error: fnError } = await supabase.functions.invoke('seed-demo-data', {
        body: { preset: selectedPreset, tenantId },
      })

      if (fnError) throw fnError

      if (selectedPreset !== 'empty' && data) {
        // Load data into stores
        // Note: The Edge Function returns processed taxonomy trees
        // that need to be converted back to the format stores expect
        if (data.risks) setRisks(data.risks)
        if (data.processes) setProcesses(data.processes)
        if (data.rows) setRows(data.rows)
        if (data.controls) {
          // Import controls into the centralized controls store
          // No control links initially - users will link controls to rows
          importControls(data.controls, [])
        }
      }

      // Navigate to taxonomy page to see the loaded data
      navigate('/taxonomy')
    } catch (err) {
      console.error('Setup error:', err)
      setError(err instanceof Error ? err.message : 'Failed to initialize tenant')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-surface-base flex items-center justify-center p-4">
      <div className="max-w-3xl w-full">
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-2 mb-4">
            <Sparkles className="h-8 w-8 text-accent-500" />
            <h1 className="text-2xl font-bold text-text-primary">Welcome to RiskGuard</h1>
          </div>
          <p className="text-text-secondary">
            Choose a starting template for your risk management framework.
            You can customize everything after setup.
          </p>
        </div>

        <PresetSelector
          selectedPreset={selectedPreset}
          onSelect={setSelectedPreset}
          disabled={isLoading}
        />

        {error && (
          <div className="mt-4 p-3 rounded bg-red-500/10 border border-red-500/50 text-red-400 text-sm">
            {error}
          </div>
        )}

        <div className="mt-8 flex justify-center">
          <button
            onClick={handleSetup}
            disabled={!selectedPreset || isLoading}
            className={clsx(
              'px-6 py-3 rounded-lg font-medium transition-colors',
              'bg-accent-500 text-white hover:bg-accent-600',
              'disabled:opacity-50 disabled:cursor-not-allowed',
              'flex items-center gap-2'
            )}
          >
            {isLoading && <Loader2 size={20} className="animate-spin" />}
            {isLoading ? 'Setting up...' : 'Continue'}
          </button>
        </div>

        <p className="mt-4 text-center text-xs text-text-muted">
          Demo data helps you explore all features. Choose "Start Empty" for a clean slate.
        </p>
      </div>
    </div>
  )
}
