import { useTaxonomy } from '@/hooks/useTaxonomy'
import { useTaxonomyWeights } from '@/hooks/useTaxonomyWeights'
import { useControls } from '@/hooks/useControls'
import { useControlLinks } from '@/hooks/useControlLinks'
import { useRCTRows } from '@/hooks/useRCTRows'
import { useCustomColumns } from '@/hooks/useCustomColumns'
import { useScoreLabels } from '@/hooks/useScoreLabels'
import { useAuth } from '@/contexts/AuthContext'
import { useMemo } from 'react'

/**
 * Central hook for loading all tenant data.
 *
 * Returns loading state and data for all core entities.
 * Components can use individual hooks for specific data,
 * or this hook for coordinated loading state.
 */
export function useTenantData() {
  const { session } = useAuth()
  const isAuthenticated = !!session

  // Core data queries (only enabled when authenticated)
  const risks = useTaxonomy('risk')
  const processes = useTaxonomy('process')
  const riskWeights = useTaxonomyWeights('risk')
  const processWeights = useTaxonomyWeights('process')
  const controls = useControls()
  const controlLinks = useControlLinks()
  const rctRows = useRCTRows()
  const customColumns = useCustomColumns()
  const probabilityLabels = useScoreLabels('probability')
  const impactLabels = useScoreLabels('impact')

  // Aggregate loading state
  const isLoading = useMemo(() => {
    if (!isAuthenticated) return false // Demo mode - no loading

    return (
      risks.isLoading ||
      processes.isLoading ||
      riskWeights.isLoading ||
      processWeights.isLoading ||
      controls.isLoading ||
      controlLinks.isLoading ||
      rctRows.isLoading ||
      customColumns.isLoading ||
      probabilityLabels.isLoading ||
      impactLabels.isLoading
    )
  }, [
    isAuthenticated,
    risks.isLoading,
    processes.isLoading,
    riskWeights.isLoading,
    processWeights.isLoading,
    controls.isLoading,
    controlLinks.isLoading,
    rctRows.isLoading,
    customColumns.isLoading,
    probabilityLabels.isLoading,
    impactLabels.isLoading,
  ])

  // Aggregate error state
  const error = useMemo(() => {
    const errors = [
      risks.error,
      processes.error,
      controls.error,
      rctRows.error,
    ].filter(Boolean)

    return errors.length > 0 ? errors[0] : null
  }, [risks.error, processes.error, controls.error, rctRows.error])

  return {
    isAuthenticated,
    isLoading,
    error,
    data: {
      risks: risks.data || [],
      processes: processes.data || [],
      riskWeights: riskWeights.data || { levelDefaults: { l1: 1, l2: 1, l3: 1, l4: 1, l5: 1 }, nodeOverrides: {} },
      processWeights: processWeights.data || { levelDefaults: { l1: 1, l2: 1, l3: 1, l4: 1, l5: 1 }, nodeOverrides: {} },
      controls: controls.data || [],
      controlLinks: controlLinks.data || [],
      rctRows: rctRows.data || [],
      customColumns: customColumns.data || [],
      probabilityLabels: probabilityLabels.data || [],
      impactLabels: impactLabels.data || [],
    },
  }
}

/**
 * Hook for components that only need loading state.
 */
export function useTenantDataLoading() {
  const { isLoading, error } = useTenantData()
  return { isLoading, error }
}

/**
 * Check if we're in demo mode (not authenticated).
 */
export function useIsDemoMode() {
  const { session } = useAuth()
  return !session
}
