// Rooms API Service
// Use-It-Up PWA Frontend

import apiClient, { retryRequest } from './axios'

// API Response Types
export interface CreateRoomRequest {
  inventoryName: string
  ownerUserId: string
}

export interface CreateRoomResponse {
  inventory_id: string
  inventory_name: string
  owner_user_id: string
  created_at: string
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
   * Create a new inventory room
   * @param inventoryName - Name of the inventory/room
   * @param ownerUserId - User ID of the room owner
   * @returns Promise<CreateRoomResponse>
   */
  async createRoom(inventoryName: string, ownerUserId?: string): Promise<CreateRoomResponse> {
    try {
      // Generate or use provided user ID
      const userId = ownerUserId || this.generateUserId()

      // Store user ID in localStorage for future use
      localStorage.setItem('user_id', userId)

      const response = await retryRequest(() =>
        fetch(`${this.baseUrl}/inventories/create`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            inventory_name: inventoryName,
            owner_user_id: userId
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
   * Generate a unique user ID
   * @returns string
   */
  private generateUserId(): string {
    // Check if user ID already exists in localStorage
    const existingUserId = localStorage.getItem('user_id')
    if (existingUserId) {
      return existingUserId
    }

    // Generate new UUID-like ID
    return crypto.randomUUID ? crypto.randomUUID() : this.fallbackUUID()
  }

  /**
   * Fallback UUID generation for older browsers
   * @returns string
   */
  private fallbackUUID(): string {
    return 'user_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9)
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
