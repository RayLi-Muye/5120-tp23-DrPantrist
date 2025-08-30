import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { setActivePinia, createPinia } from 'pinia'
import ImpactStats from '../ImpactStats.vue'
import { useImpactStore } from '@/stores/impact'
import { useAuthStore } from '@/stores/auth'

// Mock the stores
vi.mock('@/stores/impact')
vi.mock('@/stores/auth')

describe('ImpactStats', () => {
  let mockImpactStore: any
  let mockAuthStore: any

  beforeEach(() => {
    setActivePinia(createPinia())

    mockImpactStore = {
      formattedTotalImpact: {
        totalMoneySaved: '$25.50',
        totalCo2Avoided: '2.3 kg',
        totalCo2Comparison: 'equivalent to 5 miles of driving',
        itemsUsed: 12,
        itemsUsedText: '12 items used'
      },
      isLoadingTotal: false,
      error: null,
      fetchTotalImpact: vi.fn()
    }

    mockAuthStore = {
      user: {
        id: 'user_123',
        inventoryName: 'Test Kitchen',
        loginCode: '123456'
      }
    }

    vi.mocked(useImpactStore).mockReturnValue(mockImpactStore)
    vi.mocked(useAuthStore).mockReturnValue(mockAuthStore)
  })

  it('should render impact statistics correctly', () => {
    const wrapper = mount(ImpactStats)

    expect(wrapper.find('.stats-title').text()).toBe('Your Impact')
    expect(wrapper.find('.money-saved .stat-value').text()).toBe('$25.50')
    expect(wrapper.find('.co2-reduced .stat-value').text()).toBe('2.3 kg')
    expect(wrapper.find('.summary-text').text()).toContain('12 items used')
    expect(wrapper.find('.summary-text').text()).toContain('equivalent to 5 miles of driving')
  })

  it('should show loading state', () => {
    mockImpactStore.isLoadingTotal = true
    const wrapper = mount(ImpactStats)

    expect(wrapper.find('.stats-loading').exists()).toBe(true)
    expect(wrapper.find('.loading-spinner').exists()).toBe(true)
    expect(wrapper.text()).toContain('Loading your impact...')
  })

  it('should show error state with retry button', async () => {
    mockImpactStore.error = 'Failed to load impact data'
    const wrapper = mount(ImpactStats)

    expect(wrapper.find('.stats-error').exists()).toBe(true)
    expect(wrapper.text()).toContain('Failed to load impact data')

    const retryButton = wrapper.find('.retry-button')
    expect(retryButton.exists()).toBe(true)

    await retryButton.trigger('click')
    expect(mockImpactStore.fetchTotalImpact).toHaveBeenCalledWith('user_123')
  })

  it('should fetch impact data on mount', () => {
    mount(ImpactStats)
    expect(mockImpactStore.fetchTotalImpact).toHaveBeenCalledWith('user_123')
  })

  it('should handle missing user gracefully', () => {
    mockAuthStore.user = null
    const wrapper = mount(ImpactStats)

    // Should not crash and should not call fetchTotalImpact
    expect(mockImpactStore.fetchTotalImpact).not.toHaveBeenCalled()
  })
})
