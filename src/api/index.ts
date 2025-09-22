// API Service Layer Entry Point
// Use-It-Up PWA Frontend

import inventoryAPI from './inventory'
import groceriesAPI from './groceries'
import inventoryRoomsAPI from './inventory-rooms'
import apiClient from './axios'

// Export the main API services
export { inventoryAPI, groceriesAPI, inventoryRoomsAPI, apiClient }

// Export types
export type { InventoryItem, AddItemRequest, ImpactData, TotalImpactData } from './inventory'
export type { GroceryItem, APIGroceryItem, APICategory } from './groceries'
export type {
  CreateRoomRequest,
  CreateRoomResponse,
  JoinRoomRequest,
  GetUserRoomsResponse,
  CreateUserRequest,
  CreateUserResponse
} from './inventory-rooms'
