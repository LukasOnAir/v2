/**
 * TaxonomyItem - Core type for hierarchical taxonomy structures
 * Used by both Risk and Process taxonomies
 */
export interface TaxonomyItem {
  /** UUID for internal reference and react-arborist identity */
  id: string
  /** Display ID in hierarchical format (e.g., "1", "1.1", "1.2.3") */
  hierarchicalId: string
  /** User-defined name for the taxonomy item */
  name: string
  /** Optional description providing additional context */
  description: string
  /** Child items in the hierarchy */
  children?: TaxonomyItem[]
}

/**
 * TaxonomyWeights - Weight configuration for aggregation calculations
 * Used by Matrix and Sunburst for weighted rollup of scores
 */
export interface TaxonomyWeights {
  /** Per-level default weights (L1-L5) */
  levelDefaults: {
    l1: number
    l2: number
    l3: number
    l4: number
    l5: number
  }
  /** Per-node weight overrides (nodeId -> weight) */
  nodeOverrides: Record<string, number>
}
