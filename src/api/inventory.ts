// Inventory API Service
// Use-It-Up PWA Frontend

import apiClient, { retryRequest, type APIError } from './axios'
import { isDevelopment, config } from '../config/environment'
import { logger } from '@/utils/logger'

// Types for API requests/responses
export interface InventoryItem {
  id: string
  userId: string
  itemId: string
  name: string
  category: string
  categoryId?: number
  quantity: number
  unit: string
  addedDate: string
  expiryDate: string
  status: 'active' | 'used' | 'expired'
  notes?: string
  createdAt: string
  updatedAt: string
  // Ownership and visibility (EPIC4 support)
  ownerUserId?: string
  visibility?: 'shared' | 'private'
  // Sustainability metadata from backend
  estimatedCost?: number
  estimatedCo2Kg?: number
  currency?: string
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
  grocery_id: number | string
  quantity: number | string
  purchased_at: string | Date
  actual_expiry: string | Date
  visibility?: 'shared' | 'private'
  owner_user_id?: string
}

export interface AddItemByLoginCodeResult {
  created: InventoryItem
  items?: InventoryItem[]
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
  inventory_id?: string
  visibility?: 'shared' | 'private'
}

export interface ConsumeItemResult {
  consumed: MarkAsUsedResponse | null
  items?: InventoryItem[]
  impact?: ImpactData | null
  raw?: unknown
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
    logger.error('API health check failed', error)
    return false
  }
}

// Helpers
function toDateYYYYMMDD(input?: string | Date): string | undefined {
  if (input == null) return undefined
  if (typeof input === 'string') return input
  const d = new Date(input)
  if (Number.isNaN(d.getTime())) return undefined
  const m = `${d.getMonth() + 1}`.padStart(2, '0')
  const day = `${d.getDate()}`.padStart(2, '0')
  return `${d.getFullYear()}-${m}-${day}`
}

function toFiniteNumber(value: unknown): number | undefined {
  if (value == null) return undefined
  const parsed = typeof value === 'number' ? value : Number(value)
  return Number.isFinite(parsed) ? parsed : undefined
}

function pickNumber(source: Record<string, unknown>, keys: string[]): number | undefined {
  for (const key of keys) {
    if (key in source) {
      const value = toFiniteNumber(source[key])
      if (value !== undefined) return value
    }
  }
  return undefined
}

function pickString(source: Record<string, unknown>, keys: string[]): string | undefined {
  for (const key of keys) {
    const value = source[key]
    if (typeof value === 'string' && value.trim().length > 0) {
      return value
    }
  }
  return undefined
}

function mapImpactPayload(payload: any, fallback: {
  itemId: string
  itemName: string
  estimatedCost?: number
  estimatedCo2Kg?: number
}): ImpactData | null {
  if (!payload && !fallback) return null

  const moneySaved = toFiniteNumber(payload?.money_saved) ??
    toFiniteNumber(payload?.moneySaved) ??
    toFiniteNumber(payload?.value) ??
    fallback.estimatedCost ?? 0

  const co2Avoided = toFiniteNumber(payload?.co2_kg) ??
    toFiniteNumber(payload?.co2Kg) ??
    toFiniteNumber(payload?.co2e) ??
    toFiniteNumber(payload?.co2e_kg) ??
    fallback.estimatedCo2Kg ?? 0

  const actionType = (payload?.action_type || payload?.actionType) === 'discarded' ? 'discarded' : 'used'
  const itemName = payload?.item_name || payload?.itemName || fallback.itemName || 'Item'
  const itemId = payload?.item_id || payload?.itemId || fallback.itemId
  const timestamp = typeof payload?.timestamp === 'string' ? payload.timestamp : new Date().toISOString()

  return {
    itemId: String(itemId),
    itemName: String(itemName),
    moneySaved,
    co2Avoided,
    actionType,
    timestamp
  }
}

// Map backend item shape to frontend InventoryItem
function mapBackendItemToInventoryItem(item: any): InventoryItem {
  const categoryName = pickString(item, ['category_name', 'category', 'categoryLabel']) || 'Unknown'
  const unit = pickString(item, ['unit', 'measurement_unit', 'quantity_unit']) || 'pcs'
  const estimatedCost = pickNumber(item, ['price_total', 'price', 'estimated_price', 'total_price'])
  const estimatedCo2Kg = pickNumber(item, ['co2_kg', 'co2e', 'co2e_kg', 'estimated_co2_kg'])

  return {
    id: item.item_id,
    userId: item.created_by,
    itemId: String(item.grocery_id ?? item.product_id ?? item.item_id),
    name: item.grocery_name || item.name || `Item ${item.grocery_id ?? ''}`,
    category: categoryName,
    categoryId: toFiniteNumber(item.category_id),
    quantity: toFiniteNumber(item.quantity) ?? 0,
    unit,
    addedDate:
      item.purchased_at ||
      item.created_at?.split('T')[0] ||
      new Date().toISOString().split('T')[0],
    expiryDate:
      item.actual_expiry ||
      item.expiry_date ||
      new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    status: toFiniteNumber(item.quantity) && toFiniteNumber(item.quantity)! > 0 ? 'active' : 'used',
    notes: item.notes || '',
    createdAt: item.created_at || new Date().toISOString(),
    updatedAt: item.updated_at || new Date().toISOString(),
    ownerUserId: item.owner_user_id || item.created_by,
    visibility: item.visibility === 'private' || item.visibility === 'shared' ? item.visibility : 'shared',
    estimatedCost,
    estimatedCo2Kg,
    currency: pickString(item, ['currency', 'price_currency'])
  }
}

function ensureInventoryItem(item: any): InventoryItem {
  if (item && typeof item === 'object' && 'id' in item && 'name' in item && 'expiryDate' in item) {
    return item as InventoryItem
  }
  return mapBackendItemToInventoryItem(item)
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
      logger.debug('Request: GET /items/by-login-code', {
        url: `/items/by-login-code?login_code=${loginCode}`,
        loginCode: loginCode,
        baseURL: apiClient.defaults.baseURL,
        timeout: apiClient.defaults.timeout
      })
      
      const response = await retryRequest(async () => {
        logger.debug('Executing API call for /items/by-login-code')
        const result = await apiClient.get(`/items/by-login-code?login_code=${loginCode}`)
        logger.debug('Raw API response for /items/by-login-code', {
          status: result.status,
          statusText: result.statusText,
          headers: result.headers,
          dataLength: Array.isArray(result.data) ? result.data.length : typeof result.data
        })
        return result
      })
      
      logger.debug('Success: /items/by-login-code', response.data)
      const data = response.data
      return (data as any[]).map(mapBackendItemToInventoryItem)
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
      logger.debug('Request: POST /items', {
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
      
      logger.debug('Success: POST /items', response.data)
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
  async addItemByLoginCode(itemData: AddItemByLoginCodeRequest): Promise<AddItemByLoginCodeResult> {
    // Validate required fields
    if (!itemData.login_code || itemData.grocery_id == null) {
      throw new InventoryAPIError(
        'Login code and Grocery ID are required',
        'addItemByLoginCode'
      )
    }

    try {
      const groceryIdNum = Number(itemData.grocery_id)
      const quantityNum = Number(itemData.quantity)

      if (!Number.isFinite(groceryIdNum) || groceryIdNum <= 0) {
        throw new InventoryAPIError('Invalid grocery selection. Please reselect the item.', 'addItemByLoginCode')
      }
      if (!Number.isFinite(quantityNum) || quantityNum <= 0) {
        throw new InventoryAPIError('Quantity must be a positive number.', 'addItemByLoginCode')
      }

      if (itemData.visibility === 'private' && !itemData.owner_user_id) {
        throw new InventoryAPIError('Owner user ID is required for private items.', 'addItemByLoginCode')
      }

      const requestPayload = {
        login_code: String(itemData.login_code).trim(),
        grocery_id: groceryIdNum,
        quantity: quantityNum,
        ...(itemData.purchased_at ? { purchased_at: toDateYYYYMMDD(itemData.purchased_at)! } : {}),
        ...(itemData.actual_expiry ? { actual_expiry: toDateYYYYMMDD(itemData.actual_expiry)! } : {}),
        ...(itemData.visibility ? { visibility: itemData.visibility } : {}),
        ...(itemData.owner_user_id ? { owner_user_id: itemData.owner_user_id } : {})
      }
      
      logger.debug('Request: POST /items/by-login-code', {
        url: '/items/by-login-code',
        method: 'POST',
        originalData: itemData,
        payload: requestPayload,
        payloadTypes: {
          login_code: typeof requestPayload.login_code,
          grocery_id: typeof requestPayload.grocery_id,
          quantity: typeof requestPayload.quantity,
          purchased_at: typeof requestPayload.purchased_at,
          actual_expiry: typeof requestPayload.actual_expiry,
          visibility: typeof requestPayload.visibility,
          owner_user_id: typeof requestPayload.owner_user_id
        }
      })
      
      const response = await retryRequest(() =>
        apiClient.post('/items/by-login-code', requestPayload)
      )
      
      logger.debug('Success: POST /items/by-login-code', response.data)
      const data = response.data

      const itemsArray = Array.isArray(data?.items)
        ? (data.items as any[]).map(ensureInventoryItem)
        : undefined

      const insertedRaw = data?.inserted ?? data?.item ?? data?.created ?? data
      const created = ensureInventoryItem(
        insertedRaw && insertedRaw.item_id ? insertedRaw : (itemsArray ? itemsArray[itemsArray.length - 1] : insertedRaw)
      )

      return {
        created,
        items: itemsArray
      }
    } catch (error) {
      const apiError = error as APIError
      const detail = (apiError as any)?.response?.data?.detail || (apiError as any)?.details?.detail || ''

      // Friendly messages for common server-side validations
      const duplicateConstraint = 'duplicate key value violates unique constraint'
      const foreignKeyConstraint = 'foreign key constraint'

      if (detail && typeof detail === 'string') {
        if (detail.toLowerCase().includes(duplicateConstraint)) {
          const friendlyMessage = 'This item with the same purchase date already exists in your inventory. Try changing the purchase date or check your existing items.'
          throw new InventoryAPIError(friendlyMessage, 'addItemByLoginCode', apiError)
        }
        if (detail.toLowerCase().includes(foreignKeyConstraint) || detail.toLowerCase().includes('f405')) {
          const friendlyMessage = 'Selected grocery is not recognized by the server. Please pick the item again from the list.'
          throw new InventoryAPIError(friendlyMessage, 'addItemByLoginCode', apiError)
        }
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
   * Mark an item as used via login_code by deleting it from the shared inventory endpoint
   * @param itemId - The ID of the item to mark as used
   * @param loginCode - The user's login code
   */
  async markAsUsedByLoginCode(itemId: string, loginCode: string): Promise<ConsumeItemResult> {
    if (!itemId) {
      throw new InventoryAPIError('Item ID is required', 'markAsUsedByLoginCode')
    }
    if (!loginCode) {
      throw new InventoryAPIError('Login code is required', 'markAsUsedByLoginCode')
    }

    try {
      logger.debug('Request: DELETE /items/{item_id}/by-login-code', {
        url: `/items/${itemId}/by-login-code`,
        method: 'DELETE',
        params: { login_code: loginCode }
      })
      
      const response = await retryRequest(() =>
        apiClient.delete(`/items/${itemId}/by-login-code`, {
          params: { login_code: loginCode }
        })
      )
      
      logger.debug('Success: DELETE /items/{item_id}/by-login-code', response.data)
      const data = response.data ?? {}

      return {
        consumed: null,
        items: undefined,
        impact: null,
        // expose raw response for debugging if needed
        ...(data && typeof data === 'object' ? { raw: data } : {})
      }
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
      logger.error('Health check failed', error)
      return false
    }
  },

}

export default inventoryAPI
export { InventoryAPIError }
