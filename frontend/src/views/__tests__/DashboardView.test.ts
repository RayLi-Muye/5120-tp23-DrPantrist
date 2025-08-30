import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { setActivePinia, createPinia } from 'pinia'
import { createRouter, createWebHistory } from 'vue-router'
import DashboardView from '../DashboardView.vue'
import { useAuthStore } from '@/stores/auth'
import { useInventoryStore } from '@/stores/inventory'

// Mock the stores
vi.mock('@/stores/auth')
vi.mock('@/stores/inventory')
vi.mock('@/api/inventory')
vi.mock('@/config/environment')

describe('DashboardView', () => {
  let mockAuthStore: any
  let mockInventoryStore: any
  let router: any

  beforeEach(() => {
    setActivePinia(createPinia())

    // Create a mock router
    router = createRouter({
      history: createWebHistory(),
      routes: [
        { path: '/', component: DashboardView },
        { path: '/auth', component: { template: '<div>Auth</div>' } }
      ]
    })

    mockAuthStore = {
      user: {
        id: 'user_123',
        inventoryName: 'Test Kitchen',
        loginCode: '123456'
      },
      isAuthenticated: true,
      logout: vi.fn()
    }

    mockInventoryStore = {
      isLoading: false,
      error: null,
      inventoryCounts: { total: 5 },
      fetchInventory: vi.fn(),
      clearError: vi.fn()
    }

    vi.mocked(useAuthStore).mockReturnValue(mockAuthStore)
    vi.mocked(useInventoryStore).mockReturnValue(mockInventoryStore)
  })

  it('should display user inventory name', () => {
    const wrapper = mount(DashboardView, {
      global: {
        plugins: [router]
      }
    })

    expect(wrapper.find('h1').text()).toBe('Test Kitchen')
  })

  it('should display login code', () => {
    const wrapper = mount(DashboardView, {
      global: {
        plugins: [router]
      }
    })

    expect(wrapper.text()).toContain('Code: 123456')
  })

  it('should logout and redirect when logout button is clicked', async () => {
    const routerPushSpy = vi.spyOn(router, 'replace')

    const wrapper = mount(DashboardView, {
      global: {
        plugins: [router]
      }
    })

    const logoutButton = wrapper.find('.logout-btn')
    expect(logoutButton.exists()).toBe(true)

    await logoutButton.trigger('click')

    expect(mockAuthStore.logout).toHaveBeenCalled()
    expect(routerPushSpy).toHaveBeenCalledWith('/auth')
  })

  it('should handle logout error gracefully', async () => {
    const routerPushSpy = vi.spyOn(router, 'replace')
    mockAuthStore.logout.mockImplementation(() => {
      throw new Error('Logout failed')
    })

    const wrapper = mount(DashboardView, {
      global: {
        plugins: [router]
      }
    })

    const logoutButton = wrapper.find('.logout-btn')
    await logoutButton.trigger('click')

    // Should still redirect even if logout throws error
    expect(routerPushSpy).toHaveBeenCalledWith('/auth')
  })
})
