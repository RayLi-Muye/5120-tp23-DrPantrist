<template>
  <div class="inventory-view">
    <header class="inventory-header">
      <button @click="goBack" class="back-button" aria-label="Go back">
        ← Back
      </button>
      <h1>Inventory</h1>
    </header>

    <main class="inventory-main">
      <!-- Filter Section -->
      <section class="inventory-filters">
        <InventoryFilter />
      </section>

      <!-- Loading State -->
      <div v-if="inventoryStore.isLoading && !inventoryStore.items.length" class="loading-state">
        <div class="loading" />
        <p>Loading your inventory...</p>
      </div>

      <!-- Error State -->
      <div v-else-if="inventoryStore.error" class="error-state">
        <p class="error-message">{{ inventoryStore.error }}</p>
        <button @click="handleRetry" class="btn btn--secondary">
          Try Again
        </button>
      </div>

      <!-- Inventory List Section -->
      <section v-else-if="inventoryStore.activeItems.length > 0" class="inventory-list">
        <InventoryItem
          v-for="item in inventoryStore.itemsByFilter"
          :key="item.id"
          :item="item"
          :is-loading="loadingItemId === item.id"
          @item-used="handleItemUsed"
        />
      </section>

      <!-- Empty State -->
      <div v-else class="empty-state">
        <div class="empty-state__icon">{{ getEmptyStateIcon() }}</div>
        <h2 class="empty-state__title">{{ getEmptyStateTitle() }}</h2>
        <p class="empty-state__description">
          {{ getEmptyStateDescription() }}
        </p>
        <router-link
          v-if="inventoryStore.currentFilter === 'all'"
          to="/add-item"
          class="btn btn--primary btn--lg"
        >
          Add Your First Item
        </router-link>
        <button
          v-else
          @click="inventoryStore.updateFilter('all')"
          class="btn btn--secondary btn--lg"
        >
          View All Items
        </button>
      </div>
    </main>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import InventoryItem from '@/components/inventory/InventoryItem.vue'
import InventoryFilter from '@/components/inventory/InventoryFilter.vue'
import { useInventoryStore } from '@/stores/inventory'
import { useImpactStore } from '@/stores/impact'

const router = useRouter()
const inventoryStore = useInventoryStore()
const impactStore = useImpactStore()

// Local state for tracking loading states
const loadingItemId = ref<string | null>(null)

// Mock user ID - in a real app this would come from auth
const currentUserId = 'demo-user-123'

const goBack = () => {
  // Check if there's history to go back to, otherwise go to dashboard
  if (window.history.length > 1) {
    router.back()
  } else {
    router.push('/')
  }
}

const handleItemUsed = async (itemId: string) => {
  if (loadingItemId.value) return // Prevent multiple simultaneous requests

  loadingItemId.value = itemId

  try {
    // Mark item as used and get impact data
    const impactData = await inventoryStore.markItemAsUsed(itemId)

    if (impactData) {
      // Update total impact in impact store
      impactStore.updateTotalImpact(impactData)

      // Show impact card with the returned data
      impactStore.showImpact(impactData)
    }
  } catch (error) {
    console.error('Failed to mark item as used:', error)
    // Error is already handled in the store
  } finally {
    loadingItemId.value = null
  }
}

const handleRetry = () => {
  inventoryStore.clearError()
  inventoryStore.fetchInventory(currentUserId, true) // Force refresh
}

// Empty state helpers
const getEmptyStateIcon = () => {
  switch (inventoryStore.currentFilter) {
    case 'fresh':
      return '🥬'
    case 'warning':
      return '⚠️'
    case 'expired':
      return '🗑️'
    default:
      return '📦'
  }
}

const getEmptyStateTitle = () => {
  switch (inventoryStore.currentFilter) {
    case 'fresh':
      return 'No fresh items'
    case 'warning':
      return 'No items expiring soon'
    case 'expired':
      return 'No expired items'
    default:
      return 'No items in your inventory'
  }
}

const getEmptyStateDescription = () => {
  switch (inventoryStore.currentFilter) {
    case 'fresh':
      return 'You don\'t have any fresh items at the moment. Items with more than 3 days until expiry will appear here.'
    case 'warning':
      return 'Great! You don\'t have any items expiring in the next 3 days.'
    case 'expired':
      return 'Excellent! You don\'t have any expired items. Keep up the good work!'
    default:
      return 'Start by adding some groceries to track their freshness and reduce waste.'
  }
}

// Load inventory on mount
onMounted(() => {
  inventoryStore.fetchInventory(currentUserId)
})
</script>

<style scoped>
.inventory-view {
  padding: var(--spacing-md);
  min-height: 100vh;
}

.inventory-header {
  display: flex;
  align-items: center;
  margin-bottom: var(--spacing-lg);
  position: relative;
}

.back-button {
  background: none;
  border: none;
  font-size: var(--font-size-lg);
  color: var(--color-primary);
  cursor: pointer;
  padding: var(--spacing-sm);
  margin-right: var(--spacing-md);
  border-radius: var(--border-radius-md);
  min-height: var(--touch-target-min);
  min-width: var(--touch-target-min);
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background-color var(--duration-fast) ease;
}

.back-button:hover {
  background: var(--color-bg-secondary);
}

.inventory-header h1 {
  font-size: var(--font-size-xl);
  color: var(--color-primary);
  margin: 0;
}

.inventory-main {
  max-width: 600px;
  margin: 0 auto;
}

.inventory-filters {
  margin-bottom: var(--spacing-lg);
}



/* Loading State */
.loading-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--spacing-md);
  padding: var(--spacing-xxl);
  text-align: center;
}

.loading-state p {
  color: var(--color-text-secondary);
  margin: 0;
}

/* Error State */
.error-state {
  text-align: center;
  padding: var(--spacing-xl);
  background-color: rgba(220, 53, 69, 0.1);
  border: 1px solid rgba(220, 53, 69, 0.2);
  border-radius: var(--border-radius-lg);
  margin-bottom: var(--spacing-lg);
}

.error-message {
  color: var(--color-expired);
  margin-bottom: var(--spacing-md);
  font-weight: var(--font-weight-medium);
}

/* Inventory List */
.inventory-list {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-sm);
}

/* Empty State */
.empty-state {
  text-align: center;
  padding: var(--spacing-xxl) var(--spacing-md);
}

.empty-state__icon {
  font-size: 4rem;
  margin-bottom: var(--spacing-lg);
  opacity: 0.6;
}

.empty-state__title {
  font-size: var(--font-size-xl);
  font-weight: var(--font-weight-semibold);
  color: var(--color-text-primary);
  margin-bottom: var(--spacing-md);
}

.empty-state__description {
  color: var(--color-text-secondary);
  margin-bottom: var(--spacing-xl);
  max-width: 400px;
  margin-left: auto;
  margin-right: auto;
}

/* Button Styles */
.btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: var(--spacing-sm) var(--spacing-md);
  font-size: var(--font-size-base);
  font-weight: var(--font-weight-medium);
  text-align: center;
  text-decoration: none;
  border: 1px solid transparent;
  border-radius: var(--border-radius-md);
  cursor: pointer;
  transition: all var(--duration-fast) ease;
  min-height: var(--touch-target-min);

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
}

.btn--primary {
  color: var(--color-text-light);
  background-color: var(--color-primary);
  border-color: var(--color-primary);

  &:hover:not(:disabled) {
    background-color: #0056b3;
    border-color: #0056b3;
  }
}

.btn--secondary {
  color: var(--color-text-primary);
  background-color: var(--color-bg-secondary);
  border-color: var(--color-border);

  &:hover:not(:disabled) {
    background-color: #e2e6ea;
    border-color: #dae0e5;
  }
}

.btn--lg {
  padding: var(--spacing-md) var(--spacing-lg);
  font-size: var(--font-size-lg);
  min-height: 52px;
}

/* Mobile-first responsive design */
@media (max-width: 374px) {
  .inventory-view {
    padding: var(--spacing-xs);
  }

  .inventory-header {
    margin-bottom: var(--spacing-sm);
  }

  .inventory-header h1 {
    font-size: var(--font-size-lg);
  }

  .back-button {
    font-size: var(--font-size-base);
    padding: var(--spacing-xs);
    margin-right: var(--spacing-sm);
  }

  .inventory-filters {
    margin-bottom: var(--spacing-sm);
  }

  .empty-state {
    padding: var(--spacing-lg) var(--spacing-xs);
  }

  .empty-state__icon {
    font-size: 2.5rem;
  }

  .empty-state__title {
    font-size: var(--font-size-base);
  }

  .empty-state__description {
    font-size: var(--font-size-sm);
  }
}

@media (min-width: 375px) and (max-width: 480px) {
  .inventory-view {
    padding: var(--spacing-sm);
  }

  .inventory-header {
    margin-bottom: var(--spacing-md);
  }

  .inventory-filters {
    margin-bottom: var(--spacing-md);
  }

  .empty-state {
    padding: var(--spacing-xl) var(--spacing-sm);
  }

  .empty-state__icon {
    font-size: 3rem;
  }

  .empty-state__title {
    font-size: var(--font-size-lg);
  }
}

/* Large mobile and tablet */
@media (min-width: 481px) {
  .inventory-main {
    max-width: 700px;
  }
}

/* Desktop */
@media (min-width: 768px) {
  .inventory-main {
    max-width: 800px;
  }

  .inventory-header h1 {
    font-size: var(--font-size-xxl);
  }

  .empty-state {
    padding: var(--spacing-xxl);
  }
}
</style>
