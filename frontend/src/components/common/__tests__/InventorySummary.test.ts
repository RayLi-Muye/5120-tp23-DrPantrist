import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { createRouter, createWebHistory } from 'vue-router'
import InventorySummary from '../InventorySummary.vue'
import { useInventoryStore } from '@/stores/inventory'

// Mock router
const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/inventory', name: 'inventory', component: { template: '<div>Inventory</div>' } }
  ]
})

describe('InventorySummary', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('renders summary cards with correct counts', async () => {
    const wrapper = mount(InventorySummary, {
      global: {
        plugins: [router]
      }
    })

    // Check that all three cards are rendered
    const cards = wrapper.findAll('.summary-card')
    expect(cards).toHaveLength(3)

    // Check card labels
    expect(wrapper.text()).toContain('Fresh')
    expect(wrapper.text()).toContain('Warning')
    expect(wrapper.text()).toContain('Expired')
  })

  it('displays correct counts from inventory store', async () => {
    const inventoryStore = useInventoryStore()

    // Mock inventory counts
    vi.spyOn(inventoryStore, 'inventoryCounts', 'get').mockReturnValue({
      total: 10,
      fresh: 5,
      warning: 3,
      expired: 2
    })

    const wrapper = mount(InventorySummary, {
      global: {
        plugins: [router]
      }
    })

    await wrapper.vm.$nextTick()

    // Check that counts are displayed correctly
    const cards = wrapper.findAll('.summary-card')
    expect(cards[0].find('.summary-card__count').text()).toBe('5')
    expect(cards[1].find('.summary-card__count').text()).toBe('3')
    expect(cards[2].find('.summary-card__count').text()).toBe('2')
  })

  it('makes cards clickable when count > 0', async () => {
    const inventoryStore = useInventoryStore()

    // Mock inventory counts with some items
    vi.spyOn(inventoryStore, 'inventoryCounts', 'get').mockReturnValue({
      total: 5,
      fresh: 3,
      warning: 2,
      expired: 0
    })

    const wrapper = mount(InventorySummary, {
      global: {
        plugins: [router]
      }
    })

    await wrapper.vm.$nextTick()

    const cards = wrapper.findAll('.summary-card')

    // Fresh and warning cards should be clickable
    expect(cards[0].classes()).toContain('summary-card--clickable')
    expect(cards[1].classes()).toContain('summary-card--clickable')

    // Expired card should not be clickable (count is 0)
    expect(cards[2].classes()).not.toContain('summary-card--clickable')
  })

  it('navigates to inventory with correct filter when card is clicked', async () => {
    const inventoryStore = useInventoryStore()
    const updateFilterSpy = vi.spyOn(inventoryStore, 'updateFilter')
    const routerPushSpy = vi.spyOn(router, 'push')

    // Mock inventory counts
    vi.spyOn(inventoryStore, 'inventoryCounts', 'get').mockReturnValue({
      total: 5,
      fresh: 3,
      warning: 2,
      expired: 0
    })

    const wrapper = mount(InventorySummary, {
      global: {
        plugins: [router]
      }
    })

    await wrapper.vm.$nextTick()

    // Click on fresh card
    const freshCard = wrapper.findAll('.summary-card')[0]
    await freshCard.trigger('click')

    expect(updateFilterSpy).toHaveBeenCalledWith('fresh')
    expect(routerPushSpy).toHaveBeenCalledWith('/inventory')
  })
})
