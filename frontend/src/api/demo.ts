// API Service Layer Demo
// Use-It-Up PWA Frontend
// This file demonstrates the API service layer functionality

import { inventoryAPI, checkAPIHealth } from './index'
import { config, currentEnvironment } from '../config/environment'

/**
 * Demo function to showcase API service layer capabilities
 */
export async function demoAPIServiceLayer() {
  console.log('=== Use-It-Up API Service Layer Demo ===')
  console.log(`Environment: ${currentEnvironment}`)
  console.log(`API Base URL: ${config.apiBaseUrl}`)
  console.log(`Debug Mode: ${config.debug}`)
  console.log(`Timeout: ${config.timeout}ms`)
  console.log(`Retry Attempts: ${config.retryAttempts}`)
  console.log('')

  // 1. Health Check
  console.log('1. Checking API Health...')
  try {
    const isHealthy = await checkAPIHealth()
    console.log(`   API Health: ${isHealthy ? '✅ Healthy' : '❌ Unhealthy'}`)
  } catch (error) {
    console.log(`   API Health Check Error: ${error}`)
  }
  console.log('')

  // 2. Demo API Methods (these will fail without a real backend, but show the structure)
  console.log('2. API Methods Available:')
  console.log('   ✓ inventoryAPI.getInventory(userId)')
  console.log('   ✓ inventoryAPI.addItem(itemData)')
  console.log('   ✓ inventoryAPI.markAsUsed(itemId)')
  console.log('   ✓ inventoryAPI.deleteItem(itemId)')
  console.log('   ✓ inventoryAPI.getTotalImpact(userId)')
  console.log('   ✓ inventoryAPI.healthCheck()')
  console.log('')

  // 3. Error Handling Demo
  console.log('3. Error Handling Demo:')
  try {
    // This will fail gracefully with proper error handling
    await inventoryAPI.getInventory('demo-user')
  } catch (error) {
    console.log(`   Expected Error: ${error}`)
  }
  console.log('')

  // 4. Configuration Examples
  console.log('4. Environment Configuration Examples:')
  console.log('   Development: http://localhost:3000/api')
  console.log('   Staging: https://staging-api.useitup.com/v1')
  console.log('   Production: https://api.useitup.com/v1')
  console.log('')

  console.log('=== Demo Complete ===')
}

// Export for use in other parts of the application
export default demoAPIServiceLayer
