// Groceries Store
// Use-It-Up PWA Frontend

import { ref } from 'vue'
import { defineStore } from 'pinia'

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

export const useGroceriesStore = defineStore('groceries', () => {
  // Master list of 15 common grocery items
  const masterList = ref<GroceryItem[]>([
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
  ])

  // Getter to retrieve grocery item by ID
  const getItemById = (id: string): GroceryItem | undefined => {
    return masterList.value.find(item => item.id === id)
  }

  // Getter to get items by category
  const getItemsByCategory = (category: string): GroceryItem[] => {
    return masterList.value.filter(item => item.category === category)
  }

  // Get all unique categories
  const categories = ref<string[]>([
    'Dairy',
    'Bakery',
    'Fruit',
    'Vegetable',
    'Meat',
    'Seafood',
    'Pantry'
  ])

  return {
    masterList,
    categories,
    getItemById,
    getItemsByCategory
  }
})
