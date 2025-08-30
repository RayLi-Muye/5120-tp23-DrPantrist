// Impact Store Tests
// Use-It-Up PWA Frontend

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useImpactStore } from '../impact'
import type { ImpactData } from '@/api/inventory'

// Mock the formatters
vi.mock('@/utils/formatters', () => ({
  formatCurrency: vi.fn((amount: number) => `$${amount.toFixed(2)}`),
  formatCO2: vi.fn((amount: number) => `${amount}kg CO₂`),
  formatCO2Comparison: vi.fn((amount: number) => {
    if (amount >= 1) return `equivalent to driving ${Math.round(amount * 4)}km`
    return `like saving ${Math.round(amount * 1000)}g of emissions`
  })
}))

describe('Impact Store', () => {
  const mockImpactData: ImpactData = {
    itemId: 'item-1',
    itemName: 'Milk',
    moneySaved: 4.50,
    co2Avoided: 1.2,
    actionType: 'used',
    timestamp: '2024-01-05T12:00:00Z'
  }

  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('Initial State', () => {
    it('has correct initial state', () => {
      const store = useImpactStore()

      expect(store.isVisible).toBe(false)
      expect(store.currentImpact).toBe(null)
      expect(store.motivationalMessage).toBe('')
      expect(store.totalImpact).toEqual({
        totalMoneySaved: 0,
        totalCO2Avoided: 0,
        itemsUsed: 0,
        lastUpdated: null
      })
    })
  })

  describe('Computed Properties', () => {
    it('formattedImpact returns null when no current impact', () => {
      const store = useImpactStore()

      expect(store.formattedImpact).toBe(null)
    })

    it('formattedImpact formats impact data correctly', () => {
      const store = useImpactStore()
      store.currentImpact = mockImpactData

      const formatted = store.formattedImpact
      expect(formatted).toEqual({
        moneySaved: '$4.50',
        co2Avoided: '1.2kg CO₂',
        co2Comparison: 'equivalent to driving 5km',
        itemName: 'Milk',
        actionType: 'used'
      })
    })

    it('formattedTotalImpact formats total impact correctly', () => {
      const store = useImpactStore()
      store.totalImpact = {
        totalMoneySaved: 25.75,
        totalCO2Avoided: 3.8,
        itemsUsed: 12,
        lastUpdated: '2024-01-05T12:00:00Z'
      }

      const formatted = store.formattedTotalImpact
      expect(formatted).toEqual({
        totalMoneySaved: '$25.75',
        totalCO2Avoided: '3.8kg CO₂',
        totalCO2Comparison: 'equivalent to driving 15km',
        itemsUsed: 12,
        lastUpdated: '2024-01-05T12:00:00Z'
      })
    })

    it('formattedTotalImpact handles zero values', () => {
      const store = useImpactStore()
      // Initial state has zero values

      const formatted = store.formattedTotalImpact
      expect(formatted).toEqual({
        totalMoneySaved: '$0.00',
        totalCO2Avoided: '0kg CO₂',
        totalCO2Comparison: 'like saving 0g of emissions',
        itemsUsed: 0,
        lastUpdated: null
      })
    })
  })

  describe('Actions', () => {
    describe('showImpact', () => {
      it('shows impact with correct data and message', () => {
        const store = useImpactStore()
        const customMessage = 'Excellent work!'

        store.showImpact(mockImpactData, customMessage)

        expect(store.isVisible).toBe(true)
        expect(store.currentImpact).toEqual(mockImpactData)
        expect(store.motivationalMessage).toBe(customMessage)
      })

      it('uses default message when none provided', () => {
        const store = useImpactStore()

        store.showImpact(mockImpactData)

        expect(store.isVisible).toBe(true)
        expect(store.currentImpact).toEqual(mockImpactData)
        expect(store.motivationalMessage).toBe('Great job! You prevented food waste!')
      })

      it('generates different motivational messages', () => {
        const store = useImpactStore()
        const messages = new Set()

        // Call showImpact multiple times to test message variety
        for (let i = 0; i < 10; i++) {
          store.showImpact(mockImpactData)
          messages.add(store.motivationalMessage)
          store.hideImpact() // Reset for next iteration
        }

        // Should have some variety in messages (at least 2 different ones)
        expect(messages.size).toBeGreaterThanOrEqual(2)
      })

      it('updates total impact when showing new impact', () => {
        const store = useImpactStore()
        const initialTotal = { ...store.totalImpact }

        store.showImpact(mockImpactData)

        expect(store.totalImpact.totalMoneySaved).toBe(initialTotal.totalMoneySaved + mockImpactData.moneySaved)
        expect(store.totalImpact.totalCO2Avoided).toBe(initialTotal.totalCO2Avoided + mockImpactData.co2Avoided)
        expect(store.totalImpact.itemsUsed).toBe(initialTotal.itemsUsed + 1)
        expect(store.totalImpact.lastUpdated).toBe(mockImpactData.timestamp)
      })
    })

    describe('hideImpact', () => {
      it('hides impact and clears current data', () => {
        const store = useImpactStore()

        // First show impact
        store.showImpact(mockImpactData, 'Test message')
        expect(store.isVisible).toBe(true)

        // Then hide it
        store.hideImpact()

        expect(store.isVisible).toBe(false)
        expect(store.currentImpact).toBe(null)
        expect(store.motivationalMessage).toBe('')
      })

      it('does not affect total impact when hiding', () => {
        const store = useImpactStore()

        // Show impact to update totals
        store.showImpact(mockImpactData)
        const totalAfterShow = { ...store.totalImpact }

        // Hide impact
        store.hideImpact()

        // Total should remain the same
        expect(store.totalImpact).toEqual(totalAfterShow)
      })
    })

    describe('updateTotalImpact', () => {
      it('adds new impact to existing totals', () => {
        const store = useImpactStore()

        // Set initial totals
        store.totalImpact = {
          totalMoneySaved: 10.00,
          totalCO2Avoided: 2.5,
          itemsUsed: 5,
          lastUpdated: '2024-01-01T00:00:00Z'
        }

        store.updateTotalImpact(mockImpactData)

        expect(store.totalImpact.totalMoneySaved).toBe(14.50) // 10.00 + 4.50
        expect(store.totalImpact.totalCO2Avoided).toBe(3.7) // 2.5 + 1.2
        expect(store.totalImpact.itemsUsed).toBe(6) // 5 + 1
        expect(store.totalImpact.lastUpdated).toBe(mockImpactData.timestamp)
      })

      it('handles first impact correctly', () => {
        const store = useImpactStore()
        // Initial state has zero totals

        store.updateTotalImpact(mockImpactData)

        expect(store.totalImpact.totalMoneySaved).toBe(4.50)
        expect(store.totalImpact.totalCO2Avoided).toBe(1.2)
        expect(store.totalImpact.itemsUsed).toBe(1)
        expect(store.totalImpact.lastUpdated).toBe(mockImpactData.timestamp)
      })

      it('handles multiple impacts correctly', () => {
        const store = useImpactStore()

        const impact1: ImpactData = {
          itemId: 'item-1',
          itemName: 'Milk',
          moneySaved: 4.50,
          co2Avoided: 1.2,
          actionType: 'used',
          timestamp: '2024-01-05T12:00:00Z'
        }

        const impact2: ImpactData = {
          itemId: 'item-2',
          itemName: 'Bread',
          moneySaved: 3.00,
          co2Avoided: 0.8,
          actionType: 'used',
          timestamp: '2024-01-05T13:00:00Z'
        }

        store.updateTotalImpact(impact1)
        store.updateTotalImpact(impact2)

        expect(store.totalImpact.totalMoneySaved).toBe(7.50)
        expect(store.totalImpact.totalCO2Avoided).toBe(2.0)
        expect(store.totalImpact.itemsUsed).toBe(2)
        expect(store.totalImpact.lastUpdated).toBe(impact2.timestamp) // Latest timestamp
      })
    })

    describe('resetTotalImpact', () => {
      it('resets total impact to initial state', () => {
        const store = useImpactStore()

        // Add some impact first
        store.updateTotalImpact(mockImpactData)
        expect(store.totalImpact.itemsUsed).toBe(1)

        // Reset
        store.resetTotalImpact()

        expect(store.totalImpact).toEqual({
          totalMoneySaved: 0,
          totalCO2Avoided: 0,
          itemsUsed: 0,
          lastUpdated: null
        })
      })

      it('does not affect current impact visibility', () => {
        const store = useImpactStore()

        // Show impact
        store.showImpact(mockImpactData)
        expect(store.isVisible).toBe(true)

        // Reset totals
        store.resetTotalImpact()

        // Current impact should still be visible
        expect(store.isVisible).toBe(true)
        expect(store.currentImpact).toEqual(mockImpactData)
      })
    })
  })

  describe('Motivational Messages', () => {
    it('generates appropriate messages for different impact levels', () => {
      const store = useImpactStore()

      // Test with high impact
      const highImpact: ImpactData = {
        ...mockImpactData,
        moneySaved: 15.00,
        co2Avoided: 5.0
      }

      store.showImpact(highImpact)
      const highImpactMessage = store.motivationalMessage

      // Test with low impact
      const lowImpact: ImpactData = {
        ...mockImpactData,
        moneySaved: 1.00,
        co2Avoided: 0.2
      }

      store.hideImpact()
      store.showImpact(lowImpact)
      const lowImpactMessage = store.motivationalMessage

      // Both should be non-empty strings
      expect(highImpactMessage).toBeTruthy()
      expect(lowImpactMessage).toBeTruthy()
      expect(typeof highImpactMessage).toBe('string')
      expect(typeof lowImpactMessage).toBe('string')
    })

    it('includes positive reinforcement words', () => {
      const store = useImpactStore()
      const positiveWords = ['great', 'awesome', 'excellent', 'fantastic', 'amazing', 'good', 'well done']

      store.showImpact(mockImpactData)
      const message = store.motivationalMessage.toLowerCase()

      // Should contain at least one positive word
      const hasPositiveWord = positiveWords.some(word => message.includes(word))
      expect(hasPositiveWord).toBe(true)
    })
  })

  describe('Edge Cases', () => {
    it('handles zero impact values', () => {
      const store = useImpactStore()
      const zeroImpact: ImpactData = {
        itemId: 'item-1',
        itemName: 'Test Item',
        moneySaved: 0,
        co2Avoided: 0,
        actionType: 'used',
        timestamp: '2024-01-05T12:00:00Z'
      }

      store.showImpact(zeroImpact)

      expect(store.isVisible).toBe(true)
      expect(store.currentImpact).toEqual(zeroImpact)

      const formatted = store.formattedImpact
      expect(formatted?.moneySaved).toBe('$0.00')
      expect(formatted?.co2Avoided).toBe('0kg CO₂')
    })

    it('handles negative impact values gracefully', () => {
      const store = useImpactStore()
      const negativeImpact: ImpactData = {
        itemId: 'item-1',
        itemName: 'Test Item',
        moneySaved: -1.00,
        co2Avoided: -0.5,
        actionType: 'used',
        timestamp: '2024-01-05T12:00:00Z'
      }

      store.showImpact(negativeImpact)
      store.updateTotalImpact(negativeImpact)

      // Should handle negative values without crashing
      expect(store.totalImpact.totalMoneySaved).toBe(-1.00)
      expect(store.totalImpact.totalCO2Avoided).toBe(-0.5)
    })

    it('handles very large impact values', () => {
      const store = useImpactStore()
      const largeImpact: ImpactData = {
        itemId: 'item-1',
        itemName: 'Test Item',
        moneySaved: 999999.99,
        co2Avoided: 999999.99,
        actionType: 'used',
        timestamp: '2024-01-05T12:00:00Z'
      }

      store.showImpact(largeImpact)

      expect(store.isVisible).toBe(true)
      const formatted = store.formattedImpact
      expect(formatted?.moneySaved).toBe('$999999.99')
    })
  })
})
