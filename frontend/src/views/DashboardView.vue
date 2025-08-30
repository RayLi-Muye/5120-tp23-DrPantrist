<template>
  <div class="dashboard-view">
    <header class="dashboard-header">
      <h1>Use It Up</h1>
      <p class="subtitle">Your Food Waste Tracker</p>
    </header>

    <main class="dashboard-main">
      <!-- Loading State -->
      <div v-if="inventoryStore.isLoading" class="loading-state">
        <div class="loading-spinner"></div>
        <p>Loading your inventory...</p>
      </div>

      <!-- Error State -->
      <div v-else-if="inventoryStore.error" class="error-state">
        <div class="error-icon">⚠️</div>
        <p>{{ inventoryStore.error }}</p>
        <button @click="retryLoad" class="btn btn-primary">
          Try Again
        </button>
      </div>

      <!-- Main Content -->
      <div v-else>
        <!-- Empty State -->
        <div v-if="inventoryStore.inventoryCounts.total === 0" class="empty-state">
          <div class="empty-state__icon">🥗</div>
          <h2 class="empty-state__title">No items in your inventory</h2>
          <p class="empty-state__message">
            Start tracking your food by adding your first item!
          </p>
          <router-link to="/add-item" class="btn btn-primary btn-large">
            Add Your First Item
          </router-link>
        </div>

        <!-- Inventory Content -->
        <div v-else>
          <!-- Inventory Summary Section -->
          <section class="inventory-summary-section">
            <h2>Your Inventory</h2>
            <InventorySummary />
          </section>

          <!-- Quick Actions Section -->
          <section class="quick-actions-section">
            <h2>Quick Actions</h2>
            <QuickActions />
          </section>
        </div>
      </div>
    </main>
  </div>
</template>

<script setup lang="ts">
import { onMounted } from 'vue'
import { useInventoryStore } from '@/stores/inventory'
import InventorySummary from '@/components/common/InventorySummary.vue'
import QuickActions from '@/components/common/QuickActions.vue'

const inventoryStore = useInventoryStore()

// Mock user ID for demo purposes
const DEMO_USER_ID = 'demo-user-123'

const retryLoad = async () => {
  inventoryStore.clearError()
  await loadInventory()
}

const loadInventory = async () => {
  try {
    await inventoryStore.fetchInventory(DEMO_USER_ID)
  } catch (error) {
    console.error('Failed to load inventory:', error)
  }
}

onMounted(() => {
  loadInventory()
})
</script>

<style scoped>
.dashboard-view {
  padding: var(--spacing-md);
  min-height: 100vh;
  background: var(--color-bg-secondary, #f8f9fa);
}

.dashboard-header {
  text-align: center;
  margin-bottom: var(--spacing-xl);
}

.dashboard-header h1 {
  font-size: var(--font-size-xl);
  color: var(--color-primary);
  margin-bottom: var(--spacing-xs);
}

.subtitle {
  color: var(--color-secondary);
  font-size: var(--font-size-sm);
}

.dashboard-main {
  max-width: 600px;
  margin: 0 auto;
}

/* Loading State */
.loading-state {
  text-align: center;
  padding: var(--spacing-xl);
}

.loading-spinner {
  width: 40px;
  height: 40px;
  border: 4px solid var(--color-bg-secondary, #f3f3f3);
  border-top: 4px solid var(--color-primary);
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin: 0 auto var(--spacing-md);
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

/* Error State */
.error-state {
  text-align: center;
  padding: var(--spacing-xl);
  background: var(--color-bg-primary);
  border-radius: 12px;
  border: 2px solid var(--color-expired);
}

.error-icon {
  font-size: 3rem;
  margin-bottom: var(--spacing-md);
}

/* Empty State */
.empty-state {
  text-align: center;
  padding: var(--spacing-xl);
  background: var(--color-bg-primary);
  border-radius: 12px;
  margin-bottom: var(--spacing-lg);
}

.empty-state__icon {
  font-size: 4rem;
  margin-bottom: var(--spacing-lg);
}

.empty-state__title {
  font-size: var(--font-size-lg);
  color: var(--color-text-primary);
  margin-bottom: var(--spacing-md);
}

.empty-state__message {
  color: var(--color-text-secondary);
  margin-bottom: var(--spacing-lg);
  font-size: var(--font-size-base);
}

/* Content Sections */
.inventory-summary-section,
.quick-actions-section {
  margin-bottom: var(--spacing-xl);
}

.inventory-summary-section h2,
.quick-actions-section h2 {
  font-size: var(--font-size-lg);
  margin-bottom: var(--spacing-md);
  color: var(--color-text-primary);
}

/* Button Styles */
.btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: var(--spacing-md) var(--spacing-lg);
  border-radius: 8px;
  text-decoration: none;
  font-weight: 500;
  text-align: center;
  transition: all 0.2s ease;
  min-height: 44px;
  border: none;
  cursor: pointer;
  font-family: inherit;
  font-size: var(--font-size-base);
}

.btn-primary {
  background: var(--color-primary);
  color: white;
}

.btn-primary:hover {
  background: #0056b3;
}

.btn-large {
  font-size: var(--font-size-lg);
  padding: var(--spacing-lg) var(--spacing-xl);
}

/* Responsive Design */
@media (max-width: 575px) {
  .dashboard-view {
    padding: var(--spacing-sm);
  }

  .empty-state__icon {
    font-size: 3rem;
  }

  .empty-state__title {
    font-size: var(--font-size-base);
  }
}

@media (min-width: 768px) {
  .dashboard-main {
    max-width: 800px;
  }
}
</style>
