/**
 * TestFrequency - How often a control should be tested
 */
export type TestFrequency = 'monthly' | 'quarterly' | 'annually' | 'as-needed'

/**
 * TestStepInputType - Input types for test step responses
 */
export type TestStepInputType = 'text' | 'binary' | 'multiple_choice' | 'number' | 'date'

/**
 * TestStep - Configuration for a single test procedure step
 */
export interface TestStep {
  id: string                          // UUID for stable identity
  label: string                       // Display text for the step
  inputType: TestStepInputType        // What kind of input to show
  options?: string[]                  // For multiple_choice: available options
  required: boolean                   // Must complete to proceed
  helpText?: string                   // Optional guidance for tester
  order: number                       // Display order (0-indexed)
}

/**
 * StepResponse - Tester's response to a single test step
 */
export interface StepResponse {
  stepId: string                      // References TestStep.id
  value: string | number | boolean | null  // The recorded response
  cannotRecord: boolean               // Tester couldn't complete step
  cannotRecordReason?: string         // Required if cannotRecord is true
  evidenceUrl?: string                // Optional per-step photo URL
  recordedAt: string                  // ISO timestamp
}

/**
 * TestResult - Outcome of a control test
 */
export type TestResult = 'pass' | 'fail' | 'partial' | 'not-tested'

/**
 * ControlType - Types of risk controls
 */
export type ControlType =
  | 'Preventative'
  | 'Detective'
  | 'Corrective'
  | 'Directive'
  | 'Deterrent'
  | 'Compensating'
  | 'Acceptance'
  | 'Tolerance'
  | 'Manual'
  | 'Automated'

/**
 * Control - Mitigation control for a risk-process combination
 */
export interface Control {
  id: string
  name: string                     // Short name/title for the control
  description?: string             // Detailed description of the control
  controlType: ControlType | null  // Type of control
  netProbability: number | null    // 1-5
  netImpact: number | null         // 1-5
  netScore: number | null          // Calculated: probability * impact
  comment?: string                 // Optional notes about this control
  // Testing schedule
  testFrequency: TestFrequency | null
  nextTestDate: string | null      // ISO date string (yyyy-MM-dd)
  lastTestDate: string | null      // ISO date string (yyyy-MM-dd)
  testProcedure?: string           // How to test this control (legacy free-text)
  testSteps?: TestStep[]           // Structured test steps (optional, takes precedence over testProcedure)
  // Tester assignment
  assignedTesterId: string | null  // null = unassigned, matches currentTesterId in uiStore
}

/**
 * ControlLink - Links a control to an RCT row (many-to-many junction)
 * Allows one control to cover multiple risk-process combinations
 */
export interface ControlLink {
  id: string
  controlId: string           // Reference to Control
  rowId: string               // Reference to RCTRow
  // Per-link score overrides (row-specific effectiveness)
  netProbability?: number | null
  netImpact?: number | null
  netScore?: number | null    // Computed from above if present
  createdAt: string           // ISO date string
}

/**
 * ControlTest - Record of a single test execution
 */
export interface ControlTest {
  id: string
  controlId: string
  rowId: string                    // Link to RCT row for context
  testDate: string                 // ISO date string
  result: TestResult
  effectiveness: number | null     // 1-5 scale (optional)
  testerName?: string              // Who performed the test
  evidence?: string                // Text description, URLs, notes
  findings?: string                // Observations, issues found
  recommendations?: string         // Follow-up actions needed
  stepResponses?: StepResponse[]   // Per-step responses (if control has testSteps)
}

/**
 * ChangeRequest - Request for changes to risk/control definitions
 * Used by Control Owners to request changes from Risk Managers
 */
export interface ChangeRequest {
  id: string
  rowId: string
  controlId?: string  // If requesting change to specific control
  message: string
  timestamp: Date
  status: 'pending' | 'resolved'
}

/**
 * CustomColumn - User-defined column configuration
 */
export interface CustomColumn {
  id: string
  name: string
  type: 'text' | 'number' | 'dropdown' | 'date' | 'formula'
  options?: string[]    // For dropdown type
  formula?: string      // For formula type
  width?: number
}

/**
 * RCTRow - A single row in the Risk Control Table
 * Represents one lowest-level risk x lowest-level process combination
 */
export interface RCTRow {
  id: string
  // Risk hierarchy (from taxonomy)
  riskId: string
  riskL1Id: string
  riskL1Name: string
  riskL2Id: string
  riskL2Name: string
  riskL3Id: string
  riskL3Name: string
  riskL4Id: string
  riskL4Name: string
  riskL5Id: string
  riskL5Name: string
  riskName: string              // Lowest level name
  riskDescription: string
  // Process hierarchy (from taxonomy)
  processId: string
  processL1Id: string
  processL1Name: string
  processL2Id: string
  processL2Name: string
  processL3Id: string
  processL3Name: string
  processL4Id: string
  processL4Name: string
  processL5Id: string
  processL5Name: string
  processName: string           // Lowest level name
  processDescription: string
  // Scoring
  grossProbability: number | null  // 1-5
  grossImpact: number | null       // 1-5
  grossScore: number | null        // Calculated: probability * impact
  grossProbabilityComment?: string // Optional comment for probability
  grossImpactComment?: string      // Optional comment for impact
  riskAppetite: number             // Default: 9
  withinAppetite: number | null    // Calculated: appetite - grossScore
  // Controls
  controls: Control[]
  hasControls: boolean             // Derived: controls.length > 0
  netProbability: number | null    // Min probability from all controls (or gross if no controls)
  netImpact: number | null         // Min impact from all controls (or gross if no controls)
  netScore: number | null          // Calculated: netProbability * netImpact
  netWithinAppetite: number | null // Calculated: riskAppetite - netScore
  // Custom columns
  customValues: Record<string, string | number | Date | null>
}

/**
 * RemediationStatus - Status of a remediation plan
 */
export type RemediationStatus = 'open' | 'in-progress' | 'resolved' | 'closed'

/**
 * ActionItem - Individual action within a remediation plan
 */
export interface ActionItem {
  id: string
  description: string
  completed: boolean
  completedDate?: string  // ISO date when marked complete
}

/**
 * RemediationPlan - Plan to address control deficiencies found during testing
 */
export interface RemediationPlan {
  id: string
  controlTestId: string            // Link to triggering test finding
  controlId: string                // Link to control (for context)
  rowId: string                    // Link to RCT row (for risk context)
  title: string                    // Short description of issue
  description?: string             // Detailed description
  owner: string                    // Person responsible
  deadline: string                 // ISO date string (yyyy-MM-dd)
  status: RemediationStatus
  priority: 'critical' | 'high' | 'medium' | 'low'
  actionItems: ActionItem[]
  createdDate: string              // When remediation was created
  resolvedDate?: string            // When status changed to resolved
  closedDate?: string              // When status changed to closed
  notes?: string                   // Additional notes/updates
}
