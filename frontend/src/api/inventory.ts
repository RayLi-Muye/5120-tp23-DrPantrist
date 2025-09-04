// Inventory API Service
// Use-It-Up PWA Frontend

import apiClient, { retryRequest, type APIError } from './axios'
import { isDevelopment, config } from '../config/environment'

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

// New interface for /items API endpoint
export interface AddItemToInventoryRequest {
  inventory_id: string
  grocery_id: number
  created_by: string
  quantity: number
  purchased_at: string
  actual_expiry: string
}

// New interface for /items/by-login-code API endpoint
export interface AddItemByLoginCodeRequest {
  login_code: string
  grocery_id: number
  quantity: number
  purchased_at: string
  actual_expiry: string
}

// New interface for /items/{item_id}/consume API endpoint
export interface MarkAsUsedByLoginCodeRequest {
  login_code: string
  consumed: boolean
}

// Response interface for mark as used
export interface MarkAsUsedResponse {
  item_id: string
  quantity: number
  updated_at: string
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

// Health check function

async function checkAPIHealth(): Promise<boolean> {
  try {
    const response = await retryRequest(() => 
      apiClient.get('/health', {
        timeout: 3000
      })
    )
    return response.status === 200
  } catch (error) {
    console.error('API health check failed:', error)
    return false
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
      throw new InventoryAPIError(
        apiError.message || 'Failed to fetch inventory items. Please try again.',
        'getInventory',
        apiError
      )
    }
  },

  /**
   * Get all inventory items using login_code via /items/by-login-code endpoint
   * @param loginCode - The user's login code
   * @returns Promise<InventoryItem[]> - Array of inventory items
   */
  async getInventoryByLoginCode(loginCode: string): Promise<InventoryItem[]> {
    if (!loginCode) {
      throw new InventoryAPIError('Login code is required', 'getInventoryByLoginCode')
    }

    try {
      console.log('📤 /items/by-login-code API request:', {
        url: `/items/by-login-code?login_code=${loginCode}`,
        loginCode: loginCode,
        baseURL: apiClient.defaults.baseURL,
        timeout: apiClient.defaults.timeout
      })
      
      const response = await retryRequest(async () => {
        console.log('🔄 Executing API call...')
        const result = await apiClient.get(`/items/by-login-code?login_code=${loginCode}`)
        console.log('📥 Raw API response:', {
          status: result.status,
          statusText: result.statusText,
          headers: result.headers,
          dataLength: Array.isArray(result.data) ? result.data.length : typeof result.data
        })
        return result
      })
      
      console.log('✅ /items/by-login-code API success:', response.data)
      const data = response.data
      
      // Convert backend format to frontend InventoryItem format
      const items: InventoryItem[] = data.map((item: any) => ({
        id: item.item_id,
        userId: item.created_by,
        itemId: item.grocery_id.toString(),
        name: item.grocery_name || `Item ${item.grocery_id}`,
        category: 'Unknown', // Backend doesn't provide category in this endpoint
        quantity: item.quantity || 0,
        unit: 'pcs', // Default unit
        addedDate: item.purchased_at || item.created_at?.split('T')[0] || new Date().toISOString().split('T')[0],
        expiryDate: item.actual_expiry || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        status: (item.quantity && item.quantity > 0) ? 'active' : 'used',
        notes: '',
        createdAt: item.created_at || new Date().toISOString(),
        updatedAt: item.updated_at || new Date().toISOString()
      }))

      return items
    } catch (error) {
      const apiError = error as APIError
      throw new InventoryAPIError(
        apiError.message || 'Failed to fetch inventory items by login code. Please try again.',
        'getInventoryByLoginCode',
        apiError
      )
    }
  },

  /**
   * Add a new item to inventory (Legacy method)
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
      throw new InventoryAPIError(
        apiError.message || 'Failed to add item to inventory. Please try again.',
        'addItem',
        apiError
      )
    }
  },

  /**
   * Add a new item to inventory using /items endpoint
   * @param itemData - The item data to add
   * @returns Promise<InventoryItem> - The created inventory item
   */
  async addItemToInventory(itemData: AddItemToInventoryRequest): Promise<InventoryItem> {
    // Validate required fields
    if (!itemData.inventory_id || !itemData.grocery_id || !itemData.created_by) {
      throw new InventoryAPIError(
        'Inventory ID, Grocery ID, and Created By are required',
        'addItemToInventory'
      )
    }

    try {
      console.log('📤 /items API request:', {
        url: '/items',
        method: 'POST',
        data: itemData
      })
      
      const response = await retryRequest(() =>
        apiClient.post('/items', {
          inventory_id: itemData.inventory_id,
          grocery_id: itemData.grocery_id,
          created_by: itemData.created_by,
          quantity: itemData.quantity,
          purchased_at: itemData.purchased_at,
          actual_expiry: itemData.actual_expiry
        })
      )
      
      console.log('✅ /items API success:', response.data)
      return response.data as InventoryItem
    } catch (error) {
      const apiError = error as APIError
      throw new InventoryAPIError(
        apiError.message || 'Failed to add item to inventory. Please try again.',
        'addItemToInventory',
        apiError
      )
    }
  },

  /**
   * Add a new item to inventory using login_code via /items/by-login-code endpoint
   * @param itemData - The item data to add with login_code
   * @returns Promise<InventoryItem> - The created inventory item
   */
  async addItemByLoginCode(itemData: AddItemByLoginCodeRequest): Promise<InventoryItem> {
    // Validate required fields
    if (!itemData.login_code || !itemData.grocery_id) {
      throw new InventoryAPIError(
        'Login code and Grocery ID are required',
        'addItemByLoginCode'
      )
    }

    try {
      const requestPayload = {
        login_code: itemData.login_code,
        grocery_id: itemData.grocery_id,
        quantity: itemData.quantity,
        purchased_at: itemData.purchased_at,
        actual_expiry: itemData.actual_expiry
      }
      
      console.log('📤 /items/by-login-code API request:', {
        url: '/items/by-login-code',
        method: 'POST',
        originalData: itemData,
        payload: requestPayload,
        payloadTypes: {
          login_code: typeof requestPayload.login_code,
          grocery_id: typeof requestPayload.grocery_id,
          quantity: typeof requestPayload.quantity,
          purchased_at: typeof requestPayload.purchased_at,
          actual_expiry: typeof requestPayload.actual_expiry
        }
      })
      
      const response = await retryRequest(() =>
        apiClient.post('/items/by-login-code', requestPayload)
      )
      
      console.log('✅ /items/by-login-code API success:', response.data)
      return response.data as InventoryItem
    } catch (error) {
      const apiError = error as APIError
      
      // Handle duplicate item constraint error
      if (apiError.status === 422 && apiError.details?.detail?.includes('duplicate key value violates unique constraint')) {
        const friendlyMessage = 'This item with the same purchase date already exists in your inventory. Try changing the purchase date or check your existing items.'
        throw new InventoryAPIError(
          friendlyMessage,
          'addItemByLoginCode',
          apiError
        )
      }
      
      throw new InventoryAPIError(
        apiError.message || 'Failed to add item to inventory by login code. Please try again.',
        'addItemByLoginCode',
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
      throw new InventoryAPIError(
        apiError.message || 'Failed to mark item as used. Please try again.',
        'markAsUsed',
        apiError
      )
    }
  },

  /**
   * Mark an item as used via login_code using /items/{item_id}/consume endpoint
   * @param itemId - The ID of the item to mark as used
   * @param loginCode - The user's login code
   * @returns Promise<MarkAsUsedResponse> - Response from the consume endpoint
   */
  async markAsUsedByLoginCode(itemId: string, loginCode: string): Promise<MarkAsUsedResponse> {
    if (!itemId) {
      throw new InventoryAPIError('Item ID is required', 'markAsUsedByLoginCode')
    }
    if (!loginCode) {
      throw new InventoryAPIError('Login code is required', 'markAsUsedByLoginCode')
    }

    try {
      console.log('📤 /items/{item_id}/consume API request:', {
        url: `/items/${itemId}/consume`,
        method: 'PATCH',
        data: { login_code: loginCode, consumed: true }
      })
      
      const response = await retryRequest(() =>
        apiClient.patch(`/items/${itemId}/consume`, {
          login_code: loginCode,
          consumed: true
        })
      )
      
      console.log('✅ /items/{item_id}/consume API success:', response.data)
      return response.data as MarkAsUsedResponse
    } catch (error) {
      const apiError = error as APIError
      throw new InventoryAPIError(
        apiError.message || 'Failed to mark item as used by login code. Please try again.',
        'markAsUsedByLoginCode',
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
      throw new InventoryAPIError(
        apiError.message || 'Failed to delete item. Please try again.',
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
      throw new InventoryAPIError(
        apiError.message || 'Failed to fetch impact data. Please try again.',
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
      const response = await apiClient.get(config.healthCheckEndpoint)
      return response.status === 200
    } catch (error) {
      console.error('Health check failed:', error)
      return false
    }
  },

}

export default inventoryAPI
export { InventoryAPIError }
