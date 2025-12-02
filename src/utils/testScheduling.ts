import { addMonths, addYears, format, parseISO, startOfDay, isBefore, isValid, differenceInDays } from 'date-fns'
import type { TestFrequency } from '@/types/rct'

/**
 * Calculate the next test date based on the last test date and frequency
 */
export function calculateNextTestDate(
  lastTestDate: string,
  frequency: TestFrequency
): string {
  const date = parseISO(lastTestDate)

  switch (frequency) {
    case 'monthly':
      return format(addMonths(date, 1), 'yyyy-MM-dd')
    case 'quarterly':
      return format(addMonths(date, 3), 'yyyy-MM-dd')
    case 'annually':
      return format(addYears(date, 1), 'yyyy-MM-dd')
    case 'as-needed':
      return '' // No automatic scheduling
  }
}

/**
 * Check if a control test is overdue
 */
export function isTestOverdue(nextTestDate: string | null): boolean {
  if (!nextTestDate) return false
  const testDate = startOfDay(parseISO(nextTestDate))
  const today = startOfDay(new Date())
  return isBefore(testDate, today)
}

/**
 * Format a date string for display
 */
export function formatTestDate(dateString: string | null): string {
  if (!dateString) return 'Not scheduled'
  return format(parseISO(dateString), 'MMM d, yyyy')
}

/**
 * Get days until next test is due (negative = overdue)
 */
export function getDaysUntilDue(nextTestDate: string | null): number | null {
  if (!nextTestDate) return null
  const next = parseISO(nextTestDate)
  if (!isValid(next)) return null
  const today = startOfDay(new Date())
  return differenceInDays(next, today)
}
