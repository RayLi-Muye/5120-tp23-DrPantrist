// Impact Card Component Tests
// Use-It-Up PWA Frontend

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mount } from '@vue/test-utils'
import ImpactCard from '../ImpactCard.vue'
import type { FormattedImpactData } from '@/stores/impact'

// Mock timers for auto-dismiss functionality
vi.useFakeTimers()

// Create a div element to act as the teleport target
const createTeleportTarget = () => {
  const div = document.createElement('div')
  div.id = 'teleport-target'
  document.body.appendChild(div)
  return div
}

describe('ImpactCard', () => {
  const mockImpact: FormattedImpactData = {
    moneySaved: '$4.50',
    co2Avoided: '1.2kg CO₂',
    co2Comparison: 'equivalent to driving 5km',
    itemName: 'Milk',
    actionType: 'used'
  }

  let teleportTarget: HTMLElement

  beforeEach(() => {
    vi.clearAllTimers()
    teleportTarget = createTeleportTarget()
  })

  afterEach(() => {
    vi.runOnlyPendingTimers()
    vi.useRealTimers()
    vi.useFakeTimers()
    if (teleportTarget) {
      document.body.removeChild(teleportTarget)
    }
  })

  it('renders impact data correctly when visible', async () => {
    const wrapper = mount(ImpactCard, {
      props: {
        visible: true,
        impact: mockImpact,
        motivationalMessage: 'Great job!'
      },
      global: {
        stubs: {
          Teleport: false
        }
      }
    })

    await wrapper.vm.$nextTick()

    // Check content in the document body (where Teleport renders)
    expect(document.body.textContent).toContain('Great job!')
    expect(document.body.textContent).toContain('$4.50')
    expect(document.body.textContent).toContain('1.2kg CO₂')
    expect(document.body.textContent).toContain('equivalent to driving 5km')
    expect(document.body.textContent).toContain('You used Milk before it expired!')
  })

  it('does not render when not visible', () => {
    const wrapper = mount(ImpactCard, {
      props: {
        visible: false,
        impact: mockImpact,
        motivationalMessage: 'Great job!'
      }
    })

    expect(wrapper.find('.impact-modal').exists()).toBe(false)
  })

  it('emits dismissed event when close button is clicked', async () => {
    const wrapper = mount(ImpactCard, {
      props: {
        visible: true,
        impact: mockImpact,
        motivationalMessage: 'Great job!'
      }
    })

    await wrapper.find('.impact-modal__close').trigger('click')
    expect(wrapper.emitted('dismissed')).toBeTruthy()
  })

  it('emits dismissed event when backdrop is clicked', async () => {
    const wrapper = mount(ImpactCard, {
      props: {
        visible: true,
        impact: mockImpact,
        motivationalMessage: 'Great job!'
      }
    })

    await wrapper.find('.impact-modal').trigger('click')
    expect(wrapper.emitted('dismissed')).toBeTruthy()
  })

  it('does not emit dismissed when content is clicked', async () => {
    const wrapper = mount(ImpactCard, {
      props: {
        visible: true,
        impact: mockImpact,
        motivationalMessage: 'Great job!'
      }
    })

    await wrapper.find('.impact-modal__content').trigger('click')
    expect(wrapper.emitted('dismissed')).toBeFalsy()
  })

  it('shows countdown timer and auto-dismisses after 3 seconds', async () => {
    const wrapper = mount(ImpactCard, {
      props: {
        visible: true,
        impact: mockImpact,
        motivationalMessage: 'Great job!'
      }
    })

    // Initially shows 3 seconds
    expect(wrapper.text()).toContain('Auto-closing in 3s')

    // After 1 second
    vi.advanceTimersByTime(1000)
    await wrapper.vm.$nextTick()
    expect(wrapper.text()).toContain('Auto-closing in 2s')

    // After 2 seconds
    vi.advanceTimersByTime(1000)
    await wrapper.vm.$nextTick()
    expect(wrapper.text()).toContain('Auto-closing in 1s')

    // After 3 seconds - should emit dismissed
    vi.advanceTimersByTime(1000)
    await wrapper.vm.$nextTick()
    expect(wrapper.emitted('dismissed')).toBeTruthy()
  })

  it('handles null impact data gracefully', () => {
    const wrapper = mount(ImpactCard, {
      props: {
        visible: true,
        impact: null,
        motivationalMessage: 'Great job!'
      }
    })

    expect(wrapper.text()).toContain('$0.00')
    expect(wrapper.text()).toContain('0g CO₂')
    expect(wrapper.text()).toContain('You used  before it expired!')
  })

  it('clears timers when component is unmounted', () => {
    const clearTimeoutSpy = vi.spyOn(global, 'clearTimeout')
    const clearIntervalSpy = vi.spyOn(global, 'clearInterval')

    const wrapper = mount(ImpactCard, {
      props: {
        visible: true,
        impact: mockImpact,
        motivationalMessage: 'Great job!'
      }
    })

    wrapper.unmount()

    expect(clearTimeoutSpy).toHaveBeenCalled()
    expect(clearIntervalSpy).toHaveBeenCalled()
  })

  it('updates progress bar smoothly', async () => {
    const wrapper = mount(ImpactCard, {
      props: {
        visible: true,
        impact: mockImpact,
        motivationalMessage: 'Great job!'
      }
    })

    const progressBar = wrapper.find('.impact-auto-dismiss__progress')

    // Initially at 100%
    expect(progressBar.attributes('style')).toContain('width: 100%')

    // After some time, should decrease
    vi.advanceTimersByTime(500)
    await wrapper.vm.$nextTick()

    const currentWidth = progressBar.attributes('style')
    expect(currentWidth).toMatch(/width: \d+(\.\d+)?%/)
    expect(parseFloat(currentWidth.match(/width: (\d+(?:\.\d+)?)%/)?.[1] || '100')).toBeLessThan(100)
  })

  it('displays correct motivational message', () => {
    const customMessage = 'Awesome work!'
    const wrapper = mount(ImpactCard, {
      props: {
        visible: true,
        impact: mockImpact,
        motivationalMessage: customMessage
      }
    })

    expect(document.body.textContent).toContain(customMessage)
  })

  it('shows celebration icon and animation elements', () => {
    const wrapper = mount(ImpactCard, {
      props: {
        visible: true,
        impact: mockImpact,
        motivationalMessage: 'Great job!'
      }
    })

    // Check for celebration elements in the DOM
    expect(document.body.textContent).toContain('🎉')
    expect(document.body.textContent).toContain('Great job!')
  })

  it('displays impact metrics with correct icons', () => {
    const wrapper = mount(ImpactCard, {
      props: {
        visible: true,
        impact: mockImpact,
        motivationalMessage: 'Great job!'
      }
    })

    // Check for money and CO2 icons and values
    expect(document.body.textContent).toContain('💰')
    expect(document.body.textContent).toContain('🌱')
    expect(document.body.textContent).toContain('Money Saved')
    expect(document.body.textContent).toContain('CO₂ Avoided')
  })

  it('handles different impact data formats', () => {
    const differentImpact: FormattedImpactData = {
      moneySaved: '$12.99',
      co2Avoided: '500g CO₂',
      co2Comparison: 'like planting a tree',
      itemName: 'Organic Vegetables',
      actionType: 'used'
    }

    const wrapper = mount(ImpactCard, {
      props: {
        visible: true,
        impact: differentImpact,
        motivationalMessage: 'Excellent!'
      }
    })

    expect(document.body.textContent).toContain('$12.99')
    expect(document.body.textContent).toContain('500g CO₂')
    expect(document.body.textContent).toContain('like planting a tree')
    expect(document.body.textContent).toContain('You used Organic Vegetables before it expired!')
  })

  it('resets timer when visibility changes', async () => {
    const wrapper = mount(ImpactCard, {
      props: {
        visible: false,
        impact: mockImpact,
        motivationalMessage: 'Great job!'
      }
    })

    // Make visible
    await wrapper.setProps({ visible: true })
    expect(wrapper.text()).toContain('Auto-closing in 3s')

    // Make invisible
    await wrapper.setProps({ visible: false })

    // Make visible again - should reset to 3s
    await wrapper.setProps({ visible: true })
    expect(wrapper.text()).toContain('Auto-closing in 3s')
  })

  it('has proper ARIA attributes for accessibility', () => {
    const wrapper = mount(ImpactCard, {
      props: {
        visible: true,
        impact: mockImpact,
        motivationalMessage: 'Great job!'
      }
    })

    // Check for proper ARIA attributes in the DOM
    const modalElement = document.querySelector('[role="dialog"]')
    expect(modalElement).toBeTruthy()
    expect(modalElement?.getAttribute('aria-labelledby')).toBe('impact-title')
    expect(modalElement?.getAttribute('aria-describedby')).toBe('impact-description')
  })

  it('prevents event propagation when content is clicked', async () => {
    const wrapper = mount(ImpactCard, {
      props: {
        visible: true,
        impact: mockImpact,
        motivationalMessage: 'Great job!'
      }
    })

    // Create a mock event with stopPropagation
    const mockEvent = {
      stopPropagation: vi.fn()
    }

    // Find content element and trigger click with mock event
    const contentElement = wrapper.find('.impact-modal__content')
    await contentElement.trigger('click', mockEvent)

    // Should not emit dismissed when content is clicked
    expect(wrapper.emitted('dismissed')).toBeFalsy()
  })
})
