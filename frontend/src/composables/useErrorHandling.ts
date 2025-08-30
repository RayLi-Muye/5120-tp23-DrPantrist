// Error Handling Composable
// Use-It-Up PWA Frontend

import { ref, computed, type Ref } from 'vue'
import {
  handleAPIError,
  handleNetworkError,
  handleValidationError,
  addErrorNotification,
  type ErrorNotification
} from '@/utils/errorHandler'
import { InventoryAPIError } from '@/api/inventory'

export interface UseErrorHandlingOptions {
  showNotifications?: boolean
  retryAttempts?: number
  retryDelay?: number
  onError?: (error: unknown) => void
  onRetry?: () => void
}

export interface ErrorState {
  hasError: boolean
  errorMessage: string | null
  errorType: 'network' | 'validation' | 'api' | 'unknown'
  canRetry: boolean
  retryCount: number
  isRetrying: boolean
}

export function useErrorHandling(options: UseErrorHandlingOptions = {}) {
  const {
    showNotifications = true,
    retryAttempts = 3,
    retryDelay = 1000,
    onError,
    onRetry
  } = options

  // Error state
  const errorState: Ref<ErrorState> = ref({
    hasError: false,
    errorMessage: null,
    errorType: 'unknown',
    canRetry: false,
    retryCount: 0,
    isRetrying: false
  })

  // Last action for retry functionality
  const lastAction = ref<(() => Promise<unknown>) | null>(null)

  // Computed properties
  const hasError = computed(() => errorState.value.hasError)
  const errorMessage = computed(() => errorState.value.errorMessage)
  const canRetry = computed(() => errorState.value.canRetry && errorState.value.retryCount < retryAttempts)
  const isRetrying = computed(() => errorState.value.isRetrying)

  // Clear error state
  function clearError(): void {
    errorState.value = {
      hasError: false,
      errorMessage: null,
      errorType: 'unknown',
      canRetry: false,
      retryCount: 0,
      isRetrying: false
    }
    lastAction.value = null
  }

  // Handle different types of errors
  function handleError(error: unknown, context: string = 'perform action', preserveRetryCount = false): string | null {
    let notificationId: string | null = null

    // Reset retry state if this is a new error
    if (!preserveRetryCount && !errorState.value.isRetrying) {
      errorState.value.retryCount = 0
    }

    errorState.value.hasError = true
    errorState.value.isRetrying = false

    if (error instanceof InventoryAPIError) {
      errorState.value.errorType = 'api'
      errorState.value.errorMessage = error.message
      errorState.value.canRetry = error.originalError?.status ? error.originalError.status >= 500 : true

      if (showNotifications) {
        notificationId = handleAPIError(error, context)
      }
    } else if (error instanceof Error) {
      if (error.message.toLowerCase().includes('network') ||
          error.message.toLowerCase().includes('fetch') ||
          error.message.toLowerCase().includes('connection')) {
        errorState.value.errorType = 'network'
        errorState.value.errorMessage = 'Network connection failed. Please check your internet connection.'
        errorState.value.canRetry = true

        if (showNotifications) {
          notificationId = handleNetworkError(error, context)
        }
      } else {
        errorState.value.errorType = 'unknown'
        errorState.value.errorMessage = error.message
        errorState.value.canRetry = true

        if (showNotifications) {
          notificationId = addErrorNotification({
            type: 'error',
            title: 'Error',
            message: error.message
          })
        }
      }
    } else {
      errorState.value.errorType = 'unknown'
      errorState.value.errorMessage = 'An unexpected error occurred'
      errorState.value.canRetry = true

      if (showNotifications) {
        notificationId = addErrorNotification({
          type: 'error',
          title: 'Unexpected Error',
          message: 'An unexpected error occurred. Please try again.'
        })
      }
    }

    // Call error callback if provided
    if (onError) {
      onError(error)
    }

    return notificationId
  }

  // Handle validation errors specifically
  function handleValidationErrors(errors: Record<string, string[]>): string | null {
    errorState.value.hasError = true
    errorState.value.errorType = 'validation'
    errorState.value.canRetry = false
    errorState.value.isRetrying = false

    const errorMessages = Object.entries(errors)
      .map(([field, messages]) => `${field}: ${messages.join(', ')}`)
      .join('\n')

    errorState.value.errorMessage = errorMessages

    if (showNotifications) {
      return handleValidationError(errors)
    }

    return null
  }

  // Retry the last action
  async function retry(): Promise<boolean> {
    if (!canRetry.value || !lastAction.value) {
      return false
    }

    errorState.value.isRetrying = true
    errorState.value.retryCount++

    try {
      // Add exponential backoff delay
      const delay = retryDelay * Math.pow(2, errorState.value.retryCount - 1)
      await new Promise(resolve => setTimeout(resolve, delay))

      // Call retry callback if provided
      if (onRetry) {
        onRetry()
      }

      // Execute the last action
      const result = await lastAction.value()

      // Clear error state on successful retry
      clearError()
      return true
    } catch (error) {
      // Handle retry failure but preserve retry count
      handleError(error, 'retry the action', true)
      return false
    } finally {
      errorState.value.isRetrying = false
    }
  }

  // Wrapper function to execute actions with error handling
  async function executeWithErrorHandling<T>(
    action: () => Promise<T>,
    context: string = 'perform action'
  ): Promise<T | null> {
    // Store action for potential retry
    lastAction.value = action

    try {
      clearError()
      const result = await action()
      return result
    } catch (error) {
      handleError(error, context)
      return null
    }
  }

  // Wrapper for form submissions with validation error handling
  async function executeFormAction<T>(
    action: () => Promise<T>,
    context: string = 'submit form'
  ): Promise<T | null> {
    try {
      clearError()
      const result = await action()
      return result
    } catch (error) {
      // Check if it's a validation error (422 status)
      if (error instanceof InventoryAPIError &&
          error.originalError?.status === 422 &&
          error.originalError?.data?.errors) {
        handleValidationErrors(error.originalError.data.errors)
      } else {
        handleError(error, context)
      }
      return null
    }
  }

  // Get user-friendly error message
  function getUserFriendlyMessage(): string {
    if (!errorState.value.hasError) {
      return ''
    }

    switch (errorState.value.errorType) {
      case 'network':
        return 'Please check your internet connection and try again.'
      case 'validation':
        return 'Please correct the highlighted fields and try again.'
      case 'api':
        return errorState.value.errorMessage || 'A server error occurred. Please try again.'
      default:
        return 'Something went wrong. Please try again.'
    }
  }

  // Get retry button text
  function getRetryButtonText(): string {
    if (errorState.value.isRetrying) {
      return 'Retrying...'
    }

    if (errorState.value.retryCount > 0) {
      return `Retry (${errorState.value.retryCount}/${retryAttempts})`
    }

    return 'Retry'
  }

  return {
    // State
    errorState: computed(() => errorState.value),
    hasError,
    errorMessage,
    canRetry,
    isRetrying,

    // Actions
    clearError,
    handleError,
    handleValidationErrors,
    retry,
    executeWithErrorHandling,
    executeFormAction,

    // Helpers
    getUserFriendlyMessage,
    getRetryButtonText
  }
}
