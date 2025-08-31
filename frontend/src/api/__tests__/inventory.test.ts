// Inventory API Service Tests
// Use-It-Up PWA Frontend

import { describe, it, expect, vi, beforeEach } from 'vitest'
import inventoryAPI, { InventoryAPIError } from '../inventory'
import apiClient from '../axios'

// Mock the axios client and retry function
vi.mock('../axios', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn()
  },
  retryRequest: vi.fn((fn) => fn()) // Simple mock that just calls the function
}))

// Mock environment config
vi.mock('../config/environment', () => ({
  isDevelopment: () => true,
  config: {
    retryAttempts: 2,
    retryDelay: 100
  }
}))

const mockApiClient = vi.mocked(apiClient) as any

describe('Inventory API Service', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('getInventory', () => {
    it('should fetch inventory items successfully', async () => {
      const mockItems = [
        {
          id: '1',
          userId: 'user1',
          itemId: 'milk-001',
          name: 'Milk',
          category: 'Dairy',
          quantity: 1,
          unit: 'L',
          addedDate: '2024-01-01',
          expiryDate: '2024-01-08',
          status: 'active',
          createdAt: '2024-01-01T00:00:00Z',
          updatedAt: '2024-01-01T00:00:00Z'
        }
      ]

      mockApiClient.get.mockResolvedValueOnce({ data: mockItems })

      const result = await inventoryAPI.getInventory('user1')

      expect(mockApiClient.get).toHaveBeenCalledWith('/inventory', {
        params: { userId: 'user1' }
      })
      expect(result).toEqual(mockItems)
    })

    it('should throw error when userId is missing', async () => {
      await expect(inventoryAPI.getInventory('')).rejects.toThrow(InventoryAPIError)
    })

    it('should throw error when response is not an array', async () => {
      mockApiClient.get.mockResolvedValueOnce({ data: {} })

      await expect(inventoryAPI.getInventory('user1')).rejects.toThrow(InventoryAPIError)
    })
  })

  describe('addItem', () => {
    it('should add item successfully', async () => {
      const itemData = {
        userId: 'user1',
        itemId: 'milk-001',
        quantity: 1
      }

      const mockResponse = {
        id: '1',
        ...itemData,
        name: 'Milk',
        category: 'Dairy',
        unit: 'L',
        addedDate: '2024-01-01',
        expiryDate: '2024-01-08',
        status: 'active',
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z'
      }

      mockApiClient.post.mockResolvedValueOnce({ data: mockResponse })

      const result = await inventoryAPI.addItem(itemData)

      expect(mockApiClient.post).toHaveBeenCalledWith('/inventory', {
        userId: 'user1',
        itemId: 'milk-001',
        quantity: 1,
        customExpiryDate: null,
        notes: ''
      })
      expect(result).toEqual(mockResponse)
    })

    it('should throw error when required fields are missing', async () => {
      await expect(inventoryAPI.addItem({ userId: '', itemId: 'milk-001' })).rejects.toThrow(InventoryAPIError)
      await expect(inventoryAPI.addItem({ userId: 'user1', itemId: '' })).rejects.toThrow(InventoryAPIError)
    })
  })

  describe('markAsUsed', () => {
    it('should mark item as used successfully', async () => {
      const mockImpact = {
        itemId: '1',
        itemName: 'Milk',
        moneySaved: 4.50,
        co2Avoided: 1.9,
        actionType: 'used' as const,
        timestamp: '2024-01-01T00:00:00Z'
      }

      mockApiClient.put.mockResolvedValueOnce({ data: mockImpact })

      const result = await inventoryAPI.markAsUsed('1')

      expect(mockApiClient.put).toHaveBeenCalledWith('/inventory/1/use')
      expect(result).toEqual(mockImpact)
    })

    it('should throw error when itemId is missing', async () => {
      await expect(inventoryAPI.markAsUsed('')).rejects.toThrow(InventoryAPIError)
    })
  })

  describe('deleteItem', () => {
    it('should delete item successfully', async () => {
      mockApiClient.delete.mockResolvedValueOnce({ data: null })

      await inventoryAPI.deleteItem('1')

      expect(mockApiClient.delete).toHaveBeenCalledWith('/inventory/1')
    })

    it('should throw error when itemId is missing', async () => {
      await expect(inventoryAPI.deleteItem('')).rejects.toThrow(InventoryAPIError)
    })
  })

  describe('getTotalImpact', () => {
    it('should fetch total impact successfully', async () => {
      const mockImpact = {
        totalMoneySaved: 45.50,
        totalCo2Avoided: 19.5,
        itemsUsed: 10
      }

      mockApiClient.get.mockResolvedValueOnce({ data: mockImpact })

      const result = await inventoryAPI.getTotalImpact('user1')

      expect(mockApiClient.get).toHaveBeenCalledWith('/impact', {
        params: { userId: 'user1' }
      })
      expect(result).toEqual(mockImpact)
    })

    it('should throw error when userId is missing', async () => {
      await expect(inventoryAPI.getTotalImpact('')).rejects.toThrow(InventoryAPIError)
    })
  })

  describe('healthCheck', () => {
    it('should return true when API is healthy', async () => {
      mockApiClient.get.mockResolvedValueOnce({ status: 200 })

      const result = await inventoryAPI.healthCheck()

      expect(mockApiClient.get).toHaveBeenCalledWith('/health')
      expect(result).toBe(true)
    })

    it('should return false when API is unhealthy', async () => {
      mockApiClient.get.mockRejectedValueOnce(new Error('Network error'))

      const result = await inventoryAPI.healthCheck()

      expect(result).toBe(false)
    })
  })
})
