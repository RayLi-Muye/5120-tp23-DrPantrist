// Auth Store
// Use-It-Up PWA Frontend

import { ref, computed } from 'vue'
import { defineStore } from 'pinia'
import roomsAPI from '@/api/rooms'

export interface User {
  id: string
  displayName: string
  inventoryName: string
  loginCode: string
  createdAt: string
  inventoryId?: string
  isOwner?: boolean
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
  async function createInventory(inventoryName: string, displayName?: string): Promise<User> {
    if (!inventoryName.trim()) {
      throw new Error('Inventory name is required')
    }

    isLoading.value = true
    error.value = null

    try {
      // Use inventory name as display name if not provided
      const userDisplayName = displayName?.trim() || inventoryName.trim()
      
      // Create user and room using the two-step process
      const { user: userResponse, room: roomResponse } = await roomsAPI.createUserAndRoom(
        userDisplayName,
        inventoryName.trim()
      )

      const newUser: User = {
        id: userResponse.user_id,
        displayName: userResponse.display_name,
        inventoryName: inventoryName.trim(),
        loginCode: generateLoginCode(),
        createdAt: userResponse.created_at,
        inventoryId: roomResponse.inventory_id,
        isOwner: true
      }

      // Save to localStorage
      localStorage.setItem('useItUp_user', JSON.stringify(newUser))
      user.value = newUser

      return newUser
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create inventory'
      error.value = errorMessage
      throw new Error(errorMessage)
    } finally {
      isLoading.value = false
    }
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

  async function joinInventory(inventoryId: string, displayName?: string): Promise<User> {
    if (!inventoryId.trim()) {
      throw new Error('Inventory ID is required')
    }

    isLoading.value = true
    error.value = null

    try {
      // Create user first if display name provided, otherwise use fallback
      let userId: string
      let userDisplayName: string
      
      if (displayName?.trim()) {
        const userResponse = await roomsAPI.createUser(displayName.trim())
        userId = userResponse.user_id
        userDisplayName = userResponse.display_name
      } else {
        // Fallback for backward compatibility
        userId = generateUserId()
        userDisplayName = 'User'
      }

      // Join room via API
      await roomsAPI.joinRoom(inventoryId.trim(), userId)

      // Get room details
      const roomInfo = roomsAPI.getCurrentRoom()
      if (!roomInfo) {
        throw new Error('Failed to get room information after joining')
      }

      const newUser: User = {
        id: userId,
        displayName: userDisplayName,
        inventoryName: roomInfo.inventoryName,
        loginCode: generateLoginCode(),
        createdAt: new Date().toISOString(),
        inventoryId: roomInfo.inventoryId,
        isOwner: roomInfo.isOwner
      }

      // Save to localStorage
      localStorage.setItem('useItUp_user', JSON.stringify(newUser))
      user.value = newUser

      return newUser
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to join inventory'
      error.value = errorMessage
      throw new Error(errorMessage)
    } finally {
      isLoading.value = false
    }
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
    joinInventory,
    loginWithCode,
    logout,
    loadSavedUser,
    clearError,
    updateInventoryName
  }
})
