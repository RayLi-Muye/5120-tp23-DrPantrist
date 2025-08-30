// API Services Index
// Use-It-Up PWA Frontend

// Export HTTP client and utilities
export { default as apiClient, retryRequest, isRetryableError, type APIError } from './axios'

// Export inventory API service
export { default as inventoryAPI, InventoryAPIError } from './inventory'

// Export types
export type {
  InventoryItem,
  AddItemRequest,
  ImpactData,
  TotalImpactData
} from './inventory'

// Export environment configuration
export { config, currentEnvironment, isDevelopment, isProduction, isStaging } from '../config/environment'

// API service health check utility
export async function checkAPIHealth(): Promise<boolean> {
  try {
    const inventoryModule = await import('./inventory')
    return await inventoryModule.default.healthCheck()
  } catch (error) {
    console.warn('API health check failed:', error)
    return false
  }
}

// Global error handler for API errors
export function handleAPIError(error: unknown): string {
  if (error instanceof Error) {
    // Check if it's our custom API error
    if ('operation' in error) {
      return error.message
    }

    // Generic error handling
    return error.message || 'An unexpected error occurred'
  }

  return 'An unexpected error occurred'
}
