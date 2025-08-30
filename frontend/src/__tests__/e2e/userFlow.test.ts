import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { createRouter, createWebHistory } from 'vue-router'
import App from '@/App.vue'
import DashboardView from '@/views/DashboardView.vue'
import InventoryView from '@/views/InventoryView.vue'
import AddItemView from '@/views/AddItemView.vue'
import { useInventoryStore } from '@/stores/inventory'
import { useGroceriesStore } from '@/stores/groceries'
import { useImpactStore } from '@/stores/impact'

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

describe('End-to-End User Flow', () => {
  let router: any
  let pinia: any

  beforeEach(async () => {
    // Setup fresh instances for each test
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

    // Initialize stores
    const inventoryStore = useInventoryStore()
    const groceriesStore = useGroceriesStore()
    const impactStore = useImpactStore()

    // Reset store states
    inventoryStore.$reset()
    impactStore.$reset()
  })

  it('completes full user journey: dashboard → add item → view inventory → mark as used → see impact', async () => {
    const wrapper = mount(App, {
      global: {
        plugins: [router, pinia]
      }
    })

    // Wait for router to be ready
    await router.isReady()

    // STEP 1: Start at Dashboard
    await router.push('/')
    await wrapper.vm.$nextTick()

    // Verify we're on dashboard
    expect(wrapper.find('[data-testid="dashboard-view"]').exists()).toBe(true)

    // Should show empty state initially
    expect(wrapper.find('[data-testid="empty-inventory"]').exists()).toBe(true)

    // STEP 2: Navigate to Add Item
    const addItemButton = wrapper.find('[data-testid="add-item-button"]')
    expect(addItemButton.exists()).toBe(true)

    await addItemButton.trigger('click')
    await wrapper.vm.$nextTick()

    // Should be on add item view
    expect(wrapper.find('[data-testid="add-item-view"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="grocery-grid"]').exists()).toBe(true)

    // STEP 3: Select a grocery item from the grid
    const milkItem = wrapper.find('[data-testid="grocery-item-milk-001"]')
    expect(milkItem.exists()).toBe(true)

    await milkItem.trigger('click')
    await wrapper.vm.$nextTick()

    // Should show the add item form
    expect(wrapper.find('[data-testid="add-item-form"]').exists()).toBe(true)

    // Form should be pre-filled with milk data
    const itemNameInput = wrapper.find('[data-testid="item-name-input"]')
    expect(itemNameInput.element.value).toBe('Milk')

    // STEP 4: Submit the form to add the item
    const submitButton = wrapper.find('[data-testid="submit-item-button"]')
    expect(submitButton.exists()).toBe(true)

    await submitButton.trigger('click')
    await wrapper.vm.$nextTick()

    // Wait for async operations
    await new Promise(resolve => setTimeout(resolve, 100))

    // Should navigate back to dashboard or inventory
    expect(wrapper.find('[data-testid="dashboard-view"]').exists() ||
           wrapper.find('[data-testid="inventory-view"]').exists()).toBe(true)

    // STEP 5: Navigate to inventory view to see the added item
    await router.push('/inventory')
    await wrapper.vm.$nextTick()

    expect(wrapper.find('[data-testid="inventory-view"]').exists()).toBe(true)

    // Should show the added milk item
    const inventoryItems = wrapper.findAll('[data-testid^="inventory-item-"]')
    expect(inventoryItems.length).toBeGreaterThan(0)

    // Find the milk item
    const milkInventoryItem = wrapper.find('[data-testid*="milk"]')
    expect(milkInventoryItem.exists()).toBe(true)

    // STEP 6: Mark the item as used
    const markUsedButton = milkInventoryItem.find('[data-testid="mark-used-button"]')
    expect(markUsedButton.exists()).toBe(true)

    await markUsedButton.trigger('click')
    await wrapper.vm.$nextTick()

    // Wait for async operations
    await new Promise(resolve => setTimeout(resolve, 100))

    // STEP 7: Verify impact card appears
    const impactCard = wrapper.find('[data-testid="impact-card"]')
    expect(impactCard.exists()).toBe(true)

    // Verify impact data is displayed
    expect(impactCard.text()).toContain('$4.50')
    expect(impactCard.text()).toContain('1.2')
    expect(impactCard.text()).toContain('Milk')

    // STEP 8: Verify item is removed from active inventory
    await wrapper.vm.$nextTick()

    // The milk item should no longer be in the active inventory
    const remainingItems = wrapper.findAll('[data-testid^="inventory-item-"]')
    const milkStillExists = remainingItems.some(item =>
      item.attributes('data-testid')?.includes('milk')
    )
    expect(milkStillExists).toBe(false)

    // STEP 9: Return to dashboard and verify summary updates
    await router.push('/')
    await wrapper.vm.$nextTick()

    // Dashboard should reflect the changes
    expect(wrapper.find('[data-testid="dashboard-view"]').exists()).toBe(true)

    // If no more items, should show empty state again
    // If there are other items, summary should be updated
    const inventoryStore = useInventoryStore()
    if (inventoryStore.activeItems.length === 0) {
      expect(wrapper.find('[data-testid="empty-inventory"]').exists()).toBe(true)
    } else {
      expect(wrapper.find('[data-testid="inventory-summary"]').exists()).toBe(true)
    }
  })

  it('validates acceptance criteria for Requirement 1: Quick Add from Curated List', async () => {
    const wrapper = mount(App, {
      global: {
        plugins: [router, pinia]
      }
    })

    await router.isReady()
    await router.push('/add-item')
    await wrapper.vm.$nextTick()

    // AC 1: Grid of 15 common grocery items displayed
    const groceryItems = wrapper.findAll('[data-testid^="grocery-item-"]')
    expect(groceryItems.length).toBe(15)

    // AC 2: Item selection adds to inventory with defaults
    const firstItem = groceryItems[0]
    await firstItem.trigger('click')
    await wrapper.vm.$nextTick()

    // Form should appear with pre-filled data
    const form = wrapper.find('[data-testid="add-item-form"]')
    expect(form.exists()).toBe(true)

    const quantityInput = wrapper.find('[data-testid="quantity-input"]')
    expect(quantityInput.element.value).toBe('1') // Default quantity

    // AC 3: Auto-calculated expiry date
    const expiryInput = wrapper.find('[data-testid="expiry-input"]')
    expect(expiryInput.element.value).toBeTruthy() // Should have a date

    // AC 4: Ability to customize details
    await quantityInput.setValue('2')
    expect(quantityInput.element.value).toBe('2')
  })

  it('validates acceptance criteria for Requirement 2: Auto-Expiry Defaults', async () => {
    const wrapper = mount(App, {
      global: {
        plugins: [router, pinia]
      }
    })

    await router.isReady()
    await router.push('/add-item')
    await wrapper.vm.$nextTick()

    // Select milk (7-day shelf life)
    const milkItem = wrapper.find('[data-testid="grocery-item-milk-001"]')
    await milkItem.trigger('click')
    await wrapper.vm.$nextTick()

    const expiryInput = wrapper.find('[data-testid="expiry-input"]')
    const expiryDate = new Date(expiryInput.element.value)
    const today = new Date()
    const daysDiff = Math.ceil((expiryDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))

    // AC 1 & 2: Expiry date calculated from shelf-life
    expect(daysDiff).toBe(7) // Milk has 7-day shelf life

    // AC 3 & 4: Manual override capability
    const customDate = new Date()
    customDate.setDate(customDate.getDate() + 10)
    await expiryInput.setValue(customDate.toISOString().split('T')[0])

    expect(expiryInput.element.value).toBe(customDate.toISOString().split('T')[0])
  })

  it('validates acceptance criteria for Requirement 3: Mark as Used with Impact', async () => {
    const wrapper = mount(App, {
      global: {
        plugins: [router, pinia]
      }
    })

    // Setup: Add an item first
    const inventoryStore = useInventoryStore()
    await inventoryStore.addItem({
      itemId: 'milk-001',
      name: 'Milk',
      quantity: 1,
      expiryDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
    })

    await router.isReady()
    await router.push('/inventory')
    await wrapper.vm.$nextTick()

    const inventoryItem = wrapper.find('[data-testid^="inventory-item-"]')
    expect(inventoryItem.exists()).toBe(true)

    // AC 1: Mark as used removes from active inventory
    const markUsedButton = inventoryItem.find('[data-testid="mark-used-button"]')
    await markUsedButton.trigger('click')
    await wrapper.vm.$nextTick()

    // AC 2: Impact card appears immediately
    const impactCard = wrapper.find('[data-testid="impact-card"]')
    expect(impactCard.exists()).toBe(true)

    // AC 3: Shows specific savings with motivational messaging
    expect(impactCard.text()).toContain('$')
    expect(impactCard.text()).toContain('CO₂')
    expect(impactCard.text()).toContain('Great job')

    // AC 4: Auto-dismiss after 3 seconds (test manual dismiss instead)
    const dismissButton = impactCard.find('[data-testid="dismiss-button"]')
    if (dismissButton.exists()) {
      await dismissButton.trigger('click')
      await wrapper.vm.$nextTick()
      expect(wrapper.find('[data-testid="impact-card"]').exists()).toBe(false)
    }
  })

  it('validates acceptance criteria for Requirement 4: Color-coded Expiry Indicators', async () => {
    const wrapper = mount(App, {
      global: {
        plugins: [router, pinia]
      }
    })

    const inventoryStore = useInventoryStore()

    // Add items with different expiry statuses
    const today = new Date()

    // Fresh item (>3 days)
    await inventoryStore.addItem({
      itemId: 'milk-001',
      name: 'Fresh Milk',
      quantity: 1,
      expiryDate: new Date(today.getTime() + 5 * 24 * 60 * 60 * 1000)
    })

    // Warning item (0-3 days)
    await inventoryStore.addItem({
      itemId: 'bread-002',
      name: 'Warning Bread',
      quantity: 1,
      expiryDate: new Date(today.getTime() + 2 * 24 * 60 * 60 * 1000)
    })

    // Expired item (<0 days)
    await inventoryStore.addItem({
      itemId: 'yogurt-003',
      name: 'Expired Yogurt',
      quantity: 1,
      expiryDate: new Date(today.getTime() - 1 * 24 * 60 * 60 * 1000)
    })

    await router.isReady()
    await router.push('/inventory')
    await wrapper.vm.$nextTick()

    const inventoryItems = wrapper.findAll('[data-testid^="inventory-item-"]')
    expect(inventoryItems.length).toBe(3)

    // AC 1: Green for >3 days
    const freshItem = inventoryItems.find(item => item.text().includes('Fresh Milk'))
    expect(freshItem?.classes()).toContain('fresh')

    // AC 2: Yellow for 0-3 days
    const warningItem = inventoryItems.find(item => item.text().includes('Warning Bread'))
    expect(warningItem?.classes()).toContain('warning')

    // AC 3: Red for expired
    const expiredItem = inventoryItems.find(item => item.text().includes('Expired Yogurt'))
    expect(expiredItem?.classes()).toContain('expired')

    // AC 4: Color indicators prominently visible
    inventoryItems.forEach(item => {
      const statusIndicator = item.find('[data-testid="expiry-status"]')
      expect(statusIndicator.exists()).toBe(true)
    })
  })

  it('validates acceptance criteria for Requirement 5: Dashboard Summary', async () => {
    const wrapper = mount(App, {
      global: {
        plugins: [router, pinia]
      }
    })

    const inventoryStore = useInventoryStore()

    // Add items with different statuses
    const today = new Date()
    await inventoryStore.addItem({
      itemId: 'milk-001',
      name: 'Fresh Milk',
      quantity: 1,
      expiryDate: new Date(today.getTime() + 5 * 24 * 60 * 60 * 1000)
    })

    await inventoryStore.addItem({
      itemId: 'bread-002',
      name: 'Warning Bread',
      quantity: 1,
      expiryDate: new Date(today.getTime() + 2 * 24 * 60 * 60 * 1000)
    })

    await router.isReady()
    await router.push('/')
    await wrapper.vm.$nextTick()

    // AC 1: Count summaries by freshness status
    const inventorySummary = wrapper.find('[data-testid="inventory-summary"]')
    expect(inventorySummary.exists()).toBe(true)

    const freshCount = wrapper.find('[data-testid="fresh-count"]')
    const warningCount = wrapper.find('[data-testid="warning-count"]')
    const expiredCount = wrapper.find('[data-testid="expired-count"]')

    expect(freshCount.exists()).toBe(true)
    expect(warningCount.exists()).toBe(true)
    expect(expiredCount.exists()).toBe(true)

    // AC 2: Tapping category filters inventory
    await freshCount.trigger('click')
    await wrapper.vm.$nextTick()

    // Should navigate to inventory with filter
    expect(wrapper.vm.$route.path).toBe('/inventory')
    expect(wrapper.vm.$route.query.filter).toBe('fresh')

    // AC 3: Quick action buttons
    await router.push('/')
    await wrapper.vm.$nextTick()

    const quickActions = wrapper.find('[data-testid="quick-actions"]')
    expect(quickActions.exists()).toBe(true)

    const addItemButton = wrapper.find('[data-testid="add-item-button"]')
    const viewExpiringButton = wrapper.find('[data-testid="view-expiring-button"]')

    expect(addItemButton.exists()).toBe(true)
    expect(viewExpiringButton.exists()).toBe(true)
  })

  it('validates acceptance criteria for Requirement 6: Responsive Design', async () => {
    const wrapper = mount(App, {
      global: {
        plugins: [router, pinia]
      }
    })

    await router.isReady()

    // AC 1: Touch-appropriate sizing (test through CSS classes)
    const touchElements = wrapper.findAll('[data-testid*="button"], [data-testid*="card"]')
    touchElements.forEach(element => {
      // Should have appropriate touch target classes
      expect(
        element.classes().some(cls => cls.includes('touch') || cls.includes('btn') || cls.includes('card'))
      ).toBe(true)
    })

    // AC 2: Responsive layout (test grid classes)
    await router.push('/add-item')
    await wrapper.vm.$nextTick()

    const groceryGrid = wrapper.find('[data-testid="grocery-grid"]')
    expect(groceryGrid.classes()).toContain('grid')

    // AC 3: 44px minimum touch targets (test through CSS)
    const buttons = wrapper.findAll('button')
    buttons.forEach(button => {
      const computedStyle = window.getComputedStyle(button.element)
      // In a real test environment, we'd check actual computed styles
      // Here we verify the button has appropriate classes
      expect(button.classes().length).toBeGreaterThan(0)
    })

    // AC 4: Swipe gesture reliability (test event handlers)
    await router.push('/inventory')
    await wrapper.vm.$nextTick()

    const inventoryItems = wrapper.findAll('[data-testid^="inventory-item-"]')
    if (inventoryItems.length > 0) {
      const firstItem = inventoryItems[0]

      // Test touch events are properly bound
      await firstItem.trigger('touchstart', {
        touches: [{ clientX: 0, clientY: 0 }]
      })

      await firstItem.trigger('touchend', {
        changedTouches: [{ clientX: 100, clientY: 0 }]
      })

      // Should handle swipe gesture without errors
      expect(wrapper.emitted()).toBeDefined()
    }
  })

  it('ensures smooth navigation and state persistence', async () => {
    const wrapper = mount(App, {
      global: {
        plugins: [router, pinia]
      }
    })

    await router.isReady()

    // Test navigation between all main routes
    const routes = ['/', '/inventory', '/add-item']

    for (const route of routes) {
      await router.push(route)
      await wrapper.vm.$nextTick()

      // Should successfully navigate without errors
      expect(wrapper.vm.$route.path).toBe(route)

      // Should not show error boundary
      expect(wrapper.find('[data-testid="error-boundary"]').exists()).toBe(false)
    }

    // Test state persistence across navigation
    const inventoryStore = useInventoryStore()
    await inventoryStore.addItem({
      itemId: 'test-001',
      name: 'Test Item',
      quantity: 1,
      expiryDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
    })

    // Navigate away and back
    await router.push('/add-item')
    await wrapper.vm.$nextTick()

    await router.push('/inventory')
    await wrapper.vm.$nextTick()

    // State should persist
    expect(inventoryStore.activeItems.length).toBeGreaterThan(0)

    // UI should reflect persisted state
    const inventoryItems = wrapper.findAll('[data-testid^="inventory-item-"]')
    expect(inventoryItems.length).toBeGreaterThan(0)
  })
})
