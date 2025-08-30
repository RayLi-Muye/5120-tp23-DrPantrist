// Inventory API Service
// Use-It-Up PWA Frontend

import apiClient, { retryRequest, type APIError } from './axios'
import { isDevelopment } from '../config/environment'

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

    try {
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
    } catch (error) {
      const apiError = error as APIError

      if (isDevelopment()) {
        console.error('Failed to fetch inventory:', apiError)
      }

      throw new InventoryAPIError(
        'Failed to fetch inventory items. Please try again.',
        'getInventory',
        apiError
      )
    }
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

    try {
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
    } catch (error) {
      const apiError = error as APIError

      if (isDevelopment()) {
        console.error('Failed to add item:', apiError)
      }

      // Handle specific error cases
      if (apiError.status === 400) {
        throw new InventoryAPIError(
          'Invalid item data. Please check your input and try again.',
          'addItem',
          apiError
        )
      }

      throw new InventoryAPIError(
        'Failed to add item to inventory. Please try again.',
        'addItem',
        apiError
      )
    }
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

    try {
      return await retryRequest(async () => {
        const response = await apiClient.put(`/inventory/${itemId}/use`)
        return response.data as ImpactData
      })
    } catch (error) {
      const apiError = error as APIError

      if (isDevelopment()) {
        console.error('Failed to mark item as used:', apiError)
      }

      // Handle specific error cases
      if (apiError.status === 404) {
        throw new InventoryAPIError(
          'Item not found. It may have already been used or deleted.',
          'markAsUsed',
          apiError
        )
      }

      if (apiError.status === 409) {
        throw new InventoryAPIError(
          'Item has already been marked as used.',
          'markAsUsed',
          apiError
        )
      }

      throw new InventoryAPIError(
        'Failed to mark item as used. Please try again.',
        'markAsUsed',
        apiError
      )
    }
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

    try {
      await retryRequest(async () => {
        await apiClient.delete(`/inventory/${itemId}`)
      })
    } catch (error) {
      const apiError = error as APIError

      if (isDevelopment()) {
        console.error('Failed to delete item:', apiError)
      }

      // Handle specific error cases
      if (apiError.status === 404) {
        throw new InventoryAPIError(
          'Item not found. It may have already been deleted.',
          'deleteItem',
          apiError
        )
      }

      throw new InventoryAPIError(
        'Failed to delete item. Please try again.',
        'deleteItem',
        apiError
      )
    }
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

    try {
      return await retryRequest(async () => {
        const response = await apiClient.get('/impact', {
          params: { userId }
        })

        return response.data as TotalImpactData
      })
    } catch (error) {
      const apiError = error as APIError

      if (isDevelopment()) {
        console.error('Failed to fetch impact data:', apiError)
      }

      throw new InventoryAPIError(
        'Failed to fetch impact data. Please try again.',
        'getTotalImpact',
        apiError
      )
    }
  },

  /**
   * Health check endpoint to verify API connectivity
   * @returns Promise<boolean> - True if API is healthy
   */
  async healthCheck(): Promise<boolean> {
    try {
      const response = await apiClient.get('/health')
      return response.status === 200
    } catch (error) {
      if (isDevelopment()) {
        console.warn('API health check failed:', error)
      }
      return false
    }
  }
}

export default inventoryAPI
export { InventoryAPIError }
