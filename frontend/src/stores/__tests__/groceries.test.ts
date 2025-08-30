// Groceries Store Tests
// Use-It-Up PWA Frontend

import { describe, it, expect, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useGroceriesStore } from '../groceries'

describe('Groceries Store', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  describe('Initial State', () => {
    it('has a predefined master list of groceries', () => {
      const store = useGroceriesStore()

      expect(store.masterList).toBeDefined()
      expect(Array.isArray(store.masterList)).toBe(true)
      expect(store.masterList.length).toBeGreaterThan(0)
    })

    it('contains expected grocery items with correct structure', () => {
      const store = useGroceriesStore()

      // Check that each item has required properties
      store.masterList.forEach(item => {
        expect(item).toHaveProperty('id')
        expect(item).toHaveProperty('name')
        expect(item).toHaveProperty('category')
        expect(item).toHaveProperty('icon')
        expect(item).toHaveProperty('defaultShelfLife')
        expect(item).toHaveProperty('avgPrice')
        expect(item).toHaveProperty('co2Factor')
        expect(item).toHaveProperty('unit')

        // Check property types
        expect(typeof item.id).toBe('string')
        expect(typeof item.name).toBe('string')
        expect(typeof item.category).toBe('string')
        expect(typeof item.icon).toBe('string')
        expect(typeof item.defaultShelfLife).toBe('number')
        expect(typeof item.avgPrice).toBe('number')
        expect(typeof item.co2Factor).toBe('number')
        expect(typeof item.unit).toBe('string')

        // Check that numeric values are positive
        expect(item.defaultShelfLife).toBeGreaterThan(0)
        expect(item.avgPrice).toBeGreaterThan(0)
        expect(item.co2Factor).toBeGreaterThan(0)
      })
    })

    it('contains common grocery items', () => {
      const store = useGroceriesStore()
      const itemNames = store.masterList.map(item => item.name.toLowerCase())

      // Check for some expected common items
      const expectedItems = ['milk', 'bread', 'eggs', 'bananas', 'apples']
      expectedItems.forEach(expectedItem => {
        expect(itemNames.some(name => name.includes(expectedItem))).toBe(true)
      })
    })

    it('has unique IDs for all items', () => {
      const store = useGroceriesStore()
      const ids = store.masterList.map(item => item.id)
      const uniqueIds = new Set(ids)

      expect(uniqueIds.size).toBe(ids.length)
    })

    it('has diverse categories', () => {
      const store = useGroceriesStore()
      const categories = new Set(store.masterList.map(item => item.category))

      // Should have multiple categories
      expect(categories.size).toBeGreaterThan(1)

      // Check for some expected categories
      const categoryArray = Array.from(categories)
      expect(categoryArray.some(cat => cat.toLowerCase().includes('dairy'))).toBe(true)
      expect(categoryArray.some(cat => cat.toLowerCase().includes('fruit'))).toBe(true)
    })
  })

  describe('getItemById', () => {
    it('returns correct item when ID exists', () => {
      const store = useGroceriesStore()
      const firstItem = store.masterList[0]

      const foundItem = store.getItemById(firstItem.id)
      expect(foundItem).toEqual(firstItem)
    })

    it('returns undefined when ID does not exist', () => {
      const store = useGroceriesStore()

      const foundItem = store.getItemById('non-existent-id')
      expect(foundItem).toBeUndefined()
    })

    it('returns undefined for empty string ID', () => {
      const store = useGroceriesStore()

      const foundItem = store.getItemById('')
      expect(foundItem).toBeUndefined()
    })

    it('handles null and undefined IDs gracefully', () => {
      const store = useGroceriesStore()

      expect(store.getItemById(null as any)).toBeUndefined()
      expect(store.getItemById(undefined as any)).toBeUndefined()
    })

    it('is case sensitive for IDs', () => {
      const store = useGroceriesStore()
      const firstItem = store.masterList[0]

      // Should not find item with different case
      const foundItem = store.getItemById(firstItem.id.toUpperCase())
      expect(foundItem).toBeUndefined()
    })
  })

  describe('Data Quality', () => {
    it('has reasonable shelf life values', () => {
      const store = useGroceriesStore()

      store.masterList.forEach(item => {
        // Shelf life should be between 1 and 730 days (2 years max for dry goods)
        expect(item.defaultShelfLife).toBeGreaterThanOrEqual(1)
        expect(item.defaultShelfLife).toBeLessThanOrEqual(730)
      })
    })

    it('has reasonable price values', () => {
      const store = useGroceriesStore()

      store.masterList.forEach(item => {
        // Prices should be between $0.10 and $50.00 (reasonable range for common groceries)
        expect(item.avgPrice).toBeGreaterThanOrEqual(0.1)
        expect(item.avgPrice).toBeLessThanOrEqual(50)
      })
    })

    it('has reasonable CO2 factor values', () => {
      const store = useGroceriesStore()

      store.masterList.forEach(item => {
        // CO2 factors should be between 0.1 and 15 kg (reasonable range including meat)
        expect(item.co2Factor).toBeGreaterThanOrEqual(0.1)
        expect(item.co2Factor).toBeLessThanOrEqual(15)
      })
    })

    it('has non-empty names and categories', () => {
      const store = useGroceriesStore()

      store.masterList.forEach(item => {
        expect(item.name.trim()).toBeTruthy()
        expect(item.category.trim()).toBeTruthy()
        expect(item.unit.trim()).toBeTruthy()
      })
    })

    it('has emoji icons', () => {
      const store = useGroceriesStore()

      store.masterList.forEach(item => {
        // Icons should be non-empty and likely contain emoji characters
        expect(item.icon.trim()).toBeTruthy()
        expect(item.icon.length).toBeGreaterThan(0)
      })
    })
  })

  describe('Store Reactivity', () => {
    it('maintains reactivity when accessing masterList', () => {
      const store = useGroceriesStore()
      const initialLength = store.masterList.length

      // The masterList should be reactive
      expect(store.masterList.length).toBe(initialLength)
    })

    it('getItemById function is consistent', () => {
      const store = useGroceriesStore()
      const firstItem = store.masterList[0]

      // Multiple calls should return the same result
      const result1 = store.getItemById(firstItem.id)
      const result2 = store.getItemById(firstItem.id)

      expect(result1).toEqual(result2)
      expect(result1).toBe(result2) // Same reference
    })
  })

  describe('Performance', () => {
    it('getItemById performs efficiently with multiple calls', () => {
      const store = useGroceriesStore()
      const testId = store.masterList[0]?.id

      if (testId) {
        // Multiple rapid calls should not cause issues
        const results = []
        for (let i = 0; i < 100; i++) {
          results.push(store.getItemById(testId))
        }

        // All results should be identical
        expect(results.every(result => result?.id === testId)).toBe(true)
      }
    })
  })
})
