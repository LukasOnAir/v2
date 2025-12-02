import { useNavigate, createSearchParams } from 'react-router'
import type { RCTRow } from '@/types/rct'
import { useRCTStore } from '@/stores/rctStore'
import { usePermissions } from '@/hooks/usePermissions'
import { ScoreDropdown } from '@/components/rct/ScoreDropdown'
import { HeatmapCell } from '@/components/rct/HeatmapCell'

interface MatrixExpandedViewProps {
  riskId: string
  processId: string
  rows: RCTRow[]
  onClose: () => void
}

export function MatrixExpandedView({
  riskId,
  processId,
  rows,
  onClose,
}: MatrixExpandedViewProps) {
  const navigate = useNavigate()
  const { updateRow } = useRCTStore()
  const { canEditGrossScores } = usePermissions()

  const handleJumpToRCT = () => {
    // Navigate to RCT with filters applied
    const params = createSearchParams({
      riskFilter: riskId,
      processFilter: processId,
    })
    navigate(`/rct?${params.toString()}`)
    onClose()
  }

  const handleProbabilityChange = (rowId: string, value: number) => {
    updateRow(rowId, { grossProbability: value })
  }

  const handleImpactChange = (rowId: string, value: number) => {
    updateRow(rowId, { grossImpact: value })
  }

  return (
    <div className="p-4 bg-surface-elevated border border-surface-border rounded-lg shadow-lg min-w-[500px] max-w-[700px] max-h-[400px] overflow-auto">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-medium text-text-primary">
          Related RCT Rows ({rows.length})
        </h3>
        <button
          onClick={onClose}
          className="p-1 text-text-muted hover:text-text-primary transition-colors"
          aria-label="Close"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {rows.length === 0 ? (
        <p className="text-sm text-text-secondary py-4 text-center">
          No matching RCT rows found for this cell.
        </p>
      ) : (
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-surface-border">
              <th className="text-left py-2 px-2 font-medium text-text-secondary">Risk</th>
              <th className="text-left py-2 px-2 font-medium text-text-secondary">Process</th>
              <th className="text-center py-2 px-2 font-medium text-text-secondary">Prob.</th>
              <th className="text-center py-2 px-2 font-medium text-text-secondary">Impact</th>
              <th className="text-center py-2 px-2 font-medium text-text-secondary">Gross</th>
              <th className="text-center py-2 px-2 font-medium text-text-secondary">Net</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id} className="border-b border-surface-border hover:bg-surface-overlay/50">
                <td className="py-2 px-2 text-text-primary truncate max-w-[120px]" title={row.riskName}>
                  {row.riskName}
                </td>
                <td className="py-2 px-2 text-text-primary truncate max-w-[120px]" title={row.processName}>
                  {row.processName}
                </td>
                <td className="py-2 px-2">
                  <ScoreDropdown
                    value={row.grossProbability}
                    onChange={(v) => handleProbabilityChange(row.id, v)}
                    type="probability"
                    disabled={!canEditGrossScores}
                  />
                </td>
                <td className="py-2 px-2">
                  <ScoreDropdown
                    value={row.grossImpact}
                    onChange={(v) => handleImpactChange(row.id, v)}
                    type="impact"
                    disabled={!canEditGrossScores}
                  />
                </td>
                <td className="py-2 px-2 w-16">
                  <HeatmapCell score={row.grossScore} />
                </td>
                <td className="py-2 px-2 w-16">
                  <HeatmapCell score={row.netScore} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <div className="mt-4 pt-4 border-t border-surface-border">
        <button
          onClick={handleJumpToRCT}
          className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-accent-400 hover:text-accent-300 bg-surface-overlay hover:bg-surface-overlay/80 border border-surface-border rounded-lg transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
          </svg>
          Jump to RCT
        </button>
      </div>
    </div>
  )
}
