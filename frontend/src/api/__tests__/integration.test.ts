// API Integration Tests with Error Scenarios
// Use-It-Up PWA Frontend

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import axios from 'axios'
import inventoryAPI, { InventoryAPIError } from '../inventory'
import { config } from '@/config/environment'

// Mock axios
vi.mock('axios')
const mockedAxios = vi.mocked(axios)

// Mock fetch for health checks
global.fetch = vi.fn()
const mockedFetch = vi.mocked(fetch)

describe('API Integration Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    // Reset API mode before each test
    inventoryAPI.resetAPIMode()

    // Mock successful axios create
    ;(mockedAxios.create as any) = vi.fn().mockReturnValue({
      defaults: { baseURL: config.apiBaseUrl },
      get: vi.fn(),
      post: vi.fn(),
      put: vi.fn(),
      delete: vi.fn()
    })
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('API Mode Detection', () => {
    it('should use real API when health check succeeds', async () => {
      // Mock successful health check
      mockedFetch.mockResolvedValueOnce({
        ok: true,
        status: 200
      } as Response)

      const result = await inventoryAPI.healthCheck()

      expect(result).toBe(true)
      expect(inventoryAPI.getCurrentAPIMode()).toBe('real')
    })

    it('should fallback to mock API when health check fails', async () => {
      // Mock failed health check
      mockedFetch.mockRejectedValueOnce(new Error('Network error'))

      const result = await inventoryAPI.healthCheck()

      expect(result).toBe(true) // Mock API should return true
      expect(inventoryAPI.getCurrentAPIMode()).toBe('mock')
    })

    it('should fallback to mock API when health check times out', async () => {
      // Mock timeout
      mockedFetch.mockImplementationOnce(() =>
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Timeout')), 100)
        )
      )

      const result = await inventoryAPI.healthCheck()

      expect(result).toBe(true)
      expect(inventoryAPI.getCurrentAPIMode()).toBe('mock')
    })
  })

  describe('Error Handling Scenarios', () => {
    it('should handle network errors gracefully', async () => {
      // Mock network error
      mockedFetch.mockRejectedValueOnce(new Error('Network error'))

      try {
        await inventoryAPI.getInventory('user123')
      } catch (error) {
        expect(error).toBeInstanceOf(InventoryAPIError)
        expect((error as InventoryAPIError).operation).toBe('fetch inventory items')
      }
    })

    it('should handle server errors with retry', async () => {
      // Mock server error
      const mockAxiosInstance = {
        defaults: { baseURL: config.apiBaseUrl },
        get: vi.fn().mockRejectedValue({
          response: { status: 500, data: { message: 'Internal server error' } },
          message: 'Server error'
        })
      }

      mockedAxios.create.mockReturnValue(mockAxiosInstance as any)

      // Mock successful health check first
      mockedFetch.mockResolvedValueOnce({
        ok: true,
        status: 200
      } as Response)

      try {
        await inventoryAPI.getInventory('user123')
      } catch (error) {
        expect(error).toBeInstanceOf(InventoryAPIError)
      }
    })

    it('should handle authentication errors', async () => {
      const mockAxiosInstance = {
        defaults: { baseURL: config.apiBaseUrl },
        get: vi.fn().mockRejectedValue({
          response: { status: 401, data: { message: 'Unauthorized' } },
          message: 'Authentication failed'
        })
      }

      mockedAxios.create.mockReturnValue(mockAxiosInstance as any)

      // Mock successful health check first
      mockedFetch.mockResolvedValueOnce({
        ok: true,
        status: 200
      } as Response)

      try {
        await inventoryAPI.getInventory('user123')
      } catch (error) {
        expect(error).toBeInstanceOf(InventoryAPIError)
        expect((error as InventoryAPIError).message).toContain('Unauthorized')
      }
    })

    it('should handle validation errors', async () => {
      const mockAxiosInstance = {
        defaults: { baseURL: config.apiBaseUrl },
        post: vi.fn().mockRejectedValue({
          response: {
            status: 400,
            data: {
              message: 'Validation failed',
              errors: {
                itemId: ['Item ID is required'],
                quantity: ['Quantity must be positive']
              }
            }
          },
          message: 'Bad request'
        })
      }

      mockedAxios.create.mockReturnValue(mockAxiosInstance as any)

      // Mock successful health check first
      mockedFetch.mockResolvedValueOnce({
        ok: true,
        status: 200
      } as Response)

      try {
        await inventoryAPI.addItem({
          userId: 'user123',
          itemId: '',
          quantity: -1
        })
      } catch (error) {
        expect(error).toBeInstanceOf(InventoryAPIError)
        expect((error as InventoryAPIError).message).toBe('Validation failed')
      }
    })
  })

  describe('Fallback Behavior', () => {
    it('should switch to mock API after real API failure', async () => {
      // Mock failed health check
      mockedFetch.mockRejectedValueOnce(new Error('Network error'))

      // First call should detect failure and switch to mock
      const result1 = await inventoryAPI.getInventory('user123')
      expect(inventoryAPI.getCurrentAPIMode()).toBe('mock')
      expect(Array.isArray(result1)).toBe(true)

      // Second call should use mock API directly
      const result2 = await inventoryAPI.getInventory('user123')
      expect(Array.isArray(result2)).toBe(true)
    })

    it('should allow manual switch to mock mode', () => {
      inventoryAPI.forceMockMode()
      expect(inventoryAPI.getCurrentAPIMode()).toBe('mock')
    })

    it('should allow resetting API mode', () => {
      inventoryAPI.forceMockMode()
      expect(inventoryAPI.getCurrentAPIMode()).toBe('mock')

      inventoryAPI.resetAPIMode()
      // Mode should be reset, will be determined on next API call
      const status = inventoryAPI.getAPIStatus()
      expect(status.initialized).toBe(false)
    })
  })

  describe('API Status Information', () => {
    it('should provide accurate API status', async () => {
      // Mock successful health check
      mockedFetch.mockResolvedValueOnce({
        ok: true,
        status: 200
      } as Response)

      await inventoryAPI.healthCheck()

      const status = inventoryAPI.getAPIStatus()
      expect(status).toMatchObject({
        mode: 'real',
        initialized: true,
        healthCheckAttempted: true,
        baseURL: config.apiBaseUrl
      })
    })

    it('should show mock mode in status after fallback', async () => {
      // Mock failed health check
      mockedFetch.mockRejectedValueOnce(new Error('Network error'))

      await inventoryAPI.healthCheck()

      const status = inventoryAPI.getAPIStatus()
      expect(status.mode).toBe('mock')
      expect(status.initialized).toBe(true)
    })
  })

  describe('Retry Mechanism', () => {
    it('should retry failed requests with exponential backoff', async () => {
      const mockAxiosInstance = {
        defaults: { baseURL: config.apiBaseUrl },
        get: vi.fn()
          .mockRejectedValueOnce(new Error('Network error'))
          .mockRejectedValueOnce(new Error('Network error'))
          .mockResolvedValueOnce({ data: [] })
      }

      mockedAxios.create.mockReturnValue(mockAxiosInstance as any)

      // Mock successful health check first
      mockedFetch.mockResolvedValueOnce({
        ok: true,
        status: 200
      } as Response)

      const result = await inventoryAPI.getInventory('user123')

      // Should have retried and eventually succeeded
      expect(mockAxiosInstance.get).toHaveBeenCalledTimes(3)
      expect(Array.isArray(result)).toBe(true)
    })

    it('should not retry client errors (4xx)', async () => {
      const mockAxiosInstance = {
        defaults: { baseURL: config.apiBaseUrl },
        get: vi.fn().mockRejectedValue({
          response: { status: 404, data: { message: 'Not found' } },
          message: 'Not found'
        })
      }

      mockedAxios.create.mockReturnValue(mockAxiosInstance as any)

      // Mock successful health check first
      mockedFetch.mockResolvedValueOnce({
        ok: true,
        status: 200
      } as Response)

      try {
        await inventoryAPI.getInventory('user123')
      } catch (error) {
        expect(error).toBeInstanceOf(InventoryAPIError)
      }

      // Should not have retried for 4xx error
      expect(mockAxiosInstance.get).toHaveBeenCalledTimes(1)
    })
  })

  describe('Input Validation', () => {
    it('should validate required parameters', async () => {
      try {
        await inventoryAPI.getInventory('')
      } catch (error) {
        expect(error).toBeInstanceOf(InventoryAPIError)
        expect((error as InventoryAPIError).message).toBe('User ID is required')
      }
    })

    it('should validate add item parameters', async () => {
      try {
        await inventoryAPI.addItem({
          userId: '',
          itemId: ''
        })
      } catch (error) {
        expect(error).toBeInstanceOf(InventoryAPIError)
        expect((error as InventoryAPIError).message).toBe('User ID and Item ID are required')
      }
    })

    it('should validate mark as used parameters', async () => {
      try {
        await inventoryAPI.markAsUsed('')
      } catch (error) {
        expect(error).toBeInstanceOf(InventoryAPIError)
        expect((error as InventoryAPIError).message).toBe('Item ID is required')
      }
    })
  })
})
