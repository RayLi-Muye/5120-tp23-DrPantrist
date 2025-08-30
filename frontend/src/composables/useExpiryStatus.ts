// Expiry Status Composable
// Use-It-Up PWA Frontend

import { computed, type Ref } from 'vue'
import { calculateDaysUntilExpiry } from '@/utils/dateHelpers'

export type FreshnessStatus = 'fresh' | 'warning' | 'expired'

export interface ExpiryStatusResult {
  daysUntilExpiry: Ref<number>
  status: Ref<FreshnessStatus>
  statusColor: Ref<string>
  statusText: Ref<string>
}

/**
 * Composable for calculating expiry status and colors
 *
 * @param expiryDate - Reactive expiry date (string or Date)
 * @returns Computed properties for expiry status
 */
export function useExpiryStatus(expiryDate: Ref<string | Date>): ExpiryStatusResult {
  const daysUntilExpiry = computed(() => {
    try {
      return calculateDaysUntilExpiry(expiryDate.value)
    } catch (error) {
      console.error('Error calculating days until expiry:', error)
      return 0
    }
  })

  const status = computed((): FreshnessStatus => {
    const days = daysUntilExpiry.value

    if (days < 0) {
      return 'expired'
    } else if (days <= 3) {
      return 'warning'
    } else {
      return 'fresh'
    }
  })

  const statusColor = computed(() => {
    switch (status.value) {
      case 'fresh':
        return 'var(--color-fresh)'
      case 'warning':
        return 'var(--color-warning)'
      case 'expired':
        return 'var(--color-expired)'
      default:
        return 'var(--color-text-secondary)'
    }
  })

  const statusText = computed(() => {
    const days = daysUntilExpiry.value

    if (days < 0) {
      const daysExpired = Math.abs(days)
      return daysExpired === 1 ? 'Expired 1 day ago' : `Expired ${daysExpired} days ago`
    } else if (days === 0) {
      return 'Expires today'
    } else if (days === 1) {
      return 'Expires tomorrow'
    } else if (days <= 3) {
      return `Expires in ${days} days`
    } else {
      return `Fresh (${days} days left)`
    }
  })

  return {
    daysUntilExpiry,
    status,
    statusColor,
    statusText
  }
}
