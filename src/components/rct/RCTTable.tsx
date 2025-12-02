import { useMemo, useRef, useCallback, useState } from 'react'
import { useSearchParams } from 'react-router'
import {
  useReactTable,
  getCoreRowModel,
  getFilteredRowModel,
  getSortedRowModel,
  getFacetedRowModel,
  getFacetedUniqueValues,
  ColumnDef,
  ColumnFiltersState,
  SortingState,
  flexRender,
  FilterFn,
} from '@tanstack/react-table'
import { useVirtualizer } from '@tanstack/react-virtual'
import * as Popover from '@radix-ui/react-popover'
import { Settings2, MessageSquare, X, Loader2, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react'
import { useRCTStore, calculateNetScoresFromLinks } from '@/stores/rctStore'
import { useControlsStore } from '@/stores/controlsStore'
import { useTaxonomyStore } from '@/stores/taxonomyStore'
import { usePermissions } from '@/hooks/usePermissions'
import { useIsDemoMode } from '@/hooks/useTenantData'
import { useRCTRows, useUpdateRCTRow, useBulkUpsertRCTRows, type RCTRowData } from '@/hooks/useRCTRows'
import { useCustomColumns } from '@/hooks/useCustomColumns'
import { useTaxonomy } from '@/hooks/useTaxonomy'
import { useControlLinks } from '@/hooks/useControlLinks'
import { useControls } from '@/hooks/useControls'
import { generateRCTRows, regenerateRCTRows } from '@/utils/rctGenerator'
import { evaluateFormula } from '@/utils/formulaEngine'
import { ScoreDropdown } from './ScoreDropdown'
import { HeatmapCell } from './HeatmapCell'
import { ControlPanel } from './ControlPanel'
import { ColumnFilter } from './ColumnFilter'
import { RCTToolbar } from './RCTToolbar'
import { EditableCell } from './EditableCell'
import { InfoTooltip } from './InfoTooltip'
import { ResizeHandle } from '@/components/matrix/ResizeHandle'
import type { RCTRow, CustomColumn } from '@/types/rct'
import type { TaxonomyItem } from '@/types/taxonomy'

// Comment button with popover for editing comments on cells
interface CommentButtonProps {
  comment: string | undefined
  onChange: (comment: string | undefined) => void
}

function CommentButton({ comment, onChange }: CommentButtonProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [value, setValue] = useState(comment ?? '')

  const handleOpenChange = (open: boolean) => {
    if (open) {
      setValue(comment ?? '')
    }
    setIsOpen(open)
  }

  const handleSave = () => {
    onChange(value.trim() || undefined)
    setIsOpen(false)
  }

  const hasComment = !!comment && comment.trim().length > 0

  return (
    <Popover.Root open={isOpen} onOpenChange={handleOpenChange}>
      <Popover.Trigger asChild>
        <button
          type="button"
          className={`p-1 rounded transition-colors ${
            hasComment
              ? 'text-accent-500 hover:text-accent-400'
              : 'text-text-muted hover:text-text-secondary'
          }`}
          title={hasComment ? 'Edit comment' : 'Add comment'}
        >
          <MessageSquare size={14} className={hasComment ? 'fill-accent-500/20' : ''} />
        </button>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          className="bg-surface-elevated border border-surface-border rounded-lg p-3 shadow-xl z-50 w-64"
          sideOffset={5}
          align="start"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-text-secondary">Comment</span>
            <Popover.Close asChild>
              <button className="p-1 text-text-muted hover:text-text-secondary transition-colors">
                <X size={14} />
              </button>
            </Popover.Close>
          </div>
          <textarea
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder="Add a comment..."
            rows={3}
            className="w-full px-2 py-1.5 bg-surface-overlay border border-surface-border rounded text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-1 focus:ring-accent-500 resize-none"
            autoFocus
          />
          <div className="flex justify-end gap-2 mt-2">
            <Popover.Close asChild>
              <button className="px-2 py-1 text-xs text-text-secondary hover:text-text-primary transition-colors">
                Cancel
              </button>
            </Popover.Close>
            <button
              onClick={handleSave}
              className="px-2 py-1 text-xs bg-accent-500 text-white rounded hover:bg-accent-600 transition-colors"
            >
              Save
            </button>
          </div>
          <Popover.Arrow className="fill-surface-border" />
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  )
}

// Custom filter function for multi-select
const multiSelectFilter: FilterFn<RCTRow> = (row, columnId, filterValue: string[]) => {
  if (!filterValue || filterValue.length === 0) return true
  const value = String(row.getValue(columnId) ?? '')
  return filterValue.includes(value)
}

/**
 * Find a taxonomy item by ID in a tree structure
 */
function findTaxonomyById(items: TaxonomyItem[], id: string): TaxonomyItem | null {
  for (const item of items) {
    if (item.id === id) return item
    if (item.children) {
      const found = findTaxonomyById(item.children, id)
      if (found) return found
    }
  }
  return null
}

/**
 * Build a map from item ID to its parent item by traversing the tree.
 * Returns a map where key is child ID, value is parent item.
 */
function buildParentMap(items: TaxonomyItem[]): Map<string, TaxonomyItem | null> {
  const parentMap = new Map<string, TaxonomyItem | null>()

  function traverse(item: TaxonomyItem, parent: TaxonomyItem | null) {
    parentMap.set(item.id, parent)
    if (item.children) {
      for (const child of item.children) {
        traverse(child, item)
      }
    }
  }

  // Root items have no parent
  for (const item of items) {
    traverse(item, null)
  }

  return parentMap
}

/**
 * Compute the positional hierarchical ID for a taxonomy item.
 * Returns a dotted string like "1", "1.2", "1.2.3" based on the item's position in the tree.
 *
 * @param items - The root-level taxonomy items (full tree)
 * @param ancestryPath - The ancestry path from root to leaf (as returned by getAncestryPath)
 * @param parentMap - Map from item ID to parent item
 * @returns The positional ID string (e.g., "1.2.3")
 */
function computePositionalId(
  items: TaxonomyItem[],
  ancestryPath: TaxonomyItem[],
  parentMap: Map<string, TaxonomyItem | null>
): string {
  const positions: number[] = []

  for (const item of ancestryPath) {
    const parent = parentMap.get(item.id)
    // Get siblings: either root items or parent's children
    const siblings = parent ? (parent.children || []) : items
    // Find 1-based position among siblings
    const position = siblings.findIndex(s => s.id === item.id) + 1
    positions.push(position)
  }

  return positions.join('.')
}

/**
 * Get the ancestry path for a taxonomy item by walking up the tree.
 * Returns ancestors from leaf to root (index 0 is the item itself, last is root).
 */
function getAncestryPath(
  item: TaxonomyItem,
  parentMap: Map<string, TaxonomyItem | null>
): TaxonomyItem[] {
  const path: TaxonomyItem[] = [item]
  let current = parentMap.get(item.id)

  while (current) {
    path.push(current)
    current = parentMap.get(current.id)
  }

  return path.reverse() // Now ordered from root to leaf
}

/**
 * Get the hierarchy path for a taxonomy item (L1 through L5)
 * Uses tree structure traversal instead of parsing hierarchical IDs.
 */
function getHierarchyPath(
  items: TaxonomyItem[],
  itemId: string,
  parentMap?: Map<string, TaxonomyItem | null>
): { l1Id: string; l1Name: string; l2Id: string; l2Name: string; l3Id: string; l3Name: string; l4Id: string; l4Name: string; l5Id: string; l5Name: string; name: string; description: string } {
  const result = {
    l1Id: '', l1Name: '',
    l2Id: '', l2Name: '',
    l3Id: '', l3Name: '',
    l4Id: '', l4Name: '',
    l5Id: '', l5Name: '',
    name: '',
    description: '',
  }

  const item = findTaxonomyById(items, itemId)
  if (!item) return result

  result.name = item.name
  result.description = item.description

  // Build parent map if not provided
  const pMap = parentMap ?? buildParentMap(items)

  // Get ancestry path from root to leaf
  const ancestryPath = getAncestryPath(item, pMap)

  // Assign each level (L1 is root, L5 is deepest)
  // Compute positional IDs from tree structure (e.g., "1", "1.2", "1.2.3")
  for (let i = 0; i < ancestryPath.length && i < 5; i++) {
    const levelItem = ancestryPath[i]
    const level = i + 1
    const key = `l${level}` as 'l1' | 'l2' | 'l3' | 'l4' | 'l5'
    // Compute positional ID for this level (ancestry up to this point)
    const levelAncestry = ancestryPath.slice(0, i + 1)
    const positionalId = computePositionalId(items, levelAncestry, pMap)
    result[`${key}Id` as keyof typeof result] = positionalId
    result[`${key}Name` as keyof typeof result] = levelItem.name
  }

  return result
}

/**
 * Convert database RCT row data to full RCTRow with denormalized taxonomy columns
 */
function denormalizeRCTRow(
  dbRow: RCTRowData,
  risks: TaxonomyItem[],
  processes: TaxonomyItem[],
  riskParentMap?: Map<string, TaxonomyItem | null>,
  processParentMap?: Map<string, TaxonomyItem | null>
): RCTRow {
  const riskPath = getHierarchyPath(risks, dbRow.riskId, riskParentMap)
  const processPath = getHierarchyPath(processes, dbRow.processId, processParentMap)

  // DEBUG: Log L4/L5 values to verify hierarchy traversal
  if (process.env.NODE_ENV === 'development') {
    if (riskPath.l4Name || riskPath.l5Name || processPath.l4Name || processPath.l5Name) {
      console.log('[RCT Debug] L4/L5 hierarchy:', {
        riskL4: riskPath.l4Name,
        riskL5: riskPath.l5Name,
        processL4: processPath.l4Name,
        processL5: processPath.l5Name,
      })
    }
  }

  return {
    id: dbRow.id,
    // Risk hierarchy
    riskId: dbRow.riskId,
    riskL1Id: riskPath.l1Id,
    riskL1Name: riskPath.l1Name,
    riskL2Id: riskPath.l2Id,
    riskL2Name: riskPath.l2Name,
    riskL3Id: riskPath.l3Id,
    riskL3Name: riskPath.l3Name,
    riskL4Id: riskPath.l4Id,
    riskL4Name: riskPath.l4Name,
    riskL5Id: riskPath.l5Id,
    riskL5Name: riskPath.l5Name,
    riskName: riskPath.name,
    riskDescription: riskPath.description,
    // Process hierarchy
    processId: dbRow.processId,
    processL1Id: processPath.l1Id,
    processL1Name: processPath.l1Name,
    processL2Id: processPath.l2Id,
    processL2Name: processPath.l2Name,
    processL3Id: processPath.l3Id,
    processL3Name: processPath.l3Name,
    processL4Id: processPath.l4Id,
    processL4Name: processPath.l4Name,
    processL5Id: processPath.l5Id,
    processL5Name: processPath.l5Name,
    processName: processPath.name,
    processDescription: processPath.description,
    // Scoring
    grossProbability: dbRow.grossProbability,
    grossImpact: dbRow.grossImpact,
    grossScore: dbRow.grossScore,
    riskAppetite: dbRow.riskAppetite,
    withinAppetite: dbRow.withinAppetite,
    // Comments from custom values
    grossProbabilityComment: (dbRow.customValues.grossProbabilityComment as string) || undefined,
    grossImpactComment: (dbRow.customValues.grossImpactComment as string) || undefined,
    // Controls (populated separately from control links)
    controls: [],
    hasControls: false,
    netScore: null,
    // Custom values
    customValues: dbRow.customValues,
  }
}

export function RCTTable() {
  const parentRef = useRef<HTMLDivElement>(null)
  const rowsRef = useRef<RCTRow[]>([])
  const [searchParams] = useSearchParams()

  // Demo mode check
  const isDemoMode = useIsDemoMode()

  // Store data (for demo mode)
  const {
    rows: storeRows,
    setRows,
    updateRow: storeUpdateRow,
    columnVisibility,
    setColumnVisibility,
    customColumns: storeCustomColumns,
    columnWidths,
    defaultColumnWidth,
    setColumnWidth,
  } = useRCTStore()
  const { risks: storeRisks, processes: storeProcesses } = useTaxonomyStore()
  const storeControlLinks = useControlsStore(state => state.controlLinks)
  const storeControls = useControlsStore(state => state.controls)

  // Database hooks (for authenticated mode)
  const { data: dbRctRows, isLoading: rctLoading } = useRCTRows()
  const { data: dbRisks, isLoading: risksLoading } = useTaxonomy('risk')
  const { data: dbProcesses, isLoading: processesLoading } = useTaxonomy('process')
  const { data: dbControlLinks } = useControlLinks()
  const { data: dbControls } = useControls()
  const { data: dbCustomColumns } = useCustomColumns()
  const updateRCTRowMutation = useUpdateRCTRow()
  const bulkUpsertRCTRowsMutation = useBulkUpsertRCTRows()

  // Use appropriate data sources
  const risks = isDemoMode ? storeRisks : (dbRisks || [])
  const processes = isDemoMode ? storeProcesses : (dbProcesses || [])
  const controlLinks = isDemoMode ? storeControlLinks : (dbControlLinks || [])
  const allControls = isDemoMode ? storeControls : (dbControls || [])
  const customColumns = isDemoMode ? storeCustomColumns : (dbCustomColumns || [])

  // Build parent maps for efficient hierarchy lookups (memoized separately)
  const riskParentMap = useMemo(() => buildParentMap(risks), [risks])
  const processParentMap = useMemo(() => buildParentMap(processes), [processes])

  // Build denormalized rows when using database
  const rows = useMemo(() => {
    if (isDemoMode) {
      return storeRows
    }
    // Denormalize database rows with taxonomy data
    if (!dbRctRows || risks.length === 0 || processes.length === 0) {
      return []
    }
    return dbRctRows.map(dbRow => denormalizeRCTRow(dbRow, risks, processes, riskParentMap, processParentMap))
  }, [isDemoMode, storeRows, dbRctRows, risks, processes, riskParentMap, processParentMap])

  // Keep rowsRef in sync with rows for stable callback access
  rowsRef.current = rows

  // Loading state
  const isLoading = !isDemoMode && (rctLoading || risksLoading || processesLoading)

  // Unified update function that routes to store or database
  const updateRow = useCallback((rowId: string, updates: Partial<RCTRow>) => {
    if (isDemoMode) {
      storeUpdateRow(rowId, updates)
    } else {
      // Map RCTRow fields to database update format
      const dbUpdates: Parameters<typeof updateRCTRowMutation.mutateAsync>[0] = { id: rowId }

      if (updates.grossProbability !== undefined) dbUpdates.grossProbability = updates.grossProbability
      if (updates.grossImpact !== undefined) dbUpdates.grossImpact = updates.grossImpact
      if (updates.riskAppetite !== undefined) dbUpdates.riskAppetite = updates.riskAppetite

      // Store comments in customValues
      if (updates.grossProbabilityComment !== undefined || updates.grossImpactComment !== undefined || updates.customValues) {
        const currentRow = rows.find(r => r.id === rowId)
        const currentCustomValues = currentRow?.customValues || {}
        dbUpdates.customValues = {
          ...currentCustomValues,
          ...(updates.customValues || {}),
          ...(updates.grossProbabilityComment !== undefined ? { grossProbabilityComment: updates.grossProbabilityComment } : {}),
          ...(updates.grossImpactComment !== undefined ? { grossImpactComment: updates.grossImpactComment } : {}),
        }
      }

      updateRCTRowMutation.mutate(dbUpdates)
    }
  }, [isDemoMode, storeUpdateRow, updateRCTRowMutation, rows])

  const { canEditGrossScores, canEditCustomColumnValues } = usePermissions()

  // Pre-compute link counts per row for O(1) lookup
  const linkCountByRow = useMemo(() => {
    const map = new Map<string, number>()
    for (const link of controlLinks) {
      map.set(link.rowId, (map.get(link.rowId) || 0) + 1)
    }
    return map
  }, [controlLinks])

  // Pre-compute net scores for each row
  // Net score = minP × minI from all controls (embedded + linked)
  // If no controls, fall back to gross score
  const netScoresByRow = useMemo(() => {
    const map = new Map<string, { netProbability: number | null; netImpact: number | null; netScore: number | null }>()

    for (const row of rows) {
      // Collect all probabilities and impacts from embedded controls
      const embeddedProbs: number[] = []
      const embeddedImps: number[] = []
      for (const control of row.controls) {
        if (control.netProbability !== null) embeddedProbs.push(control.netProbability)
        if (control.netImpact !== null) embeddedImps.push(control.netImpact)
      }

      // Get linked control scores (pass correct data source based on auth mode)
      const linkedScores = calculateNetScoresFromLinks(row.id, allControls, controlLinks)

      // Combine all probabilities and impacts
      const allProbs = [...embeddedProbs]
      const allImps = [...embeddedImps]

      // Add linked scores if they exist
      if (linkedScores.netProbability !== null) allProbs.push(linkedScores.netProbability)
      if (linkedScores.netImpact !== null) allImps.push(linkedScores.netImpact)

      // If no controls at all, fall back to gross score
      const hasAnyControls = row.controls.length > 0 || (linkCountByRow.get(row.id) || 0) > 0

      let netProbability: number | null = null
      let netImpact: number | null = null
      let netScore: number | null = null

      if (!hasAnyControls) {
        // No controls - use gross score as net score
        netProbability = row.grossProbability
        netImpact = row.grossImpact
        netScore = row.grossScore
      } else if (allProbs.length > 0 && allImps.length > 0) {
        // Has controls with scores - take min of each
        netProbability = Math.min(...allProbs)
        netImpact = Math.min(...allImps)
        netScore = netProbability * netImpact
      }
      // else: has controls but no scores set - leave as null

      map.set(row.id, { netProbability, netImpact, netScore })
    }

    return map
  }, [rows, controlLinks, allControls, linkCountByRow])

  // Build initial filters from URL params (lazy initialization)
  const getInitialFilters = (): ColumnFiltersState => {
    const filters: ColumnFiltersState = []

    const riskFilter = searchParams.get('riskFilter')
    if (riskFilter) {
      filters.push({ id: 'riskId', value: [riskFilter] })
    }

    const processFilter = searchParams.get('processFilter')
    if (processFilter) {
      filters.push({ id: 'processId', value: [processFilter] })
    }

    return filters
  }

  // Filter state - initialized from URL params
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>(getInitialFilters)

  // Sorting state
  const [sorting, setSorting] = useState<SortingState>([])

  // Global filter state (search)
  const [globalFilter, setGlobalFilter] = useState('')

  // Control panel state
  const [selectedRowId, setSelectedRowId] = useState<string | null>(null)
  const [isPanelOpen, setIsPanelOpen] = useState(false)

  const selectedRow = useMemo(
    () => rows.find(r => r.id === selectedRowId) ?? null,
    [rows, selectedRowId]
  )

  const openControlPanel = useCallback((rowId: string) => {
    setSelectedRowId(rowId)
    setIsPanelOpen(true)
  }, [])

  const closeControlPanel = useCallback(() => {
    setIsPanelOpen(false)
  }, [])

  // Check if taxonomies have leaf items
  const hasData = useMemo(() => {
    return risks.length > 0 && processes.length > 0
  }, [risks, processes])

  // Generate/regenerate rows button handler
  // Uses regenerateRCTRows when rows exist to preserve scores, controls, and custom values
  const handleGenerateRows = useCallback(() => {
    if (isDemoMode) {
      // Demo mode: use Zustand store
      if (rows.length > 0) {
        const newRows = regenerateRCTRows(risks, processes, rows)
        setRows(newRows)
      } else {
        const newRows = generateRCTRows(risks, processes)
        setRows(newRows)
      }
    } else {
      // Authenticated mode: use database with upsert
      // Generate rows from leaf taxonomy items
      const newRows = generateRCTRows(risks, processes)

      if (newRows.length === 0) {
        return
      }

      // Convert to database format (rowId not needed - hook constructs it)
      const dbRows = newRows.map((row) => ({
        riskId: row.riskId,
        processId: row.processId,
        riskAppetite: row.riskAppetite,
      }))

      bulkUpsertRCTRowsMutation.mutate(dbRows)
    }
  }, [isDemoMode, risks, processes, rows, setRows, bulkUpsertRCTRowsMutation])

  // Handle score changes
  const handleScoreChange = useCallback((
    rowId: string,
    field: 'grossProbability' | 'grossImpact' | 'riskAppetite',
    value: number
  ) => {
    updateRow(rowId, { [field]: value })
  }, [updateRow])

  // Handle custom value changes
  // Uses rowsRef to avoid recreating callback when rows change (prevents focus loss)
  const handleCustomValueChange = useCallback((
    rowId: string,
    columnId: string,
    value: string | number | Date | null
  ) => {
    // Get current row from ref (stable identity, always has latest rows)
    const row = rowsRef.current.find(r => r.id === rowId)
    if (row) {
      updateRow(rowId, {
        customValues: { ...row.customValues, [columnId]: value }
      })
    }
  }, [updateRow])

  // Build custom column definitions
  const customColumnDefs = useMemo<ColumnDef<RCTRow>[]>(() => {
    return customColumns.map(col => {
      const baseColumn: ColumnDef<RCTRow> = {
        id: col.id,
        header: col.name,
        size: col.width ?? 120,
        filterFn: 'multiSelect',
        accessorFn: (row) => {
          if (col.type === 'formula' && col.formula) {
            const result = evaluateFormula(col.formula, row, customColumns)
            return result.error ? `#ERR: ${result.error}` : result.result
          }
          return row.customValues[col.id] ?? ''
        },
      }

      // Cell renderer based on type
      switch (col.type) {
        case 'text':
          baseColumn.cell = ({ row }) => (
            <EditableCell
              type="text"
              value={(row.original.customValues[col.id] as string) ?? null}
              onChange={(value) => handleCustomValueChange(row.original.id, col.id, value)}
              disabled={!canEditCustomColumnValues}
            />
          )
          break

        case 'number':
          baseColumn.cell = ({ row }) => (
            <EditableCell
              type="number"
              value={(row.original.customValues[col.id] as number) ?? null}
              onChange={(value) => handleCustomValueChange(row.original.id, col.id, value)}
              disabled={!canEditCustomColumnValues}
            />
          )
          break

        case 'dropdown':
          baseColumn.cell = ({ row }) => (
            <select
              value={(row.original.customValues[col.id] as string) ?? ''}
              onChange={(e) => handleCustomValueChange(row.original.id, col.id, e.target.value || null)}
              disabled={!canEditCustomColumnValues}
              className="w-full px-2 py-1 bg-surface-overlay border border-surface-border rounded text-sm text-text-primary focus:outline-none focus:ring-1 focus:ring-accent-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <option value="">-</option>
              {col.options?.map(opt => (
                <option key={opt} value={opt}>{opt}</option>
              ))}
            </select>
          )
          break

        case 'date':
          baseColumn.cell = ({ row }) => (
            <EditableCell
              type="date"
              value={(row.original.customValues[col.id] as string) ?? null}
              onChange={(value) => handleCustomValueChange(row.original.id, col.id, value)}
              disabled={!canEditCustomColumnValues}
            />
          )
          break

        case 'formula':
          baseColumn.cell = ({ getValue }) => {
            const value = getValue()
            const isError = typeof value === 'string' && value.startsWith('#ERR')
            return (
              <span className={isError ? 'text-red-400' : 'text-text-primary'}>
                {String(value)}
              </span>
            )
          }
          break
      }

      return baseColumn
    })
  }, [customColumns, handleCustomValueChange, canEditCustomColumnValues])

  // Column definitions with interactive cells
  const columns = useMemo<ColumnDef<RCTRow>[]>(() => [
    // Hidden columns for URL-based filtering (riskId/processId from Matrix navigation)
    { accessorKey: 'riskId', header: 'Risk ID', size: 80, filterFn: 'multiSelect', enableHiding: true },
    { accessorKey: 'processId', header: 'Process ID', size: 80, filterFn: 'multiSelect', enableHiding: true },
    // Risk hierarchy columns
    { accessorKey: 'riskL1Id', header: 'Risk L1 ID', size: 80, filterFn: 'multiSelect' },
    { accessorKey: 'riskL1Name', header: 'Risk L1 Name', size: 150, filterFn: 'multiSelect' },
    { accessorKey: 'riskL2Id', header: 'Risk L2 ID', size: 80, filterFn: 'multiSelect' },
    { accessorKey: 'riskL2Name', header: 'Risk L2 Name', size: 150, filterFn: 'multiSelect' },
    { accessorKey: 'riskL3Id', header: 'Risk L3 ID', size: 80, filterFn: 'multiSelect' },
    { accessorKey: 'riskL3Name', header: 'Risk L3 Name', size: 150, filterFn: 'multiSelect' },
    { accessorKey: 'riskL4Id', header: 'Risk L4 ID', size: 80, filterFn: 'multiSelect' },
    { accessorKey: 'riskL4Name', header: 'Risk L4 Name', size: 150, filterFn: 'multiSelect' },
    { accessorKey: 'riskL5Id', header: 'Risk L5 ID', size: 80, filterFn: 'multiSelect' },
    { accessorKey: 'riskL5Name', header: 'Risk L5 Name', size: 150, filterFn: 'multiSelect' },
    // Process hierarchy columns
    { accessorKey: 'processL1Id', header: 'Process L1 ID', size: 80, filterFn: 'multiSelect' },
    { accessorKey: 'processL1Name', header: 'Process L1 Name', size: 150, filterFn: 'multiSelect' },
    { accessorKey: 'processL2Id', header: 'Process L2 ID', size: 80, filterFn: 'multiSelect' },
    { accessorKey: 'processL2Name', header: 'Process L2 Name', size: 150, filterFn: 'multiSelect' },
    { accessorKey: 'processL3Id', header: 'Process L3 ID', size: 80, filterFn: 'multiSelect' },
    { accessorKey: 'processL3Name', header: 'Process L3 Name', size: 150, filterFn: 'multiSelect' },
    { accessorKey: 'processL4Id', header: 'Process L4 ID', size: 80, filterFn: 'multiSelect' },
    { accessorKey: 'processL4Name', header: 'Process L4 Name', size: 150, filterFn: 'multiSelect' },
    { accessorKey: 'processL5Id', header: 'Process L5 ID', size: 80, filterFn: 'multiSelect' },
    { accessorKey: 'processL5Name', header: 'Process L5 Name', size: 150, filterFn: 'multiSelect' },
    // Scoring columns with interactive cells
    {
      accessorKey: 'grossProbability',
      header: () => (
        <div className="flex items-center gap-1">
          <span>Gross Prob.</span>
          <InfoTooltip type="probability" editable={true} />
        </div>
      ),
      size: 180,
      filterFn: 'multiSelect',
      cell: ({ row }) => (
        <div className="flex items-center gap-1">
          <ScoreDropdown
            value={row.original.grossProbability}
            onChange={(v) => handleScoreChange(row.original.id, 'grossProbability', v)}
            type="probability"
            disabled={!canEditGrossScores}
          />
          <CommentButton
            comment={row.original.grossProbabilityComment}
            onChange={(c) => updateRow(row.original.id, { grossProbabilityComment: c })}
          />
        </div>
      ),
    },
    {
      accessorKey: 'grossImpact',
      header: () => (
        <div className="flex items-center gap-1">
          <span>Gross Impact</span>
          <InfoTooltip type="impact" editable={true} />
        </div>
      ),
      size: 180,
      filterFn: 'multiSelect',
      cell: ({ row }) => (
        <div className="flex items-center gap-1">
          <ScoreDropdown
            value={row.original.grossImpact}
            onChange={(v) => handleScoreChange(row.original.id, 'grossImpact', v)}
            type="impact"
            disabled={!canEditGrossScores}
          />
          <CommentButton
            comment={row.original.grossImpactComment}
            onChange={(c) => updateRow(row.original.id, { grossImpactComment: c })}
          />
        </div>
      ),
    },
    {
      accessorKey: 'grossScore',
      header: 'Gross Score',
      size: 100,
      filterFn: 'multiSelect',
      cell: ({ row }) => <HeatmapCell score={row.original.grossScore} />,
    },
    {
      accessorKey: 'riskAppetite',
      header: 'Appetite',
      size: 80,
      filterFn: 'multiSelect',
      cell: ({ row }) => (
        <input
          type="number"
          min={1}
          max={25}
          value={row.original.riskAppetite}
          onChange={(e) => handleScoreChange(row.original.id, 'riskAppetite', Number(e.target.value))}
          disabled={!canEditGrossScores}
          className="w-16 px-2 py-1 bg-surface-overlay border border-surface-border rounded text-sm text-text-primary text-center focus:outline-none focus:ring-1 focus:ring-accent-500 disabled:opacity-50 disabled:cursor-not-allowed"
        />
      ),
    },
    {
      accessorKey: 'withinAppetite',
      header: 'Within Appetite',
      size: 120,
      filterFn: 'multiSelect',
      cell: ({ row }) => <HeatmapCell score={row.original.withinAppetite} variant="appetite" />,
    },
    // Controls column - positioned between Within Appetite and Net Score
    {
      id: 'controls',
      header: 'Controls',
      size: 100,
      cell: ({ row }) => {
        // Count both embedded controls and linked controls from hub
        const embeddedCount = row.original.controls.length
        const linkedCount = linkCountByRow.get(row.original.id) || 0
        const totalCount = embeddedCount + linkedCount
        return (
          <button
            onClick={() => openControlPanel(row.original.id)}
            className="flex items-center gap-1.5 px-2 py-1 text-xs rounded bg-surface-overlay hover:bg-surface-border transition-colors"
          >
            <Settings2 size={14} />
            <span>{totalCount}</span>
          </button>
        )
      },
    },
    {
      id: 'netScore',
      header: 'Net Score',
      size: 100,
      filterFn: 'multiSelect',
      accessorFn: (row) => netScoresByRow.get(row.id)?.netScore ?? null,
      cell: ({ row }) => {
        const scores = netScoresByRow.get(row.original.id)
        return <HeatmapCell score={scores?.netScore ?? null} />
      },
    },
    {
      id: 'netWithinAppetite',
      header: 'Net Within App.',
      size: 120,
      filterFn: 'multiSelect',
      accessorFn: (row) => {
        const scores = netScoresByRow.get(row.id)
        if (scores?.netScore === null) return null
        return row.riskAppetite - scores.netScore
      },
      cell: ({ row }) => {
        const scores = netScoresByRow.get(row.original.id)
        if (scores?.netScore === null) return <HeatmapCell score={null} variant="appetite" />
        const netWithinAppetite = row.original.riskAppetite - scores.netScore
        return <HeatmapCell score={netWithinAppetite} variant="appetite" />
      },
    },
    // Custom columns appended at end
    ...customColumnDefs,
  ], [handleScoreChange, openControlPanel, customColumnDefs, canEditGrossScores, linkCountByRow, netScoresByRow])

  // Helper to get column width with fallback to default or column definition size
  const getColumnWidth = useCallback((columnId: string, defaultSize: number): number => {
    return columnWidths[columnId] ?? defaultSize
  }, [columnWidths])

  // Auto-fit column width based on header and cell content
  const autoFitColumnWidth = useCallback((columnId: string, headerText: string) => {
    // Header width breakdown:
    // - Cell padding: px-3 = 24px (12px each side)
    // - Sort icon: 14px + flex-shrink-0
    // - Filter button: p-1 (8px) + 14px icon = 22px
    // - Gaps: gap-1 between elements = 8px (2 gaps)
    // - Buffer for rounding/fonts: 2px
    // Total fixed overhead: ~70px
    const HEADER_OVERHEAD_PX = 70
    const CHAR_WIDTH_PX = 8
    let maxWidth = headerText.length * CHAR_WIDTH_PX + HEADER_OVERHEAD_PX

    // Check all visible cell content for this column
    // Cell padding: px-3 = 24px
    const CELL_PADDING_PX = 24
    for (const row of rows) {
      const cellValue = (row as Record<string, unknown>)[columnId]
      if (cellValue !== null && cellValue !== undefined) {
        const contentWidth = String(cellValue).length * CHAR_WIDTH_PX + CELL_PADDING_PX
        maxWidth = Math.max(maxWidth, contentWidth)
      }
    }

    // Clamp to reasonable range (80-500px)
    const finalWidth = Math.max(80, Math.min(500, maxWidth))
    setColumnWidth(columnId, finalWidth)
  }, [rows, setColumnWidth])

  // Auto-fit ALL visible columns at once
  const autoFitAllColumns = useCallback(() => {
    for (const column of columns) {
      const columnId = column.id ?? (column as { accessorKey?: string }).accessorKey
      if (!columnId) continue

      // Skip hidden columns
      if (columnVisibility[columnId] === false) continue

      // Get header text for width calculation
      let headerText = columnId
      if (typeof column.header === 'string') {
        headerText = column.header
      } else if (column.id) {
        // Use column ID as fallback (will be converted from camelCase)
        headerText = column.id.replace(/([A-Z])/g, ' $1').trim()
      }

      autoFitColumnWidth(columnId, headerText)
    }
  }, [columns, columnVisibility, autoFitColumnWidth])

  // Table instance with faceted filtering, sorting, global search, and column resizing
  const table = useReactTable({
    data: rows,
    columns,
    state: {
      columnVisibility,
      columnFilters,
      sorting,
      globalFilter,
    },
    filterFns: {
      multiSelect: multiSelectFilter,
    },
    globalFilterFn: 'includesString',
    enableColumnResizing: true,
    columnResizeMode: 'onChange',
    onColumnVisibilityChange: setColumnVisibility,
    onColumnFiltersChange: setColumnFilters,
    onSortingChange: setSorting,
    onGlobalFilterChange: setGlobalFilter,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFacetedRowModel: getFacetedRowModel(),
    getFacetedUniqueValues: getFacetedUniqueValues(),
  })

  // Virtualizer for rows
  const { rows: tableRows } = table.getRowModel()
  const virtualizer = useVirtualizer({
    count: tableRows.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 56,
    overscan: 10,
  })

  // Loading state (only when authenticated)
  if (isLoading) {
    return (
      <div className="bg-surface-elevated rounded-lg p-6 border border-surface-border flex items-center justify-center h-64">
        <div className="flex items-center gap-3 text-text-secondary">
          <Loader2 className="animate-spin" size={24} />
          <span>Loading risk control table...</span>
        </div>
      </div>
    )
  }

  // Empty state - no taxonomies
  if (!hasData) {
    return (
      <div className="bg-surface-elevated rounded-lg p-6 border border-surface-border text-center">
        <p className="text-text-secondary mb-4">
          Build your Risk and Process taxonomies first to generate the Risk Control Table.
        </p>
        <a
          href="/taxonomy"
          className="text-accent-500 hover:text-accent-400 font-medium transition-colors"
        >
          Go to Taxonomies
        </a>
      </div>
    )
  }

  // No rows generated yet
  if (rows.length === 0) {
    return (
      <div className="bg-surface-elevated rounded-lg p-6 border border-surface-border text-center">
        <p className="text-text-secondary mb-4">
          Taxonomies are ready. Generate the Risk Control Table from your risk and process combinations.
        </p>
        <button
          onClick={handleGenerateRows}
          className="px-4 py-2 bg-accent-500 text-white rounded-lg font-medium hover:bg-accent-600 transition-colors"
        >
          Generate RCT
        </button>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      {/* Toolbar */}
      <RCTToolbar
        table={table}
        rowCount={rows.length}
        filteredCount={tableRows.length}
        onRegenerate={handleGenerateRows}
        onAutoFitColumns={autoFitAllColumns}
        globalFilter={globalFilter}
        setGlobalFilter={setGlobalFilter}
      />

      {/* Table container */}
      <div
        ref={parentRef}
        className="flex-1 overflow-auto border border-surface-border rounded-lg"
      >
        <table className="w-full border-collapse" style={{ tableLayout: 'fixed' }}>
          <thead className="sticky top-0 bg-surface-elevated z-10" style={{ display: 'block' }}>
            {table.getHeaderGroups().map(headerGroup => (
              <tr key={headerGroup.id} style={{ display: 'flex', width: '100%' }}>
                {headerGroup.headers.map(header => {
                  const headerWidth = getColumnWidth(header.id, header.getSize())
                  const headerText = typeof header.column.columnDef.header === 'string'
                    ? header.column.columnDef.header
                    : header.id
                  return (
                    <th
                      key={header.id}
                      className="px-3 py-2 text-left text-sm font-medium text-text-secondary border-b border-surface-border bg-surface-elevated group relative flex-shrink-0 cursor-pointer hover:bg-surface-overlay/50"
                      style={{ width: headerWidth, minWidth: headerWidth }}
                      onClick={header.column.getToggleSortingHandler()}
                    >
                      <div className="flex items-center gap-1">
                        <span className="truncate flex-1" title={typeof header.column.columnDef.header === 'string' ? header.column.columnDef.header : ''}>
                          {header.isPlaceholder
                            ? null
                            : flexRender(header.column.columnDef.header, header.getContext())}
                        </span>
                        {header.column.getCanSort() && (
                          header.column.getIsSorted() === 'asc' ? (
                            <ArrowUp size={14} className="text-accent-500 flex-shrink-0" />
                          ) : header.column.getIsSorted() === 'desc' ? (
                            <ArrowDown size={14} className="text-accent-500 flex-shrink-0" />
                          ) : (
                            <ArrowUpDown size={14} className="opacity-40 group-hover:opacity-70 flex-shrink-0" />
                          )
                        )}
                        {header.column.getCanFilter() && (
                          <ColumnFilter column={header.column} />
                        )}
                      </div>
                      {/* Column resize handle with auto-fit on double-click */}
                      <ResizeHandle
                        direction="horizontal"
                        onResize={(delta) => {
                          const currentWidth = getColumnWidth(header.id, header.getSize())
                          setColumnWidth(header.id, currentWidth + delta)
                        }}
                        onDoubleClick={() => {
                          autoFitColumnWidth(header.id, headerText)
                        }}
                      />
                    </th>
                  )
                })}
              </tr>
            ))}
          </thead>
          <tbody
            style={{
              display: 'block',
              height: `${virtualizer.getTotalSize()}px`,
              position: 'relative',
            }}
          >
            {virtualizer.getVirtualItems().map(virtualRow => {
              const row = tableRows[virtualRow.index]
              return (
                <tr
                  key={row.id}
                  className="hover:bg-surface-overlay/50 transition-colors"
                  style={{
                    display: 'flex',
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '100%',
                    height: `${virtualRow.size}px`,
                    transform: `translateY(${virtualRow.start}px)`,
                  }}
                >
                  {row.getVisibleCells().map(cell => {
                    const cellValue = cell.getValue()
                    const isTextCell = typeof cellValue === 'string' || typeof cellValue === 'number'
                    const cellWidth = getColumnWidth(cell.column.id, cell.column.getSize())
                    return (
                      <td
                        key={cell.id}
                        className="px-3 py-2 text-sm text-text-primary border-b border-surface-border overflow-hidden flex-shrink-0"
                        style={{ width: cellWidth, minWidth: cellWidth }}
                      >
                        <div
                          className="truncate"
                          title={isTextCell ? String(cellValue) : undefined}
                        >
                          {flexRender(cell.column.columnDef.cell, cell.getContext())}
                        </div>
                      </td>
                    )
                  })}
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* Control Panel */}
      <ControlPanel
        isOpen={isPanelOpen}
        onClose={closeControlPanel}
        row={selectedRow}
      />
    </div>
  )
}
