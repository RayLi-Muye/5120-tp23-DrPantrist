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
      console.error('Failed to fetch groceries:', err)
      error.value = err instanceof Error ? err.message : 'Failed to load groceries'
      throw err
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
      throw err
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
