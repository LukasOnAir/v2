import { useState, useMemo } from 'react'
import { calculateSampleSize, type SamplingInput, type SamplingResult } from '@/utils/samplingCalculator'
import { SamplingResults } from './SamplingResults'

/**
 * Sampling calculator UI component
 * Allows users to input population parameters and get recommended sample sizes
 * based on AICPA attribute sampling methodology
 */
export function SamplingCalculator() {
  // Input state
  const [populationSize, setPopulationSize] = useState<number>(100)
  const [confidenceLevel, setConfidenceLevel] = useState<90 | 95>(95)
  const [tolerableDeviationRate, setTolerableDeviationRate] = useState<5 | 10>(5)
  const [expectedDeviationRate, setExpectedDeviationRate] = useState<0 | 1 | 2>(0)

  // Calculate result reactively
  const result = useMemo<SamplingResult>(() => {
    const input: SamplingInput = {
      populationSize,
      confidenceLevel,
      tolerableDeviationRate,
      expectedDeviationRate,
    }
    return calculateSampleSize(input)
  }, [populationSize, confidenceLevel, tolerableDeviationRate, expectedDeviationRate])

  return (
    <div className="space-y-6">
      {/* Main grid: inputs on left, results on right */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Input form */}
        <div className="space-y-4">
          {/* Population size */}
          <div>
            <label
              htmlFor="population-size"
              className="block text-sm font-medium text-text-primary mb-1"
            >
              Control Population Size
            </label>
            <input
              id="population-size"
              type="number"
              min={1}
              value={populationSize}
              onChange={(e) => setPopulationSize(Math.max(1, parseInt(e.target.value) || 1))}
              className="w-full bg-surface border border-surface-border rounded px-3 py-2 text-text-primary focus:ring-2 focus:ring-accent focus:outline-none"
            />
          </div>

          {/* Confidence level */}
          <fieldset>
            <legend className="block text-sm font-medium text-text-primary mb-2">
              Confidence Level
            </legend>
            <div className="flex gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="confidence-level"
                  value={90}
                  checked={confidenceLevel === 90}
                  onChange={() => setConfidenceLevel(90)}
                  className="text-accent focus:ring-accent"
                />
                <span className="text-text-primary">90%</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="confidence-level"
                  value={95}
                  checked={confidenceLevel === 95}
                  onChange={() => setConfidenceLevel(95)}
                  className="text-accent focus:ring-accent"
                />
                <span className="text-text-primary">95%</span>
              </label>
            </div>
          </fieldset>

          {/* Tolerable deviation rate */}
          <fieldset>
            <legend className="block text-sm font-medium text-text-primary mb-2">
              Tolerable Deviation Rate
            </legend>
            <div className="flex gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="tolerable-deviation"
                  value={5}
                  checked={tolerableDeviationRate === 5}
                  onChange={() => setTolerableDeviationRate(5)}
                  className="text-accent focus:ring-accent"
                />
                <span className="text-text-primary">5%</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="tolerable-deviation"
                  value={10}
                  checked={tolerableDeviationRate === 10}
                  onChange={() => setTolerableDeviationRate(10)}
                  className="text-accent focus:ring-accent"
                />
                <span className="text-text-primary">10%</span>
              </label>
            </div>
          </fieldset>

          {/* Expected deviation rate */}
          <div>
            <label
              htmlFor="expected-deviation"
              className="block text-sm font-medium text-text-primary mb-1"
            >
              Expected Deviation Rate
            </label>
            <select
              id="expected-deviation"
              value={expectedDeviationRate}
              onChange={(e) => setExpectedDeviationRate(parseInt(e.target.value) as 0 | 1 | 2)}
              className="w-full bg-surface border border-surface-border rounded px-3 py-2 text-text-primary focus:ring-2 focus:ring-accent focus:outline-none"
            >
              <option value={0} className="bg-surface-elevated text-text-primary">0%</option>
              <option value={1} className="bg-surface-elevated text-text-primary">1%</option>
              <option value={2} className="bg-surface-elevated text-text-primary">2%</option>
            </select>
          </div>
        </div>

        {/* Results */}
        <SamplingResults result={result} />
      </div>

      {/* Methodology section */}
      <details className="bg-surface rounded-lg border border-surface-border">
        <summary className="px-4 py-3 cursor-pointer text-text-primary font-medium hover:bg-surface-elevated transition-colors">
          Sampling Methodology
        </summary>
        <div className="px-4 pb-4 text-text-muted text-sm space-y-2">
          <p>
            Sample sizes are based on the <strong className="text-text-secondary">AICPA Audit Sampling Guide</strong> for
            attribute sampling (tests of controls).
          </p>
          <ul className="list-disc list-inside space-y-1 ml-2">
            <li>
              <strong className="text-text-secondary">Confidence level</strong> - The probability that the sample
              accurately represents the population (90% or 95%)
            </li>
            <li>
              <strong className="text-text-secondary">Tolerable deviation rate</strong> - The maximum rate of
              deviations from prescribed controls that the auditor is willing to accept (5% or 10%)
            </li>
            <li>
              <strong className="text-text-secondary">Expected deviation rate</strong> - The anticipated rate of
              deviations based on prior experience or pilot testing (0%, 1%, or 2%)
            </li>
            <li>
              <strong className="text-text-secondary">Finite population correction</strong> - Applied when
              population size is less than 250 items, reducing required sample size
            </li>
          </ul>
          <p className="mt-3">
            For populations under 250, a mathematical correction factor is applied:
            <code className="bg-surface-elevated px-1 rounded">n&apos; = (n * N) / (n + N - 1)</code> where
            n is the table sample size and N is the population size.
          </p>
        </div>
      </details>
    </div>
  )
}
