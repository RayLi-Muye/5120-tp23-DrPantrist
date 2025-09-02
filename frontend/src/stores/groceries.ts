// Groceries Store
// Use-It-Up PWA Frontend

import { ref, computed } from 'vue'
import { defineStore } from 'pinia'
import groceriesAPI, { type GroceryItem } from '@/api/groceries'

export { type GroceryItem } from '@/api/groceries'

export const useGroceriesStore = defineStore('groceries', () => {
  // State
  const masterList = ref<GroceryItem[]>([])
  const isLoading = ref(false)
  const error = ref<string | null>(null)
  const lastFetched = ref<Date | null>(null)

  // Cache duration (5 minutes)
  const CACHE_DURATION = 5 * 60 * 1000

  // Fallback data for offline/error scenarios
  const fallbackItems: GroceryItem[] = [
    {
      id: 'milk-001',
      name: 'Milk',
      category: 'Dairy',
      icon: '🥛',
      defaultShelfLife: 7,
      avgPrice: 4.50,
      co2Factor: 1.9,
      unit: 'L'
    },
    {
      id: 'bread-001',
      name: 'Bread',
      category: 'Bakery',
      icon: '🍞',
      defaultShelfLife: 5,
      avgPrice: 3.00,
      co2Factor: 0.9,
      unit: 'loaf'
    },
    {
      id: 'eggs-001',
      name: 'Eggs',
      category: 'Dairy',
      icon: '🥚',
      defaultShelfLife: 21,
      avgPrice: 6.00,
      co2Factor: 1.8,
      unit: 'dozen'
    },
    {
      id: 'bananas-001',
      name: 'Bananas',
      category: 'Fruit',
      icon: '🍌',
      defaultShelfLife: 7,
      avgPrice: 4.00,
      co2Factor: 0.5,
      unit: 'kg'
    },
    {
      id: 'apples-001',
      name: 'Apples',
      category: 'Fruit',
      icon: '🍎',
      defaultShelfLife: 14,
      avgPrice: 5.00,
      co2Factor: 0.4,
      unit: 'kg'
    },
    {
      id: 'chicken-001',
      name: 'Chicken Breast',
      category: 'Meat',
      icon: '🐔',
      defaultShelfLife: 3,
      avgPrice: 12.00,
      co2Factor: 6.9,
      unit: 'kg'
    },
    {
      id: 'yogurt-001',
      name: 'Yogurt',
      category: 'Dairy',
      icon: '🥛',
      defaultShelfLife: 10,
      avgPrice: 5.50,
      co2Factor: 1.2,
      unit: 'tub'
    },
    {
      id: 'lettuce-001',
      name: 'Lettuce',
      category: 'Vegetable',
      icon: '🥬',
      defaultShelfLife: 7,
      avgPrice: 3.50,
      co2Factor: 0.3,
      unit: 'head'
    },
    {
      id: 'tomatoes-001',
      name: 'Tomatoes',
      category: 'Vegetable',
      icon: '🍅',
      defaultShelfLife: 7,
      avgPrice: 6.00,
      co2Factor: 1.1,
      unit: 'kg'
    },
    {
      id: 'cheese-001',
      name: 'Cheese',
      category: 'Dairy',
      icon: '🧀',
      defaultShelfLife: 14,
      avgPrice: 8.00,
      co2Factor: 13.5,
      unit: 'block'
    },
    {
      id: 'pasta-001',
      name: 'Pasta',
      category: 'Pantry',
      icon: '🍝',
      defaultShelfLife: 730,
      avgPrice: 2.50,
      co2Factor: 1.1,
      unit: 'pack'
    },
    {
      id: 'rice-001',
      name: 'Rice',
      category: 'Pantry',
      icon: '🍚',
      defaultShelfLife: 365,
      avgPrice: 4.00,
      co2Factor: 2.7,
      unit: 'kg'
    },
    {
      id: 'carrots-001',
      name: 'Carrots',
      category: 'Vegetable',
      icon: '🥕',
      defaultShelfLife: 21,
      avgPrice: 2.50,
      co2Factor: 0.3,
      unit: 'kg'
    },
    {
      id: 'potatoes-001',
      name: 'Potatoes',
      category: 'Vegetable',
      icon: '🥔',
      defaultShelfLife: 30,
      avgPrice: 3.00,
      co2Factor: 0.3,
      unit: 'kg'
    },
    {
      id: 'salmon-001',
      name: 'Salmon',
      category: 'Seafood',
      icon: '🐟',
      defaultShelfLife: 2,
      avgPrice: 25.00,
      co2Factor: 11.9,
      unit: 'kg'
    }
  ]

  // Computed properties
  const categories = computed(() => {
    const uniqueCategories = [...new Set(masterList.value.map(item => item.category))]
    return uniqueCategories.sort()
  })

  const isDataStale = computed(() => {
    if (!lastFetched.value) return true
    return Date.now() - lastFetched.value.getTime() > CACHE_DURATION
  })

  // Actions
  const fetchGroceries = async (forceRefresh = false) => {
    // Skip if data is fresh and not forcing refresh
    if (!forceRefresh && !isDataStale.value && masterList.value.length > 0) {
      return
    }

    isLoading.value = true
    error.value = null

    try {
      const groceries = await groceriesAPI.fetchGroceries()
      masterList.value = groceries
      lastFetched.value = new Date()

      console.log(`Loaded ${groceries.length} groceries from API`)
    } catch (err) {
      console.error('Failed to fetch groceries, using fallback data:', err)
      error.value = err instanceof Error ? err.message : 'Failed to load groceries'

      // Use fallback data if API fails
      if (masterList.value.length === 0) {
        masterList.value = fallbackItems
        console.log('Using fallback grocery data')
      }
    } finally {
      isLoading.value = false
    }
  }

  const searchGroceries = async (query?: string, category?: string) => {
    isLoading.value = true
    error.value = null

    try {
      // Find category ID if category name is provided
      let categoryId: number | undefined
      if (category) {
        // This is a simplified mapping - in a real app you'd want to fetch categories first
        const categoryMap: Record<string, number> = {
          'Dairy': 7,
          'Bakery': 2,
          'Beverages': 5,
          'Condiments': 6,
          'Frozen': 8,
          'Grains': 9,
          'Meat': 10,
          'Poultry': 15,
          'Fruit': 18,
          'Vegetable': 19,
          'Seafood': 20,
          'Pantry': 23
        }
        categoryId = categoryMap[category]
      }

      const results = await groceriesAPI.searchGroceries(query, categoryId)
      return results
    } catch (err) {
      console.error('Search failed:', err)
      error.value = err instanceof Error ? err.message : 'Search failed'

      // Fallback to local filtering
      let filtered = masterList.value
      if (query) {
        filtered = filtered.filter(item =>
          item.name.toLowerCase().includes(query.toLowerCase())
        )
      }
      if (category) {
        filtered = filtered.filter(item => item.category === category)
      }
      return filtered
    } finally {
      isLoading.value = false
    }
  }

  const clearError = () => {
    error.value = null
  }

  // Getters (maintain backward compatibility)
  const getItemById = (id: string): GroceryItem | undefined => {
    return masterList.value.find(item => item.id === id)
  }

  const getItemsByCategory = (category: string): GroceryItem[] => {
    return masterList.value.filter(item => item.category === category)
  }

  // Initialize with fallback data
  if (masterList.value.length === 0) {
    masterList.value = fallbackItems
  }

  return {
    // State
    masterList,
    categories,
    isLoading,
    error,
    lastFetched,
    isDataStale,

    // Actions
    fetchGroceries,
    searchGroceries,
    clearError,

    // Getters (backward compatibility)
    getItemById,
    getItemsByCategory
  }
})
