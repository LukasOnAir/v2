// supabase/functions/seed-demo-data/index.ts
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { z } from 'https://deno.land/x/zod@v3.22.4/mod.ts'

// Structured logging helper
function logStructured(
  level: 'debug' | 'info' | 'warn' | 'error',
  message: string,
  context?: Record<string, unknown>
) {
  const entry = {
    level,
    message,
    timestamp: new Date().toISOString(),
    function: 'seed-demo-data',
    ...context,
  }
  console[level](JSON.stringify(entry))
}

// Import preset data
import { emptyPreset } from './presets/empty.ts'
import { casinoPreset } from './presets/casino.ts'
import { bankPreset } from './presets/bank.ts'
import { insurerPreset } from './presets/insurer.ts'
import { genericPreset } from './presets/generic.ts'
import type { PresetData, SeedTaxonomyItem, SeedControl, RCTPairing } from './presets/types.ts'

// Preset registry
const PRESETS: Record<string, PresetData> = {
  empty: emptyPreset,
  casino: casinoPreset,
  bank: bankPreset,
  insurer: insurerPreset,
  generic: genericPreset,
}

// Valid preset names
const PRESET_NAMES = ['empty', 'casino', 'bank', 'insurer', 'generic'] as const
type PresetName = typeof PRESET_NAMES[number]

// Request validation schema
const SeedRequestSchema = z.object({
  preset: z.enum(PRESET_NAMES),
  tenantId: z.string().uuid('Invalid tenant ID format'),
})

// CORS headers (same pattern as accept-invitation)
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

/**
 * Generate UUIDs and hierarchical IDs for taxonomy items
 * Returns flattened array with parent references for database insertion
 */
interface ProcessedTaxonomyItem {
  id: string
  hierarchicalId: string
  name: string
  description: string
  parentId: string | null
  level: number
  children?: ProcessedTaxonomyItem[]
}

function processTaxonomyTree(
  items: SeedTaxonomyItem[],
  parentId: string | null = null,
  prefix = '',
  level = 1
): ProcessedTaxonomyItem[] {
  const result: ProcessedTaxonomyItem[] = []

  items.forEach((item, index) => {
    const hierarchicalId = prefix ? `${prefix}.${index + 1}` : `${index + 1}`
    const id = crypto.randomUUID()

    const processedItem: ProcessedTaxonomyItem = {
      id,
      hierarchicalId,
      name: item.name,
      description: item.description,
      parentId,
      level,
    }

    result.push(processedItem)

    // Process children recursively
    if (item.children && item.children.length > 0) {
      const children = processTaxonomyTree(item.children, id, hierarchicalId, level + 1)
      processedItem.children = children
      result.push(...children)
    }
  })

  return result
}

/**
 * Build hierarchical tree structure from flattened items
 * Returns only root items with nested children
 */
function buildTaxonomyTree(flatItems: ProcessedTaxonomyItem[]): ProcessedTaxonomyItem[] {
  const itemMap = new Map<string, ProcessedTaxonomyItem>()
  const roots: ProcessedTaxonomyItem[] = []

  // First pass: create map of all items
  for (const item of flatItems) {
    itemMap.set(item.id, { ...item, children: [] })
  }

  // Second pass: build tree structure
  for (const item of flatItems) {
    const processedItem = itemMap.get(item.id)!
    if (item.parentId === null) {
      roots.push(processedItem)
    } else {
      const parent = itemMap.get(item.parentId)
      if (parent) {
        if (!parent.children) parent.children = []
        parent.children.push(processedItem)
      }
    }
  }

  return roots
}

/**
 * Find taxonomy item by path (array of names from root to target)
 */
function findItemByPath(
  items: ProcessedTaxonomyItem[],
  path: string[]
): ProcessedTaxonomyItem | null {
  if (path.length === 0) return null

  const [first, ...rest] = path
  const found = items.find(item => item.name === first)

  if (!found) return null
  if (rest.length === 0) return found
  if (!found.children) return null

  return findItemByPath(found.children, rest)
}

/**
 * Generate RCT rows from pairings
 */
interface GeneratedRCTRow {
  id: string
  riskId: string
  riskL1Id: string
  riskL1Name: string
  riskL2Id: string
  riskL2Name: string
  riskL3Id: string
  riskL3Name: string
  riskL4Id: string
  riskL4Name: string
  riskL5Id: string
  riskL5Name: string
  riskName: string
  riskDescription: string
  processId: string
  processL1Id: string
  processL1Name: string
  processL2Id: string
  processL2Name: string
  processL3Id: string
  processL3Name: string
  processL4Id: string
  processL4Name: string
  processL5Id: string
  processL5Name: string
  processName: string
  processDescription: string
  grossProbability: number | null
  grossImpact: number | null
  grossScore: number | null
  riskAppetite: number
  withinAppetite: number | null
  controls: never[]
  hasControls: boolean
  netProbability: number | null
  netImpact: number | null
  netScore: number | null
  netWithinAppetite: number | null
  customValues: Record<string, never>
}

function getAncestors(
  item: ProcessedTaxonomyItem,
  flatItems: ProcessedTaxonomyItem[]
): ProcessedTaxonomyItem[] {
  const ancestors: ProcessedTaxonomyItem[] = []
  let current: ProcessedTaxonomyItem | undefined = item

  while (current) {
    ancestors.unshift(current)
    if (current.parentId) {
      current = flatItems.find(i => i.id === current!.parentId)
    } else {
      current = undefined
    }
  }

  return ancestors
}

function generateRCTRows(
  pairings: RCTPairing[],
  riskTree: ProcessedTaxonomyItem[],
  processTree: ProcessedTaxonomyItem[],
  riskFlat: ProcessedTaxonomyItem[],
  processFlat: ProcessedTaxonomyItem[]
): GeneratedRCTRow[] {
  const rows: GeneratedRCTRow[] = []

  for (const pairing of pairings) {
    const risk = findItemByPath(riskTree, pairing.riskPath)
    const process = findItemByPath(processTree, pairing.processPath)

    if (!risk || !process) {
      console.warn('Could not find risk or process for pairing:', pairing)
      continue
    }

    const riskAncestors = getAncestors(risk, riskFlat)
    const processAncestors = getAncestors(process, processFlat)

    // Pad ancestors to 5 levels
    while (riskAncestors.length < 5) {
      riskAncestors.push({ id: '', hierarchicalId: '', name: '', description: '', parentId: null, level: riskAncestors.length + 1 })
    }
    while (processAncestors.length < 5) {
      processAncestors.push({ id: '', hierarchicalId: '', name: '', description: '', parentId: null, level: processAncestors.length + 1 })
    }

    rows.push({
      id: crypto.randomUUID(),
      riskId: risk.id,
      riskL1Id: riskAncestors[0].id,
      riskL1Name: riskAncestors[0].name,
      riskL2Id: riskAncestors[1].id,
      riskL2Name: riskAncestors[1].name,
      riskL3Id: riskAncestors[2].id,
      riskL3Name: riskAncestors[2].name,
      riskL4Id: riskAncestors[3].id,
      riskL4Name: riskAncestors[3].name,
      riskL5Id: riskAncestors[4].id,
      riskL5Name: riskAncestors[4].name,
      riskName: risk.name,
      riskDescription: risk.description,
      processId: process.id,
      processL1Id: processAncestors[0].id,
      processL1Name: processAncestors[0].name,
      processL2Id: processAncestors[1].id,
      processL2Name: processAncestors[1].name,
      processL3Id: processAncestors[2].id,
      processL3Name: processAncestors[2].name,
      processL4Id: processAncestors[3].id,
      processL4Name: processAncestors[3].name,
      processL5Id: processAncestors[4].id,
      processL5Name: processAncestors[4].name,
      processName: process.name,
      processDescription: process.description,
      grossProbability: null,
      grossImpact: null,
      grossScore: null,
      riskAppetite: 9,
      withinAppetite: null,
      controls: [],
      hasControls: false,
      netProbability: null,
      netImpact: null,
      netScore: null,
      netWithinAppetite: null,
      customValues: {},
    })
  }

  return rows
}

/**
 * Process controls from preset, generating IDs
 */
interface ProcessedControl {
  id: string
  name: string
  description: string
  controlType: string
  testFrequency: string
  testProcedure: string
  netProbability: number | null
  netImpact: number | null
  netScore: number | null
  nextTestDate: string | null
  lastTestDate: string | null
  assignedTesterId: string | null
}

function processControls(controls: SeedControl[]): ProcessedControl[] {
  return controls.map(control => ({
    id: crypto.randomUUID(),
    name: control.name,
    description: control.description,
    controlType: control.controlType,
    testFrequency: control.testFrequency,
    testProcedure: control.testProcedure,
    netProbability: null,
    netImpact: null,
    netScore: null,
    nextTestDate: null,
    lastTestDate: null,
    assignedTesterId: null,
  }))
}

serve(async (req) => {
  const requestId = crypto.randomUUID()
  logStructured('info', 'Function invoked', { requestId, method: req.method })

  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const body = await req.json()
    const parseResult = SeedRequestSchema.safeParse(body)

    if (!parseResult.success) {
      return new Response(
        JSON.stringify({
          error: 'Invalid request',
          details: parseResult.error.flatten().fieldErrors,
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const { preset, tenantId } = parseResult.data

    // Verify JWT and extract user claims
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Create Supabase client with user's JWT to verify access
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      {
        global: {
          headers: { Authorization: authHeader },
        },
      }
    )

    // Get user from JWT
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser()

    if (userError || !user) {
      logStructured('error', 'Authentication failed', { requestId, error: userError?.message || 'Unknown' })
      return new Response(
        JSON.stringify({ error: 'Invalid or expired token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    logStructured('info', 'User authenticated', { requestId, userId: user.id })

    // Verify user is Director of the specified tenant
    const userTenantId = user.app_metadata?.tenant_id
    const userRole = user.app_metadata?.role

    if (userTenantId !== tenantId) {
      logStructured('warn', 'Tenant ID mismatch', { requestId, userTenantId, requestedTenantId: tenantId })
      return new Response(
        JSON.stringify({ error: 'Tenant ID mismatch' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (userRole !== 'director') {
      logStructured('warn', 'Non-director attempted to seed data', { requestId, role: userRole })
      return new Response(
        JSON.stringify({ error: 'Only Directors can seed demo data' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    logStructured('info', 'Authorization verified', { requestId, role: userRole, preset })

    // Load preset data
    const presetData = PRESETS[preset]
    if (!presetData) {
      return new Response(
        JSON.stringify({ error: 'Unknown preset' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Empty preset - return success immediately with empty data
    if (preset === 'empty') {
      logStructured('info', 'Empty preset selected, returning empty data', { requestId })
      logStructured('info', 'Request completed', { requestId, status: 200, preset: 'empty' })
      return new Response(
        JSON.stringify({
          success: true,
          preset: 'empty',
          risks: [],
          processes: [],
          controls: [],
          rows: [],
          counts: {
            risks: 0,
            processes: 0,
            controls: 0,
            rows: 0,
          },
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Process taxonomy trees
    const riskFlat = processTaxonomyTree(presetData.risks)
    const processFlat = processTaxonomyTree(presetData.processes)

    // Build hierarchical trees for path lookup and frontend consumption
    const riskTree = buildTaxonomyTree(riskFlat)
    const processTree = buildTaxonomyTree(processFlat)

    // Generate RCT rows from pairings
    const rows = generateRCTRows(
      presetData.rctPairings,
      riskTree,
      processTree,
      riskFlat,
      processFlat
    )

    // Process controls
    const controls = processControls(presetData.controls)

    // Return data for frontend to load into Zustand stores
    // The frontend will handle persistence to localStorage
    logStructured('info', 'Request completed', {
      requestId,
      status: 200,
      preset,
      risksCount: riskFlat.length,
      processesCount: processFlat.length,
      controlsCount: controls.length,
      rowsCount: rows.length,
    })
    return new Response(
      JSON.stringify({
        success: true,
        preset,
        risks: riskTree,
        processes: processTree,
        controls,
        rows,
        counts: {
          risks: riskFlat.length,
          processes: processFlat.length,
          controls: controls.length,
          rows: rows.length,
        },
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    logStructured('error', 'Internal server error', { requestId, error: error instanceof Error ? error.message : 'Unknown' })
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
