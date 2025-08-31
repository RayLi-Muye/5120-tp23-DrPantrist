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
    </header>

    <main class="dashboard-main">
      <!-- Loading State -->
      <div v-if="inventoryStore.isLoading" class="loading-container">
        <LoadingState message="Loading your dashboard..." />
      </div>

      <!-- Error State -->
      <div v-else-if="inventoryStore.error" class="error-container">
        <div class="error-message">
          <h3>Failed to load dashboard</h3>
          <p>{{ inventoryStore.error }}</p>
          <button @click="retryLoad" class="btn btn--primary">Retry</button>
        </div>
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

        <!-- Recent Activity Section
        <section class="recent-activity-section">
          <h2>Recent Activity</h2>
          <RecentActivity />
        </section> -->

        <!-- Quick Actions Section -->
        <section class="quick-actions-section">
          <h2>Quick Actions</h2>
          <QuickActions />
        </section>
      </div>

      <!-- Development Info -->
      <div v-if="isDevelopment() && apiStatus" class="dev-info">
        <h3>Development Info</h3>
        <p>API Mode: {{ apiStatus.mode }}</p>
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
import LoadingState from '@/components/common/LoadingState.vue'
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
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}

.dashboard-header {
  text-align: center;
  color: white;
  margin-bottom: var(--spacing-xl);
}

.dashboard-header h1 {
  font-size: var(--font-size-xxl);
  font-weight: var(--font-weight-bold);
  margin-bottom: var(--spacing-xs);
}

.subtitle {
  color: white(--color-secondary);
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
  max-width: 800px;
  margin: 0 auto;
}

.loading-container,
.error-container {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 200px;
}

.error-message {
  text-align: center;
  padding: var(--spacing-lg);
  background: white;
  border-radius: var(--border-radius-lg);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: var(--spacing-md) var(--spacing-lg);
  font-size: var(--font-size-base);
  font-weight: var(--font-weight-medium);
  text-decoration: none;
  border: 1px solid transparent;
  border-radius: var(--border-radius-md);
  cursor: pointer;
  transition: all var(--duration-fast) ease;
  min-height: var(--touch-target-min);
}

.btn--primary {
  color: white;
  background-color: var(--color-primary);
  border-color: var(--color-primary);
}

.btn--primary:hover {
  background-color: #0056b3;
  border-color: #0056b3;
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

.dev-info {
  margin-top: var(--spacing-xl);
  padding: var(--spacing-md);
  background: rgba(255, 255, 255, 0.1);
  border-radius: var(--border-radius-md);
  color: white;
  font-size: var(--font-size-sm);
}

.dev-info h3 {
  margin-bottom: var(--spacing-sm);
  font-size: var(--font-size-base);
}

/* Mobile optimizations */
@media (max-width: 480px) {
  .dashboard-view {
    padding: var(--spacing-sm);
  }

  .dashboard-header h1 {
    font-size: var(--font-size-xl);
  }

  .user-info {
    flex-direction: column;
    gap: var(--spacing-sm);
  }

  .impact-overview-section h2,
  .inventory-summary-section h2,
  .recent-activity-section h2,
  .quick-actions-section h2 {
    font-size: var(--font-size-base);
  }
}

/* Tablet and desktop */
@media (min-width: 768px) {
  .dashboard-main {
    max-width: 1000px;
  }

  .dashboard-view {
    padding: var(--spacing-lg);
  }
}
</style>
