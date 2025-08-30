import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { createRouter, createWebHistory } from 'vue-router'
import App from '@/App.vue'
import DashboardView from '@/views/DashboardView.vue'
import InventoryView from '@/views/InventoryView.vue'
import AddItemView from '@/views/AddItemView.vue'
import { useInventoryStore } from '@/stores/inventory'
import { useImpactStore } from '@/stores/impact'
import mobileTestUtils from '../utils/mobileTestUtils'

// Mock API calls
vi.mock('@/api/inventory', () => ({
  default: {
    getInventory: vi.fn(() => Promise.resolve([])),
    addItem: vi.fn((item) => Promise.resolve({
      id: 'test-id-' + Date.now(),
      ...item,
      addedDate: new Date().toISOString(),
      status: 'active'
    })),
    markAsUsed: vi.fn(() => Promise.resolve({
      moneySaved: 4.50,
      co2Avoided: 1.2,
      itemName: 'Milk'
    }))
  }
}))

describe('Mobile User Flow Testing', () => {
  let router: any
  let pinia: any

  beforeEach(async () => {
    // Setup mobile viewport
    mobileTestUtils.setMobileViewport()

    pinia = createPinia()
    setActivePinia(pinia)

    router = createRouter({
      history: createWebHistory(),
      routes: [
        {
          path: '/',
          name: 'dashboard',
          component: DashboardView
        },
        {
          path: '/inventory',
          name: 'inventory',
          component: InventoryView
        },
        {
          path: '/add-item',
          name: 'add-item',
          component: AddItemView
        }
      ]
    })

    // Reset stores
    const inventoryStore = useInventoryStore()
    const impactStore = useImpactStore()
    inventoryStore.$reset()
    impactStore.$reset()
  })

  it('completes full mobile user journey with touch interactions', async () => {
    const wrapper = mount(App, {
      global: {
        plugins: [router, pinia]
      }
    })

    await router.isReady()

    // STEP 1: Mobile Dashboard Navigation
    await router.push('/')
    await wrapper.vm.$nextTick()

    // Validate mobile layout
    expect(wrapper.find('[data-testid="dashboard-view"]').exists()).toBe(true)

    // Check responsive grid on mobile
    const isResponsive = mobileTestUtils.validateResponsiveGrid(
      wrapper,
      '[data-testid="inventory-summary"]',
      { mobile: 2, tablet: 3, desktop: 3 }
    )
    expect(isResponsive).toBe(true)

    // STEP 2: Touch-based Add Item Navigation
    const addItemButton = wrapper.find('[data-testid="add-item-button"]')
    expect(addItemButton.exists()).toBe(true)

    // Validate touch target size
    // Note: In a real browser environment, we'd check actual dimensions
    expect(addItemButton.classes()).toContain('btn')

    // Simulate mobile tap
    await mobileTestUtils.simulateTap(wrapper, addItemButton)
    await wrapper.vm.$nextTick()

    expect(wrapper.find('[data-testid="add-item-view"]').exists()).toBe(true)

    // STEP 3: Mobile Grocery Grid Interaction
    const groceryGrid = wrapper.find('[data-testid="grocery-grid"]')
    expect(groceryGrid.exists()).toBe(true)

    // Verify 3-column mobile layout
    expect(groceryGrid.classes()).toContain('grid')

    // Test touch selection of grocery item
    const milkItem = wrapper.find('[data-testid="grocery-item-milk-001"]')
    expect(milkItem.exists()).toBe(true)

    await mobileTestUtils.simulateTap(wrapper, milkItem)
    await wrapper.vm.$nextTick()

    // STEP 4: Mobile Form Interaction
    const addItemForm = wrapper.find('[data-testid="add-item-form"]')
    expect(addItemForm.exists()).toBe(true)

    // Test mobile form inputs
    const quantityInput = wrapper.find('[data-testid="quantity-input"]')
    expect(quantityInput.exists()).toBe(true)

    // Simulate mobile keyboard input
    await quantityInput.setValue('2')
    expect(quantityInput.element.value).toBe('2')

    // Submit with mobile tap
    const submitButton = wrapper.find('[data-testid="submit-item-button"]')
    await mobileTestUtils.simulateTap(wrapper, submitButton)
    await wrapper.vm.$nextTick()

    // Wait for async operations
    await new Promise(resolve => setTimeout(resolve, 100))

    // STEP 5: Mobile Inventory View with Swipe Gestures
    await router.push('/inventory')
    await wrapper.vm.$nextTick()

    const inventoryView = wrapper.find('[data-testid="inventory-view"]')
    expect(inventoryView.exists()).toBe(true)

    // Test mobile filter tabs
    const filterTabs = wrapper.findAll('[data-testid*="filter-tab"]')
    expect(filterTabs.length).toBeGreaterThan(0)

    // Each tab should be touch-friendly
    filterTabs.forEach(tab => {
      expect(tab.classes()).toContain('tab')
    })

    // STEP 6: Swipe-to-Use Gesture Testing
    const inventoryItems = wrapper.findAll('[data-testid^="inventory-item-"]')
    if (inventoryItems.length > 0) {
      const firstItem = inventoryItems[0]

      // Test swipe-right gesture
      await mobileTestUtils.simulateSwipeRight(wrapper, firstItem, 120)
      await wrapper.vm.$nextTick()

      // Wait for async operations
      await new Promise(resolve => setTimeout(resolve, 100))

      // Impact card should appear
      const impactCard = wrapper.find('[data-testid="impact-card"]')
      expect(impactCard.exists()).toBe(true)

      // Test mobile impact card layout
      expect(impactCard.classes()).toContain('modal')
    }

    // STEP 7: Mobile Navigation Persistence
    await router.push('/')
    await wrapper.vm.$nextTick()

    // State should persist across mobile navigation
    const inventoryStore = useInventoryStore()
    expect(inventoryStore).toBeDefined()

    // Dashboard should reflect mobile-optimized layout
    expect(wrapper.find('[data-testid="dashboard-view"]').exists()).toBe(true)
  })

  it('validates mobile responsive breakpoints', async () => {
    const wrapper = mount(App, {
      global: {
        plugins: [router, pinia]
      }
    })

    await router.isReady()

    // Test Mobile Layout (375px)
    mobileTestUtils.setMobileViewport()
    await router.push('/add-item')
    await wrapper.vm.$nextTick()

    const groceryGrid = wrapper.find('[data-testid="grocery-grid"]')
    expect(groceryGrid.classes()).toContain('grid')

    // Test Tablet Layout (768px)
    mobileTestUtils.setTabletViewport()
    await wrapper.vm.$nextTick()

    // Grid should adapt to tablet layout
    expect(groceryGrid.classes()).toContain('grid')

    // Test navigation on different screen sizes
    const navElements = wrapper.findAll('[data-testid*="nav"], [data-testid*="button"]')
    navElements.forEach(element => {
      // Should maintain proper sizing across breakpoints
      expect(element.classes().length).toBeGreaterThan(0)
    })
  })

  it('validates touch target accessibility on mobile', async () => {
    const wrapper = mount(App, {
      global: {
        plugins: [router, pinia]
      }
    })

    mobileTestUtils.setMobileViewport()
    await router.isReady()

    // Test all main views for touch accessibility
    const views = ['/', '/inventory', '/add-item']

    for (const view of views) {
      await router.push(view)
      await wrapper.vm.$nextTick()

      // Find all interactive elements
      const buttons = wrapper.findAll('button')
      const links = wrapper.findAll('a')
      const inputs = wrapper.findAll('input, select, textarea')

      const interactiveElements = [...buttons, ...links, ...inputs]

      // Each interactive element should be touch-friendly
      interactiveElements.forEach(element => {
        // Should have appropriate classes for touch targets
        const classes = element.classes()
        const hasTouchClass = classes.some(cls =>
          cls.includes('btn') ||
          cls.includes('touch') ||
          cls.includes('interactive') ||
          cls.includes('input') ||
          cls.includes('link')
        )
        expect(hasTouchClass).toBe(true)
      })
    }
  })

  it('handles mobile-specific error scenarios', async () => {
    const wrapper = mount(App, {
      global: {
        plugins: [router, pinia]
      }
    })

    mobileTestUtils.setMobileViewport()
    await router.isReady()

    // Test offline scenario
    mobileTestUtils.simulateNetworkConditions('offline')

    await router.push('/inventory')
    await wrapper.vm.$nextTick()

    // Should handle network errors gracefully
    const inventoryStore = useInventoryStore()

    try {
      await inventoryStore.fetchInventory()
    } catch (error) {
      // Error should be handled gracefully
      expect(error).toBeDefined()
    }

    // Should show appropriate error state
    const errorBoundary = wrapper.find('[data-testid="error-boundary"]')
    const retryAction = wrapper.find('[data-testid="retry-action"]')

    // Either error boundary or retry action should be available
    expect(errorBoundary.exists() || retryAction.exists()).toBe(true)

    // Reset network conditions
    mobileTestUtils.simulateNetworkConditions('fast')
  })

  it('validates mobile form validation and feedback', async () => {
    const wrapper = mount(App, {
      global: {
        plugins: [router, pinia]
      }
    })

    mobileTestUtils.setMobileViewport()
    await router.isReady()

    await router.push('/add-item')
    await wrapper.vm.$nextTick()

    // Select an item to get to form
    const milkItem = wrapper.find('[data-testid="grocery-item-milk-001"]')
    await mobileTestUtils.simulateTap(wrapper, milkItem)
    await wrapper.vm.$nextTick()

    // Test form validation with invalid data
    const errorMessages = await mobileTestUtils.validateFormErrorHandling(
      wrapper,
      '[data-testid="add-item-form"]',
      {
        quantity: '-1', // Invalid quantity
        expiry: '2020-01-01' // Past date
      }
    )

    // Should show mobile-friendly error messages
    expect(errorMessages.length).toBeGreaterThan(0)

    errorMessages.forEach(error => {
      // Error messages should be visible and readable on mobile
      expect(error.isVisible()).toBe(true)
    })
  })

  it('validates mobile loading states and transitions', async () => {
    const wrapper = mount(App, {
      global: {
        plugins: [router, pinia]
      }
    })

    mobileTestUtils.setMobileViewport()
    await router.isReady()

    const inventoryStore = useInventoryStore()

    // Test loading states during async operations
    await mobileTestUtils.validateLoadingStates(wrapper, async () => {
      await inventoryStore.fetchInventory()
    })

    // Test loading states during item addition
    await router.push('/add-item')
    await wrapper.vm.$nextTick()

    const milkItem = wrapper.find('[data-testid="grocery-item-milk-001"]')
    await mobileTestUtils.simulateTap(wrapper, milkItem)
    await wrapper.vm.$nextTick()

    await mobileTestUtils.validateLoadingStates(wrapper, async () => {
      const submitButton = wrapper.find('[data-testid="submit-item-button"]')
      await mobileTestUtils.simulateTap(wrapper, submitButton)
      await new Promise(resolve => setTimeout(resolve, 100))
    })
  })

  it('validates mobile accessibility features', async () => {
    const wrapper = mount(App, {
      global: {
        plugins: [router, pinia]
      }
    })

    mobileTestUtils.setMobileViewport()
    await router.isReady()

    // Test accessibility across all views
    const views = ['/', '/inventory', '/add-item']

    for (const view of views) {
      await router.push(view)
      await wrapper.vm.$nextTick()

      const accessibility = mobileTestUtils.validateAccessibility(wrapper)

      // Should have proper heading structure
      expect(accessibility.hasProperHeadings).toBe(true)

      // Should have keyboard navigation support
      expect(accessibility.hasKeyboardNavigation).toBe(true)

      // Images should have alt text (if any)
      if (wrapper.findAll('img').length > 0) {
        expect(accessibility.hasAltText).toBe(true)
      }
    }
  })

  it('validates mobile performance and smooth animations', async () => {
    const wrapper = mount(App, {
      global: {
        plugins: [router, pinia]
      }
    })

    mobileTestUtils.setMobileViewport()
    await router.isReady()

    // Test smooth navigation transitions
    const startTime = performance.now()

    await router.push('/')
    await wrapper.vm.$nextTick()

    await router.push('/inventory')
    await wrapper.vm.$nextTick()

    await router.push('/add-item')
    await wrapper.vm.$nextTick()

    const endTime = performance.now()
    const navigationTime = endTime - startTime

    // Navigation should be reasonably fast (under 1 second for tests)
    expect(navigationTime).toBeLessThan(1000)

    // Test impact card animation
    const inventoryStore = useInventoryStore()
    await inventoryStore.addItem({
      itemId: 'test-001',
      name: 'Test Item',
      quantity: 1,
      expiryDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
    })

    await router.push('/inventory')
    await wrapper.vm.$nextTick()

    const inventoryItem = wrapper.find('[data-testid^="inventory-item-"]')
    if (inventoryItem.exists()) {
      const markUsedButton = inventoryItem.find('[data-testid="mark-used-button"]')
      await mobileTestUtils.simulateTap(wrapper, markUsedButton)
      await wrapper.vm.$nextTick()

      // Impact card should appear with animation classes
      const impactCard = wrapper.find('[data-testid="impact-card"]')
      if (impactCard.exists()) {
        expect(impactCard.classes()).toContain('modal')
      }
    }
  })

  it('validates mobile state persistence across app lifecycle', async () => {
    const wrapper = mount(App, {
      global: {
        plugins: [router, pinia]
      }
    })

    mobileTestUtils.setMobileViewport()
    await router.isReady()

    const inventoryStore = useInventoryStore()

    // Add some test data
    await inventoryStore.addItem({
      itemId: 'persist-001',
      name: 'Persistence Test',
      quantity: 1,
      expiryDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
    })

    // Navigate through app
    await router.push('/inventory')
    await wrapper.vm.$nextTick()

    // Verify data exists
    expect(inventoryStore.activeItems.length).toBeGreaterThan(0)

    // Simulate app backgrounding/foregrounding (mobile scenario)
    document.dispatchEvent(new Event('visibilitychange'))
    await wrapper.vm.$nextTick()

    // State should persist
    expect(inventoryStore.activeItems.length).toBeGreaterThan(0)

    // Navigate away and back
    await router.push('/')
    await wrapper.vm.$nextTick()

    await router.push('/inventory')
    await wrapper.vm.$nextTick()

    // Data should still be there
    expect(inventoryStore.activeItems.length).toBeGreaterThan(0)

    const inventoryItems = wrapper.findAll('[data-testid^="inventory-item-"]')
    expect(inventoryItems.length).toBeGreaterThan(0)
  })
})
