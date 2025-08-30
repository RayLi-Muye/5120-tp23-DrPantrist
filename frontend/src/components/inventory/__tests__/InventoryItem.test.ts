// InventoryItem Component Tests
// Use-It-Up PWA Frontend

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { ref } from 'vue'
import InventoryItem from '../InventoryItem.vue'
import type { InventoryItem as InventoryItemType } from '@/api/inventory'

// Mock composables
vi.mock('@/composables/useExpiryStatus', () => ({
  useExpiryStatus: vi.fn(() => ({
    status: ref('fresh'),
    statusText: ref('Fresh (5 days left)')
  }))
}))

vi.mock('@/composables/useSwipeGesture', () => ({
  useSwipeGesture: vi.fn(() => ({
    handleTouchStart: vi.fn(),
    handleTouchMove: vi.fn(),
    handleTouchEnd: vi.fn(),
    handleTouchCancel: vi.fn(),
    isSwiping: ref(false),
    swipeProgress: ref({ distance: 0, progress: 0, direction: null }),
    swipeProgressPercent: ref(0),
    isSwipeActive: ref(false)
  }))
}))

vi.mock('@/utils/formatters', () => ({
  formatQuantity: vi.fn((quantity: number, unit: string) => `${quantity} ${unit}`)
}))

describe('InventoryItem', () => {
  const mockItem: InventoryItemType = {
    id: 'item-1',
    userId: 'user-1',
    itemId: 'milk-001',
    name: 'Milk',
    category: 'Dairy',
    quantity: 1,
    unit: 'L',
    addedDate: '2024-01-01T00:00:00Z',
    expiryDate: '2024-01-08T00:00:00Z',
    status: 'active',
    notes: '',
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z'
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('renders item information correctly', () => {
    const wrapper = mount(InventoryItem, {
      props: {
        item: mockItem,
        isLoading: false
      }
    })

    // Check item name
    expect(wrapper.find('.inventory-item__name').text()).toBe('Milk')

    // Check category
    expect(wrapper.find('.inventory-item__category').text()).toBe('Dairy')

    // Check quantity (mocked formatter)
    expect(wrapper.find('.inventory-item__quantity').text()).toBe('1 L')

    // Check action button
    expect(wrapper.find('.inventory-item__action').text()).toBe('Mark as Used')
  })

  it('displays formatted expiry date correctly', () => {
    const wrapper = mount(InventoryItem, {
      props: {
        item: mockItem,
        isLoading: false
      }
    })

    const expiryDateElement = wrapper.find('.inventory-item__expiry-date')
    expect(expiryDateElement.exists()).toBe(true)
    // The exact format depends on the current date, so we just check it exists
    expect(expiryDateElement.text()).toBeTruthy()
  })

  it('applies correct CSS classes based on status', () => {
    const wrapper = mount(InventoryItem, {
      props: {
        item: mockItem,
        isLoading: false
      }
    })

    // Should have fresh status class (from mocked composable)
    expect(wrapper.find('.inventory-item').classes()).toContain('inventory-item--fresh')
  })

  it('emits itemUsed event when mark as used button is clicked', async () => {
    const wrapper = mount(InventoryItem, {
      props: {
        item: mockItem,
        isLoading: false
      }
    })

    await wrapper.find('.inventory-item__action').trigger('click')

    expect(wrapper.emitted('itemUsed')).toBeTruthy()
    expect(wrapper.emitted('itemUsed')?.[0]).toEqual(['item-1'])
  })

  it('does not emit itemUsed when loading', async () => {
    const wrapper = mount(InventoryItem, {
      props: {
        item: mockItem,
        isLoading: true
      }
    })

    await wrapper.find('.inventory-item__action').trigger('click')

    expect(wrapper.emitted('itemUsed')).toBeFalsy()
  })

  it('shows loading state on action button when isLoading is true', () => {
    const wrapper = mount(InventoryItem, {
      props: {
        item: mockItem,
        isLoading: true
      }
    })

    const actionButton = wrapper.find('.inventory-item__action')
    expect(actionButton.attributes('disabled')).toBeDefined()
    expect(actionButton.find('.loading').exists()).toBe(true)
  })

  it('handles touch events for swipe gesture', () => {
    const mockSwipeGesture = {
      handleTouchStart: vi.fn(),
      handleTouchMove: vi.fn(),
      handleTouchEnd: vi.fn(),
      handleTouchCancel: vi.fn(),
      isSwiping: ref(false),
      swipeProgress: ref({ distance: 0, progress: 0, direction: null }),
      swipeProgressPercent: ref(0),
      isSwipeActive: ref(false)
    }

    // Re-mock with our specific mock
    vi.mocked(require('@/composables/useSwipeGesture').useSwipeGesture).mockReturnValue(mockSwipeGesture)

    const wrapper = mount(InventoryItem, {
      props: {
        item: mockItem,
        isLoading: false
      }
    })

    const inventoryItem = wrapper.find('.inventory-item')

    // Simulate touch events
    const touchEvent = new TouchEvent('touchstart', {
      touches: [{ clientX: 100, clientY: 100 } as Touch]
    })

    inventoryItem.element.dispatchEvent(touchEvent)
    expect(mockSwipeGesture.handleTouchStart).toHaveBeenCalled()
  })

  it('displays swipe action background when swiping', async () => {
    const mockSwipeGesture = {
      handleTouchStart: vi.fn(),
      handleTouchMove: vi.fn(),
      handleTouchEnd: vi.fn(),
      handleTouchCancel: vi.fn(),
      isSwiping: ref(true),
      swipeProgress: ref({ distance: 50, progress: 0.5, direction: 'right' }),
      swipeProgressPercent: ref(50),
      isSwipeActive: ref(true)
    }

    vi.mocked(require('@/composables/useSwipeGesture').useSwipeGesture).mockReturnValue(mockSwipeGesture)

    const wrapper = mount(InventoryItem, {
      props: {
        item: mockItem,
        isLoading: false
      }
    })

    await wrapper.vm.$nextTick()

    // Check swipe active class
    expect(wrapper.find('.inventory-item').classes()).toContain('inventory-item--swipe-active')

    // Check swipe action visibility
    const swipeAction = wrapper.find('.inventory-item__swipe-action')
    expect(swipeAction.exists()).toBe(true)
  })

  it('handles invalid expiry date gracefully', () => {
    const itemWithInvalidDate = {
      ...mockItem,
      expiryDate: 'invalid-date'
    }

    const wrapper = mount(InventoryItem, {
      props: {
        item: itemWithInvalidDate,
        isLoading: false
      }
    })

    const expiryDateElement = wrapper.find('.inventory-item__expiry-date')
    expect(expiryDateElement.text()).toBe('Invalid date')
  })

  it('calls useExpiryStatus composable with correct expiry date', () => {
    const { useExpiryStatus } = require('@/composables/useExpiryStatus')

    mount(InventoryItem, {
      props: {
        item: mockItem,
        isLoading: false
      }
    })

    expect(useExpiryStatus).toHaveBeenCalled()
    // The composable should be called with a ref to the expiry date
    const callArgs = vi.mocked(useExpiryStatus).mock.calls[0]
    expect(callArgs[0].value).toBe(mockItem.expiryDate)
  })

  it('calls useSwipeGesture composable with correct callback', () => {
    const { useSwipeGesture } = require('@/composables/useSwipeGesture')

    const wrapper = mount(InventoryItem, {
      props: {
        item: mockItem,
        isLoading: false
      }
    })

    expect(useSwipeGesture).toHaveBeenCalled()

    // Get the callback function passed to useSwipeGesture
    const callArgs = vi.mocked(useSwipeGesture).mock.calls[0]
    const swipeCallback = callArgs[0]

    // Execute the callback and check if it emits the event
    swipeCallback()
    expect(wrapper.emitted('itemUsed')).toBeTruthy()
    expect(wrapper.emitted('itemUsed')?.[0]).toEqual(['item-1'])
  })

  it('displays correct swipe progress text based on progress percentage', async () => {
    const mockSwipeGesture = {
      handleTouchStart: vi.fn(),
      handleTouchMove: vi.fn(),
      handleTouchEnd: vi.fn(),
      handleTouchCancel: vi.fn(),
      isSwiping: ref(true),
      swipeProgress: ref({ distance: 50, progress: 0.5, direction: 'right' }),
      swipeProgressPercent: ref(50),
      isSwipeActive: ref(true)
    }

    vi.mocked(require('@/composables/useSwipeGesture').useSwipeGesture).mockReturnValue(mockSwipeGesture)

    const wrapper = mount(InventoryItem, {
      props: {
        item: mockItem,
        isLoading: false
      }
    })

    await wrapper.vm.$nextTick()

    // Should show "Swipe to mark as used" when progress < 100%
    expect(wrapper.find('.inventory-item__swipe-text').text()).toBe('Swipe to mark as used')

    // Update progress to 100%
    mockSwipeGesture.swipeProgressPercent.value = 100
    await wrapper.vm.$nextTick()

    // Should show "Release to mark as used!" when progress >= 100%
    expect(wrapper.find('.inventory-item__swipe-text').text()).toBe('Release to mark as used!')
  })
})
