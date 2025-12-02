import {
  TrendChartSection,
  ControlTestTrendChart,
  RiskScoreTrendChart,
  SamplingCalculator,
  AggregationReport,
} from '@/components/analytics'

/**
 * Main analytics dashboard layout
 * Assembles all analytics components into a cohesive page:
 * - Trend charts (control test effectiveness + risk score history)
 * - Sampling calculator with AICPA methodology
 * - Risk aggregation report by L1 category
 */
export function AnalyticsDashboard() {
  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      {/* Page header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-text-primary">
            Analytics & Reporting
          </h1>
          <p className="text-text-secondary">
            Trend analysis, sampling guidance, and risk aggregation
          </p>
        </div>
      </div>

      {/* Row 1: Trend Charts (2 columns on lg) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <TrendChartSection title="Control Test Trends">
          {(dateRange) => <ControlTestTrendChart dateRange={dateRange} />}
        </TrendChartSection>

        <TrendChartSection title="Risk Score History">
          {(dateRange) => <RiskScoreTrendChart dateRange={dateRange} />}
        </TrendChartSection>
      </div>

      {/* Row 2: Sampling Calculator (full width) */}
      <div className="mb-6">
        <div className="bg-surface rounded-lg p-6">
          <h2 className="text-lg font-medium text-text-primary mb-4">
            Sampling Calculator
          </h2>
          <SamplingCalculator />
        </div>
      </div>

      {/* Row 3: Aggregation Report (full width) */}
      <div className="bg-surface rounded-lg p-6">
        <AggregationReport />
      </div>
    </div>
  )
}
