// Inventory API Service
// Use-It-Up PWA Frontend

import apiClient, { retryRequest, type APIError } from './axios'
import { isDevelopment } from '../config/environment'
import { mockInventoryAPI } from './mockInventory'

// Types for API requests/responses
export interface InventoryItem {
  id: string
  userId: string
  itemId: string
  name: string
  category: string
  quantity: number
  unit: string
  addedDate: string
  expiryDate: string
  status: 'active' | 'used' | 'expired'
  notes?: string
  createdAt: string
  updatedAt: string
}

export interface AddItemRequest {
  userId: string
  itemId: string
  quantity?: number
  customExpiryDate?: string
  notes?: string
}

export interface ImpactData {
  itemId: string
  itemName: string
  moneySaved: number
  co2Avoided: number
  actionType: 'used' | 'discarded'
  timestamp: string
}

export interface TotalImpactData {
  totalMoneySaved: number
  totalCo2Avoided: number
  itemsUsed: number
}

// API Error wrapper for better error handling
class InventoryAPIError extends Error {
  constructor(
    message: string,
    public operation: string,
    public originalError?: APIError
  ) {
    super(message)
    this.name = 'InventoryAPIError'
  }
}

// API Mode Management
let useMockAPI = false
let apiInitialized = false
let apiHealthCheckAttempted = false

// Initialize API mode with fallback strategy
async function initializeAPIMode(): Promise<void> {
  if (apiInitialized) return

  try {
    // Always try the real API first, regardless of environment
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 3000) // 3 second timeout

    const response = await fetch(`${apiClient.defaults.baseURL}/health`, {
      method: 'GET',
      signal: controller.signal,
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      }
    })

    clearTimeout(timeoutId)

    if (response.ok) {
      useMockAPI = false
      console.log('✅ Real API is available at', apiClient.defaults.baseURL)
    } else {
      throw new Error(`API responded with status: ${response.status}`)
    }
  } catch (error) {
    useMockAPI = true
    console.log('🔄 Real API not available, using mock API as fallback')
    if (isDevelopment()) {
      console.log('   Reason:', (error as Error).message)
    }
  } finally {
    apiInitialized = true
    apiHealthCheckAttempted = true
  }
}

// Ensure API is initialized before any calls
async function ensureAPIInitialized(): Promise<void> {
  if (!apiInitialized) {
    await initializeAPIMode()
  }
}

// Fallback mechanism for individual API calls
async function withFallback<T>(
  realAPICall: () => Promise<T>,
  mockAPICall: () => Promise<T>,
  operation: string
): Promise<T> {
  await ensureAPIInitialized()

  // If we're already using mock API, go straight to it
  if (useMockAPI) {
    try {
      return await mockAPICall()
    } catch (error) {
      throw new InventoryAPIError(
        (error as Error).message || `Failed to ${operation}.`,
        operation
      )
    }
  }

  // Try real API first
  try {
    return await realAPICall()
  } catch (error) {
    const apiError = error as APIError

    // If it's a network error or server error, fall back to mock API
    if (!apiError.status || apiError.status >= 500 || apiError.code === 'NETWORK_ERROR') {
      console.warn(`Real API failed for ${operation}, falling back to mock API`)

      // Switch to mock API for future calls
      useMockAPI = true

      try {
        return await mockAPICall()
      } catch (mockError) {
        throw new InventoryAPIError(
          (mockError as Error).message || `Failed to ${operation}.`,
          operation
        )
      }
    }

    // For client errors (4xx), don't fall back - these are likely real issues
    throw new InventoryAPIError(
      apiError.message || `Failed to ${operation}. Please try again.`,
      operation,
      apiError
    )
  }
}

const inventoryAPI = {
  /**
   * Get all active inventory items for a user
   * @param userId - The user ID to fetch inventory for
   * @returns Promise<InventoryItem[]> - Array of inventory items
   */
  async getInventory(userId: string): Promise<InventoryItem[]> {
    if (!userId) {
      throw new InventoryAPIError('User ID is required', 'getInventory')
    }

    return withFallback(
      // Real API call
      async () => {
        return await retryRequest(async () => {
          const response = await apiClient.get('/inventory', {
            params: { userId }
          })

          // Validate response data
          if (!Array.isArray(response.data)) {
            throw new Error('Invalid response format: expected array')
          }

          return response.data as InventoryItem[]
        })
      },
      // Mock API fallback
      async () => {
        return await mockInventoryAPI.getInventory(userId)
      },
      'fetch inventory items'
    )
  },

  /**
   * Add a new item to inventory
   * @param itemData - The item data to add
   * @returns Promise<InventoryItem> - The created inventory item
   */
  async addItem(itemData: AddItemRequest): Promise<InventoryItem> {
    // Validate required fields
    if (!itemData.userId || !itemData.itemId) {
      throw new InventoryAPIError(
        'User ID and Item ID are required',
        'addItem'
      )
    }

    return withFallback(
      // Real API call
      async () => {
        return await retryRequest(async () => {
          const response = await apiClient.post('/inventory', {
            userId: itemData.userId,
            itemId: itemData.itemId,
            quantity: itemData.quantity || 1,
            customExpiryDate: itemData.customExpiryDate || null,
            notes: itemData.notes || ''
          })

          return response.data as InventoryItem
        })
      },
      // Mock API fallback
      async () => {
        return await mockInventoryAPI.addItem(itemData)
      },
      'add item to inventory'
    )
  },

  /**
   * Mark an item as used and get impact data
   * @param itemId - The ID of the item to mark as used
   * @returns Promise<ImpactData> - Impact data for the used item
   */
  async markAsUsed(itemId: string): Promise<ImpactData> {
    if (!itemId) {
      throw new InventoryAPIError('Item ID is required', 'markAsUsed')
    }

    return withFallback(
      // Real API call
      async () => {
        return await retryRequest(async () => {
          const response = await apiClient.put(`/inventory/${itemId}/use`)
          return response.data as ImpactData
        })
      },
      // Mock API fallback
      async () => {
        return await mockInventoryAPI.markAsUsed(itemId)
      },
      'mark item as used'
    )
  },

  /**
   * Delete an item from inventory
   * @param itemId - The ID of the item to delete
   * @returns Promise<void>
   */
  async deleteItem(itemId: string): Promise<void> {
    if (!itemId) {
      throw new InventoryAPIError('Item ID is required', 'deleteItem')
    }

    return withFallback(
      // Real API call
      async () => {
        await retryRequest(async () => {
          await apiClient.delete(`/inventory/${itemId}`)
        })
      },
      // Mock API fallback
      async () => {
        return await mockInventoryAPI.deleteItem(itemId)
      },
      'delete item'
    )
  },

  /**
   * Get total impact data for a user
   * @param userId - The user ID to fetch impact data for
   * @returns Promise<TotalImpactData> - Total impact statistics
   */
  async getTotalImpact(userId: string): Promise<TotalImpactData> {
    if (!userId) {
      throw new InventoryAPIError('User ID is required', 'getTotalImpact')
    }

    return withFallback(
      // Real API call
      async () => {
        return await retryRequest(async () => {
          const response = await apiClient.get('/impact', {
            params: { userId }
          })

          return response.data as TotalImpactData
        })
      },
      // Mock API fallback
      async () => {
        return await mockInventoryAPI.getTotalImpact(userId)
      },
      'fetch impact data'
    )
  },

  /**
   * Health check endpoint to verify API connectivity
   * @returns Promise<boolean> - True if API is healthy
   */
  async healthCheck(): Promise<boolean> {
    return withFallback(
      // Real API call
      async () => {
        const response = await apiClient.get('/health')
        return response.status === 200
      },
      // Mock API fallback
      async () => {
        return await mockInventoryAPI.healthCheck()
      },
      'perform health check'
    )
  },

  /**
   * Force a switch to mock API (useful for testing or when real API is known to be down)
   */
  forceMockMode(): void {
    useMockAPI = true
    console.log('🔄 Forced switch to mock API mode')
  },

  /**
   * Reset API mode (will re-check real API on next call)
   */
  resetAPIMode(): void {
    useMockAPI = false
    apiInitialized = false
    apiHealthCheckAttempted = false
    console.log('🔄 API mode reset - will re-check real API on next call')
  },

  /**
   * Get current API mode
   */
  getCurrentAPIMode(): 'real' | 'mock' {
    return useMockAPI ? 'mock' : 'real'
  }
}

// Export API with additional utilities
const inventoryAPIWithUtils = {
  ...inventoryAPI,

  /**
   * Get API status information
   */
  getAPIStatus(): {
    mode: 'real' | 'mock'
    initialized: boolean
    healthCheckAttempted: boolean
    baseURL: string
  } {
    return {
      mode: useMockAPI ? 'mock' : 'real',
      initialized: apiInitialized,
      healthCheckAttempted: apiHealthCheckAttempted,
      baseURL: apiClient.defaults.baseURL || 'unknown'
    }
  }
}

export default inventoryAPIWithUtils
export { InventoryAPIError }
