// Formatting Utilities
// Use-It-Up PWA Frontend

/**
 * Format currency in AUD
 */
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-AU', {
    style: 'currency',
    currency: 'AUD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(amount)
}

/**
 * Format CO2 amount with appropriate unit
 */
export function formatCO2(kg: number): string {
  if (kg < 1) {
    const grams = Math.round(kg * 1000)
    return `${grams}g`
  } else {
    return `${kg.toFixed(1)}kg`
  }
}

/**
 * Format quantity with unit
 */
export function formatQuantity(quantity: number, unit: string): string {
  if (quantity === 1 && (unit === 'item' || unit === 'piece')) {
    return '1 item'
  }
  return `${quantity} ${unit}${quantity !== 1 ? 's' : ''}`
}

/**
 * Capitalize first letter of a string
 */
export function capitalize(str: string): string {
  if (!str) return ''
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase()
}

/**
 * Truncate text with ellipsis
 */
export function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text
  return text.slice(0, maxLength - 3) + '...'
}

/**
 * Format number with appropriate decimal places
 */
export function formatNumber(num: number, decimals: number = 1): string {
  return num.toFixed(decimals)
}

/**
 * Get CO2 comparison text for impact display
 */
export function getCO2Comparison(kg: number): string {
  // Rough equivalents for context
  if (kg < 0.1) {
    return 'equivalent to charging a phone'
  } else if (kg < 0.5) {
    return 'equivalent to a short bike ride'
  } else if (kg < 2) {
    return 'equivalent to driving 5km'
  } else if (kg < 5) {
    return 'equivalent to a load of laundry'
  } else {
    return 'equivalent to driving 20km'
  }
}
