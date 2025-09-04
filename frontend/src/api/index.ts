// API Service Layer Entry Point
// Use-It-Up PWA Frontend

import inventoryAPI from './inventory'
import groceriesAPI from './groceries'
import inventoryRoomsAPI from './inventory-rooms'
import apiClient from './axios'

// Health check function
export async function checkAPIHealth(): Promise<boolean> {
  try {
    const response = await fetch('/api/health')
    return response.ok
  } catch (error) {
    console.error('API health check failed:', error)
    return false
  }
}

// Export the main API services
export { inventoryAPI, groceriesAPI, inventoryRoomsAPI, apiClient }

// Export types
export type { InventoryItem, AddItemRequest, ImpactData, TotalImpactData } from './inventory'
export type { GroceryItem, APIGroceryItem, APICategory } from './groceries'
export type { CreateRoomRequest, CreateRoomResponse, JoinRoomRequest, GetUserRoomsResponse, CreateUserRequest, CreateUserResponse } from './inventory-rooms'
