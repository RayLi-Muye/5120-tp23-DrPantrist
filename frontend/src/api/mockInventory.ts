// Mock Inventory API Service
// Use-It-Up PWA Frontend
// Provides demo data for development and testing

import type { InventoryItem, AddItemRequest, ImpactData, TotalImpactData } from './inventory'

// Generate realistic dates
const today = new Date()
const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000)
const twoDaysAgo = new Date(today.getTime() - 2 * 24 * 60 * 60 * 1000)
const threeDaysAgo = new Date(today.getTime() - 3 * 24 * 60 * 60 * 1000)
const fourDaysAgo = new Date(today.getTime() - 4 * 24 * 60 * 60 * 1000)

const tomorrow = new Date(today.getTime() + 24 * 60 * 60 * 1000)
const twoDaysFromNow = new Date(today.getTime() + 2 * 24 * 60 * 60 * 1000)
const fiveDaysFromNow = new Date(today.getTime() + 5 * 24 * 60 * 60 * 1000)
const oneWeekFromNow = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000)

const formatDate = (date: Date) => date.toISOString().split('T')[0]

// Mock data storage
let mockInventoryItems: InventoryItem[] = [
  {
    id: '1',
    userId: 'demo-user-123',
    itemId: 'apple',
    name: 'Apples',
    category: 'Fruits',
    quantity: 6,
    unit: 'pieces',
    addedDate: formatDate(fourDaysAgo),
    expiryDate: formatDate(yesterday), // Expired
    status: 'active',
    notes: 'Red delicious apples',
    createdAt: fourDaysAgo.toISOString(),
    updatedAt: fourDaysAgo.toISOString()
  },
  {
    id: '2',
    userId: 'demo-user-123',
    itemId: 'milk',
    name: 'Milk',
    category: 'Dairy',
    quantity: 1,
    unit: 'liter',
    addedDate: formatDate(threeDaysAgo),
    expiryDate: formatDate(twoDaysFromNow), // Warning (expires soon)
    status: 'active',
    notes: 'Whole milk',
    createdAt: threeDaysAgo.toISOString(),
    updatedAt: threeDaysAgo.toISOString()
  },
  {
    id: '3',
    userId: 'demo-user-123',
    itemId: 'bread',
    name: 'Bread',
    category: 'Bakery',
    quantity: 1,
    unit: 'loaf',
    addedDate: formatDate(twoDaysAgo),
    expiryDate: formatDate(fiveDaysFromNow), // Fresh
    status: 'active',
    notes: 'Whole wheat bread',
    createdAt: twoDaysAgo.toISOString(),
    updatedAt: twoDaysAgo.toISOString()
  },
  {
    id: '4',
    userId: 'demo-user-123',
    itemId: 'yogurt',
    name: 'Greek Yogurt',
    category: 'Dairy',
    quantity: 4,
    unit: 'cups',
    addedDate: formatDate(threeDaysAgo),
    expiryDate: formatDate(oneWeekFromNow), // Fresh
    status: 'active',
    notes: 'Plain Greek yogurt',
    createdAt: threeDaysAgo.toISOString(),
    updatedAt: threeDaysAgo.toISOString()
  },
  {
    id: '5',
    userId: 'demo-user-123',
    itemId: 'bananas',
    name: 'Bananas',
    category: 'Fruits',
    quantity: 8,
    unit: 'pieces',
    addedDate: formatDate(twoDaysAgo),
    expiryDate: formatDate(tomorrow), // Warning
    status: 'active',
    notes: 'Organic bananas',
    createdAt: twoDaysAgo.toISOString(),
    updatedAt: twoDaysAgo.toISOString()
  }
]

let mockTotalImpact: TotalImpactData = {
  totalMoneySaved: 45.50,
  totalCo2Avoided: 12.3,
  itemsUsed: 15
}

// Simulate network delay
const simulateDelay = (ms: number = 500) => new Promise(resolve => setTimeout(resolve, ms))

// Generate mock impact data
const generateMockImpact = (item: InventoryItem): ImpactData => {
  const baseMoneySaved = Math.random() * 5 + 1 // $1-6
  const baseCo2Avoided = Math.random() * 2 + 0.5 // 0.5-2.5 kg

  return {
    itemId: item.id,
    itemName: item.name,
    moneySaved: Math.round(baseMoneySaved * 100) / 100,
    co2Avoided: Math.round(baseCo2Avoided * 100) / 100,
    actionType: 'used',
    timestamp: new Date().toISOString()
  }
}

// Mock API implementation
export const mockInventoryAPI = {
  /**
   * Get all active inventory items for a user
   */
  async getInventory(userId: string): Promise<InventoryItem[]> {
    await simulateDelay(300)

    if (!userId) {
      throw new Error('User ID is required')
    }

    // Filter items by user ID and active status
    return mockInventoryItems.filter(item =>
      item.userId === userId && item.status === 'active'
    )
  },

  /**
   * Add a new item to inventory
   */
  async addItem(itemData: AddItemRequest): Promise<InventoryItem> {
    await simulateDelay(400)

    if (!itemData.userId || !itemData.itemId) {
      throw new Error('User ID and Item ID are required')
    }

    // Create new inventory item
    const newItem: InventoryItem = {
      id: `mock-${Date.now()}`,
      userId: itemData.userId,
      itemId: itemData.itemId,
      name: itemData.itemId.charAt(0).toUpperCase() + itemData.itemId.slice(1),
      category: 'Other', // Would normally come from grocery database
      quantity: itemData.quantity || 1,
      unit: 'pieces',
      addedDate: new Date().toISOString().split('T')[0],
      expiryDate: itemData.customExpiryDate || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      status: 'active',
      notes: itemData.notes || '',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }

    mockInventoryItems.push(newItem)
    return newItem
  },

  /**
   * Mark an item as used and get impact data
   */
  async markAsUsed(itemId: string): Promise<ImpactData> {
    await simulateDelay(350)

    if (!itemId) {
      throw new Error('Item ID is required')
    }

    const itemIndex = mockInventoryItems.findIndex(item => item.id === itemId)
    if (itemIndex === -1) {
      throw new Error('Item not found')
    }

    const item = mockInventoryItems[itemIndex]
    if (item.status !== 'active') {
      throw new Error('Item has already been used')
    }

    // Mark item as used
    mockInventoryItems[itemIndex] = {
      ...item,
      status: 'used',
      updatedAt: new Date().toISOString()
    }

    // Generate impact data
    const impact = generateMockImpact(item)

    // Update total impact
    mockTotalImpact.totalMoneySaved += impact.moneySaved
    mockTotalImpact.totalCo2Avoided += impact.co2Avoided
    mockTotalImpact.itemsUsed += 1

    return impact
  },

  /**
   * Delete an item from inventory
   */
  async deleteItem(itemId: string): Promise<void> {
    await simulateDelay(300)

    if (!itemId) {
      throw new Error('Item ID is required')
    }

    const itemIndex = mockInventoryItems.findIndex(item => item.id === itemId)
    if (itemIndex === -1) {
      throw new Error('Item not found')
    }

    mockInventoryItems.splice(itemIndex, 1)
  },

  /**
   * Get total impact data for a user
   */
  async getTotalImpact(userId: string): Promise<TotalImpactData> {
    await simulateDelay(200)

    if (!userId) {
      throw new Error('User ID is required')
    }

    return { ...mockTotalImpact }
  },

  /**
   * Health check endpoint
   */
  async healthCheck(): Promise<boolean> {
    await simulateDelay(100)
    return true
  }
}

// Reset mock data (useful for testing)
export const resetMockData = () => {
  const today = new Date()
  const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000)
  const twoDaysAgo = new Date(today.getTime() - 2 * 24 * 60 * 60 * 1000)
  const threeDaysAgo = new Date(today.getTime() - 3 * 24 * 60 * 60 * 1000)
  const fourDaysAgo = new Date(today.getTime() - 4 * 24 * 60 * 60 * 1000)

  const tomorrow = new Date(today.getTime() + 24 * 60 * 60 * 1000)
  const twoDaysFromNow = new Date(today.getTime() + 2 * 24 * 60 * 60 * 1000)
  const fiveDaysFromNow = new Date(today.getTime() + 5 * 24 * 60 * 60 * 1000)
  const oneWeekFromNow = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000)

  const formatDate = (date: Date) => date.toISOString().split('T')[0]

  mockInventoryItems = [
    {
      id: '1',
      userId: 'demo-user-123',
      itemId: 'apple',
      name: 'Apples',
      category: 'Fruits',
      quantity: 6,
      unit: 'pieces',
      addedDate: formatDate(fourDaysAgo),
      expiryDate: formatDate(yesterday),
      status: 'active',
      notes: 'Red delicious apples',
      createdAt: fourDaysAgo.toISOString(),
      updatedAt: fourDaysAgo.toISOString()
    },
    {
      id: '2',
      userId: 'demo-user-123',
      itemId: 'milk',
      name: 'Milk',
      category: 'Dairy',
      quantity: 1,
      unit: 'liter',
      addedDate: formatDate(threeDaysAgo),
      expiryDate: formatDate(twoDaysFromNow),
      status: 'active',
      notes: 'Whole milk',
      createdAt: threeDaysAgo.toISOString(),
      updatedAt: threeDaysAgo.toISOString()
    },
    {
      id: '3',
      userId: 'demo-user-123',
      itemId: 'bread',
      name: 'Bread',
      category: 'Bakery',
      quantity: 1,
      unit: 'loaf',
      addedDate: formatDate(twoDaysAgo),
      expiryDate: formatDate(fiveDaysFromNow),
      status: 'active',
      notes: 'Whole wheat bread',
      createdAt: twoDaysAgo.toISOString(),
      updatedAt: twoDaysAgo.toISOString()
    },
    {
      id: '4',
      userId: 'demo-user-123',
      itemId: 'yogurt',
      name: 'Greek Yogurt',
      category: 'Dairy',
      quantity: 4,
      unit: 'cups',
      addedDate: formatDate(threeDaysAgo),
      expiryDate: formatDate(oneWeekFromNow),
      status: 'active',
      notes: 'Plain Greek yogurt',
      createdAt: threeDaysAgo.toISOString(),
      updatedAt: threeDaysAgo.toISOString()
    },
    {
      id: '5',
      userId: 'demo-user-123',
      itemId: 'bananas',
      name: 'Bananas',
      category: 'Fruits',
      quantity: 8,
      unit: 'pieces',
      addedDate: formatDate(twoDaysAgo),
      expiryDate: formatDate(tomorrow),
      status: 'active',
      notes: 'Organic bananas',
      createdAt: twoDaysAgo.toISOString(),
      updatedAt: twoDaysAgo.toISOString()
    }
  ]

  mockTotalImpact = {
    totalMoneySaved: 45.50,
    totalCo2Avoided: 12.3,
    itemsUsed: 15
  }
}
