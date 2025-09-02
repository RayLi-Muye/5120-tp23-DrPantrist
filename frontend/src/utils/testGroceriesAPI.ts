// Test utility for Groceries API
// Use-It-Up PWA Frontend

import groceriesAPI from '@/api/groceries'

export async function testGroceriesAPI() {
  console.log('🧪 Testing Groceries API...')

  try {
    // Test fetching all groceries
    console.log('📦 Fetching all groceries...')
    const groceries = await groceriesAPI.fetchGroceries()
    console.log(`✅ Successfully fetched ${groceries.length} groceries`)
    console.log('Sample items:', groceries.slice(0, 3))

    // Test fetching categories
    console.log('📂 Fetching categories...')
    const categories = await groceriesAPI.fetchCategories()
    console.log(`✅ Successfully fetched ${categories.length} categories`)
    console.log('Categories:', categories)

    // Test search functionality
    console.log('🔍 Testing search...')
    const searchResults = await groceriesAPI.searchGroceries('apple')
    console.log(`✅ Search for "apple" returned ${searchResults.length} results`)
    console.log('Search results:', searchResults)

    // Test getting specific item
    console.log('🎯 Testing get by ID...')
    const specificItem = await groceriesAPI.getGroceryById(101)
    console.log('✅ Get by ID result:', specificItem)

    console.log('🎉 All API tests completed successfully!')
    return true

  } catch (error) {
    console.error('❌ API test failed:', error)
    return false
  }
}

// Auto-run in development
if (import.meta.env.DEV) {
  // Delay to ensure app is initialized
  setTimeout(() => {
    testGroceriesAPI()
  }, 2000)
}
