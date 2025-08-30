// Global Error Handler
// Use-It-Up PWA Frontend

import { ref, type Ref } from 'vue'
import { InventoryAPIError } from '@/api/inventory'
import { isDevelopment } from '@/config/environment'

export interface ErrorNotification {
  id: string
  type: 'error' | 'warning' | 'info'
  title: string
  message: string
  timestamp: Date
  persistent?: boolean
  action?: {
    label: string
    handler: () => void
  }
}

export interface NetworkStatus {
  isOnline: boolean
  lastOnline: Date | null
  connectionType: string | null
}

// Global error state
const errorNotifications: Ref<ErrorNotification[]> = ref([])
const networkStatus: Ref<NetworkStatus> = ref({
  isOnline: navigator.onLine,
  lastOnline: navigator.onLine ? new Date() : null,
  connectionType: null
})

// Error ID generator
let errorIdCounter = 0
const generateErrorId = () => `error_${Date.now()}_${++errorIdCounter}`

// Network status monitoring
function initializeNetworkMonitoring(): void {
  const updateOnlineStatus = () => {
    const wasOnline = networkStatus.value.isOnline
    networkStatus.value.isOnline = navigator.onLine

    if (navigator.onLine) {
      networkStatus.value.lastOnline = new Date()

      // If we just came back online, show notification
      if (!wasOnline) {
        addErrorNotification({
          type: 'info',
          title: 'Connection Restored',
          message: 'You are back online. The app will sync your data.',
          persistent: false
        })
      }
    } else {
      addErrorNotification({
        type: 'warning',
        title: 'Connection Lost',
        message: 'You are offline. Some features may not work properly.',
        persistent: true
      })
    }
  }

  window.addEventListener('online', updateOnlineStatus)
  window.addEventListener('offline', updateOnlineStatus)

  // Check connection type if available
  if ('connection' in navigator) {
    const connection = (navigator as any).connection
    networkStatus.value.connectionType = connection?.effectiveType || null

    connection?.addEventListener('change', () => {
      networkStatus.value.connectionType = connection.effectiveType || null
    })
  }
}

// Add error notification
function addErrorNotification(notification: Omit<ErrorNotification, 'id' | 'timestamp'>): string {
  const id = generateErrorId()
  const fullNotification: ErrorNotification = {
    id,
    timestamp: new Date(),
    ...notification
  }

  errorNotifications.value.push(fullNotification)

  // Auto-remove non-persistent notifications after 5 seconds
  if (!notification.persistent) {
    setTimeout(() => {
      removeErrorNotification(id)
    }, 5000)
  }

  // Log error in development
  if (isDevelopment()) {
    console.error(`[Error Notification ${id}]`, fullNotification)
  }

  return id
}

// Remove error notification
function removeErrorNotification(id: string): void {
  const index = errorNotifications.value.findIndex(n => n.id === id)
  if (index !== -1) {
    errorNotifications.value.splice(index, 1)
  }
}

// Clear all notifications
function clearAllNotifications(): void {
  errorNotifications.value = []
}

// Handle different types of errors
function handleAPIError(error: unknown, context: string): string {
  let title = 'API Error'
  let message = 'An unexpected error occurred. Please try again.'
  let type: ErrorNotification['type'] = 'error'
  let persistent = false
  let action: ErrorNotification['action'] | undefined

  if (error instanceof InventoryAPIError) {
    title = `Failed to ${context}`
    message = error.message

    // Add retry action for certain errors
    if (error.originalError?.status && error.originalError.status >= 500) {
      action = {
        label: 'Retry',
        handler: () => {
          // This will be handled by the calling component
          window.dispatchEvent(new CustomEvent('retry-last-action'))
        }
      }
    }
  } else if (error instanceof Error) {
    if (error.message.includes('network') || error.message.includes('fetch')) {
      title = 'Network Error'
      message = 'Unable to connect to the server. Please check your internet connection.'
      type = 'warning'
      persistent = true
    } else {
      message = error.message
    }
  }

  return addErrorNotification({
    type,
    title,
    message,
    persistent,
    action
  })
}

// Handle network errors specifically
function handleNetworkError(error: unknown, context: string): string {
  return addErrorNotification({
    type: 'warning',
    title: 'Connection Problem',
    message: `Unable to ${context} due to network issues. Please check your connection and try again.`,
    persistent: true,
    action: {
      label: 'Retry',
      handler: () => {
        window.dispatchEvent(new CustomEvent('retry-last-action'))
      }
    }
  })
}

// Handle validation errors
function handleValidationError(errors: Record<string, string[]>): string {
  const errorMessages = Object.entries(errors)
    .map(([field, messages]) => `${field}: ${messages.join(', ')}`)
    .join('\n')

  return addErrorNotification({
    type: 'error',
    title: 'Validation Error',
    message: errorMessages,
    persistent: false
  })
}

// Handle authentication errors
function handleAuthError(): string {
  return addErrorNotification({
    type: 'error',
    title: 'Authentication Required',
    message: 'Your session has expired. Please log in again.',
    persistent: true,
    action: {
      label: 'Login',
      handler: () => {
        // This will be handled by the auth system
        window.dispatchEvent(new CustomEvent('auth-required'))
      }
    }
  })
}

// Global error handler for unhandled errors
function setupGlobalErrorHandler(): void {
  // Handle unhandled JavaScript errors
  window.addEventListener('error', (event) => {
    console.error('Unhandled error:', event.error)

    addErrorNotification({
      type: 'error',
      title: 'Application Error',
      message: 'An unexpected error occurred. Please refresh the page if the problem persists.',
      persistent: true,
      action: {
        label: 'Refresh',
        handler: () => window.location.reload()
      }
    })
  })

  // Handle unhandled promise rejections
  window.addEventListener('unhandledrejection', (event) => {
    console.error('Unhandled promise rejection:', event.reason)

    addErrorNotification({
      type: 'error',
      title: 'Application Error',
      message: 'An unexpected error occurred. Please try again.',
      persistent: false
    })
  })

  // Handle custom error events
  window.addEventListener('auth-error', () => {
    handleAuthError()
  })

  window.addEventListener('network-error', (event: any) => {
    handleNetworkError(event.detail?.error, 'complete the request')
  })
}

// Initialize error handling system
function initializeErrorHandler(): void {
  setupGlobalErrorHandler()
  initializeNetworkMonitoring()
}

// Export error handling utilities
export {
  errorNotifications,
  networkStatus,
  addErrorNotification,
  removeErrorNotification,
  clearAllNotifications,
  handleAPIError,
  handleNetworkError,
  handleValidationError,
  handleAuthError,
  initializeErrorHandler
}

// Export types
export type { ErrorNotification, NetworkStatus }
