import { memo, useMemo } from 'react'
import * as Popover from '@radix-ui/react-popover'
import { getHeatmapColor, getContrastingText } from '@/utils/heatmapColors'
import { useMatrixStore } from '@/stores/matrixStore'
import { useRCTStore } from '@/stores/rctStore'
import { getMatchingRows } from '@/utils/aggregation'
import { MatrixExpandedView } from './MatrixExpandedView'

interface MatrixCellProps {
  riskId: string
  processId: string
  score: number | null
}

export const MatrixCell = memo(function MatrixCell({
  riskId,
  processId,
  score,
}: MatrixCellProps) {
  const { showNumbers, expandedCell, setExpandedCell } = useMatrixStore()
  const { rows } = useRCTStore()

  const bgColor = getHeatmapColor(score)
  const textColor = getContrastingText(bgColor)

  const isExpanded = expandedCell?.riskId === riskId && expandedCell?.processId === processId

  // Get matching rows for this cell
  const matchingRows = useMemo(
    () => getMatchingRows(rows, riskId, processId),
    [rows, riskId, processId]
  )

  const handleOpenChange = (open: boolean) => {
    if (open) {
      setExpandedCell({ riskId, processId })
    } else {
      setExpandedCell(null)
    }
  }

  const handleClose = () => {
    setExpandedCell(null)
  }

  return (
    <Popover.Root open={isExpanded} onOpenChange={handleOpenChange}>
      <Popover.Trigger asChild>
        <div
          className={`flex items-center justify-center font-medium text-xs cursor-pointer transition-all duration-150 hover:ring-2 hover:ring-accent-500 hover:z-10 w-full h-full ${
            isExpanded ? 'ring-2 ring-accent-500 z-10' : ''
          }`}
          style={{
            backgroundColor: bgColor,
            color: textColor,
          }}
          role="button"
          tabIndex={0}
          aria-label={`Risk-Process cell: score ${score ?? 'N/A'}. ${matchingRows.length} related rows.`}
        >
          {showNumbers && score !== null && score}
          {score === null && '-'}
        </div>
      </Popover.Trigger>

      <Popover.Portal>
        <Popover.Content
          className="z-50"
          side="right"
          sideOffset={8}
          align="start"
          avoidCollisions
          collisionPadding={16}
        >
          <MatrixExpandedView
            riskId={riskId}
            processId={processId}
            rows={matchingRows}
            onClose={handleClose}
          />
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  )
})
