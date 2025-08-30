// Inventory Store Tests
// Use-It-Up PWA Frontend

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useInventoryStore } from '../inventory'
import inventoryAPI, { InventoryAPIError, type InventoryItem, type AddItemRequest, type ImpactData } from '@/api/inventory'

// Mock the API module
vi.mock('@/api/inventory', () => ({
  default: {
    getInventory: vi.fn(),
    addItem: vi.fn(),
    markAsUsed: vi.fn(),
    deleteItem: vi.fn()
  },
  InventoryAPIError: class extends Error {
    constructor(message: string, public statusCode?: number) {
      super(message)
      this.name = 'InventoryAPIError'
    }
  }
}))

// Mock utility functions
vi.mock('@/utils/dateHelpers', () => ({
  calculateDaysUntilExpiry: vi.fn((date: string) => {
    // Mock implementation for testing
    const expiryDate = new Date(date)
    const today = new Date('2024-01-05T00:00:00Z') // Fixed date for consistent testing
    const diffTime = expiryDate.getTime() - today.getTime()
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24))
  })
}))

vi.mock('@/utils/errorHandler', () => ({
  handleAPIError: vi.fn(),
  handleNetworkError: vi.fn()
}))

describe('Inventory Store', () => {
  const mockInventoryItems: InventoryItem[] = [
    {
      id: 'item-1',
      userId: 'user-1',
      itemId: 'milk-001',
      name: 'Milk',
      category: 'Dairy',
      quantity: 1,
      unit: 'L',
      addedDate: '2024-01-01T00:00:00Z',
      expiryDate: '2024-01-10T00:00:00Z', // 5 days from mock today (fresh)
      status: 'active',
      notes: '',
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-01T00:00:00Z'
    },
    {
      id: 'item-2',
      userId: 'user-1',
      itemId: 'bread-001',
      name: 'Bread',
      category: 'Bakery',
      quantity: 1,
      unit: 'loaf',
      addedDate: '2024-01-02T00:00:00Z',
      expiryDate: '2024-01-07T00:00:00Z', // 2 days from mock today (warning)
      status: 'active',
      notes: '',
      createdAt: '2024-01-02T00:00:00Z',
      updatedAt: '2024-01-02T00:00:00Z'
    },
    {
      id: 'item-3',
      userId: 'user-1',
      itemId: 'banana-001',
      name: 'Bananas',
      category: 'Fruit',
      quantity: 2,
      unit: 'bunch',
      addedDate: '2024-01-01T00:00:00Z',
      expiryDate: '2024-01-03T00:00:00Z', // -2 days from mock today (expired)
      status: 'active',
      notes: '',
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-01T00:00:00Z'
    },
    {
      id: 'item-4',
      userId: 'user-1',
      itemId: 'cheese-001',
      name: 'Cheese',
      category: 'Dairy',
      quantity: 1,
      unit: 'block',
      addedDate: '2024-01-01T00:00:00Z',
      expiryDate: '2024-01-08T00:00:00Z',
      status: 'used', // Not active
      notes: '',
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-01T00:00:00Z'
    }
  ]

  const mockAddItemRequest: AddItemRequest = {
    userId: 'user-1',
    itemId: 'apple-001',
    quantity: 3,
    customExpiryDate: '2024-01-15T00:00:00Z',
    notes: 'Fresh apples'
  }

  const mockNewItem: InventoryItem = {
    id: 'item-5',
    userId: 'user-1',
    itemId: 'apple-001',
    name: 'Apples',
    category: 'Fruit',
    quantity: 3,
    unit: 'kg',
    addedDate: '2024-01-05T00:00:00Z',
    expiryDate: '2024-01-15T00:00:00Z',
    status: 'active',
    notes: 'Fresh apples',
    createdAt: '2024-01-05T00:00:00Z',
    updatedAt: '2024-01-05T00:00:00Z'
  }

  const mockImpactData: ImpactData = {
    itemId: 'item-1',
    itemName: 'Milk',
    moneySaved: 4.50,
    co2Avoided: 1.2,
    actionType: 'used',
    timestamp: '2024-01-05T12:00:00Z'
  }

  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()

    // Reset API mocks to default successful responses
    vi.mocked(inventoryAPI.getInventory).mockResolvedValue(mockInventoryItems)
    vi.mocked(inventoryAPI.addItem).mockResolvedValue(mockNewItem)
    vi.mocked(inventoryAPI.markAsUsed).mockResolvedValue(mockImpactData)
    vi.mocked(inventoryAPI.deleteItem).mockResolvedValue(undefined)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('Initial State', () => {
    it('has correct initial state', () => {
      const store = useInventoryStore()

      expect(store.items).toEqual([])
      expect(store.isLoading).toBe(false)
      expect(store.error).toBe(null)
      expect(store.currentFilter).toBe('all')
      expect(store.lastFetch).toBe(null)
    })
  })

  describe('Computed Properties', () => {
    it('activeItems filters out non-active items', () => {
      const store = useInventoryStore()
      store.items = mockInventoryItems

      const activeItems = store.activeItems
      expect(activeItems).toHaveLength(3) // Excludes the 'used' item
      expect(activeItems.every(item => item.status === 'active')).toBe(true)
    })

    it('itemsByFilter returns all items when filter is "all"', () => {
      const store = useInventoryStore()
      store.items = mockInventoryItems
      store.currentFilter = 'all'

      const filteredItems = store.itemsByFilter
      expect(filteredItems).toHaveLength(3) // Only active items
    })

    it('itemsByFilter returns fresh items when filter is "fresh"', () => {
      const store = useInventoryStore()
      store.items = mockInventoryItems
      store.currentFilter = 'fresh'

      const filteredItems = store.itemsByFilter
      expect(filteredItems).toHaveLength(1)
      expect(filteredItems[0].name).toBe('Milk') // Only fresh item
    })

    it('itemsByFilter returns warning items when filter is "warning"', () => {
      const store = useInventoryStore()
      store.items = mockInventoryItems
      store.currentFilter = 'warning'

      const filteredItems = store.itemsByFilter
      expect(filteredItems).toHaveLength(1)
      expect(filteredItems[0].name).toBe('Bread') // Only warning item
    })

    it('itemsByFilter returns expired items when filter is "expired"', () => {
      const store = useInventoryStore()
      store.items = mockInventoryItems
      store.currentFilter = 'expired'

      const filteredItems = store.itemsByFilter
      expect(filteredItems).toHaveLength(1)
      expect(filteredItems[0].name).toBe('Bananas') // Only expired item
    })

    it('inventoryCounts calculates correct counts by freshness status', () => {
      const store = useInventoryStore()
      store.items = mockInventoryItems

      const counts = store.inventoryCounts
      expect(counts.total).toBe(3) // Only active items
      expect(counts.fresh).toBe(1) // Milk
      expect(counts.warning).toBe(1) // Bread
      expect(counts.expired).toBe(1) // Bananas
    })

    it('itemsExpiringSoon returns warning and expired items', () => {
      const store = useInventoryStore()
      store.items = mockInventoryItems

      const expiringSoon = store.itemsExpiringSoon
      expect(expiringSoon).toHaveLength(2)
      expect(expiringSoon.map(item => item.name)).toEqual(['Bread', 'Bananas'])
    })

    it('isCacheValid returns false when no lastFetch', () => {
      const store = useInventoryStore()
      expect(store.isCacheValid).toBe(false)
    })

    it('isCacheValid returns true when cache is fresh', () => {
      const store = useInventoryStore()
      store.lastFetch = Date.now() - 60000 // 1 minute ago
      expect(store.isCacheValid).toBe(true)
    })

    it('isCacheValid returns false when cache is stale', () => {
      const store = useInventoryStore()
      store.lastFetch = Date.now() - 6 * 60 * 1000 // 6 minutes ago (stale)
      expect(store.isCacheValid).toBe(false)
    })
  })

  describe('Actions', () => {
    describe('fetchInventory', () => {
      it('fetches inventory successfully', async () => {
        const store = useInventoryStore()

        await store.fetchInventory('user-1')

        expect(inventoryAPI.getInventory).toHaveBeenCalledWith('user-1')
        expect(store.items).toEqual(mockInventoryItems)
        expect(store.isLoading).toBe(false)
        expect(store.error).toBe(null)
        expect(store.lastFetch).toBeTruthy()
      })

      it('sets loading state during fetch', async () => {
        const store = useInventoryStore()
        let loadingDuringFetch = false

        // Mock API to delay response so we can check loading state
        vi.mocked(inventoryAPI.getInventory).mockImplementation(async () => {
          loadingDuringFetch = store.isLoading
          return mockInventoryItems
        })

        await store.fetchInventory('user-1')

        expect(loadingDuringFetch).toBe(true)
        expect(store.isLoading).toBe(false) // Should be false after completion
      })

      it('handles API errors correctly', async () => {
        const store = useInventoryStore()
        const apiError = new InventoryAPIError('Server error', 500)
        vi.mocked(inventoryAPI.getInventory).mockRejectedValue(apiError)

        await store.fetchInventory('user-1')

        expect(store.error).toBe('Server error')
        expect(store.isLoading).toBe(false)
        expect(store.items).toEqual([]) // Should remain empty on error
      })

      it('handles network errors correctly', async () => {
        const store = useInventoryStore()
        const networkError = new Error('network error')
        vi.mocked(inventoryAPI.getInventory).mockRejectedValue(networkError)

        await store.fetchInventory('user-1')

        expect(store.error).toBe('Network error - using cached data if available')
        expect(store.isLoading).toBe(false)
      })

      it('skips fetch when cache is valid and not forcing refresh', async () => {
        const store = useInventoryStore()
        store.lastFetch = Date.now() - 60000 // 1 minute ago (valid cache)

        await store.fetchInventory('user-1', false)

        expect(inventoryAPI.getInventory).not.toHaveBeenCalled()
      })

      it('fetches when forcing refresh even with valid cache', async () => {
        const store = useInventoryStore()
        store.lastFetch = Date.now() - 60000 // 1 minute ago (valid cache)

        await store.fetchInventory('user-1', true)

        expect(inventoryAPI.getInventory).toHaveBeenCalledWith('user-1')
      })
    })

    describe('addItem', () => {
      it('adds item successfully', async () => {
        const store = useInventoryStore()

        const result = await store.addItem(mockAddItemRequest)

        expect(inventoryAPI.addItem).toHaveBeenCalledWith(mockAddItemRequest)
        expect(result).toEqual(mockNewItem)
        expect(store.items).toContain(mockNewItem)
        expect(store.error).toBe(null)
        expect(store.lastFetch).toBeTruthy()
      })

      it('handles add item API errors', async () => {
        const store = useInventoryStore()
        const apiError = new InventoryAPIError('Validation error', 400)
        vi.mocked(inventoryAPI.addItem).mockRejectedValue(apiError)

        const result = await store.addItem(mockAddItemRequest)

        expect(result).toBe(null)
        expect(store.error).toBe('Validation error')
        expect(store.items).not.toContain(mockNewItem)
      })

      it('handles add item network errors', async () => {
        const store = useInventoryStore()
        const networkError = new Error('network timeout')
        vi.mocked(inventoryAPI.addItem).mockRejectedValue(networkError)

        const result = await store.addItem(mockAddItemRequest)

        expect(result).toBe(null)
        expect(store.error).toBe('Network error - item not added')
      })
    })

    describe('markItemAsUsed', () => {
      it('marks item as used successfully', async () => {
        const store = useInventoryStore()
        store.items = [...mockInventoryItems]

        const result = await store.markItemAsUsed('item-1')

        expect(inventoryAPI.markAsUsed).toHaveBeenCalledWith('item-1')
        expect(result).toEqual(mockImpactData)
        expect(store.items.find(item => item.id === 'item-1')).toBeUndefined()
        expect(store.error).toBe(null)
      })

      it('performs optimistic update and rollback on error', async () => {
        const store = useInventoryStore()
        store.items = [...mockInventoryItems]
        const originalItemCount = store.items.length

        const apiError = new InventoryAPIError('Server error', 500)
        vi.mocked(inventoryAPI.markAsUsed).mockRejectedValue(apiError)

        const result = await store.markItemAsUsed('item-1')

        expect(result).toBe(null)
        expect(store.error).toBe('Server error')
        expect(store.items).toHaveLength(originalItemCount) // Rollback occurred
        expect(store.items.find(item => item.id === 'item-1')).toBeTruthy() // Item restored
      })

      it('handles marking non-existent item', async () => {
        const store = useInventoryStore()
        store.items = [...mockInventoryItems]

        const result = await store.markItemAsUsed('non-existent-id')

        expect(inventoryAPI.markAsUsed).toHaveBeenCalledWith('non-existent-id')
        expect(result).toEqual(mockImpactData)
        // No item should be removed since it didn't exist
        expect(store.items).toHaveLength(mockInventoryItems.length)
      })
    })

    describe('deleteItem', () => {
      it('deletes item successfully', async () => {
        const store = useInventoryStore()
        store.items = [...mockInventoryItems]

        const result = await store.deleteItem('item-1')

        expect(inventoryAPI.deleteItem).toHaveBeenCalledWith('item-1')
        expect(result).toBe(true)
        expect(store.items.find(item => item.id === 'item-1')).toBeUndefined()
        expect(store.error).toBe(null)
      })

      it('performs optimistic update and rollback on error', async () => {
        const store = useInventoryStore()
        store.items = [...mockInventoryItems]
        const originalItemCount = store.items.length

        const apiError = new InventoryAPIError('Delete failed', 500)
        vi.mocked(inventoryAPI.deleteItem).mockRejectedValue(apiError)

        const result = await store.deleteItem('item-1')

        expect(result).toBe(false)
        expect(store.error).toBe('Delete failed')
        expect(store.items).toHaveLength(originalItemCount) // Rollback occurred
        expect(store.items.find(item => item.id === 'item-1')).toBeTruthy() // Item restored
      })
    })

    describe('updateFilter', () => {
      it('updates current filter', () => {
        const store = useInventoryStore()

        store.updateFilter('fresh')
        expect(store.currentFilter).toBe('fresh')

        store.updateFilter('warning')
        expect(store.currentFilter).toBe('warning')

        store.updateFilter('expired')
        expect(store.currentFilter).toBe('expired')

        store.updateFilter('all')
        expect(store.currentFilter).toBe('all')
      })
    })

    describe('clearError', () => {
      it('clears error state', () => {
        const store = useInventoryStore()
        store.error = 'Some error'

        store.clearError()
        expect(store.error).toBe(null)
      })
    })

    describe('invalidateCache', () => {
      it('invalidates cache by clearing lastFetch', () => {
        const store = useInventoryStore()
        store.lastFetch = Date.now()

        store.invalidateCache()
        expect(store.lastFetch).toBe(null)
      })
    })

    describe('getItemById', () => {
      it('returns item when found', () => {
        const store = useInventoryStore()
        store.items = mockInventoryItems

        const item = store.getItemById('item-1')
        expect(item).toEqual(mockInventoryItems[0])
      })

      it('returns undefined when item not found', () => {
        const store = useInventoryStore()
        store.items = mockInventoryItems

        const item = store.getItemById('non-existent')
        expect(item).toBeUndefined()
      })
    })
  })

  describe('Error Handling and Loading States', () => {
    it('manages loading state correctly across multiple actions', async () => {
      const store = useInventoryStore()

      // Start multiple actions
      const fetchPromise = store.fetchInventory('user-1')
      const addPromise = store.addItem(mockAddItemRequest)

      // Both should set loading to true
      expect(store.isLoading).toBe(true)

      await Promise.all([fetchPromise, addPromise])

      // Loading should be false after all complete
      expect(store.isLoading).toBe(false)
    })

    it('clears error on successful operations after previous errors', async () => {
      const store = useInventoryStore()

      // Set initial error
      store.error = 'Previous error'

      // Successful operation should clear error
      await store.fetchInventory('user-1')

      expect(store.error).toBe(null)
    })

    it('handles generic errors gracefully', async () => {
      const store = useInventoryStore()
      const genericError = new Error('Generic error')
      vi.mocked(inventoryAPI.getInventory).mockRejectedValue(genericError)

      await store.fetchInventory('user-1')

      expect(store.error).toBe('Failed to fetch inventory. Please try again.')
    })
  })
})
