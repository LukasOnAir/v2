import { nanoid } from 'nanoid'
import type { Control, ControlLink, RCTRow } from '@/types/rct'
import { useControlsStore } from '@/stores/controlsStore'
import { useRCTStore } from '@/stores/rctStore'

/**
 * Extracts controls from embedded row.controls arrays into separate arrays.
 * Preserves existing control IDs to maintain test history references.
 */
export function migrateEmbeddedControls(
  rows: RCTRow[]
): { controls: Control[]; links: ControlLink[] } {
  const controls: Control[] = []
  const links: ControlLink[] = []
  const seenControlIds = new Set<string>()

  for (const row of rows) {
    for (const embeddedControl of row.controls) {
      // If control ID not seen, add to controls array
      // (handles case where same control might be duplicated - preserve first)
      if (!seenControlIds.has(embeddedControl.id)) {
        controls.push({ ...embeddedControl })
        seenControlIds.add(embeddedControl.id)
      }

      // Create link for this row-control relationship
      links.push({
        id: nanoid(),
        controlId: embeddedControl.id,
        rowId: row.id,
        // Preserve row-specific scores in the link (not typical but safe)
        netProbability: embeddedControl.netProbability,
        netImpact: embeddedControl.netImpact,
        netScore: embeddedControl.netScore,
        createdAt: new Date().toISOString(),
      })
    }
  }

  return { controls, links }
}

/**
 * Run migration if not already done.
 * Checks migrationVersion in controlsStore.
 * Safe to call multiple times - only runs once.
 */
export function runMigrationIfNeeded(): void {
  const controlsState = useControlsStore.getState()
  const rctState = useRCTStore.getState()

  // Already migrated
  if (controlsState.migrationVersion >= 1) {
    return
  }

  // No rows to migrate
  if (rctState.rows.length === 0) {
    // Still mark as migrated so we don't check again
    controlsState.setMigrationVersion(1)
    return
  }

  // Check if any rows have embedded controls
  const hasEmbeddedControls = rctState.rows.some(r => r.controls.length > 0)
  if (!hasEmbeddedControls) {
    controlsState.setMigrationVersion(1)
    return
  }

  // Run migration
  const { controls, links } = migrateEmbeddedControls(rctState.rows)

  // Import to controlsStore
  controlsState.importControls(controls, links)

  // Mark migration complete
  controlsState.setMigrationVersion(1)

  console.log(`[Controls Migration] Migrated ${controls.length} controls with ${links.length} links`)
}
