import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { createRouter, createWebHistory } from 'vue-router'
import QuickActions from '../QuickActions.vue'
import { useInventoryStore } from '@/stores/inventory'

// Mock router
const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/add-item', name: 'add-item', component: { template: '<div>Add Item</div>' } },
    { path: '/inventory', name: 'inventory', component: { template: '<div>Inventory</div>' } }
  ]
})

describe('QuickActions', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('renders all action buttons', async () => {
    const wrapper = mount(QuickActions, {
      global: {
        plugins: [router]
      }
    })

    // Check that all action buttons are rendered
    const buttons = wrapper.findAll('.action-button')
    expect(buttons).toHaveLength(3)

    // Check button titles
    expect(wrapper.text()).toContain('Add Item')
    expect(wrapper.text()).toContain('Expiring Soon')
    expect(wrapper.text()).toContain('View All')
  })

  it('displays correct expiring items count', async () => {
    const inventoryStore = useInventoryStore()

    // Mock items expiring soon
    vi.spyOn(inventoryStore, 'itemsExpiringSoon', 'get').mockReturnValue([
      { id: '1', name: 'Item 1' },
      { id: '2', name: 'Item 2' }
    ] as any)

    const wrapper = mount(QuickActions, {
      global: {
        plugins: [router]
      }
    })

    await wrapper.vm.$nextTick()

    // Check that expiring count is displayed correctly
    expect(wrapper.text()).toContain('2 items')
  })

  it('shows singular form when only 1 item is expiring', async () => {
    const inventoryStore = useInventoryStore()

    // Mock single item expiring soon
    vi.spyOn(inventoryStore, 'itemsExpiringSoon', 'get').mockReturnValue([
      { id: '1', name: 'Item 1' }
    ] as any)

    const wrapper = mount(QuickActions, {
      global: {
        plugins: [router]
      }
    })

    await wrapper.vm.$nextTick()

    // Check singular form
    expect(wrapper.text()).toContain('1 item')
    expect(wrapper.text()).not.toContain('1 items')
  })

  it('disables expiring items button when no items are expiring', async () => {
    const inventoryStore = useInventoryStore()

    // Mock no items expiring
    vi.spyOn(inventoryStore, 'itemsExpiringSoon', 'get').mockReturnValue([])

    const wrapper = mount(QuickActions, {
      global: {
        plugins: [router]
      }
    })

    await wrapper.vm.$nextTick()

    // Find the expiring items button (second button)
    const expiringButton = wrapper.findAll('.action-button')[1]
    expect(expiringButton.attributes('disabled')).toBeDefined()
  })

  it('navigates to inventory with warning filter when expiring items button is clicked', async () => {
    const inventoryStore = useInventoryStore()
    const updateFilterSpy = vi.spyOn(inventoryStore, 'updateFilter')
    const routerPushSpy = vi.spyOn(router, 'push')

    // Mock items expiring soon
    vi.spyOn(inventoryStore, 'itemsExpiringSoon', 'get').mockReturnValue([
      { id: '1', name: 'Item 1' }
    ] as unknown)

    const wrapper = mount(QuickActions, {
      global: {
        plugins: [router]
      }
    })

    await wrapper.vm.$nextTick()

    // Click on expiring items button
    const expiringButton = wrapper.findAll('.action-button')[1]
    await expiringButton.trigger('click')

    expect(updateFilterSpy).toHaveBeenCalledWith('warning')
    expect(routerPushSpy).toHaveBeenCalledWith('/inventory')
  })

  it('has proper accessibility attributes', async () => {
    const wrapper = mount(QuickActions, {
      global: {
        plugins: [router]
      }
    })

    // Check that buttons have proper focus styles
    const buttons = wrapper.findAll('.action-button')
    buttons.forEach(button => {
      const tagName = button.element.tagName
      expect(['A', 'BUTTON']).toContain(tagName)
    })
  })
})
