// Inventory Store
// Use-It-Up PWA Frontend

import { ref, computed } from 'vue'
import { defineStore } from 'pinia'
import inventoryAPI, { type InventoryItem, type AddItemRequest, type AddItemToInventoryRequest, type AddItemByLoginCodeRequest, type MarkAsUsedResponse, type ImpactData, InventoryAPIError } from '@/api/inventory'
import { calculateDaysUntilExpiry } from '@/utils/dateHelpers'
import { logger } from '@/utils/logger'
// Removed error handler imports for MVP
import type { FreshnessStatus } from '@/composables/useExpiryStatus'

export type FilterType = 'all' | 'fresh' | 'warning' | 'expired'

export interface InventoryCounts {
  total: number
  fresh: number
  warning: number
  expired: number
}

export interface InventoryState {
  items: InventoryItem[]
  isLoading: boolean
  error: string | null
  currentFilter: FilterType
  lastFetch: number | null
}

// Cache duration: 5 minutes
const CACHE_DURATION = 5 * 60 * 1000

/**
 * Get freshness status based on days until expiry
 */
function getFreshnessStatus(expiryDate: string): FreshnessStatus {
  try {
    const days = calculateDaysUntilExpiry(expiryDate)

    if (days < 0) {
      return 'expired'
    } else if (days <= 3) {
      return 'warning'
    } else {
      return 'fresh'
    }
  } catch (error) {
    logger.error('Error calculating freshness status', error)
    return 'expired' // Default to expired for safety
  }
}

export const useInventoryStore = defineStore('inventory', () => {
  // State
  const items = ref<InventoryItem[]>([])
  const isLoading = ref(false)
  const error = ref<string | null>(null)
  const currentFilter = ref<FilterType>('all')
  const lastFetch = ref<number | null>(null)

  // Getters
  const activeItems = computed(() =>
    items.value.filter(item => item.status === 'active')
  )

  const itemsByFilter = computed(() => {
    const active = activeItems.value

    if (currentFilter.value === 'all') {
      return active
    }

    return active.filter(item => {
      const status = getFreshnessStatus(item.expiryDate)
      return status === currentFilter.value
    })
  })

  const inventoryCounts = computed((): InventoryCounts => {
    const active = activeItems.value

    const counts = active.reduce(
      (acc, item) => {
        const status = getFreshnessStatus(item.expiryDate)
        acc[status]++
        acc.total++
        return acc
      },
      { total: 0, fresh: 0, warning: 0, expired: 0 }
    )

    return counts
  })

  // Helper to check if cache is valid
  const isCacheValid = computed(() => {
    if (!lastFetch.value) return false
    const now = Date.now()
    return (now - lastFetch.value) < CACHE_DURATION
  })

  // Actions
  async function fetchInventory(userId: string, forceRefresh = false): Promise<void> {
    // Skip fetch if cache is valid and not forcing refresh
    if (!forceRefresh && isCacheValid.value) {
      return
    }

    isLoading.value = true
    error.value = null

    try {
      const data = await inventoryAPI.getInventory(userId)
      items.value = data
      lastFetch.value = Date.now()

      // Clear any previous errors on successful fetch
      error.value = null
    } catch (err) {
      const errorMessage = 'fetch your inventory'

      if (err instanceof InventoryAPIError) {
        error.value = err.message
      } else if (err instanceof Error && err.message.includes('network')) {
        error.value = 'Network error - using cached data if available'
      } else {
        error.value = 'Failed to fetch inventory. Please try again.'
      }
      logger.error(`Failed to ${errorMessage}`, err)
    } finally {
      isLoading.value = false
    }
  }

  async function fetchInventoryByLoginCode(loginCode: string, forceRefresh = false): Promise<void> {
    // Skip fetch if cache is valid and not forcing refresh
    if (!forceRefresh && isCacheValid.value) {
      return
    }

    isLoading.value = true
    error.value = null

    try {
      logger.info('Fetching inventory by login code', { loginCode })
      const data = await inventoryAPI.getInventoryByLoginCode(loginCode)
      logger.info('Fetched inventory data', { count: Array.isArray(data) ? data.length : 0 })
      items.value = data
      lastFetch.value = Date.now()

      // Clear any previous errors on successful fetch
      error.value = null
    } catch (err) {
      const errorMessage = 'fetch your inventory by login code'
      
      logger.error('Failed to fetch inventory by login code', {
        loginCode,
        error: err,
        message: err instanceof Error ? err.message : 'Unknown error',
        stack: err instanceof Error ? err.stack : 'No stack trace',
        name: err instanceof Error ? err.name : 'Unknown error type'
      })

      // Set detailed error message for debugging
      if (err instanceof InventoryAPIError) {
        error.value = `API Error: ${err.message} (Operation: ${err.operation})`
        if (err.originalError) {
          logger.error('Original error details', err.originalError)
        }
      } else if (err instanceof Error) {
        if (err.message.includes('network') || err.message.includes('Network')) {
          error.value = `Network error: ${err.message} - please check your connection`
        } else if (err.message.includes('fetch')) {
          error.value = `Fetch error: ${err.message} - API may be unavailable`
        } else {
          error.value = `Error: ${err.message}`
        }
      } else {
        error.value = `Unknown error: ${String(err)}`
      }
      logger.error(`Failed to ${errorMessage}`, err)
      // Do not throw to prevent UI breakage on network failures
    } finally {
      isLoading.value = false
    }
  }

  async function addItem(itemData: AddItemRequest): Promise<InventoryItem | null> {
    isLoading.value = true
    error.value = null

    try {
      const newItem = await inventoryAPI.addItem(itemData)

      // Add to local state for immediate UI update
      items.value.push(newItem)

      // Update cache timestamp
      lastFetch.value = Date.now()

      // Clear any previous errors on successful add
      error.value = null

      return newItem
    } catch (err) {
      const errorMessage = 'add the item'

      if (err instanceof InventoryAPIError) {
        error.value = err.message
      } else if (err instanceof Error && err.message.includes('network')) {
        error.value = 'Network error - item not added'
      } else {
        error.value = 'Failed to add item. Please try again.'
      }
      logger.error(`Failed to ${errorMessage}`, err)
      return null
    } finally {
      isLoading.value = false
    }
  }

  async function addItemToInventory(itemData: AddItemToInventoryRequest): Promise<InventoryItem | null> {
    isLoading.value = true
    error.value = null

    try {
      const newItem = await inventoryAPI.addItemToInventory(itemData)

      // Add to local state for immediate UI update
      items.value.push(newItem)

      // Update cache timestamp
      lastFetch.value = Date.now()

      // Clear any previous errors on successful add
      error.value = null

      return newItem
    } catch (err) {
      const errorMessage = 'add the item to inventory'

      if (err instanceof InventoryAPIError) {
        error.value = err.message
      } else if (err instanceof Error && err.message.includes('network')) {
        error.value = 'Network error - item not added'
      } else {
        error.value = 'Failed to add item to inventory. Please try again.'
      }
      logger.error(`Failed to ${errorMessage}`, err)
      return null
    } finally {
      isLoading.value = false
    }
  }

  async function addItemByLoginCode(itemData: AddItemByLoginCodeRequest): Promise<InventoryItem | null> {
    isLoading.value = true
    error.value = null

    try {
      const newItem = await inventoryAPI.addItemByLoginCode(itemData)

      // Add to local state for immediate UI update
      items.value.push(newItem)

      // Update cache timestamp
      lastFetch.value = Date.now()

      // Clear any previous errors on successful add
      error.value = null

      return newItem
    } catch (err) {
      const errorMessage = 'add the item to inventory via login code'

      if (err instanceof InventoryAPIError) {
        error.value = err.message
      } else if (err instanceof Error && err.message.includes('network')) {
        error.value = 'Network error - item not added'
      } else {
        error.value = 'Failed to add item to inventory. Please try again.'
      }
      logger.error(`Failed to ${errorMessage}`, err)
      return null
    } finally {
      isLoading.value = false
    }
  }

  async function markItemAsUsedByLoginCode(itemId: string, loginCode: string): Promise<MarkAsUsedResponse | null> {
    isLoading.value = true
    error.value = null

    // Store item reference for potential rollback
    const itemIndex = items.value.findIndex(item => item.id === itemId)
    const itemToRemove = itemIndex !== -1 ? items.value[itemIndex] : null

    try {
      const result = await inventoryAPI.markAsUsedByLoginCode(itemId, loginCode)

      // Remove item from local state for immediate UI update (consumed items are removed)
      if (itemIndex !== -1) {
        items.value.splice(itemIndex, 1)
      }

      // Update cache timestamp
      lastFetch.value = Date.now()

      // Clear any previous errors on successful action
      error.value = null

      return result
    } catch (err) {
      // Rollback optimistic update on error
      if (itemToRemove && itemIndex !== -1) {
        items.value.splice(itemIndex, 0, itemToRemove)
      }

      const errorMessage = 'mark the item as used via login code'

      if (err instanceof InventoryAPIError) {
        error.value = err.message
      } else if (err instanceof Error && err.message.includes('network')) {
        error.value = 'Network error - item not marked as used'
      } else {
        error.value = 'Failed to mark item as used. Please try again.'
      }
      logger.error(`Failed to ${errorMessage}`, err)
      return null
    } finally {
      isLoading.value = false
    }
  }

  async function markItemAsUsed(itemId: string): Promise<ImpactData | null> {
    isLoading.value = true
    error.value = null

    // Store item reference for potential rollback
    const itemIndex = items.value.findIndex(item => item.id === itemId)
    const itemToRemove = itemIndex !== -1 ? items.value[itemIndex] : null

    try {
      const impactData = await inventoryAPI.markAsUsed(itemId)

      // Remove item from local state for immediate UI update
      if (itemIndex !== -1) {
        items.value.splice(itemIndex, 1)
      }

      // Update cache timestamp
      lastFetch.value = Date.now()

      // Clear any previous errors on successful action
      error.value = null

      return impactData
    } catch (err) {
      // Rollback optimistic update on error
      if (itemToRemove && itemIndex !== -1) {
        items.value.splice(itemIndex, 0, itemToRemove)
      }

      const errorMessage = 'mark the item as used'

      if (err instanceof InventoryAPIError) {
        error.value = err.message
      } else if (err instanceof Error && err.message.includes('network')) {
        error.value = 'Network error - item not marked as used'
      } else {
        error.value = 'Failed to mark item as used. Please try again.'
      }
      logger.error(`Failed to ${errorMessage}`, err)
      return null
    } finally {
      isLoading.value = false
    }
  }

  async function deleteItem(itemId: string): Promise<boolean> {
    isLoading.value = true
    error.value = null

    // Store item reference for potential rollback
    const itemIndex = items.value.findIndex(item => item.id === itemId)
    const itemToDelete = itemIndex !== -1 ? items.value[itemIndex] : null

    try {
      await inventoryAPI.deleteItem(itemId)

      // Remove item from local state for immediate UI update
      if (itemIndex !== -1) {
        items.value.splice(itemIndex, 1)
      }

      // Update cache timestamp
      lastFetch.value = Date.now()

      // Clear any previous errors on successful delete
      error.value = null

      return true
    } catch (err) {
      // Rollback optimistic update on error
      if (itemToDelete && itemIndex !== -1) {
        items.value.splice(itemIndex, 0, itemToDelete)
      }

      const errorMessage = 'delete the item'

      if (err instanceof InventoryAPIError) {
        error.value = err.message
      } else if (err instanceof Error && err.message.includes('network')) {
        error.value = 'Network error - item not deleted'
      } else {
        error.value = 'Failed to delete item. Please try again.'
      }
      logger.error(`Failed to ${errorMessage}`, err)
      return false
    } finally {
      isLoading.value = false
    }
  }

  function updateFilter(filter: FilterType): void {
    currentFilter.value = filter
  }

  function clearError(): void {
    error.value = null
  }

  function invalidateCache(): void {
    lastFetch.value = null
  }

  // Helper to get item by ID
  function getItemById(itemId: string): InventoryItem | undefined {
    return items.value.find(item => item.id === itemId)
  }

  // Helper to get items expiring soon (within 3 days)
  const itemsExpiringSoon = computed(() => {
    return activeItems.value.filter(item => {
      const status = getFreshnessStatus(item.expiryDate)
      return status === 'warning' || status === 'expired'
    })
  })

  return {
    // State
    items,
    isLoading,
    error,
    currentFilter,
    lastFetch,

    // Getters
    activeItems,
    itemsByFilter,
    inventoryCounts,
    itemsExpiringSoon,
    isCacheValid,

    // Actions
    fetchInventory,
    fetchInventoryByLoginCode,
    addItem,
    addItemToInventory,
    addItemByLoginCode,
    markItemAsUsed,
    markItemAsUsedByLoginCode,
    deleteItem,
    updateFilter,
    clearError,
    invalidateCache,
    getItemById
  }
})
