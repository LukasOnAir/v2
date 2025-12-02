/**
 * Empty Preset - No demo data
 *
 * Use this preset when the tenant wants to start from scratch
 * without any pre-populated data.
 */

import type { PresetData } from './types.ts'

export const emptyPreset: PresetData = {
  risks: [],
  processes: [],
  controls: [],
  rctPairings: [],
}
