// Error Handler Tests
// Use-It-Up PWA Frontend

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import {
  addErrorNotification,
  removeErrorNotification,
  clearAllNotifications,
  handleAPIError,
  handleNetworkError,
  handleValidationError,
  handleAuthError,
  errorNotifications,
  networkStatus,
  initializeErrorHandler
} from '../errorHandler'
import { InventoryAPIError } from '@/api/inventory'

// Mock navigator.onLine
Object.defineProperty(navigator, 'onLine', {
  writable: true,
  value: true
})

// Mock window events
const mockEventListeners: { [key: string]: EventListener[] } = {}
const originalAddEventListener = window.addEventListener
const originalRemoveEventListener = window.removeEventListener

beforeEach(() => {
  // Clear notifications before each test
  clearAllNotifications()

  // Reset network status
  networkStatus.value = {
    isOnline: true,
    lastOnline: new Date(),
    connectionType: null
  }

  // Mock addEventListener
  window.addEventListener = vi.fn((event: string, listener: EventListener) => {
    if (!mockEventListeners[event]) {
      mockEventListeners[event] = []
    }
    mockEventListeners[event].push(listener)
  })

  // Mock removeEventListener
  window.removeEventListener = vi.fn()

  // Mock setTimeout and clearTimeout
  vi.useFakeTimers()
})

afterEach(() => {
  // Restore original functions
  window.addEventListener = originalAddEventListener
  window.removeEventListener = originalRemoveEventListener

  // Clear mock event listeners
  Object.keys(mockEventListeners).forEach(key => {
    delete mockEventListeners[key]
  })

  vi.useRealTimers()
})

describe('Error Handler', () => {
  describe('addErrorNotification', () => {
    it('should add error notification with correct properties', () => {
      const id = addErrorNotification({
        type: 'error',
        title: 'Test Error',
        message: 'This is a test error message'
      })

      expect(errorNotifications.value).toHaveLength(1)
      expect(errorNotifications.value[0]).toMatchObject({
        id,
        type: 'error',
        title: 'Test Error',
        message: 'This is a test error message'
      })
      expect(errorNotifications.value[0].timestamp).toBeInstanceOf(Date)
    })

    it('should auto-remove non-persistent notifications', () => {
      addErrorNotification({
        type: 'info',
        title: 'Test Info',
        message: 'This should auto-remove',
        persistent: false
      })

      expect(errorNotifications.value).toHaveLength(1)

      // Fast-forward time by 5 seconds
      vi.advanceTimersByTime(5000)

      expect(errorNotifications.value).toHaveLength(0)
    })

    it('should not auto-remove persistent notifications', () => {
      addErrorNotification({
        type: 'warning',
        title: 'Test Warning',
        message: 'This should persist',
        persistent: true
      })

      expect(errorNotifications.value).toHaveLength(1)

      // Fast-forward time by 10 seconds
      vi.advanceTimersByTime(10000)

      expect(errorNotifications.value).toHaveLength(1)
    })
  })

  describe('removeErrorNotification', () => {
    it('should remove notification by ID', () => {
      const id1 = addErrorNotification({
        type: 'error',
        title: 'Error 1',
        message: 'First error'
      })

      const id2 = addErrorNotification({
        type: 'error',
        title: 'Error 2',
        message: 'Second error'
      })

      expect(errorNotifications.value).toHaveLength(2)

      removeErrorNotification(id1)

      expect(errorNotifications.value).toHaveLength(1)
      expect(errorNotifications.value[0].id).toBe(id2)
    })

    it('should handle non-existent ID gracefully', () => {
      addErrorNotification({
        type: 'error',
        title: 'Test Error',
        message: 'Test message'
      })

      expect(errorNotifications.value).toHaveLength(1)

      removeErrorNotification('non-existent-id')

      expect(errorNotifications.value).toHaveLength(1)
    })
  })

  describe('clearAllNotifications', () => {
    it('should clear all notifications', () => {
      addErrorNotification({
        type: 'error',
        title: 'Error 1',
        message: 'First error'
      })

      addErrorNotification({
        type: 'warning',
        title: 'Warning 1',
        message: 'First warning'
      })

      expect(errorNotifications.value).toHaveLength(2)

      clearAllNotifications()

      expect(errorNotifications.value).toHaveLength(0)
    })
  })

  describe('handleAPIError', () => {
    it('should handle InventoryAPIError correctly', () => {
      const apiError = new InventoryAPIError('Item not found', 'addItem')

      const id = handleAPIError(apiError, 'add item')

      expect(errorNotifications.value).toHaveLength(1)
      expect(errorNotifications.value[0]).toMatchObject({
        id,
        type: 'error',
        title: 'Failed to add item',
        message: 'Item not found'
      })
    })

    it('should handle generic Error correctly', () => {
      const error = new Error('Network connection failed')

      const id = handleAPIError(error, 'fetch data')

      expect(errorNotifications.value).toHaveLength(1)
      expect(errorNotifications.value[0]).toMatchObject({
        id,
        type: 'error',
        title: 'API Error',
        message: 'Network connection failed'
      })
    })

    it('should add retry action for server errors', () => {
      const apiError = new InventoryAPIError('Server error', 'fetchInventory')
      apiError.originalError = { status: 500 } as any

      handleAPIError(apiError, 'fetch inventory')

      expect(errorNotifications.value[0].action).toBeDefined()
      expect(errorNotifications.value[0].action?.label).toBe('Retry')
    })
  })

  describe('handleNetworkError', () => {
    it('should create network error notification', () => {
      const error = new Error('Network error')

      const id = handleNetworkError(error, 'save data')

      expect(errorNotifications.value).toHaveLength(1)
      expect(errorNotifications.value[0]).toMatchObject({
        id,
        type: 'warning',
        title: 'Connection Problem',
        message: 'Unable to save data due to network issues. Please check your connection and try again.',
        persistent: true
      })
      expect(errorNotifications.value[0].action?.label).toBe('Retry')
    })
  })

  describe('handleValidationError', () => {
    it('should format validation errors correctly', () => {
      const errors = {
        name: ['Name is required', 'Name must be at least 2 characters'],
        email: ['Email is invalid']
      }

      const id = handleValidationError(errors)

      expect(errorNotifications.value).toHaveLength(1)
      expect(errorNotifications.value[0]).toMatchObject({
        id,
        type: 'error',
        title: 'Validation Error',
        message: 'name: Name is required, Name must be at least 2 characters\nemail: Email is invalid'
      })
    })
  })

  describe('handleAuthError', () => {
    it('should create authentication error notification', () => {
      const id = handleAuthError()

      expect(errorNotifications.value).toHaveLength(1)
      expect(errorNotifications.value[0]).toMatchObject({
        id,
        type: 'error',
        title: 'Authentication Required',
        message: 'Your session has expired. Please log in again.',
        persistent: true
      })
      expect(errorNotifications.value[0].action?.label).toBe('Login')
    })
  })

  describe('Network Status Monitoring', () => {
    it('should initialize network monitoring', () => {
      initializeErrorHandler()

      expect(window.addEventListener).toHaveBeenCalledWith('online', expect.any(Function))
      expect(window.addEventListener).toHaveBeenCalledWith('offline', expect.any(Function))
      expect(window.addEventListener).toHaveBeenCalledWith('error', expect.any(Function))
      expect(window.addEventListener).toHaveBeenCalledWith('unhandledrejection', expect.any(Function))
    })

    it('should handle online/offline events', () => {
      initializeErrorHandler()

      // Simulate going offline
      Object.defineProperty(navigator, 'onLine', { value: false })
      const offlineHandler = mockEventListeners['offline']?.[0]
      if (offlineHandler) {
        offlineHandler(new Event('offline'))
      }

      expect(networkStatus.value.isOnline).toBe(false)
      expect(errorNotifications.value).toHaveLength(1)
      expect(errorNotifications.value[0].title).toBe('Connection Lost')

      // Clear notifications for next test
      clearAllNotifications()

      // Simulate coming back online
      Object.defineProperty(navigator, 'onLine', { value: true })
      const onlineHandler = mockEventListeners['online']?.[0]
      if (onlineHandler) {
        onlineHandler(new Event('online'))
      }

      expect(networkStatus.value.isOnline).toBe(true)
      expect(errorNotifications.value).toHaveLength(1)
      expect(errorNotifications.value[0].title).toBe('Connection Restored')
    })
  })

  describe('Global Error Handling', () => {
    it('should handle unhandled JavaScript errors', () => {
      initializeErrorHandler()

      const errorEvent = new ErrorEvent('error', {
        error: new Error('Unhandled error'),
        message: 'Unhandled error'
      })

      const errorHandler = mockEventListeners['error']?.[0]
      if (errorHandler) {
        errorHandler(errorEvent)
      }

      expect(errorNotifications.value).toHaveLength(1)
      expect(errorNotifications.value[0].title).toBe('Application Error')
      expect(errorNotifications.value[0].action?.label).toBe('Refresh')
    })

    it('should handle unhandled promise rejections', () => {
      initializeErrorHandler()

      // Create a mock PromiseRejectionEvent-like object
      const rejectionEvent = {
        type: 'unhandledrejection',
        promise: Promise.reject('Unhandled rejection'),
        reason: 'Unhandled rejection'
      } as any

      const rejectionHandler = mockEventListeners['unhandledrejection']?.[0]
      if (rejectionHandler) {
        rejectionHandler(rejectionEvent)
      }

      expect(errorNotifications.value).toHaveLength(1)
      expect(errorNotifications.value[0].title).toBe('Application Error')
    })
  })
})
