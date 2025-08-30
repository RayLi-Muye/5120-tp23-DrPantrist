import { describe, it, expect, beforeEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useAuthStore } from '../auth'

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
}

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock
})

describe('Auth Store', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
  })

  it('should create a new inventory with login code', () => {
    const authStore = useAuthStore()

    const user = authStore.createInventory('My Kitchen')

    expect(user.inventoryName).toBe('My Kitchen')
    expect(user.loginCode).toMatch(/^\d{6}$/) // 6-digit code
    expect(user.id).toMatch(/^user_\d+_[a-z0-9]+$/)
    expect(authStore.isAuthenticated).toBe(true)
    expect(localStorageMock.setItem).toHaveBeenCalledWith('useItUp_user', JSON.stringify(user))
  })

  it('should login with valid code', () => {
    const authStore = useAuthStore()
    const mockUser = {
      id: 'user_123',
      inventoryName: 'Test Kitchen',
      loginCode: '123456',
      createdAt: new Date().toISOString()
    }

    localStorageMock.getItem.mockReturnValue(JSON.stringify(mockUser))

    const success = authStore.loginWithCode('123456')

    expect(success).toBe(true)
    expect(authStore.isAuthenticated).toBe(true)
    expect(authStore.user?.inventoryName).toBe('Test Kitchen')
  })

  it('should fail login with invalid code', () => {
    const authStore = useAuthStore()
    const mockUser = {
      id: 'user_123',
      inventoryName: 'Test Kitchen',
      loginCode: '123456',
      createdAt: new Date().toISOString()
    }

    localStorageMock.getItem.mockReturnValue(JSON.stringify(mockUser))

    const success = authStore.loginWithCode('654321')

    expect(success).toBe(false)
    expect(authStore.isAuthenticated).toBe(false)
    expect(authStore.error).toBe('Invalid login code')
  })

  it('should logout user', () => {
    const authStore = useAuthStore()

    // First create a user
    authStore.createInventory('Test Kitchen')
    expect(authStore.isAuthenticated).toBe(true)

    // Then logout
    authStore.logout()

    expect(authStore.isAuthenticated).toBe(false)
    expect(authStore.user).toBe(null)
    expect(localStorageMock.removeItem).toHaveBeenCalledWith('useItUp_user')
  })

  it('should load saved user from localStorage', () => {
    const authStore = useAuthStore()
    const mockUser = {
      id: 'user_123',
      inventoryName: 'Test Kitchen',
      loginCode: '123456',
      createdAt: new Date().toISOString()
    }

    localStorageMock.getItem.mockReturnValue(JSON.stringify(mockUser))

    const loaded = authStore.loadSavedUser()

    expect(loaded).toBe(true)
    expect(authStore.isAuthenticated).toBe(true)
    expect(authStore.user?.inventoryName).toBe('Test Kitchen')
  })
})
