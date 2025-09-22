// Inventory API Service
// Use-It-Up PWA Frontend

import apiClient, { retryRequest, type APIError } from './axios'
import { config } from '../config/environment'
import { logger } from '@/utils/logger'

// Types for API requests/responses
export interface InventoryItem {
  id: string
  userId: string
  itemId: string
  groceryId?: number
  name: string
  category: string
  icon?: string
  imageUrl?: string
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
  profileId?: string
  profileName?: string
  profilePosition?: number
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
  profile_position?: number | string
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

// Normalized impact stats from GET /stats/by-login-code
export interface ImpactStatsBucket {
  moneySaved: number
  co2SavedKg: number
}

export interface ProfileImpactStats extends ImpactStatsBucket {
  position: number
  profileId: string
  profileName: string
}

export interface ImpactStats {
  inventoryId: string
  overall: ImpactStatsBucket
  shared: ImpactStatsBucket
  profiles: ProfileImpactStats[]
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

// (Health check is provided in src/api/index.ts)

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

// Removed unused mapImpactPayload helper (store computes impact when needed)

// Map backend item shape to frontend InventoryItem
function mapBackendItemToInventoryItem(item: unknown): InventoryItem {
  const obj = item as Record<string, unknown>
  const categoryName = pickString(obj, ['category_name', 'category', 'categoryLabel']) || 'Unknown'
  const unit = pickString(obj, ['unit', 'measurement_unit', 'quantity_unit']) || 'pcs'
  const estimatedCost = pickNumber(obj, ['price_total', 'price', 'estimated_price', 'total_price'])
  const estimatedCo2Kg = pickNumber(obj, ['co2_kg', 'co2e', 'co2e_kg', 'estimated_co2_kg'])
  const profilePosition = pickNumber(obj, ['profile_position'])
  const profileId = pickString(obj, ['profile_id'])
  const profileName = pickString(obj, ['profile_name'])

  const id = pickString(obj, ['item_id']) || String(pickNumber(obj, ['item_id']) ?? '')
  const userId = pickString(obj, ['created_by']) || ''
  const groceryId = pickNumber(obj, ['grocery_id'])
  const groceryOrProductId = pickNumber(obj, ['grocery_id']) ?? pickNumber(obj, ['product_id'])
  const itemId = pickString(obj, ['grocery_id', 'product_id', 'item_id']) || String(groceryOrProductId ?? id)
  const name = pickString(obj, ['grocery_name', 'name']) || `Item ${groceryId ?? ''}`

  const createdAtRaw = pickString(obj, ['created_at'])
  const purchasedAt = pickString(obj, ['purchased_at'])
  const addedDate = purchasedAt || (createdAtRaw ? createdAtRaw.split('T')[0] : new Date().toISOString().split('T')[0])

  const expiryDate = pickString(obj, ['actual_expiry', 'expiry_date']) ||
    new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]

  const quantity = toFiniteNumber(obj['quantity' as keyof typeof obj] as unknown) ?? 0
  const status: InventoryItem['status'] = quantity > 0 ? 'active' : 'used'

  const createdAt = createdAtRaw || new Date().toISOString()
  const updatedAt = pickString(obj, ['updated_at']) || new Date().toISOString()
  const ownerUserId = pickString(obj, ['owner_user_id', 'created_by']) || ''

  const rawVis = pickString(obj, ['visibility'])
  const visibility: 'shared' | 'private' = rawVis === 'private' || rawVis === 'shared' ? rawVis : 'shared'

  return {
    id,
    userId,
    itemId,
    groceryId,
    name,
    category: categoryName,
    categoryId: toFiniteNumber(obj['category_id' as keyof typeof obj] as unknown),
    quantity,
    unit,
    addedDate,
    expiryDate,
    status,
    notes: pickString(obj, ['notes']) || '',
    createdAt,
    updatedAt,
    ownerUserId,
    visibility,
    estimatedCost,
    estimatedCo2Kg,
    currency: pickString(obj, ['currency', 'price_currency']),
    profileId,
    profileName,
    profilePosition
  }
}

function isInventoryItem(value: unknown): value is InventoryItem {
  return !!value && typeof value === 'object' && 'id' in (value as any) && 'name' in (value as any) && 'expiryDate' in (value as any)
}

function ensureInventoryItem(item: unknown): InventoryItem {
  if (isInventoryItem(item)) return item
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
      const list: unknown[] = Array.isArray(data) ? data : []
      return list.map(mapBackendItemToInventoryItem)
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
   * Get items by login code with optional filters (visibility, profile_position)
   */
  async getItemsByLoginCode(loginCode: string, opts?: { visibility?: 'shared' | 'private', profile_position?: number }): Promise<InventoryItem[]> {
    if (!loginCode) {
      throw new InventoryAPIError('Login code is required', 'getItemsByLoginCode')
    }

    try {
      const code = String(loginCode).trim().toUpperCase()
      const params = new URLSearchParams({ login_code: code })
      if (opts?.visibility) params.append('visibility', opts.visibility)
      if (opts?.profile_position != null) params.append('profile_position', String(opts.profile_position))
      const url = `/items/by-login-code?${params.toString()}`

      const response = await retryRequest(async () => apiClient.get(url))
      const list: unknown[] = Array.isArray(response.data) ? response.data : []
      const mapped = list.map(mapBackendItemToInventoryItem)

      // If server omitted profile_position on private filtered lists, stamp from filter
      if (opts?.visibility === 'private' && opts?.profile_position != null) {
        for (const it of mapped) {
          if (typeof it.profilePosition !== 'number') {
            it.profilePosition = opts.profile_position
          }
        }
      }

      // Ensure visibility stays consistent with the applied filter when server omits it
      if (opts?.visibility) {
        for (const it of mapped) {
          // Override to match the filter because this list was fetched using it
          it.visibility = opts.visibility
        }
      }

      return mapped
    } catch (error) {
      const apiError = error as APIError
      throw new InventoryAPIError(
        apiError.message || 'Failed to fetch items by login code',
        'getItemsByLoginCode',
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

      let profilePositionNum: number | undefined
      if (itemData.profile_position != null) {
        const parsed = Number(itemData.profile_position)
        if (Number.isFinite(parsed) && parsed >= 1 && parsed <= 3) {
          profilePositionNum = parsed
        }
      }

      if (itemData.visibility === 'private' && profilePositionNum == null) {
        throw new InventoryAPIError('Profile position is required for private items.', 'addItemByLoginCode')
      }

      const requestPayload = {
        login_code: String(itemData.login_code).trim(),
        grocery_id: groceryIdNum,
        quantity: quantityNum,
        ...(itemData.purchased_at ? { purchased_at: toDateYYYYMMDD(itemData.purchased_at)! } : {}),
        ...(itemData.actual_expiry ? { actual_expiry: toDateYYYYMMDD(itemData.actual_expiry)! } : {}),
        ...(itemData.visibility ? { visibility: itemData.visibility } : {}),
        ...(profilePositionNum != null ? { profile_position: profilePositionNum } : {}),
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
        ? (data.items as unknown[]).map(ensureInventoryItem)
        : undefined

      const insertedRaw = data?.inserted ?? data?.item ?? data?.created ?? data
      const created = ensureInventoryItem(
        insertedRaw && insertedRaw.item_id ? insertedRaw : (itemsArray ? itemsArray[itemsArray.length - 1] : insertedRaw)
      )

      // Ensure client reflects intended privacy immediately when backend omits fields
      if (requestPayload.visibility === 'private') {
        const createdMut = created as InventoryItem & { profilePosition?: number }
        createdMut.visibility = 'private'
        const pp = (requestPayload as { profile_position?: number }).profile_position
        if (typeof pp === 'number') createdMut.profilePosition = pp
      }

      return {
        created,
        items: itemsArray
      }
    } catch (error) {
      const apiError = error as APIError & { response?: { data?: { detail?: string } } } & { details?: { detail?: string } }
      const detail = apiError.response?.data?.detail || apiError.details?.detail || ''

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
      const data = (response.data ?? {}) as Record<string, unknown>

      const moneySaved = typeof data['money_saved'] === 'number' ? (data['money_saved'] as number) : Number(data['money_saved'] as any)
      const co2Saved = typeof data['co2_saved_kg'] === 'number' ? (data['co2_saved_kg'] as number) : Number(data['co2_saved_kg'] as any)
      const consumedAt = typeof data['consumed_at'] === 'string' ? (data['consumed_at'] as string) : new Date().toISOString()

      const impact: ImpactData | null = Number.isFinite(moneySaved) || Number.isFinite(co2Saved)
        ? {
            itemId,
            itemName: '',
            moneySaved: Number.isFinite(moneySaved) ? (moneySaved as number) : 0,
            co2Avoided: Number.isFinite(co2Saved) ? (co2Saved as number) : 0,
            actionType: 'used',
            timestamp: consumedAt
          }
        : null

      return {
        consumed: null,
        items: undefined,
        impact,
        raw: data
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
   * Get room-wide impact stats via login code
   * Backed by GET /stats/by-login-code?login_code=XXXXXX
   */
  async getImpactStatsByLoginCode(loginCode: string): Promise<ImpactStats> {
    if (!loginCode) {
      throw new InventoryAPIError('Login code is required', 'getImpactStatsByLoginCode')
    }
    try {
      const response = await retryRequest(() =>
        apiClient.get('/stats/by-login-code', { params: { login_code: String(loginCode).trim() } })
      )

      const data = (response.data ?? {}) as any
      const toBucket = (src: any): ImpactStatsBucket => ({
        moneySaved: Number(src?.money_saved ?? 0) || 0,
        co2SavedKg: Number(src?.co2_saved_kg ?? 0) || 0
      })
      const profiles: ProfileImpactStats[] = Array.isArray(data?.profiles)
        ? data.profiles.map((p: any) => ({
            position: Number(p?.position ?? 0) || 0,
            profileId: String(p?.profile_id ?? ''),
            profileName: String(p?.profile_name ?? ''),
            moneySaved: Number(p?.money_saved ?? 0) || 0,
            co2SavedKg: Number(p?.co2_saved_kg ?? 0) || 0
          }))
        : []

      return {
        inventoryId: String(data?.inventory_id ?? ''),
        overall: toBucket(data?.overall),
        shared: toBucket(data?.shared),
        profiles
      }
    } catch (error) {
      const apiError = error as APIError
      throw new InventoryAPIError(
        apiError.message || 'Failed to fetch impact stats by login code.',
        'getImpactStatsByLoginCode',
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
