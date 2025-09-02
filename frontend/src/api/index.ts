// API Service Layer Entry Point
// Use-It-Up PWA Frontend

import inventoryAPI from './inventory'
import groceriesAPI from './groceries'
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
export { inventoryAPI, groceriesAPI, apiClient }

// Export types
export type { InventoryItem, AddItemRequest, ImpactData, TotalImpactData } from './inventory'
export type { GroceryItem, APIGroceryItem, APICategory } from './groceries'
