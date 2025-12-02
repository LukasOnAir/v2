/**
 * Shared type definitions for preset modules
 *
 * These types are copied from the frontend types to avoid
 * cross-module imports between Deno and Node environments.
 */

/**
 * TestFrequency - How often a control should be tested
 */
export type TestFrequency = 'monthly' | 'quarterly' | 'annually' | 'as-needed'

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
