// Auth Store
// Use-It-Up PWA Frontend

import { ref, computed } from 'vue'
import { defineStore } from 'pinia'

export interface User {
  id: string
  inventoryName: string
  loginCode: string
  createdAt: string
}

export interface AuthState {
  user: User | null
  isAuthenticated: boolean
  isLoading: boolean
  error: string | null
}

// Generate a random 6-digit login code
function generateLoginCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString()
}

// Generate a unique user ID
function generateUserId(): string {
  return 'user_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9)
}

export const useAuthStore = defineStore('auth', () => {
  // State
  const user = ref<User | null>(null)
  const isLoading = ref(false)
  const error = ref<string | null>(null)

  // Computed
  const isAuthenticated = computed(() => !!user.value)

  // Actions
  function createInventory(inventoryName: string): User {
    if (!inventoryName.trim()) {
      throw new Error('Inventory name is required')
    }

    const newUser: User = {
      id: generateUserId(),
      inventoryName: inventoryName.trim(),
      loginCode: generateLoginCode(),
      createdAt: new Date().toISOString()
    }

    // Save to localStorage
    localStorage.setItem('useItUp_user', JSON.stringify(newUser))
    user.value = newUser

    return newUser
  }

  function loginWithCode(loginCode: string): boolean {
    if (!loginCode.trim()) {
      error.value = 'Login code is required'
      return false
    }

    // In a real app, this would validate against a backend
    // For now, we'll check localStorage for existing users
    const savedUser = localStorage.getItem('useItUp_user')

    if (savedUser) {
      try {
        const userData: User = JSON.parse(savedUser)
        if (userData.loginCode === loginCode.trim()) {
          user.value = userData
          error.value = null
          return true
        }
      } catch (e) {
        console.error('Error parsing saved user data:', e)
      }
    }

    error.value = 'Invalid login code'
    return false
  }

  function logout(): void {
    // Clear user state immediately
    user.value = null
    error.value = null

    // Clear localStorage
    localStorage.removeItem('useItUp_user')

    // Clear any other related data
    localStorage.removeItem('pendingChanges') // If exists

    console.log('User logged out successfully')
  }

  function loadSavedUser(): boolean {
    try {
      const savedUser = localStorage.getItem('useItUp_user')
      if (savedUser) {
        const userData: User = JSON.parse(savedUser)
        user.value = userData
        return true
      }
    } catch (e) {
      console.error('Error loading saved user:', e)
      localStorage.removeItem('useItUp_user')
    }
    return false
  }

  function clearError(): void {
    error.value = null
  }

  function updateInventoryName(newName: string): boolean {
    if (!user.value || !newName.trim()) {
      error.value = 'Invalid inventory name'
      return false
    }

    user.value.inventoryName = newName.trim()
    localStorage.setItem('useItUp_user', JSON.stringify(user.value))
    error.value = null
    return true
  }

  return {
    // State
    user: computed(() => user.value),
    isAuthenticated,
    isLoading,
    error,

    // Actions
    createInventory,
    loginWithCode,
    logout,
    loadSavedUser,
    clearError,
    updateInventoryName
  }
})
