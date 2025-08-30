// Error Boundary Component Tests
// Use-It-Up PWA Frontend

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'
import ErrorBoundary from '../ErrorBoundary.vue'
import {
  addErrorNotification,
  clearAllNotifications,
  errorNotifications,
  networkStatus
} from '@/utils/errorHandler'

// Mock navigator.onLine
Object.defineProperty(navigator, 'onLine', {
  writable: true,
  value: true
})

describe('ErrorBoundary', () => {
  beforeEach(() => {
    clearAllNotifications()
    networkStatus.value = {
      isOnline: true,
      lastOnline: new Date(),
      connectionType: null
    }
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('should render slot content when no errors', () => {
    const wrapper = mount(ErrorBoundary, {
      slots: {
        default: '<div data-testid="content">Main Content</div>'
      }
    })

    expect(wrapper.find('[data-testid="content"]').exists()).toBe(true)
    expect(wrapper.text()).toContain('Main Content')
  })

  it('should display error notifications when they exist', async () => {
    const wrapper = mount(ErrorBoundary, {
      slots: {
        default: '<div>Content</div>'
      }
    })

    // Add an error notification
    addErrorNotification({
      type: 'error',
      title: 'Test Error',
      message: 'This is a test error message'
    })

    await nextTick()

    expect(wrapper.find('.error-notification').exists()).toBe(true)
    expect(wrapper.find('.error-notification__title').text()).toBe('Test Error')
    expect(wrapper.find('.error-notification__message').text()).toBe('This is a test error message')
  })

  it('should display different notification types with correct styling', async () => {
    const wrapper = mount(ErrorBoundary, {
      slots: {
        default: '<div>Content</div>'
      }
    })

    // Add different types of notifications
    addErrorNotification({
      type: 'error',
      title: 'Error',
      message: 'Error message'
    })

    addErrorNotification({
      type: 'warning',
      title: 'Warning',
      message: 'Warning message'
    })

    addErrorNotification({
      type: 'info',
      title: 'Info',
      message: 'Info message'
    })

    await nextTick()

    const notifications = wrapper.findAll('.error-notification')
    expect(notifications).toHaveLength(3)

    expect(notifications[0].classes()).toContain('error-notification--error')
    expect(notifications[1].classes()).toContain('error-notification--warning')
    expect(notifications[2].classes()).toContain('error-notification--info')
  })

  it('should allow dismissing notifications', async () => {
    const wrapper = mount(ErrorBoundary, {
      slots: {
        default: '<div>Content</div>'
      }
    })

    addErrorNotification({
      type: 'error',
      title: 'Test Error',
      message: 'Test message'
    })

    await nextTick()

    expect(wrapper.find('.error-notification').exists()).toBe(true)

    // Click the close button
    await wrapper.find('.error-notification__close').trigger('click')
    await nextTick()

    expect(wrapper.find('.error-notification').exists()).toBe(false)
  })

  it('should display action buttons when provided', async () => {
    const mockAction = vi.fn()
    const wrapper = mount(ErrorBoundary, {
      slots: {
        default: '<div>Content</div>'
      }
    })

    addErrorNotification({
      type: 'error',
      title: 'Test Error',
      message: 'Test message',
      action: {
        label: 'Retry',
        handler: mockAction
      }
    })

    await nextTick()

    const actionButton = wrapper.find('.error-notification__action-btn')
    expect(actionButton.exists()).toBe(true)
    expect(actionButton.text()).toBe('Retry')

    await actionButton.trigger('click')
    expect(mockAction).toHaveBeenCalledOnce()
  })

  it('should display network status when offline', async () => {
    const wrapper = mount(ErrorBoundary, {
      slots: {
        default: '<div>Content</div>'
      }
    })

    // Simulate going offline
    networkStatus.value.isOnline = false

    await nextTick()

    expect(wrapper.find('.network-status--offline').exists()).toBe(true)
    expect(wrapper.find('.network-status__text').text()).toBe('You are offline')
  })

  it('should not display network status when online', async () => {
    const wrapper = mount(ErrorBoundary, {
      slots: {
        default: '<div>Content</div>'
      }
    })

    // Ensure we're online
    networkStatus.value.isOnline = true

    await nextTick()

    expect(wrapper.find('.network-status').exists()).toBe(false)
  })

  it('should handle multiple notifications correctly', async () => {
    const wrapper = mount(ErrorBoundary, {
      slots: {
        default: '<div>Content</div>'
      }
    })

    // Add multiple notifications
    for (let i = 0; i < 3; i++) {
      addErrorNotification({
        type: 'error',
        title: `Error ${i + 1}`,
        message: `Message ${i + 1}`
      })
    }

    await nextTick()

    const notifications = wrapper.findAll('.error-notification')
    expect(notifications).toHaveLength(3)

    // Check that each notification has the correct content
    notifications.forEach((notification, index) => {
      expect(notification.find('.error-notification__title').text()).toBe(`Error ${index + 1}`)
      expect(notification.find('.error-notification__message').text()).toBe(`Message ${index + 1}`)
    })
  })

  it('should handle notifications with multiline messages', async () => {
    const wrapper = mount(ErrorBoundary, {
      slots: {
        default: '<div>Content</div>'
      }
    })

    addErrorNotification({
      type: 'error',
      title: 'Validation Error',
      message: 'Line 1\nLine 2\nLine 3'
    })

    await nextTick()

    const messageElement = wrapper.find('.error-notification__message')
    expect(messageElement.text()).toBe('Line 1\nLine 2\nLine 3')

    // Check that the message content is preserved correctly (CSS styling is tested separately)
    expect(messageElement.text()).toBe('Line 1\nLine 2\nLine 3')
  })

  it('should initialize error handler on mount', async () => {
    const { initializeErrorHandler } = await import('@/utils/errorHandler')
    const initSpy = vi.spyOn({ initializeErrorHandler }, 'initializeErrorHandler')

    mount(ErrorBoundary, {
      slots: {
        default: '<div>Content</div>'
      }
    })

    expect(initSpy).toHaveBeenCalledOnce()
  })

  it('should be accessible with proper ARIA labels', async () => {
    const wrapper = mount(ErrorBoundary, {
      slots: {
        default: '<div>Content</div>'
      }
    })

    addErrorNotification({
      type: 'error',
      title: 'Test Error',
      message: 'Test message'
    })

    await nextTick()

    const closeButton = wrapper.find('.error-notification__close')
    expect(closeButton.attributes('aria-label')).toBe('Dismiss notification')
  })
})
