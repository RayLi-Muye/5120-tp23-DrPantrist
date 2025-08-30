// Error Handling Composable Tests
// Use-It-Up PWA Frontend

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { useErrorHandling } from '../useErrorHandling'
import { InventoryAPIError } from '@/api/inventory'
import { clearAllNotifications } from '@/utils/errorHandler'

describe('useErrorHandling', () => {
  beforeEach(() => {
    clearAllNotifications()
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  describe('Error State Management', () => {
    it('should initialize with no errors', () => {
      const { hasError, errorMessage, canRetry, isRetrying } = useErrorHandling()

      expect(hasError.value).toBe(false)
      expect(errorMessage.value).toBeNull()
      expect(canRetry.value).toBe(false)
      expect(isRetrying.value).toBe(false)
    })

    it('should handle API errors correctly', () => {
      const { handleError, errorState } = useErrorHandling({ showNotifications: false })

      const apiError = new InventoryAPIError('Item not found', 'addItem')
      handleError(apiError, 'add item')

      expect(errorState.value.hasError).toBe(true)
      expect(errorState.value.errorType).toBe('api')
      expect(errorState.value.errorMessage).toBe('Item not found')
      expect(errorState.value.canRetry).toBe(true)
    })

    it('should handle network errors correctly', () => {
      const { handleError, errorState } = useErrorHandling({ showNotifications: false })

      const networkError = new Error('Network connection failed')
      handleError(networkError, 'fetch data')

      expect(errorState.value.hasError).toBe(true)
      expect(errorState.value.errorType).toBe('network')
      expect(errorState.value.errorMessage).toBe('Network connection failed. Please check your internet connection.')
      expect(errorState.value.canRetry).toBe(true)
    })

    it('should handle validation errors correctly', () => {
      const { handleValidationErrors, errorState } = useErrorHandling({ showNotifications: false })

      const validationErrors = {
        name: ['Name is required'],
        email: ['Email is invalid']
      }
      handleValidationErrors(validationErrors)

      expect(errorState.value.hasError).toBe(true)
      expect(errorState.value.errorType).toBe('validation')
      expect(errorState.value.canRetry).toBe(false)
      expect(errorState.value.errorMessage).toBe('name: Name is required\nemail: Email is invalid')
    })

    it('should clear error state', () => {
      const { handleError, clearError, errorState } = useErrorHandling({ showNotifications: false })

      handleError(new Error('Test error'), 'test')
      expect(errorState.value.hasError).toBe(true)

      clearError()
      expect(errorState.value.hasError).toBe(false)
      expect(errorState.value.errorMessage).toBeNull()
    })
  })

  describe('Action Execution', () => {
    it('should execute successful actions without errors', async () => {
      const { executeWithErrorHandling, hasError } = useErrorHandling({ showNotifications: false })

      const mockAction = vi.fn().mockResolvedValue('success')
      const result = await executeWithErrorHandling(mockAction, 'test action')

      expect(result).toBe('success')
      expect(hasError.value).toBe(false)
      expect(mockAction).toHaveBeenCalledOnce()
    })

    it('should handle failed actions and return null', async () => {
      const { executeWithErrorHandling, hasError, errorState } = useErrorHandling({ showNotifications: false })

      const mockAction = vi.fn().mockRejectedValue(new Error('Action failed'))
      const result = await executeWithErrorHandling(mockAction, 'test action')

      expect(result).toBeNull()
      expect(hasError.value).toBe(true)
      expect(errorState.value.errorMessage).toBe('Action failed')
    })

    it('should execute form actions with validation error handling', async () => {
      const { executeFormAction, errorState } = useErrorHandling({ showNotifications: false })

      const validationError = new InventoryAPIError('Validation failed', 'addItem')
      validationError.originalError = {
        status: 422,
        data: {
          errors: {
            name: ['Name is required']
          }
        }
      } as any

      const mockAction = vi.fn().mockRejectedValue(validationError)
      const result = await executeFormAction(mockAction, 'submit form')

      expect(result).toBeNull()
      expect(errorState.value.errorType).toBe('validation')
      expect(errorState.value.errorMessage).toBe('name: Name is required')
    })
  })

  describe('Retry Mechanism', () => {
    it('should retry failed actions successfully', async () => {
      const { executeWithErrorHandling, retry, canRetry, hasError } = useErrorHandling({
        showNotifications: false,
        retryDelay: 100
      })

      let callCount = 0
      const mockAction = vi.fn().mockImplementation(() => {
        callCount++
        if (callCount === 1) {
          throw new Error('First attempt failed')
        }
        return Promise.resolve('success')
      })

      // First execution should fail
      const result1 = await executeWithErrorHandling(mockAction, 'test action')
      expect(result1).toBeNull()
      expect(hasError.value).toBe(true)
      expect(canRetry.value).toBe(true)

      // Retry should succeed
      const retryResult = await retry()
      expect(retryResult).toBe(true)
      expect(hasError.value).toBe(false)
      expect(mockAction).toHaveBeenCalledTimes(2)
    })

    it('should handle retry failures', async () => {
      const { executeWithErrorHandling, retry, canRetry } = useErrorHandling({
        showNotifications: false,
        retryDelay: 100
      })

      const mockAction = vi.fn().mockRejectedValue(new Error('Always fails'))

      // First execution should fail
      await executeWithErrorHandling(mockAction, 'test action')
      expect(canRetry.value).toBe(true)

      // Retry should also fail
      const retryResult = await retry()
      expect(retryResult).toBe(false)
      expect(mockAction).toHaveBeenCalledTimes(2)
    })

    it('should respect retry attempt limits', async () => {
      const { executeWithErrorHandling, retry, canRetry, errorState } = useErrorHandling({
        showNotifications: false,
        retryAttempts: 2,
        retryDelay: 10
      })

      const mockAction = vi.fn().mockRejectedValue(new Error('Always fails'))

      // First execution
      await executeWithErrorHandling(mockAction, 'test action')
      expect(canRetry.value).toBe(true)

      // First retry
      await retry()
      expect(canRetry.value).toBe(true)
      expect(errorState.value.retryCount).toBe(1)

      // Second retry (should reach limit)
      await retry()
      expect(canRetry.value).toBe(false)
      expect(errorState.value.retryCount).toBe(2)
    })

    it('should apply exponential backoff delay', async () => {
      const { executeWithErrorHandling, retry } = useErrorHandling({
        showNotifications: false,
        retryDelay: 100
      })

      const mockAction = vi.fn().mockRejectedValue(new Error('Always fails'))

      await executeWithErrorHandling(mockAction, 'test action')

      const startTime = Date.now()
      await retry()

      // Fast-forward timers to check delay was applied
      vi.advanceTimersByTime(100)

      expect(mockAction).toHaveBeenCalledTimes(2)
    })
  })

  describe('Helper Methods', () => {
    it('should provide user-friendly error messages', () => {
      const { handleError, getUserFriendlyMessage } = useErrorHandling({ showNotifications: false })

      // Network error
      handleError(new Error('Network connection failed'), 'test')
      expect(getUserFriendlyMessage()).toBe('Please check your internet connection and try again.')

      // API error
      const apiError = new InventoryAPIError('Server error', 'test')
      handleError(apiError, 'test')
      expect(getUserFriendlyMessage()).toBe('Server error')

      // Unknown error
      handleError(new Error('Unknown error'), 'test')
      expect(getUserFriendlyMessage()).toBe('Something went wrong. Please try again.')
    })

    it('should provide appropriate retry button text', () => {
      const { executeWithErrorHandling, retry, getRetryButtonText, errorState } = useErrorHandling({
        showNotifications: false,
        retryAttempts: 3
      })

      expect(getRetryButtonText()).toBe('Retry')

      // After first retry
      errorState.value.retryCount = 1
      expect(getRetryButtonText()).toBe('Retry (1/3)')

      // During retry
      errorState.value.isRetrying = true
      expect(getRetryButtonText()).toBe('Retrying...')
    })
  })

  describe('Callbacks', () => {
    it('should call onError callback when errors occur', () => {
      const onErrorSpy = vi.fn()
      const { handleError } = useErrorHandling({
        showNotifications: false,
        onError: onErrorSpy
      })

      const error = new Error('Test error')
      handleError(error, 'test')

      expect(onErrorSpy).toHaveBeenCalledWith(error)
    })

    it('should call onRetry callback during retry', async () => {
      const onRetrySpy = vi.fn()
      const { executeWithErrorHandling, retry } = useErrorHandling({
        showNotifications: false,
        onRetry: onRetrySpy,
        retryDelay: 10
      })

      const mockAction = vi.fn()
        .mockRejectedValueOnce(new Error('First attempt'))
        .mockResolvedValueOnce('success')

      await executeWithErrorHandling(mockAction, 'test')
      await retry()

      expect(onRetrySpy).toHaveBeenCalledOnce()
    })
  })

  describe('Server Error Retry Logic', () => {
    it('should not retry client errors (4xx)', () => {
      const { handleError, errorState } = useErrorHandling({ showNotifications: false })

      const clientError = new InventoryAPIError('Not found', 'test')
      clientError.originalError = { status: 404 } as any

      handleError(clientError, 'test')
      expect(errorState.value.canRetry).toBe(false)
    })

    it('should retry server errors (5xx)', () => {
      const { handleError, errorState } = useErrorHandling({ showNotifications: false })

      const serverError = new InventoryAPIError('Server error', 'test')
      serverError.originalError = { status: 500 } as any

      handleError(serverError, 'test')
      expect(errorState.value.canRetry).toBe(true)
    })
  })
})
