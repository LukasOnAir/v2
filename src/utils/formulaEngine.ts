import { Parser } from 'hot-formula-parser'
import type { RCTRow, CustomColumn } from '@/types/rct'

/**
 * Normalize smart quotes to straight quotes
 * Handles copy-paste from Word, email, and other rich text sources
 */
function normalizeQuotes(formula: string): string {
  return formula
    .replace(/[\u201C\u201D\u201E\u201F]/g, '"')  // Smart double quotes -> straight
    .replace(/[\u2018\u2019\u201A\u201B]/g, "'") // Smart single quotes -> straight
}

/**
 * Evaluate a formula against a row's values
 * Supports Excel-like formulas: IF, SUM, AVG, MAX, MIN, AND, OR
 * Column references use underscore instead of spaces: Gross_Score, Risk_Appetite
 */
export function evaluateFormula(
  formula: string,
  row: RCTRow,
  customColumns: CustomColumn[]
): { result: string | number | null; error: string | null } {
  const parser = new Parser()
  const normalizedFormula = normalizeQuotes(formula)

  // Map variable names to row values
  parser.on('callVariable', (name: string, done: (value: unknown) => void) => {
    // Built-in columns (snake_case)
    const builtInValues: Record<string, unknown> = {
      Gross_Probability: row.grossProbability,
      Gross_Impact: row.grossImpact,
      Gross_Score: row.grossScore,
      Risk_Appetite: row.riskAppetite,
      Within_Appetite: row.withinAppetite,
      Net_Score: row.netScore,
      Has_Controls: row.hasControls,
      Control_Count: row.controls.length,
    }

    if (name in builtInValues) {
      done(builtInValues[name] ?? 0)
      return
    }

    // Custom columns (normalize name to match)
    const normalizedName = name.replace(/_/g, ' ').toLowerCase()
    const customCol = customColumns.find(
      c => c.name.toLowerCase() === normalizedName ||
           c.name.replace(/\s/g, '_').toLowerCase() === name.toLowerCase()
    )

    if (customCol) {
      const value = row.customValues[customCol.id]
      done(value ?? (customCol.type === 'number' ? 0 : ''))
      return
    }

    // Unknown variable - return 0 to avoid errors
    done(0)
  })

  try {
    const parsed = parser.parse(normalizedFormula)

    if (parsed.error) {
      return { result: null, error: parsed.error }
    }

    return { result: parsed.result, error: null }
  } catch (err) {
    return { result: null, error: 'Invalid formula' }
  }
}

/**
 * Validate a formula without executing it
 * Optionally validates that referenced custom columns exist
 */
export function validateFormula(
  formula: string,
  customColumns?: CustomColumn[]
): { valid: boolean; error: string | null } {
  const parser = new Parser()
  const normalizedFormula = normalizeQuotes(formula)

  // Track unknown variables for better error reporting
  const unknownVariables: string[] = []

  // Built-in variable names (normalized lowercase for comparison)
  const builtInVars = new Set([
    'gross_probability',
    'gross_impact',
    'gross_score',
    'risk_appetite',
    'within_appetite',
    'net_score',
    'has_controls',
    'control_count',
  ])

  // Custom column names (normalized)
  const customVars = new Set(
    (customColumns || []).flatMap(c => [
      c.name.toLowerCase(),
      c.name.replace(/\s/g, '_').toLowerCase(),
    ])
  )

  // Detect unquoted string arguments in IF function (common mistake)
  const ifMatch = normalizedFormula.match(/IF\s*\([^,]+,\s*([A-Za-z_][A-Za-z0-9_]*)\s*(?:,|\))/i)
  if (ifMatch) {
    const potentialString = ifMatch[1]
    const normalizedPotential = potentialString.toLowerCase()
    const potentialWithSpaces = potentialString.replace(/_/g, ' ').toLowerCase()

    // Check if it's NOT a known variable (then it's likely unquoted text)
    if (!builtInVars.has(normalizedPotential) &&
        !customVars.has(normalizedPotential) &&
        !customVars.has(potentialWithSpaces)) {
      return {
        valid: false,
        error: `"${potentialString}" looks like text. Add quotes: "${potentialString}" or '${potentialString}'`
      }
    }
  }

  // Provide dummy values for all variables during validation
  parser.on('callVariable', (name: string, done: (value: unknown) => void) => {
    const normalizedName = name.toLowerCase()
    const nameWithSpaces = name.replace(/_/g, ' ').toLowerCase()

    if (builtInVars.has(normalizedName) || customVars.has(normalizedName) || customVars.has(nameWithSpaces)) {
      done(0)
    } else {
      unknownVariables.push(name)
      done(0)
    }
  })

  try {
    const parsed = parser.parse(normalizedFormula)

    if (parsed.error) {
      return { valid: false, error: parsed.error }
    }

    // Report unknown variables if custom columns validation is enabled
    if (customColumns && unknownVariables.length > 0) {
      return {
        valid: false,
        error: `Unknown variable(s): ${unknownVariables.join(', ')}`,
      }
    }

    return { valid: true, error: null }
  } catch {
    return { valid: false, error: 'Invalid formula syntax' }
  }
}
