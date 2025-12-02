/**
 * Preset Data Types for Demo Seeders
 *
 * These types define the structure of demo data that can be seeded
 * into a tenant's database during onboarding. IDs and hierarchicalIds
 * are NOT included - they are generated at insert time.
 */

import type { ControlType, TestFrequency } from './deps.ts'

/**
 * SeedTaxonomyItem - Simplified taxonomy item for seeding
 * Does NOT include id or hierarchicalId - those are generated at insert time
 */
export interface SeedTaxonomyItem {
  /** User-defined name for the taxonomy item */
  name: string
  /** Description providing additional context */
  description: string
  /** Child items in the hierarchy (recursive) */
  children?: SeedTaxonomyItem[]
}

/**
 * SeedControl - Control template for seeding
 * Does NOT include ids, dates, or scores - those are set at insert time
 */
export interface SeedControl {
  /** Short name/title for the control */
  name: string
  /** Detailed description of the control */
  description: string
  /** Type of control (Preventative, Detective, Corrective, etc.) */
  controlType: ControlType
  /** How often this control should be tested */
  testFrequency: TestFrequency
  /** Procedure for testing this control */
  testProcedure: string
}

/**
 * RCTPairing - Links a risk path to a process path
 * Uses taxonomy names as path segments for matching during seeding
 */
export interface RCTPairing {
  /** Path from risk taxonomy root to leaf (using names) */
  riskPath: string[]
  /** Path from process taxonomy root to leaf (using names) */
  processPath: string[]
}

/**
 * PresetData - Container for all demo data in a preset
 */
export interface PresetData {
  /** Risk taxonomy tree */
  risks: SeedTaxonomyItem[]
  /** Process taxonomy tree */
  processes: SeedTaxonomyItem[]
  /** Sample controls */
  controls: SeedControl[]
  /** Curated risk-process pairings for RCT generation */
  rctPairings: RCTPairing[]
}
