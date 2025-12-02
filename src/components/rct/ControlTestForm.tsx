import { useState } from 'react'
import { format } from 'date-fns'
import { useRCTStore } from '@/stores/rctStore'
import { useIsDemoMode } from '@/hooks/useTenantData'
import { useRecordTest } from '@/hooks/useControlTests'
import type { TestResult } from '@/types/rct'

const RESULT_OPTIONS: { value: TestResult; label: string; color: string }[] = [
  { value: 'pass', label: 'Pass', color: 'text-green-400' },
  { value: 'fail', label: 'Fail', color: 'text-red-400' },
  { value: 'partial', label: 'Partially Effective', color: 'text-amber-400' },
  { value: 'not-tested', label: 'Not Tested', color: 'text-text-muted' },
]

const EFFECTIVENESS_OPTIONS = [
  { value: 1, label: '1 - Ineffective' },
  { value: 2, label: '2 - Needs Improvement' },
  { value: 3, label: '3 - Adequate' },
  { value: 4, label: '4 - Good' },
  { value: 5, label: '5 - Excellent' },
]

interface ControlTestFormProps {
  rowId: string
  controlId: string
  onComplete: () => void
}

export function ControlTestForm({ rowId, controlId, onComplete }: ControlTestFormProps) {
  const isDemoMode = useIsDemoMode()

  // Store mutation (demo mode)
  const storeRecordTest = useRCTStore((state) => state.recordControlTest)

  // Database mutation (auth mode)
  const recordTestMutation = useRecordTest()

  const [testDate, setTestDate] = useState(format(new Date(), 'yyyy-MM-dd'))
  const [result, setResult] = useState<TestResult>('pass')
  const [effectiveness, setEffectiveness] = useState<number | ''>('')
  const [testerName, setTesterName] = useState('')
  const [evidence, setEvidence] = useState('')
  const [findings, setFindings] = useState('')
  const [recommendations, setRecommendations] = useState('')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    const testData = {
      controlId,
      rowId,
      testDate,
      result,
      effectiveness: effectiveness === '' ? null : effectiveness,
      testerName: testerName.trim() || undefined,
      evidence: evidence.trim() || undefined,
      findings: findings.trim() || undefined,
      recommendations: recommendations.trim() || undefined,
    }

    if (isDemoMode) {
      storeRecordTest(testData)
    } else {
      recordTestMutation.mutate(testData)
    }

    onComplete()
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      {/* Test Date */}
      <div>
        <label className="text-xs text-text-muted block mb-1">Test Date</label>
        <input
          type="date"
          value={testDate}
          onChange={(e) => setTestDate(e.target.value)}
          required
          className="w-full px-2 py-1.5 bg-surface-elevated border border-surface-border rounded text-sm text-text-primary focus:outline-none focus:ring-1 focus:ring-accent-500"
        />
      </div>

      {/* Result */}
      <div>
        <label className="text-xs text-text-muted block mb-1">Result</label>
        <select
          value={result}
          onChange={(e) => setResult(e.target.value as TestResult)}
          required
          className="w-full px-2 py-1.5 bg-surface-elevated border border-surface-border rounded text-sm text-text-primary focus:outline-none focus:ring-1 focus:ring-accent-500"
        >
          {RESULT_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>

      {/* Effectiveness (optional) */}
      <div>
        <label className="text-xs text-text-muted block mb-1">Effectiveness (optional)</label>
        <select
          value={effectiveness}
          onChange={(e) => setEffectiveness(e.target.value === '' ? '' : Number(e.target.value))}
          className="w-full px-2 py-1.5 bg-surface-elevated border border-surface-border rounded text-sm text-text-primary focus:outline-none focus:ring-1 focus:ring-accent-500"
        >
          <option value="">Not rated</option>
          {EFFECTIVENESS_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>

      {/* Tester Name (optional) */}
      <div>
        <label className="text-xs text-text-muted block mb-1">Tester Name (optional)</label>
        <input
          type="text"
          value={testerName}
          onChange={(e) => setTesterName(e.target.value)}
          placeholder="Who performed the test"
          className="w-full px-2 py-1.5 bg-surface-elevated border border-surface-border rounded text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-1 focus:ring-accent-500"
        />
      </div>

      {/* Evidence */}
      <div>
        <label className="text-xs text-text-muted block mb-1">Evidence (optional)</label>
        <textarea
          value={evidence}
          onChange={(e) => setEvidence(e.target.value)}
          placeholder="Describe evidence or paste links..."
          rows={2}
          className="w-full px-2 py-1.5 bg-surface-elevated border border-surface-border rounded text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-1 focus:ring-accent-500 resize-y min-h-[48px]"
        />
      </div>

      {/* Findings */}
      <div>
        <label className="text-xs text-text-muted block mb-1">Findings (optional)</label>
        <textarea
          value={findings}
          onChange={(e) => setFindings(e.target.value)}
          placeholder="Observations, issues found..."
          rows={2}
          className="w-full px-2 py-1.5 bg-surface-elevated border border-surface-border rounded text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-1 focus:ring-accent-500 resize-y min-h-[48px]"
        />
      </div>

      {/* Recommendations */}
      <div>
        <label className="text-xs text-text-muted block mb-1">Recommendations (optional)</label>
        <textarea
          value={recommendations}
          onChange={(e) => setRecommendations(e.target.value)}
          placeholder="Follow-up actions needed..."
          rows={2}
          className="w-full px-2 py-1.5 bg-surface-elevated border border-surface-border rounded text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-1 focus:ring-accent-500 resize-y min-h-[48px]"
        />
      </div>

      {/* Actions */}
      <div className="flex justify-end gap-2 pt-2">
        <button
          type="button"
          onClick={onComplete}
          className="px-3 py-1.5 text-sm text-text-secondary hover:text-text-primary transition-colors"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={recordTestMutation.isPending}
          className="px-3 py-1.5 text-sm bg-accent-500 text-white rounded hover:bg-accent-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {recordTestMutation.isPending ? 'Recording...' : 'Record Test'}
        </button>
      </div>
    </form>
  )
}
