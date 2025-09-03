// Rooms API Service
// Use-It-Up PWA Frontend

import apiClient, { retryRequest } from './axios'

// API Response Types
export interface CreateUserRequest {
  display_name: string
}

export interface CreateUserResponse {
  user_id: string
  display_name: string
  created_at: string
}

export interface CreateRoomRequest {
  inventory_name: string
  owner_user_id: string
}

export interface CreateRoomResponse {
  inventory_id: string
  inventory_name: string
  owner_user_id: string
  share_code: string
}

export interface JoinRoomRequest {
  inventoryId: string
  userId: string
}

export interface GetUserRoomsResponse {
  inventory_id: string
  inventory_name: string
  owner_user_id: string
  created_at: string
  is_owner: boolean
}

// API Service Class
class RoomsAPI {
  private baseUrl = 'http://13.210.101.133:8000'

  /**
   * Create a new user (Step 1)
   * @param displayName - Display name for the user
   * @returns Promise<CreateUserResponse>
   */
  async createUser(displayName: string): Promise<CreateUserResponse> {
    try {
      const response = await retryRequest(() =>
        fetch(`${this.baseUrl}/users/create`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            display_name: displayName
          })
        })
      )

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.message || `HTTP error! status: ${response.status}`)
      }

      const data: CreateUserResponse = await response.json()

      // Store user ID in localStorage for future use
      localStorage.setItem('user_id', data.user_id)

      return data
    } catch (error) {
      console.error('Failed to create user:', error)
      throw error
    }
  }

  /**
   * Create a new inventory room (Step 2)
   * @param inventoryName - Name of the inventory/room
   * @param ownerUserId - User ID of the room owner
   * @returns Promise<CreateRoomResponse>
   */
  async createRoom(inventoryName: string, ownerUserId: string): Promise<CreateRoomResponse> {
    try {
      const response = await retryRequest(() =>
        fetch(`${this.baseUrl}/inventories/create`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            inventory_name: inventoryName,
            owner_user_id: ownerUserId
          })
        })
      )

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.message || `HTTP error! status: ${response.status}`)
      }

      const data: CreateRoomResponse = await response.json()

      // Store room info in localStorage
      localStorage.setItem('current_room', JSON.stringify({
        inventoryId: data.inventory_id,
        inventoryName: data.inventory_name,
        ownerUserId: data.owner_user_id,
        isOwner: true
      }))

      return data
    } catch (error) {
      console.error('Failed to create room:', error)
      throw error
    }
  }

  /**
   * Create user and inventory in one call (convenience method)
   * @param displayName - Display name for the user
   * @param inventoryName - Name of the inventory/room
   * @returns Promise<{user: CreateUserResponse, room: CreateRoomResponse}>
   */
  async createUserAndRoom(displayName: string, inventoryName: string): Promise<{user: CreateUserResponse, room: CreateRoomResponse}> {
    try {
      // Step 1: Create user
      const user = await this.createUser(displayName)
      
      // Step 2: Create room with the user ID
      const room = await this.createRoom(inventoryName, user.user_id)
      
      return { user, room }
    } catch (error) {
      console.error('Failed to create user and room:', error)
      throw error
    }
  }

  /**
   * Join an existing inventory room
   * @param inventoryId - ID of the inventory to join
   * @param userId - User ID (optional, will generate if not provided)
   * @returns Promise<void>
   */
  async joinRoom(inventoryId: string, userId?: string): Promise<void> {
    try {
      // Generate or use provided user ID
      const actualUserId = userId || this.generateUserId()

      // Store user ID in localStorage
      localStorage.setItem('user_id', actualUserId)

      const response = await retryRequest(() =>
        fetch(`${this.baseUrl}/inventories/${inventoryId}/join`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            user_id: actualUserId
          })
        })
      )

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.message || `HTTP error! status: ${response.status}`)
      }

      // Get room details after joining
      const roomDetails = await this.getRoomDetails(inventoryId)

      // Store room info in localStorage
      localStorage.setItem('current_room', JSON.stringify({
        inventoryId: inventoryId,
        inventoryName: roomDetails.inventory_name,
        ownerUserId: roomDetails.owner_user_id,
        isOwner: roomDetails.owner_user_id === actualUserId
      }))

    } catch (error) {
      console.error('Failed to join room:', error)
      throw error
    }
  }

  /**
   * Get user's rooms/inventories
   * @param userId - User ID
   * @returns Promise<GetUserRoomsResponse[]>
   */
  async getUserRooms(userId: string): Promise<GetUserRoomsResponse[]> {
    try {
      const response = await retryRequest(() =>
        fetch(`${this.baseUrl}/inventories/by-user?user_id=${userId}`)
      )

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      return await response.json()
    } catch (error) {
      console.error('Failed to get user rooms:', error)
      throw error
    }
  }

  /**
   * Get room details by inventory ID
   * @param inventoryId - Inventory ID
   * @returns Promise<GetUserRoomsResponse>
   */
  private async getRoomDetails(inventoryId: string): Promise<GetUserRoomsResponse> {
    try {
      // This is a simplified implementation - in a real API you'd have a specific endpoint
      // For now, we'll use the user rooms endpoint and filter
      const userId = localStorage.getItem('user_id')
      if (!userId) throw new Error('User ID not found')

      const rooms = await this.getUserRooms(userId)
      const room = rooms.find(r => r.inventory_id === inventoryId)

      if (!room) {
        throw new Error('Room not found')
      }

      return room
    } catch (error) {
      console.error('Failed to get room details:', error)
      throw error
    }
  }

  /**
   * Generate a unique user ID (UUID format)
   * @returns string
   */
  private generateUserId(): string {
    // Check if user ID already exists in localStorage
    const existingUserId = localStorage.getItem('user_id')
    if (existingUserId && this.isValidUUID(existingUserId)) {
      return existingUserId
    }

    // Generate new UUID
    return crypto.randomUUID ? crypto.randomUUID() : this.fallbackUUID()
  }

  /**
   * Fallback UUID generation for older browsers
   * @returns string
   */
  private fallbackUUID(): string {
    // Generate a proper UUID v4 format
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      const r = Math.random() * 16 | 0
      const v = c === 'x' ? r : (r & 0x3 | 0x8)
      return v.toString(16)
    })
  }

  /**
   * Validate UUID format
   * @returns boolean
   */
  private isValidUUID(uuid: string): boolean {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
    return uuidRegex.test(uuid)
  }

  /**
   * Get current room info from localStorage
   * @returns object | null
   */
  getCurrentRoom(): {
    inventoryId: string
    inventoryName: string
    ownerUserId: string
    isOwner: boolean
  } | null {
    try {
      const roomData = localStorage.getItem('current_room')
      return roomData ? JSON.parse(roomData) : null
    } catch (error) {
      console.error('Failed to get current room:', error)
      return null
    }
  }

  /**
   * Clear current room info
   */
  clearCurrentRoom(): void {
    localStorage.removeItem('current_room')
  }

  /**
   * Get current user ID
   * @returns string | null
   */
  getCurrentUserId(): string | null {
    return localStorage.getItem('user_id')
  }
}

// Export singleton instance
const roomsAPI = new RoomsAPI()
export default roomsAPI
