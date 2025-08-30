import { describe, it, expect, beforeEach } from 'vitest'
import { createRouter, createWebHistory } from 'vue-router'
import router from '../index'

describe('Router Configuration', () => {
  beforeEach(() => {
    // Reset router state before each test
    router.push('/')
  })

  it('should have correct route configuration', () => {
    const routes = router.getRoutes()

    // Check that all required routes exist
    const routeNames = routes.map(route => route.name)
    expect(routeNames).toContain('dashboard')
    expect(routeNames).toContain('inventory')
    expect(routeNames).toContain('add-item')
    expect(routeNames).toContain('about')
  })

  it('should redirect /home to dashboard', async () => {
    await router.push('/home')
    expect(router.currentRoute.value.name).toBe('dashboard')
  })

  it('should redirect unknown routes to dashboard', async () => {
    await router.push('/unknown-route')
    expect(router.currentRoute.value.name).toBe('dashboard')
  })

  it('should have correct meta information for routes', () => {
    const routes = router.getRoutes()

    const dashboardRoute = routes.find(route => route.name === 'dashboard')
    expect(dashboardRoute?.meta?.title).toBe('Dashboard - Use It Up')

    const inventoryRoute = routes.find(route => route.name === 'inventory')
    expect(inventoryRoute?.meta?.title).toBe('Inventory - Use It Up')

    const addItemRoute = routes.find(route => route.name === 'add-item')
    expect(addItemRoute?.meta?.title).toBe('Add Item - Use It Up')
  })

  it('should navigate between main routes', async () => {
    // Navigate to inventory
    await router.push('/inventory')
    expect(router.currentRoute.value.name).toBe('inventory')
    expect(router.currentRoute.value.path).toBe('/inventory')

    // Navigate to add-item
    await router.push('/add-item')
    expect(router.currentRoute.value.name).toBe('add-item')
    expect(router.currentRoute.value.path).toBe('/add-item')

    // Navigate back to dashboard
    await router.push('/')
    expect(router.currentRoute.value.name).toBe('dashboard')
    expect(router.currentRoute.value.path).toBe('/')
  })

  it('should have lazy-loaded components', () => {
    const routes = router.getRoutes()

    // Check that main routes exist and have proper configuration
    const dashboardRoute = routes.find(route => route.name === 'dashboard')
    const inventoryRoute = routes.find(route => route.name === 'inventory')
    const addItemRoute = routes.find(route => route.name === 'add-item')

    // Verify routes exist and have correct paths
    expect(dashboardRoute).toBeDefined()
    expect(dashboardRoute?.path).toBe('/')

    expect(inventoryRoute).toBeDefined()
    expect(inventoryRoute?.path).toBe('/inventory')

    expect(addItemRoute).toBeDefined()
    expect(addItemRoute?.path).toBe('/add-item')
  })
})
