// Auth Store
// Use-It-Up PWA Frontend

import { ref, computed } from 'vue'
import { defineStore } from 'pinia'
import inventoryRoomsAPI from '@/api/inventory-rooms'

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
      
      // Create user and room using the new login_code process
      const { user: userResponse, room: roomResponse, loginCode } = await inventoryRoomsAPI.createUserAndRoomWithLoginCode(
        userDisplayName,
        inventoryName.trim()
      )

      const newUser: User = {
        id: userResponse.user_id,
        displayName: userResponse.display_name,
        inventoryName: inventoryName.trim(),
        loginCode: loginCode,  // Use the loginCode from backend response
        createdAt: userResponse.created_at || new Date().toISOString(),
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

  // Create a household (inventory) for the current user (EPIC3 #1)
  async function createHousehold(inventoryName: string): Promise<User> {
    if (!user.value) {
      throw new Error('You must be logged in to create a household')
    }
    if (!inventoryName.trim()) {
      throw new Error('Household name is required')
    }

    isLoading.value = true
    error.value = null

    try {
      // Create a room for the existing user
      const room = await inventoryRoomsAPI.createRoom(inventoryName.trim(), user.value.id)

      // Update user state with new inventory
      const updatedUser: User = {
        ...user.value,
        inventoryName: room.inventory_name,
        inventoryId: room.inventory_id,
        isOwner: true
      }
      localStorage.setItem('useItUp_user', JSON.stringify(updatedUser))
      user.value = updatedUser

      return updatedUser
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to create household'
      error.value = msg
      throw new Error(msg)
    } finally {
      isLoading.value = false
    }
  }

  async function loginWithCode(loginCode: string): Promise<User> {
    if (!loginCode.trim()) {
      throw new Error('Login code is required')
    }

    isLoading.value = true
    error.value = null

    try {
      // Use the new API-based authentication
      const { user: userResponse, inventory: inventoryResponse } = await inventoryRoomsAPI.loginWithCode(loginCode.trim())

      const authenticatedUser: User = {
        id: userResponse.user_id,
        displayName: userResponse.display_name,
        inventoryName: inventoryResponse.inventory_name,
        loginCode: userResponse.login_code,
        createdAt: userResponse.created_at || new Date().toISOString(),
        inventoryId: inventoryResponse.inventory_id,
        isOwner: userResponse.user_id === inventoryResponse.owner_user_id
      }

      // Save to localStorage
      localStorage.setItem('useItUp_user', JSON.stringify(authenticatedUser))
      user.value = authenticatedUser

      return authenticatedUser
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Invalid login code or authentication failed'
      error.value = errorMessage
      throw new Error(errorMessage)
    } finally {
      isLoading.value = false
    }
  }

  function logout(): void {
    // Clear user state immediately
    user.value = null
    error.value = null

    // Clear localStorage
    localStorage.removeItem('useItUp_user')

    // Clear any other related data using the API method
    inventoryRoomsAPI.clearAuthData()
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

  async function tryAutoLogin(): Promise<boolean> {
    try {
      const savedLoginCode = inventoryRoomsAPI.getCurrentLoginCode()
      if (savedLoginCode && !user.value) {
        console.log('Found saved login code, attempting auto-login...')
        await loginWithCode(savedLoginCode)
        return true
      }
    } catch (e) {
      console.warn('Auto-login failed:', e)
      // Clear invalid auth data
      inventoryRoomsAPI.clearAuthData()
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
        const userResponse = await inventoryRoomsAPI.createUser(displayName.trim())
        userId = userResponse.user_id
        userDisplayName = userResponse.display_name
      } else {
        // Fallback for backward compatibility
        userId = generateUserId()
        userDisplayName = 'User'
      }

      // Join room via API
      await inventoryRoomsAPI.joinRoom(inventoryId.trim(), userId)

      // Get room details
      const roomInfo = inventoryRoomsAPI.getCurrentRoom()
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
    createHousehold,
    logout,
    loadSavedUser,
    tryAutoLogin,
    clearError,
    updateInventoryName
  }
})
