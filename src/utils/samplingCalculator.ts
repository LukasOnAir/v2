/**
 * AICPA-aligned sample size calculator for attribute sampling
 * Used to determine testing sample sizes based on risk and population parameters
 */

/**
 * Input parameters for sample size calculation
 */
export interface SamplingInput {
  /** Total number of items in the population */
  populationSize: number
  /** Confidence level (90% or 95%) */
  confidenceLevel: 90 | 95
  /** Maximum acceptable deviation rate (5% or 10%) */
  tolerableDeviationRate: 5 | 10
  /** Expected rate of deviation in population (0%, 1%, or 2%) */
  expectedDeviationRate: 0 | 1 | 2
}

/**
 * Result of sample size calculation
 */
export interface SamplingResult {
  /** Recommended number of items to sample */
  recommendedSampleSize: number
  /** Description of sampling methodology used */
  methodology: string
  /** Additional notes about the calculation */
  notes: string[]
}

/**
 * AICPA attribute sampling table values
 * Key format: '{confidenceLevel}-{tolerableDeviationRate}-{expectedDeviationRate}'
 */
const SAMPLE_SIZE_TABLE: Record<string, number> = {
  // 90% confidence
  '90-10-0': 23,
  '90-5-0': 46,
  // 95% confidence
  '95-10-0': 29,
  '95-5-0': 59,
  '95-10-1': 46,
  '95-5-1': 93,
  '95-10-2': 77,
  '95-5-2': 124,
}

/**
 * Calculate recommended sample size based on AICPA attribute sampling methodology
 *
 * @param input - Sampling parameters
 * @returns Calculation result with recommended sample size and notes
 */
export function calculateSampleSize(input: SamplingInput): SamplingResult {
  const { populationSize, confidenceLevel, tolerableDeviationRate, expectedDeviationRate } = input
  const notes: string[] = []

  // Build lookup key
  const key = `${confidenceLevel}-${tolerableDeviationRate}-${expectedDeviationRate}`

  // Get base size from table (default to 25 if key not found)
  const baseSize = SAMPLE_SIZE_TABLE[key] ?? 25
  if (!SAMPLE_SIZE_TABLE[key]) {
    notes.push('Using default sample size (parameters not in standard table)')
  }

  let methodology: string
  let recommendedSampleSize: number

  // Apply finite population correction for small populations (< 250)
  if (populationSize < 250) {
    // Formula: n' = (n * N) / (n + N - 1)
    // Where n = base sample size, N = population size
    const adjustedSize = Math.ceil((baseSize * populationSize) / (baseSize + populationSize - 1))
    // Return max of adjusted size or minimum of (population size, 2)
    recommendedSampleSize = Math.max(adjustedSize, Math.min(populationSize, 2))
    methodology = 'AICPA attribute sampling table with finite population correction'
    notes.push(`Finite population correction applied (population < 250)`)
    notes.push(`Base sample size before adjustment: ${baseSize}`)
  } else {
    recommendedSampleSize = baseSize
    methodology = 'AICPA attribute sampling table'
  }

  notes.push(`Confidence level: ${confidenceLevel}%`)
  notes.push(`Tolerable deviation rate: ${tolerableDeviationRate}%`)
  notes.push(`Expected deviation rate: ${expectedDeviationRate}%`)

  return {
    recommendedSampleSize,
    methodology,
    notes,
  }
}
