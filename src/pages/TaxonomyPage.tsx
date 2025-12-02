import { useState, useRef, useEffect, useCallback } from 'react'
import { Plus, AlertTriangle, GitBranch, Scale, Loader2 } from 'lucide-react'
import clsx from 'clsx'
import { TaxonomyTree, TaxonomyTreeRef } from '@/components/taxonomy/TaxonomyTree'
import { TaxonomyTabs, TaxonomyType } from '@/components/taxonomy/TaxonomyTabs'
import { TaxonomyToolbar } from '@/components/taxonomy/TaxonomyToolbar'
import { LevelWeightsBar } from '@/components/taxonomy'
import { useTaxonomyStore } from '@/stores/taxonomyStore'
import { usePermissions } from '@/hooks/usePermissions'
import { useIsDemoMode } from '@/hooks/useTenantData'
import {
  useTaxonomy,
  useAddTaxonomyNode,
  useUpdateTaxonomyNode,
  useDeleteTaxonomyNode,
} from '@/hooks/useTaxonomy'
import type { TaxonomyItem } from '@/types/taxonomy'

/**
 * TaxonomyPage - Complete taxonomy builder page
 *
 * Provides a full CRUD interface for building Risk and Process taxonomies:
 * - Tab switching between taxonomies
 * - Toolbar with search, expand/collapse, add root
 * - Tree view with drag-drop, inline editing, visual hierarchy
 * - Empty state when no items exist
 * - Bottom "Add item" button for convenience
 */
export function TaxonomyPage() {
  // Active taxonomy tab
  const [activeTab, setActiveTab] = useState<TaxonomyType>('risks')

  // Search term
  const [searchTerm, setSearchTerm] = useState('')

  // View toggles
  const [showIds, setShowIds] = useState(true)
  const [showDescriptions, setShowDescriptions] = useState(true)
  const [showWeights, setShowWeights] = useState(false)

  // Tree refs
  const risksTreeRef = useRef<TaxonomyTreeRef>(null)
  const processesTreeRef = useRef<TaxonomyTreeRef>(null)

  // Get current tree ref based on active tab
  const currentTreeRef = activeTab === 'risks' ? risksTreeRef : processesTreeRef

  // Demo mode check
  const isDemoMode = useIsDemoMode()

  // Database hooks (only active when authenticated)
  const { data: dbRisks, isLoading: risksLoading } = useTaxonomy('risk')
  const { data: dbProcesses, isLoading: processesLoading } = useTaxonomy('process')

  // Mutation hooks for risk taxonomy
  const addRiskMutation = useAddTaxonomyNode('risk')
  const updateRiskMutation = useUpdateTaxonomyNode('risk')
  const deleteRiskMutation = useDeleteTaxonomyNode('risk')

  // Mutation hooks for process taxonomy
  const addProcessMutation = useAddTaxonomyNode('process')
  const updateProcessMutation = useUpdateTaxonomyNode('process')
  const deleteProcessMutation = useDeleteTaxonomyNode('process')

  // Get store data for demo mode
  const storeRisks = useTaxonomyStore((state) => state.risks)
  const storeProcesses = useTaxonomyStore((state) => state.processes)
  const riskWeights = useTaxonomyStore((state) => state.riskWeights)
  const processWeights = useTaxonomyStore((state) => state.processWeights)
  const setLevelWeight = useTaxonomyStore((state) => state.setLevelWeight)

  // Use appropriate data source
  const risks = isDemoMode ? storeRisks : (dbRisks || [])
  const processes = isDemoMode ? storeProcesses : (dbProcesses || [])

  // Loading state (only when authenticated)
  const isLoading = !isDemoMode && (
    (activeTab === 'risks' && risksLoading) ||
    (activeTab === 'processes' && processesLoading)
  )

  // Permissions
  const { canEditTaxonomies } = usePermissions()

  // Current data based on active tab
  const currentData = activeTab === 'risks' ? risks : processes
  const hasItems = currentData.length > 0

  // Current weights for level bar
  const currentWeights = activeTab === 'risks' ? riskWeights : processWeights

  const handleLevelWeightChange = (level: 1 | 2 | 3 | 4 | 5, weight: number) => {
    setLevelWeight(activeTab === 'risks' ? 'risk' : 'process', level, weight)
  }

  // Clear search when switching tabs
  useEffect(() => {
    setSearchTerm('')
  }, [activeTab])

  // Get title based on active tab
  const title = activeTab === 'risks' ? 'Risk Taxonomy' : 'Process Taxonomy'

  // Handle add root item from bottom button
  const handleAddRootItem = () => {
    currentTreeRef.current?.createAtRoot()
  }

  // Calculate tree height (container height - toolbar - tabs - padding - bottom button)
  // This is approximate; in a real app you'd measure the container
  const treeHeight = window.innerHeight - 280

  // Show loading state when fetching from database
  if (isLoading) {
    return (
      <div className="h-full flex flex-col">
        <h1 className="text-2xl font-semibold text-text-primary mb-4">
          Taxonomies
        </h1>
        <TaxonomyTabs activeTab={activeTab} onTabChange={setActiveTab} />
        <div className="flex-1 bg-surface-elevated rounded-lg border border-surface-border flex items-center justify-center">
          <div className="flex items-center gap-3 text-text-secondary">
            <Loader2 className="animate-spin" size={24} />
            <span>Loading {activeTab === 'risks' ? 'risks' : 'processes'}...</span>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col">
      {/* Page header */}
      <h1 className="text-2xl font-semibold text-text-primary mb-4">
        Taxonomies
      </h1>

      {/* Tabs */}
      <TaxonomyTabs activeTab={activeTab} onTabChange={setActiveTab} />

      {/* Toolbar */}
      <div className="flex items-center gap-4 mb-4 flex-wrap">
        <TaxonomyToolbar
          title={title}
          treeRef={currentTreeRef}
          searchTerm={searchTerm}
          onSearchChange={setSearchTerm}
          showIds={showIds}
          onToggleIds={() => setShowIds(!showIds)}
          showDescriptions={showDescriptions}
          onToggleDescriptions={() => setShowDescriptions(!showDescriptions)}
          hasItems={hasItems}
          canEdit={canEditTaxonomies}
        />
        {/* Weight toggle button */}
        <button
          onClick={() => setShowWeights(!showWeights)}
          className={clsx(
            'p-2 rounded-md transition-colors border border-surface-border',
            showWeights
              ? 'bg-accent-500/20 text-accent-400 border-accent-500/30'
              : 'bg-surface-overlay text-text-muted hover:text-text-secondary'
          )}
          title={showWeights ? 'Hide Weights' : 'Show Weights'}
        >
          <Scale size={16} />
        </button>
      </div>

      {/* Level weights bar - visible when weights are shown */}
      {showWeights && (
        <div className="mb-4">
          <LevelWeightsBar
            weights={currentWeights.levelDefaults}
            onWeightChange={handleLevelWeightChange}
            disabled={!canEditTaxonomies}
          />
        </div>
      )}

      {/* Tree container */}
      <div className="flex-1 bg-surface-elevated rounded-lg border border-surface-border overflow-hidden relative">
        {/* Always render trees so refs are available for add buttons */}
        <div className={hasItems ? 'px-4' : 'absolute inset-0 opacity-0 pointer-events-none'}>
          {/* Risks Tree (hidden when processes tab active) */}
          <div className={activeTab === 'risks' ? '' : 'hidden'}>
            <TaxonomyTree
              ref={risksTreeRef}
              type="risks"
              data={risks}
              searchTerm={searchTerm}
              showIds={showIds}
              showDescriptions={showDescriptions}
              height={treeHeight}
              showWeights={showWeights}
              isDemoMode={isDemoMode}
              addMutation={addRiskMutation}
              updateMutation={updateRiskMutation}
              deleteMutation={deleteRiskMutation}
            />
          </div>

          {/* Processes Tree (hidden when risks tab active) */}
          <div className={activeTab === 'processes' ? '' : 'hidden'}>
            <TaxonomyTree
              ref={processesTreeRef}
              type="processes"
              data={processes}
              searchTerm={searchTerm}
              showIds={showIds}
              showDescriptions={showDescriptions}
              height={treeHeight}
              showWeights={showWeights}
              isDemoMode={isDemoMode}
              addMutation={addProcessMutation}
              updateMutation={updateProcessMutation}
              deleteMutation={deleteProcessMutation}
            />
          </div>
        </div>

        {/* Empty state overlay - shown when no items */}
        {!hasItems && (
          <div className="absolute inset-0 flex flex-col items-center justify-center py-16 px-8 bg-surface-elevated">
            <div className="w-16 h-16 rounded-full bg-surface-overlay flex items-center justify-center mb-4">
              {activeTab === 'risks' ? (
                <AlertTriangle size={32} className="text-text-muted" />
              ) : (
                <GitBranch size={32} className="text-text-muted" />
              )}
            </div>
            <h3 className="text-lg font-medium text-text-primary mb-2">
              No {activeTab === 'risks' ? 'risks' : 'processes'} yet
            </h3>
            <p className="text-text-secondary text-center mb-6 max-w-md">
              {canEditTaxonomies
                ? (activeTab === 'risks'
                  ? 'Start building your risk taxonomy by adding your first risk category.'
                  : 'Start building your process taxonomy by adding your first process category.')
                : 'A Risk Manager can add taxonomy items.'}
            </p>
            {canEditTaxonomies && (
              <button
                onClick={handleAddRootItem}
                className={clsx(
                  'flex items-center gap-2 px-4 py-2 rounded-md transition-colors',
                  'bg-accent-600 hover:bg-accent-500 text-white',
                  'font-medium'
                )}
              >
                <Plus size={18} />
                Add your first {activeTab === 'risks' ? 'risk' : 'process'}
              </button>
            )}
          </div>
        )}
      </div>

    </div>
  )
}
