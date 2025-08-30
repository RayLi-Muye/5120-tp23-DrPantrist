// Date Helper Utilities
// Use-It-Up PWA Frontend

import { addDays, differenceInDays, format, isValid, parseISO } from 'date-fns'

/**
 * Calculate days until expiry from a given date
 */
export function calculateDaysUntilExpiry(expiryDate: string | Date): number {
  const expiry = typeof expiryDate === 'string' ? parseISO(expiryDate) : expiryDate
  const today = new Date()

  if (!isValid(expiry)) {
    throw new Error('Invalid expiry date')
  }

  return differenceInDays(expiry, today)
}

/**
 * Get default expiry date by adding shelf life days to current date
 */
export function getDefaultExpiryDate(shelfLifeDays: number): Date {
  const today = new Date()
  return addDays(today, shelfLifeDays)
}

/**
 * Format expiry date for display
 */
export function formatExpiryDate(expiryDate: string | Date, formatString: string = 'MMM dd, yyyy'): string {
  const date = typeof expiryDate === 'string' ? parseISO(expiryDate) : expiryDate

  if (!isValid(date)) {
    return 'Invalid date'
  }

  return format(date, formatString)
}

/**
 * Format date for API (ISO string)
 */
export function formatDateForAPI(date: Date): string {
  return date.toISOString()
}

/**
 * Validate if a date string is valid
 */
export function isValidDate(dateString: string): boolean {
  const date = parseISO(dateString)
  return isValid(date)
}

/**
 * Get relative time description (e.g., "expires in 3 days", "expired 2 days ago")
 */
export function getRelativeExpiryText(expiryDate: string | Date): string {
  const daysUntilExpiry = calculateDaysUntilExpiry(expiryDate)

  if (daysUntilExpiry < 0) {
    const daysExpired = Math.abs(daysUntilExpiry)
    return daysExpired === 1 ? 'expired 1 day ago' : `expired ${daysExpired} days ago`
  } else if (daysUntilExpiry === 0) {
    return 'expires today'
  } else if (daysUntilExpiry === 1) {
    return 'expires tomorrow'
  } else {
    return `expires in ${daysUntilExpiry} days`
  }
}
