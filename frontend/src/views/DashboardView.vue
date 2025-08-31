<template>
  <div class="dashboard-view">
    <header class="dashboard-header">
      <h1>{{ userDisplayName }}</h1>
      <p class="subtitle">Your Food Waste Tracker</p>

      <!-- User Info -->
      <div v-if="authStore.user" class="user-info">
        <span class="login-code">Code: {{ authStore.user.loginCode }}</span>
        <button @click="logout" class="logout-btn">Logout</button>
      </div>

      <!-- API Status (Development Only) -->
      <div v-if="apiStatus && isDevelopment()" class="api-status">
        <span class="api-status__badge" :class="`api-status__badge--${apiStatus.mode}`">
          {{ apiStatus.mode === 'mock' ? '🔄 Mock API' : '✅ Real API' }}
        </span>
      </div>
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

        <!-- Dashboard Content -->
        <div v-else>
          <!-- Impact Overview Section -->
          <section class="impact-overview-section">
            <h2>Your Environmental Impact</h2>
            <ImpactStats />
          </section>

          <!-- Inventory Summary Section -->
          <section class="inventory-summary-section">
            <h2>Inventory Overview</h2>
            <InventorySummary />
          </section>

          <!-- Recent Activity Section -->
          <section class="recent-activity-section">
            <h2>Recent Activity</h2>
            <RecentActivity />
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
import { onMounted, ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useInventoryStore } from '@/stores/inventory'
import { useAuthStore } from '@/stores/auth'
import InventorySummary from '@/components/common/InventorySummary.vue'
import QuickActions from '@/components/common/QuickActions.vue'
import ImpactStats from '@/components/inventory/ImpactStats.vue'
import RecentActivity from '@/components/dashboard/RecentActivity.vue'
import inventoryAPI from '@/api/inventory'
import { isDevelopment } from '@/config/environment'

const router = useRouter()
const inventoryStore = useInventoryStore()
const authStore = useAuthStore()
const apiStatus = ref<{ mode: string } | null>(null)

const userDisplayName = computed(() => {
  return authStore.user?.inventoryName || 'Your Inventory'
})

const retryLoad = async () => {
  inventoryStore.clearError()
  await loadInventory()
}

const loadInventory = async () => {
  if (!authStore.user) {
    console.error('No authenticated user found')
    return
  }

  try {
    await inventoryStore.fetchInventory(authStore.user.id)

    // Update API status for development display
    if (isDevelopment()) {
      apiStatus.value = inventoryAPI.getAPIStatus()
    }
  } catch (error) {
    console.error('Failed to load inventory:', error)
  }
}

const logout = async () => {
  try {
    authStore.logout()
    // Force immediate redirect to auth page
    await router.replace('/auth')
  } catch (error) {
    console.error('Logout error:', error)
    // Fallback: force redirect anyway
    await router.replace('/auth')
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

.user-info {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--spacing-md);
  margin-top: var(--spacing-md);
  padding: var(--spacing-sm);
  background: rgba(255, 255, 255, 0.1);
  border-radius: var(--border-radius-md);
}

.login-code {
  font-size: var(--font-size-sm);
  color: var(--color-text-secondary);
  font-family: monospace;
  background: rgba(255, 255, 255, 0.2);
  padding: var(--spacing-xs) var(--spacing-sm);
  border-radius: var(--border-radius-sm);
}

.logout-btn {
  background: none;
  border: 1px solid var(--color-text-secondary);
  color: var(--color-text-secondary);
  padding: var(--spacing-xs) var(--spacing-sm);
  border-radius: var(--border-radius-sm);
  cursor: pointer;
  font-size: var(--font-size-sm);
  transition: all var(--duration-fast) ease;
}

.logout-btn:hover {
  background: var(--color-text-secondary);
  color: white;
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
.impact-overview-section,
.inventory-summary-section,
.recent-activity-section,
.quick-actions-section {
  margin-bottom: var(--spacing-xl);
}

.impact-overview-section h2,
.inventory-summary-section h2,
.recent-activity-section h2,
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

/* Mobile-first responsive design */
@media (max-width: 374px) {
  .dashboard-view {
    padding: var(--spacing-xs);
  }

  .dashboard-header h1 {
    font-size: var(--font-size-lg);
  }

  .subtitle {
    font-size: var(--font-size-xs);
  }

  .empty-state__icon {
    font-size: 2.5rem;
  }

  .empty-state__title {
    font-size: var(--font-size-sm);
  }

  .empty-state__message {
    font-size: var(--font-size-sm);
  }
}

@media (min-width: 375px) and (max-width: 575px) {
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

@media (min-width: 576px) {
  .dashboard-main {
    max-width: 600px;
  }
}

@media (min-width: 768px) {
  .dashboard-main {
    max-width: 800px;
  }

  .dashboard-header h1 {
    font-size: var(--font-size-xxl);
  }

  .empty-state {
    padding: var(--spacing-xxl);
  }
}

@media (min-width: 1024px) {
  .dashboard-main {
    max-width: 900px;
  }
}

/* API Status Badge (Development Only) */
.api-status {
  margin-top: var(--spacing-sm);
}

.api-status__badge {
  display: inline-block;
  padding: var(--spacing-xs) var(--spacing-sm);
  border-radius: var(--border-radius-md);
  font-size: var(--font-size-xs);
  font-weight: var(--font-weight-medium);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.api-status__badge--real {
  background-color: rgba(40, 167, 69, 0.1);
  color: var(--color-fresh);
  border: 1px solid rgba(40, 167, 69, 0.2);
}

.api-status__badge--mock {
  background-color: rgba(255, 193, 7, 0.1);
  color: #b8860b;
  border: 1px solid rgba(255, 193, 7, 0.2);
}
</style>
