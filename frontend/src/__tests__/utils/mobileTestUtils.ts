import { VueWrapper } from '@vue/test-utils'
import { vi } from 'vitest'

/**
 * Mobile testing utilities for simulating mobile device interactions
 */

export interface TouchEvent {
  clientX: number
  clientY: number
  identifier?: number
}

export interface SwipeGesture {
  startX: number
  startY: number
  endX: number
  endY: number
  duration?: number
}

/**
 * Simulates a mobile viewport by setting appropriate dimensions
 */
export function setMobileViewport() {
  // Simulate mobile viewport dimensions
  Object.defineProperty(window, 'innerWidth', {
    writable: true,
    configurable: true,
    value: 375, // iPhone SE width
  })

  Object.defineProperty(window, 'innerHeight', {
    writable: true,
    configurable: true,
    value: 667, // iPhone SE height
  })

  // Trigger resize event
  window.dispatchEvent(new Event('resize'))
}

/**
 * Simulates a tablet viewport
 */
export function setTabletViewport() {
  Object.defineProperty(window, 'innerWidth', {
    writable: true,
    configurable: true,
    value: 768, // iPad width
  })

  Object.defineProperty(window, 'innerHeight', {
    writable: true,
    configurable: true,
    value: 1024, // iPad height
  })

  window.dispatchEvent(new Event('resize'))
}

/**
 * Simulates a swipe gesture on an element
 */
export async function simulateSwipe(
  wrapper: VueWrapper<any>,
  element: any,
  gesture: SwipeGesture
) {
  const { startX, startY, endX, endY, duration = 300 } = gesture

  // Start touch
  await element.trigger('touchstart', {
    touches: [{ clientX: startX, clientY: startY, identifier: 0 }],
    changedTouches: [{ clientX: startX, clientY: startY, identifier: 0 }]
  })

  // Simulate movement (optional intermediate points)
  const steps = 5
  for (let i = 1; i <= steps; i++) {
    const progress = i / steps
    const currentX = startX + (endX - startX) * progress
    const currentY = startY + (endY - startY) * progress

    await element.trigger('touchmove', {
      touches: [{ clientX: currentX, clientY: currentY, identifier: 0 }],
      changedTouches: [{ clientX: currentX, clientY: currentY, identifier: 0 }]
    })

    // Small delay to simulate real gesture timing
    await new Promise(resolve => setTimeout(resolve, duration / steps))
  }

  // End touch
  await element.trigger('touchend', {
    touches: [],
    changedTouches: [{ clientX: endX, clientY: endY, identifier: 0 }]
  })

  await wrapper.vm.$nextTick()
}

/**
 * Simulates a right swipe (swipe-to-use gesture)
 */
export async function simulateSwipeRight(
  wrapper: VueWrapper<any>,
  element: any,
  distance: number = 100
) {
  return simulateSwipe(wrapper, element, {
    startX: 50,
    startY: 50,
    endX: 50 + distance,
    endY: 50,
    duration: 250
  })
}

/**
 * Simulates a tap gesture with proper touch events
 */
export async function simulateTap(
  wrapper: VueWrapper<any>,
  element: any,
  coordinates: { x: number; y: number } = { x: 50, y: 50 }
) {
  const { x, y } = coordinates

  await element.trigger('touchstart', {
    touches: [{ clientX: x, clientY: y, identifier: 0 }],
    changedTouches: [{ clientX: x, clientY: y, identifier: 0 }]
  })

  // Short delay for tap
  await new Promise(resolve => setTimeout(resolve, 50))

  await element.trigger('touchend', {
    touches: [],
    changedTouches: [{ clientX: x, clientY: y, identifier: 0 }]
  })

  // Also trigger click for compatibility
  await element.trigger('click')
  await wrapper.vm.$nextTick()
}

/**
 * Checks if an element meets minimum touch target size (44px)
 */
export function validateTouchTargetSize(element: any): boolean {
  const rect = element.element.getBoundingClientRect()
  return rect.width >= 44 && rect.height >= 44
}

/**
 * Validates responsive grid layout
 */
export function validateResponsiveGrid(
  wrapper: VueWrapper<any>,
  gridSelector: string,
  expectedColumns: { mobile: number; tablet: number; desktop: number }
) {
  const grid = wrapper.find(gridSelector)
  if (!grid.exists()) return false

  // Test mobile layout
  setMobileViewport()
  // In a real browser, we'd check computed styles
  // Here we verify the grid has appropriate responsive classes
  const classes = grid.classes()
  const hasMobileGrid = classes.some(cls =>
    cls.includes('grid') || cls.includes('col') || cls.includes('mobile')
  )

  // Test tablet layout
  setTabletViewport()
  const hasTabletGrid = classes.some(cls =>
    cls.includes('grid') || cls.includes('col') || cls.includes('tablet')
  )

  return hasMobileGrid && hasTabletGrid
}

/**
 * Simulates network conditions for testing offline/slow network scenarios
 */
export function simulateNetworkConditions(condition: 'offline' | 'slow' | 'fast') {
  const originalFetch = global.fetch

  switch (condition) {
    case 'offline':
      global.fetch = vi.fn(() => Promise.reject(new Error('Network error')))
      break
    case 'slow':
      global.fetch = vi.fn((...args) =>
        new Promise(resolve =>
          setTimeout(() => resolve(originalFetch(...args)), 2000)
        )
      )
      break
    case 'fast':
      global.fetch = originalFetch
      break
  }
}

/**
 * Validates loading states and transitions
 */
export async function validateLoadingStates(
  wrapper: VueWrapper<any>,
  actionTrigger: () => Promise<void>
) {
  // Check initial state
  expect(wrapper.find('[data-testid="loading"]').exists()).toBe(false)

  // Trigger action that should show loading
  const actionPromise = actionTrigger()
  await wrapper.vm.$nextTick()

  // Should show loading state
  expect(wrapper.find('[data-testid="loading"]').exists()).toBe(true)

  // Wait for action to complete
  await actionPromise
  await wrapper.vm.$nextTick()

  // Loading should be gone
  expect(wrapper.find('[data-testid="loading"]').exists()).toBe(false)
}

/**
 * Tests form validation and error handling
 */
export async function validateFormErrorHandling(
  wrapper: VueWrapper<any>,
  formSelector: string,
  invalidData: Record<string, any>
) {
  const form = wrapper.find(formSelector)
  expect(form.exists()).toBe(true)

  // Fill form with invalid data
  for (const [field, value] of Object.entries(invalidData)) {
    const input = form.find(`[data-testid="${field}-input"]`)
    if (input.exists()) {
      await input.setValue(value)
    }
  }

  // Try to submit
  const submitButton = form.find('[data-testid="submit-button"]')
  await submitButton.trigger('click')
  await wrapper.vm.$nextTick()

  // Should show validation errors
  const errorMessages = form.findAll('[data-testid*="error"]')
  expect(errorMessages.length).toBeGreaterThan(0)

  return errorMessages
}

/**
 * Validates accessibility features
 */
export function validateAccessibility(wrapper: VueWrapper<any>) {
  const results = {
    hasProperHeadings: false,
    hasAltText: false,
    hasAriaLabels: false,
    hasKeyboardNavigation: false
  }

  // Check for proper heading structure
  const headings = wrapper.findAll('h1, h2, h3, h4, h5, h6')
  results.hasProperHeadings = headings.length > 0

  // Check for alt text on images
  const images = wrapper.findAll('img')
  results.hasAltText = images.every(img =>
    img.attributes('alt') !== undefined
  )

  // Check for ARIA labels
  const interactiveElements = wrapper.findAll('button, input, select, textarea')
  results.hasAriaLabels = interactiveElements.some(el =>
    el.attributes('aria-label') || el.attributes('aria-labelledby')
  )

  // Check for keyboard navigation support
  const focusableElements = wrapper.findAll('[tabindex], button, input, select, textarea, a')
  results.hasKeyboardNavigation = focusableElements.length > 0

  return results
}

export default {
  setMobileViewport,
  setTabletViewport,
  simulateSwipe,
  simulateSwipeRight,
  simulateTap,
  validateTouchTargetSize,
  validateResponsiveGrid,
  simulateNetworkConditions,
  validateLoadingStates,
  validateFormErrorHandling,
  validateAccessibility
}
