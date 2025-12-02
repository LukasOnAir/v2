import { RemediationSummary } from './RemediationSummary'
import { OverdueWidget } from './OverdueWidget'
import { UpcomingWidget } from './UpcomingWidget'
import { RemediationTable } from './RemediationTable'

/**
 * Main remediation dashboard layout
 * Displays summary stats, overdue/upcoming widgets, and full remediation table
 */
export function RemediationDashboard() {
  return (
    <div className="space-y-6">
      {/* Page header */}
      <h1 className="text-2xl font-semibold text-text-primary">
        Remediation Dashboard
      </h1>

      {/* Summary statistics */}
      <section>
        <RemediationSummary />
      </section>

      {/* Overdue and Upcoming widgets - 2 column grid */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <OverdueWidget />
        <UpcomingWidget />
      </section>

      {/* Full table */}
      <section>
        <h2 className="text-lg font-medium text-text-primary mb-3">
          All Remediation Plans
        </h2>
        <div className="bg-surface-elevated rounded-lg border border-surface-border">
          <RemediationTable />
        </div>
      </section>
    </div>
  )
}
