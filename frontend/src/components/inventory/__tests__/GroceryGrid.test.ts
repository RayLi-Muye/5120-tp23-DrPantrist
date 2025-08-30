// GroceryGrid Component Tests
// Use-It-Up PWA Frontend

import { describe, it, expect, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import GroceryGrid from '../GroceryGrid.vue'
import type { GroceryItem } from '@/stores/groceries'

describe('GroceryGrid', () => {
  const mockGroceries: GroceryItem[] = [
    {
      id: 'milk-001',
      name: 'Milk',
      category: 'Dairy',
      icon: '🥛',
      defaultShelfLife: 7,
      avgPrice: 4.50,
      co2Factor: 1.9,
      unit: 'L'
    },
    {
      id: 'bread-001',
      name: 'Bread',
      category: 'Bakery',
      icon: '🍞',
      defaultShelfLife: 5,
      avgPrice: 3.00,
      co2Factor: 0.8,
      unit: 'loaf'
    },
    {
      id: 'banana-001',
      name: 'Bananas',
      category: 'Fruit',
      icon: '🍌',
      defaultShelfLife: 4,
      avgPrice: 2.50,
      co2Factor: 0.5,
      unit: 'bunch'
    }
  ]

  let wrapper: any

  beforeEach(() => {
    wrapper = mount(GroceryGrid, {
      props: {
        groceries: mockGroceries
      }
    })
  })

  it('renders all grocery items', () => {
    const groceryItems = wrapper.findAll('.grocery-item')
    expect(groceryItems).toHaveLength(3)
  })

  it('displays correct item information for each grocery', () => {
    const groceryItems = wrapper.findAll('.grocery-item')

    // Check first item (Milk)
    const milkItem = groceryItems[0]
    expect(milkItem.find('.item-icon').text()).toBe('🥛')
    expect(milkItem.find('.item-name').text()).toBe('Milk')
    expect(milkItem.find('.item-category').text()).toBe('Dairy')

    // Check second item (Bread)
    const breadItem = groceryItems[1]
    expect(breadItem.find('.item-icon').text()).toBe('🍞')
    expect(breadItem.find('.item-name').text()).toBe('Bread')
    expect(breadItem.find('.item-category').text()).toBe('Bakery')

    // Check third item (Bananas)
    const bananaItem = groceryItems[2]
    expect(bananaItem.find('.item-icon').text()).toBe('🍌')
    expect(bananaItem.find('.item-name').text()).toBe('Bananas')
    expect(bananaItem.find('.item-category').text()).toBe('Fruit')
  })

  it('emits item-selected event when grocery item is clicked', async () => {
    const groceryItems = wrapper.findAll('.grocery-item')

    // Click on the first item (Milk)
    await groceryItems[0].trigger('click')

    expect(wrapper.emitted('item-selected')).toBeTruthy()
    expect(wrapper.emitted('item-selected')?.[0]).toEqual([mockGroceries[0]])
  })

  it('emits correct item data for different grocery items', async () => {
    const groceryItems = wrapper.findAll('.grocery-item')

    // Click on different items
    await groceryItems[1].trigger('click') // Bread
    await groceryItems[2].trigger('click') // Bananas

    const emittedEvents = wrapper.emitted('item-selected')
    expect(emittedEvents).toHaveLength(2)
    expect(emittedEvents?.[0]).toEqual([mockGroceries[1]]) // Bread
    expect(emittedEvents?.[1]).toEqual([mockGroceries[2]]) // Bananas
  })

  it('has proper accessibility attributes', () => {
    const groceryItems = wrapper.findAll('.grocery-item')

    // Check aria-label for first item
    expect(groceryItems[0].attributes('aria-label')).toBe('Select Milk')
    expect(groceryItems[1].attributes('aria-label')).toBe('Select Bread')
    expect(groceryItems[2].attributes('aria-label')).toBe('Select Bananas')
  })

  it('renders empty grid when no groceries provided', () => {
    const emptyWrapper = mount(GroceryGrid, {
      props: {
        groceries: []
      }
    })

    const groceryItems = emptyWrapper.findAll('.grocery-item')
    expect(groceryItems).toHaveLength(0)
  })

  it('handles single grocery item correctly', () => {
    const singleItemWrapper = mount(GroceryGrid, {
      props: {
        groceries: [mockGroceries[0]]
      }
    })

    const groceryItems = singleItemWrapper.findAll('.grocery-item')
    expect(groceryItems).toHaveLength(1)

    const item = groceryItems[0]
    expect(item.find('.item-name').text()).toBe('Milk')
  })

  it('maintains grid layout structure', () => {
    const gridContainer = wrapper.find('.grocery-items')
    expect(gridContainer.exists()).toBe(true)

    // Check that it has the grid class
    expect(gridContainer.classes()).toContain('grocery-items')
  })

  it('applies correct CSS classes to grocery items', () => {
    const groceryItems = wrapper.findAll('.grocery-item')

    groceryItems.forEach(item => {
      expect(item.classes()).toContain('grocery-item')
    })
  })

  it('handles grocery items with special characters in names', () => {
    const specialGroceries: GroceryItem[] = [
      {
        id: 'special-001',
        name: 'Café Latte',
        category: 'Beverages',
        icon: '☕',
        defaultShelfLife: 1,
        avgPrice: 5.00,
        co2Factor: 0.3,
        unit: 'cup'
      }
    ]

    const specialWrapper = mount(GroceryGrid, {
      props: {
        groceries: specialGroceries
      }
    })

    const item = specialWrapper.find('.grocery-item')
    expect(item.find('.item-name').text()).toBe('Café Latte')
    expect(item.attributes('aria-label')).toBe('Select Café Latte')
  })

  it('handles grocery items with long names gracefully', () => {
    const longNameGroceries: GroceryItem[] = [
      {
        id: 'long-001',
        name: 'Extra Long Grocery Item Name That Might Wrap',
        category: 'Test Category',
        icon: '🧪',
        defaultShelfLife: 7,
        avgPrice: 10.00,
        co2Factor: 1.0,
        unit: 'item'
      }
    ]

    const longNameWrapper = mount(GroceryGrid, {
      props: {
        groceries: longNameGroceries
      }
    })

    const item = longNameWrapper.find('.grocery-item')
    expect(item.find('.item-name').text()).toBe('Extra Long Grocery Item Name That Might Wrap')
  })

  it('maintains proper button semantics for keyboard navigation', () => {
    const groceryItems = wrapper.findAll('.grocery-item')

    groceryItems.forEach(item => {
      // Should be button elements for proper keyboard navigation
      expect(item.element.tagName).toBe('BUTTON')
    })
  })

  it('handles rapid clicking without issues', async () => {
    const groceryItems = wrapper.findAll('.grocery-item')
    const firstItem = groceryItems[0]

    // Simulate rapid clicking
    await firstItem.trigger('click')
    await firstItem.trigger('click')
    await firstItem.trigger('click')

    const emittedEvents = wrapper.emitted('item-selected')
    expect(emittedEvents).toHaveLength(3)

    // All events should contain the same item data
    emittedEvents?.forEach(event => {
      expect(event).toEqual([mockGroceries[0]])
    })
  })

  it('preserves item order as provided in props', () => {
    const groceryItems = wrapper.findAll('.grocery-item')

    // Check that items are rendered in the same order as the props
    expect(groceryItems[0].find('.item-name').text()).toBe(mockGroceries[0].name)
    expect(groceryItems[1].find('.item-name').text()).toBe(mockGroceries[1].name)
    expect(groceryItems[2].find('.item-name').text()).toBe(mockGroceries[2].name)
  })
})
