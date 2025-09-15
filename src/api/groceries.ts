// Groceries API Service
// Use-It-Up PWA Frontend

import apiClient, { retryRequest } from './axios'
import { config } from '@/config/environment'

// API Response Types
export interface APIGroceryItem {
  grocery_id: number
  product_id: number
  name: string
  category_id: number
  dop_pantry_max: number | null
  dop_pantry_metric: string | null
  dop_refrigerate_max: number | null
  dop_refrigerate_metric: string | null
  dop_freeze_max: number | null
  dop_freeze_metric: string | null
  created_at: string
}

export interface APICategory {
  category_id: number
  category_name: string
}

// Frontend Types (transformed from API)
export interface GroceryItem {
  id: string
  name: string
  category: string
  icon: string
  defaultShelfLife: number
  avgPrice: number
  co2Factor: number
  unit: string
}

// Category mapping from API to frontend
const CATEGORY_MAPPING: Record<number, string> = {
  1: 'Dairy',
  2: 'Bakery',
  5: 'Beverages',
  6: 'Condiments',
  7: 'Dairy',
  8: 'Frozen',
  9: 'Grains',
  10: 'Meat',
  12: 'Meat',
  14: 'Poultry',
  15: 'Poultry',
  18: 'Fruit',
  19: 'Vegetable',
  20: 'Seafood',
  22: 'Seafood',
  23: 'Pantry'
}

// Icon mapping based on food names and categories
const getIconForFood = (name: string, categoryId: number): string => {
  const lowerName = name.toLowerCase()

  // Specific food icons
  if (lowerName.includes('milk')) return '🥛'
  if (lowerName.includes('bread')) return '🍞'
  if (lowerName.includes('egg')) return '🥚'
  if (lowerName.includes('banana')) return '🍌'
  if (lowerName.includes('apple')) return '🍎'
  if (lowerName.includes('chicken')) return '🐔'
  if (lowerName.includes('yogurt')) return '🥛'
  if (lowerName.includes('lettuce')) return '🥬'
  if (lowerName.includes('tomato')) return '🍅'
  if (lowerName.includes('cheese')) return '🧀'
  if (lowerName.includes('pasta')) return '🍝'
  if (lowerName.includes('rice')) return '🍚'
  if (lowerName.includes('carrot')) return '🥕'
  if (lowerName.includes('potato')) return '🥔'
  if (lowerName.includes('salmon') || lowerName.includes('fish')) return '🐟'

  // Category-based icons
  switch (categoryId) {
    case 1:
    case 7: return '🥛' // Dairy
    case 2: return '🍞' // Baked Goods
    case 5: return '🥤' // Beverages
    case 6: return '🍯' // Condiments
    case 8: return '🧊' // Frozen
    case 9: return '🌾' // Grains
    case 10:
    case 12: return '🥩' // Meat
    case 14:
    case 15: return '🐔' // Poultry
    case 18: return '🍎' // Fruits
    case 19: return '🥬' // Vegetables
    case 20:
    case 22: return '🐟' // Seafood
    case 23: return '🥫' // Shelf Stables
    default: return '🍽️'
  }
}

// Estimate price and CO2 factor based on category and name
const estimatePriceAndCO2 = (name: string, categoryId: number): { price: number, co2: number } => {
  const lowerName = name.toLowerCase()

  // Specific estimates based on food type
  if (lowerName.includes('milk')) return { price: 4.50, co2: 1.9 }
  if (lowerName.includes('bread')) return { price: 3.00, co2: 0.9 }
  if (lowerName.includes('egg')) return { price: 6.00, co2: 1.8 }
  if (lowerName.includes('chicken')) return { price: 12.00, co2: 6.9 }
  if (lowerName.includes('cheese')) return { price: 8.00, co2: 13.5 }
  if (lowerName.includes('salmon') || lowerName.includes('fish')) return { price: 25.00, co2: 11.9 }

  // Category-based estimates
  switch (categoryId) {
    case 1:
    case 7: return { price: 5.00, co2: 2.0 } // Dairy
    case 2: return { price: 3.50, co2: 1.0 } // Baked Goods
    case 5: return { price: 3.00, co2: 0.5 } // Beverages
    case 6: return { price: 4.00, co2: 0.8 } // Condiments
    case 8: return { price: 6.00, co2: 2.5 } // Frozen
    case 9: return { price: 3.00, co2: 1.5 } // Grains
    case 10:
    case 12: return { price: 15.00, co2: 8.0 } // Meat
    case 14:
    case 15: return { price: 10.00, co2: 6.0 } // Poultry
    case 18: return { price: 4.50, co2: 0.4 } // Fruits
    case 19: return { price: 3.50, co2: 0.3 } // Vegetables
    case 20:
    case 22: return { price: 20.00, co2: 10.0 } // Seafood
    case 23: return { price: 3.00, co2: 1.0 } // Shelf Stables
    default: return { price: 5.00, co2: 2.0 }
  }
}

// Get unit based on category and name
const getUnit = (name: string, categoryId: number): string => {
  const lowerName = name.toLowerCase()

  if (lowerName.includes('milk') || lowerName.includes('juice')) return 'L'
  if (lowerName.includes('bread') || lowerName.includes('loaf')) return 'loaf'
  if (lowerName.includes('egg')) return 'dozen'
  if (lowerName.includes('pasta') || lowerName.includes('cereal')) return 'pack'
  if (lowerName.includes('cheese') && !lowerName.includes('cottage')) return 'block'
  if (lowerName.includes('yogurt') || lowerName.includes('cottage')) return 'tub'
  if (lowerName.includes('lettuce') || lowerName.includes('cabbage')) return 'head'

  // Category-based units
  switch (categoryId) {
    case 1:
    case 7: return 'pack' // Dairy
    case 2: return 'loaf' // Baked Goods
    case 5: return 'L' // Beverages
    case 6: return 'bottle' // Condiments
    case 8: return 'pack' // Frozen
    case 9: return 'pack' // Grains
    case 10:
    case 12:
    case 14:
    case 15:
    case 20:
    case 22: return 'kg' // Meat, Poultry, Seafood
    case 18:
    case 19: return 'kg' // Fruits, Vegetables
    case 23: return 'pack' // Shelf Stables
    default: return 'pack'
  }
}

// Transform API data to frontend format
const transformGroceryItem = (apiItem: APIGroceryItem): GroceryItem => {
  const category = CATEGORY_MAPPING[apiItem.category_id] || 'Other'
  const icon = getIconForFood(apiItem.name, apiItem.category_id)
  const { price, co2 } = estimatePriceAndCO2(apiItem.name, apiItem.category_id)
  const unit = getUnit(apiItem.name, apiItem.category_id)

  // Prefer DOP_Refrigerate_Max for default shelf life.
  // Be robust to different casing/keys from the backend.
  const anyItem = apiItem as unknown as Record<string, unknown>
  const readNum = (val: unknown): number | null => {
    if (typeof val === 'number') {
      return Number.isFinite(val) ? val : null
    }
    if (typeof val === 'string') {
      const parsed = Number(val)
      return Number.isFinite(parsed) ? parsed : null
    }
    return null
  }
  const refrigerate = readNum(apiItem.dop_refrigerate_max) ?? readNum(anyItem['DOP_Refrigerate_Max']) ?? readNum(anyItem['dopRefrigerateMax'])
  const pantry = readNum(apiItem.dop_pantry_max) ?? readNum(anyItem['DOP_Pantry_Max']) ?? readNum(anyItem['dopPantryMax'])

  // Strict requirement: prefer Refrigerate, then Pantry, never default to Freeze
  const defaultShelfLife = refrigerate ?? pantry ?? 7

  return {
    id: `grocery-${apiItem.grocery_id}`,
    name: apiItem.name,
    category,
    icon,
    defaultShelfLife,
    avgPrice: price,
    co2Factor: co2,
    unit
  }
}

// API Service Class
class GroceriesAPI {
  private baseUrl = config.apiBaseUrl

  // Fetch all groceries from API
  async fetchGroceries(): Promise<GroceryItem[]> {
    try {
      const response = await retryRequest(() =>
        fetch(`${this.baseUrl}/groceries`)
      )

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const apiGroceries: APIGroceryItem[] = await response.json()
      return apiGroceries.map(transformGroceryItem)
    } catch (error) {
      console.error('Failed to fetch groceries from API:', error)
      throw error
    }
  }

  // Fetch categories from API
  async fetchCategories(): Promise<APICategory[]> {
    try {
      const response = await retryRequest(() =>
        fetch(`${this.baseUrl}/categories`)
      )

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      return await response.json()
    } catch (error) {
      console.error('Failed to fetch categories from API:', error)
      throw error
    }
  }

  // Search groceries by name or category
  async searchGroceries(query?: string, categoryId?: number): Promise<GroceryItem[]> {
    try {
      const params = new URLSearchParams()
      if (query) params.append('q', query)
      if (categoryId) params.append('category_id', categoryId.toString())

      const url = `${this.baseUrl}/groceries${params.toString() ? '?' + params.toString() : ''}`

      const response = await retryRequest(() => fetch(url))

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const apiGroceries: APIGroceryItem[] = await response.json()
      return apiGroceries.map(transformGroceryItem)
    } catch (error) {
      console.error('Failed to search groceries:', error)
      throw error
    }
  }

  // Get grocery by ID
  async getGroceryById(groceryId: number): Promise<GroceryItem | null> {
    try {
      const response = await retryRequest(() =>
        fetch(`${this.baseUrl}/groceries/${groceryId}`)
      )

      if (!response.ok) {
        if (response.status === 404) return null
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const apiGrocery: APIGroceryItem = await response.json()
      return transformGroceryItem(apiGrocery)
    } catch (error) {
      console.error(`Failed to fetch grocery ${groceryId}:`, error)
      throw error
    }
  }
}

// Export singleton instance
const groceriesAPI = new GroceriesAPI()
export default groceriesAPI
