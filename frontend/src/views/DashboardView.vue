<template>
  <div class="dashboard-view">
    <!-- Fridge-style hero header -->
    <header class="dashboard-hero">
      <div class="hero-content">
        <div class="hero-title">
          <h1>{{ userDisplayName }}</h1>
          <p class="subtitle">Your Fridge</p>
          <!-- Impact Overview Section -->
          <section class="impact-overview-section">
            <ImpactStats />
          </section>
        </div>

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
          Stats and quick actions grid
          <div class="dashboard-grid">
            <section class="stats-card" aria-label="Inventory summary" data-testid="inventory-summary">
              <h2>Inventory Overview</h2>
              <InventorySummary />
            </section>

            <section class="actions-card" aria-label="Quick actions">
              <h2>Quick Actions</h2>
              <QuickActions />
            </section>
          </div>

          <!-- Fridge shelf: compact inventory cards -->
          <section class="inventory-shelf">
            <h2>Your Items</h2>
            <div v-if="filteredItems.length" class="shelf-grid">
              <article
                v-for="item in filteredItems.slice(0, 6)"
                :key="item.id"
                class="shelf-card"
                :data-testid="`inventory-item-${item.id}`"
              >
                <div class="shelf-card__top">
                  <div class="shelf-card__name">{{ item.name }}</div>
                  <span class="status-dot" :class="statusClass(item.expiryDate)" aria-hidden="true"></span>
                </div>
                <div class="shelf-card__meta">
                  <span class="qty">Qty: {{ item.quantity }}</span>
                  <span class="days" :class="statusClass(item.expiryDate)">{{ daysLeftText(item.expiryDate) }}</span>
                </div>
                <div class="shelf-card__progress">
                  <div class="progress-bar">
                    <div class="progress-bar__fill" :class="statusClass(item.expiryDate)" :style="{ width: progressPercent(item.expiryDate) + '%' }"></div>
                  </div>
                </div>
              </article>
            </div>
            <div v-else class="inventory-inline__empty">
              <p>No matching items.</p>
              <router-link to="/inventory" class="btn btn-primary">Manage Inventory</router-link>
            </div>
            <router-link v-if="inventoryStore.itemsByFilter.length > 6" to="/inventory" class="view-all">
              View all items →
            </router-link>
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
import { calculateDaysUntilExpiry } from '@/utils/dateHelpers'
import inventoryAPI from '@/api/inventory'
import { isDevelopment } from '@/config/environment'

const router = useRouter()
const inventoryStore = useInventoryStore()
const authStore = useAuthStore()
const apiStatus = ref<{ mode: string } | null>(null)
const searchQuery = ref('')

const filters = computed(() => [
  { key: 'all', label: 'All', count: inventoryStore.inventoryCounts.total },
  { key: 'fresh', label: 'Fresh', count: inventoryStore.inventoryCounts.fresh },
  { key: 'warning', label: 'Expiring', count: inventoryStore.inventoryCounts.warning },
  { key: 'expired', label: 'Expired', count: inventoryStore.inventoryCounts.expired },
] as { key: 'all' | 'fresh' | 'warning' | 'expired', label: string, count: number }[])

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

const filteredItems = computed(() => {
  const q = searchQuery.value.trim().toLowerCase()
  const list = inventoryStore.itemsByFilter
  if (!q) return list
  return list.filter(i => i.name.toLowerCase().includes(q))
})

const statusClass = (expiryDate: string) => {
  const d = calculateDaysUntilExpiry(expiryDate)
  if (d < 0) return 'is-expired'
  if (d <= 3) return 'is-warning'
  return 'is-fresh'
}

const daysLeftText = (expiryDate: string) => {
  const d = calculateDaysUntilExpiry(expiryDate)
  if (d < 0) return `${Math.abs(d)}d overdue`
  if (d === 0) return 'today'
  if (d === 1) return '1 day left'
  return `${d} days left`
}

const progressPercent = (expiryDate: string) => {
  // Visual heuristic: map days left to bar width (0-100) within 7-day window
  const d = Math.max(-3, Math.min(7, calculateDaysUntilExpiry(expiryDate)))
  return Math.max(0, Math.min(100, Math.round(((7 - d) / 10) * 100)))
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

.dashboard-view { min-height: 100vh; background: var(--color-bg-secondary, #f7f9fb); }

.dashboard-hero {
  background: var(--brand-gradient);
  color: #fff;
  padding: var(--spacing-xl) var(--spacing-md);
  border-bottom-left-radius: 16px;
  border-bottom-right-radius: 16px;
}

.hero-content { max-width: 960px; margin: 0 auto; display: grid; gap: var(--spacing-md); }
.hero-title h1 { font-size: var(--font-size-xxl); margin: 0; }
.subtitle { opacity: 0.9; font-size: var(--font-size-sm); margin-top: var(--spacing-xs); }

.user-info {
  display: flex; align-items: center; gap: var(--spacing-md);
  margin-top: var(--spacing-sm);
  padding: var(--spacing-xs) var(--spacing-sm);
  background: rgba(255, 255, 255, 0.15);
  border-radius: var(--border-radius-md);
  width: fit-content;
}

.login-code {
  font-size: var(--font-size-sm);
  color: #fff;
  font-family: monospace;
  background: rgba(255, 255, 255, 0.2);
  padding: var(--spacing-xs) var(--spacing-sm);
  border-radius: var(--border-radius-sm);
}

.logout-btn {
  background: rgba(255,255,255,0.1);
  border: 1px solid rgba(255,255,255,0.35);
  color: #fff;
  padding: var(--spacing-xs) var(--spacing-sm);
  border-radius: var(--border-radius-sm);
  cursor: pointer;
  font-size: var(--font-size-sm);
  transition: all var(--duration-fast) ease;
}

.logout-btn:hover {
  background: rgba(255,255,255,0.2);
}

.dashboard-main {
  max-width: 960px;
  margin: 0 auto;
  padding: var(--spacing-lg) var(--spacing-md);
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
.dashboard-grid { display: grid; gap: var(--spacing-lg); grid-template-columns: 1fr; margin-bottom: var(--spacing-xl); }
.stats-card, .actions-card {
  background: var(--glass-bg);
  border-radius: 16px;
  padding: var(--spacing-lg);
  box-shadow: 0 8px 24px rgba(16, 24, 40, 0.06);
  border: 1px solid var(--glass-border);
  backdrop-filter: blur(var(--glass-blur));
  -webkit-backdrop-filter: blur(var(--glass-blur));
}
.stats-card h2, .actions-card h2, .inventory-shelf h2, .impact-overview-section h2 { font-size: var(--font-size-lg); margin-bottom: var(--spacing-md); color: var(--color-text-primary); }

@media (min-width: 768px) {
  .dashboard-grid { grid-template-columns: 1.2fr 1fr; }
}

/* Inline Inventory on Dashboard */
.inventory-inline__filters {
  margin-bottom: var(--spacing-md);
}

.inventory-inline__list {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-sm);
}

.inventory-inline__empty {
  padding: var(--spacing-lg);
  background: var(--color-bg-primary);
  border-radius: var(--border-radius-md);
}

.view-all {
  display: inline-block;
  margin-top: var(--spacing-sm);
  color: var(--color-primary);
  text-decoration: none;
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

.btn-primary { background: var(--brand-gradient); color: white; border: 0; box-shadow: 0 8px 16px rgba(16,185,129,0.2); }
.btn-primary:hover { background: var(--brand-gradient-hover); }

.btn-large {
  font-size: var(--font-size-lg);
  padding: var(--spacing-lg) var(--spacing-xl);
}

/* Search and chips */
.search-filters { margin: var(--spacing-xl) 0 var(--spacing-lg); }
.search-bar { margin-bottom: var(--spacing-md); }
.search-input {
  width: 100%;
  padding: 12px 14px;
  border-radius: 12px;
  border: 1px solid var(--color-border, #e6e9ee);
  background: #fff;
  font-size: var(--font-size-base);
}
.filter-chips { display: flex; gap: var(--spacing-sm); flex-wrap: wrap; }
.chip {
  border: 1px solid var(--color-border, #e6e9ee);
  background: #fff;
  color: var(--color-text-primary);
  border-radius: 999px;
  padding: 6px 10px;
  cursor: pointer;
  font-size: var(--font-size-sm);
}
.chip--active { border-color: var(--color-primary); box-shadow: 0 0 0 2px rgba(0,123,255,0.08); }
.chip--fresh { }
.chip--warning { }
.chip--expired { }
.chip-count { margin-left: 6px; opacity: 0.7; }

/* Shelf cards */
.shelf-grid { display: grid; grid-template-columns: 1fr; gap: var(--spacing-sm); }
@media (min-width: 576px) { .shelf-grid { grid-template-columns: 1fr 1fr; gap: var(--spacing-md); } }
@media (min-width: 960px) { .shelf-grid { grid-template-columns: 1fr 1fr 1fr; } }

.shelf-card {
  background: var(--glass-bg);
  border: 1px solid var(--glass-border);
  border-radius: 14px;
  padding: var(--spacing-md);
  display: flex;
  flex-direction: column;
  gap: 8px;
  backdrop-filter: blur(var(--glass-blur));
  -webkit-backdrop-filter: blur(var(--glass-blur));
}
.shelf-card__top { display: flex; align-items: center; justify-content: space-between; gap: 8px; }
.shelf-card__name { font-weight: 600; color: var(--color-text-primary); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.status-dot { width: 10px; height: 10px; border-radius: 50%; }
.status-dot.is-fresh { background: var(--color-fresh); }
.status-dot.is-warning { background: var(--color-warning); }
.status-dot.is-expired { background: var(--color-expired); }
.shelf-card__meta { display: flex; justify-content: space-between; color: var(--color-text-secondary); font-size: var(--font-size-sm); }
.shelf-card__progress .progress-bar { width: 100%; height: 6px; background: var(--color-bg-secondary, #f0f3f7); border-radius: 999px; overflow: hidden; }
.progress-bar__fill { height: 100%; background: var(--color-fresh); transition: width 0.3s ease; }
.progress-bar__fill.is-warning { background: var(--color-warning); }
.progress-bar__fill.is-expired { background: var(--color-expired); }

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

@media (min-width: 768px) { .empty-state { padding: var(--spacing-xxl); } }

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
