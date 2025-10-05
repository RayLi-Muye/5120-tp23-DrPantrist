<template>
  <div class="dashboard-view">
    <header class="dashboard-header">
      <div class="header-main">
        <div class="header-text">
          <h1>{{ userDisplayName }}</h1>
          <p class="subtitle">Manage shared and private household items</p>
        </div>
        <div class="user-switch-stack">
          <div class="user-switch" data-tour-id="profile-manager" role="group" aria-label="Select household member">
            <button
              v-for="slot in slots"
              :key="slot.profile ? slot.profile.profileId : `placeholder-${slot.position}`"
              :class="[
                'user-switch__button',
                { 'user-switch__button--active': activeProfile && slot.profile && activeProfile.position === slot.profile.position },
                { 'user-switch__button--placeholder': !slot.profile }
              ]"
              @click="handleUserSlotClick(slot)"
              @contextmenu.prevent="handleSlotContextMenu(slot)"
              :aria-pressed="!!(slot.profile && activeProfile && activeProfile.position === slot.profile.position)"
              :title="slot.profile ? (isOwner ? `Switch to ${slot.profile.profileName}\n(right click to rename)` : `Switch to ${slot.profile.profileName}`) : (isOwner ? 'Add household member' : 'Members managed by owner')"
            >
              <span v-if="!slot.profile">+</span>
              <span v-else>{{ getInitials(slot.profile.profileName) }}</span>
            </button>
          </div>
          <DashboardTour />
        </div>
      </div>
      <div class="header-info">
        <span v-if="activeProfile" class="header-info__text">Active inventory: {{ activeProfile.profileName }}</span>
        <span v-else class="header-info__text">Select a member to view their private inventory</span>
      </div>
    </header>

    <main class="dashboard-main">
      <div v-if="inventoryStore.isLoading" class="loading-container">
        <LoadingState :visible="true" message="Loading your dashboard..." />
      </div>

      <div v-else-if="inventoryStore.error" class="error-container">
        <div class="error-message">
          <h3>Failed to load dashboard</h3>
          <p><strong>Error:</strong> {{ inventoryStore.error }}</p>
          <div v-if="isDevelopment()" class="debug-info">
            <h4>Debug Info</h4>
            <p><strong>User:</strong> {{ authStore.user ? 'Authenticated' : 'Not authenticated' }}</p>
            <p v-if="authStore.user"><strong>Login Code:</strong> {{ authStore.user.loginCode || 'Missing' }}</p>
            <p v-if="authStore.user"><strong>User ID:</strong> {{ authStore.user.id }}</p>
            <p><strong>Items Count:</strong> {{ inventoryStore.items.length }}</p>
            <p><strong>Last Fetch:</strong> {{ inventoryStore.lastFetch ? new Date(inventoryStore.lastFetch).toLocaleTimeString() : 'Never' }}</p>
          </div>
          <button @click="retryLoad" class="btn btn--primary">Retry</button>
        </div>
      </div>

      <div v-else class="dashboard-content">
        <section class="dashboard-section inventory-section user-inventory">
          <div class="section-header">
            <div class="section-title">
              <h2>{{ activeProfile ? `${activeProfile.profileName}'s Inventory` : 'Private Inventory' }}</h2>
              <p class="section-subtext">Private items only for selected member.</p>
            </div>
            <div class="section-controls">
              <!-- Private local filter -->
              <div class="local-filter">
                <button
                  v-for="opt in privateFilterOptions"
                  :key="opt.key"
                  :class="['filter-chip', { active: privateFilter === opt.key }]"
                  @click="privateFilter = opt.key"
                >
                  {{ opt.label }}<span v-if="opt.count > 0" class="chip-badge">{{ opt.count }}</span>
                </button>
              </div>
              <div class="inventory-actions">
                <router-link
                  :to="{ path: '/add-item', query: { visibility: 'private' } }"
                  class="inventory-add-button" data-tour-id="add-item"
                  aria-label="Add inventory item"
                >
                  +
                </router-link>
                <div
                  class="inventory-info-fab"
                  role="button"
                  tabindex="0"
                  aria-label="物品数据来源信息"
                >
                  i
                  <span class="inventory-info-fab__tooltip">
                    可用物品的价格和碳排放的数据来源是: CO2来自SuEatableLife Food Footprint Database, 价格来自Nutrition Research Australia - Australian Food Price Dataset
                  </span>
                </div>
              </div>
              <div class="impact-summary" data-tour-id="impact-summary">
                <div class="impact-summary__item">
                  <span class="impact-label">Well Spent</span>
                  <span class="impact-value">{{ privateImpact.money }}</span>
                </div>
                <div class="impact-summary__item">
                  <span class="impact-label">CO2 Avoided</span>
                  <span class="impact-value">{{ privateImpact.co2 }}</span>
                </div>
              </div>
            </div>
          </div>

          <div class="inventory-content">
            <div v-if="privateItems.length === 0" class="empty-section">
              <div class="empty-icon" aria-hidden="true">&#128717;</div>
              <p>No private items for {{ activeProfile?.profileName || 'this member' }} yet.</p>
              <router-link :to="{ path: '/add-item', query: { visibility: 'private' } }" class="btn btn--primary">Add Private Item</router-link>
            </div>
            <div v-else class="inventory-grid">
              <ItemCard
                v-for="(item, index) in privateFilteredItems"
                :key="item.id"
                :item="item"
                :is-loading="loadingItemId === item.id"
                :data-tour-id="index === 0 ? 'use-item' : null"
                @use="handleUseItem"
              />
            </div>
          </div>
        </section>

        <section class="dashboard-section inventory-section shared-inventory">
          <div class="section-header">
            <div class="section-title">
              <h2>Shared Inventory</h2>
              <p class="section-subtext">Items everyone in the household can access.</p>
            </div>
            <div class="section-controls">
              <!-- Shared local filter -->
              <div class="local-filter">
                <button
                  v-for="opt in sharedFilterOptions"
                  :key="opt.key"
                  :class="['filter-chip', { active: sharedFilter === opt.key }]"
                  @click="sharedFilter = opt.key"
                >
                  {{ opt.label }}<span v-if="opt.count > 0" class="chip-badge">{{ opt.count }}</span>
                </button>
              </div>
              <div class="inventory-actions">
                <router-link
                  :to="{ path: '/add-item', query: { visibility: 'shared' } }"
                  class="inventory-add-button" data-tour-id="add-item"
                  aria-label="Add inventory item"
                >
                  +
                </router-link>
                <div
                  class="inventory-info-fab"
                  role="button"
                  tabindex="0"
                  aria-label="物品数据来源信息"
                >
                  i
                  <span class="inventory-info-fab__tooltip">
                    可用物品的价格和碳排放的数据来源是: CO2来自SuEatableLife Food Footprint Database, 价格来自Nutrition Research Australia - Australian Food Price Dataset
                  </span>
                </div>
              </div>
              <div class="impact-summary" data-tour-id="impact-summary">
                <div class="impact-summary__item">
                  <span class="impact-label">Well Spent</span>
                  <span class="impact-value">{{ sharedImpact.money }}</span>
                </div>
                <div class="impact-summary__item">
                  <span class="impact-label">CO2 Avoided</span>
                  <span class="impact-value">{{ sharedImpact.co2 }}</span>
                </div>
              </div>
            </div>
          </div>

          <div class="inventory-content">
            <div v-if="sharedItems.length === 0" class="empty-section">
              <div class="empty-icon">🤝</div>
              <p>No shared items yet. Add something for everyone to see.</p>
              <router-link :to="{ path: '/add-item', query: { visibility: 'shared' } }" class="btn btn--secondary">Add Shared Item</router-link>
            </div>
            <div v-else class="inventory-grid">
              <ItemCard
                v-for="(item, sharedIndex) in sharedFilteredItems"
                :key="item.id"
                :item="item"
                :is-loading="loadingItemId === item.id"
                :data-tour-id="sharedIndex === 0 && privateFilteredItems.length === 0 ? 'use-item' : null"
                @use="handleUseItem"
              />
            </div>
          </div>
        </section>
      </div>

      <div v-if="authStore.user" class="user-info">
        <span class="login-code">Code: {{ authStore.user.loginCode }}</span>
        <button @click="logout" class="logout-btn">Logout</button>
      </div>
    </main>

    <DashboardAssistant />
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref, computed, watch, nextTick } from 'vue'
import { useRouter } from 'vue-router'
import { useInventoryStore } from '@/stores/inventory'
import { useAuthStore } from '@/stores/auth'
import ItemCard from '@/components/inventory/ItemCard.vue'
import { useImpactStore } from '@/stores/impact'
import { useInventoryAccess } from '@/composables/useInventoryAccess'
import type { InventoryItem as InventoryItemType } from '@/api/inventory'
import LoadingState from '@/components/common/LoadingState.vue'
import DashboardAssistant from '@/components/assistant/DashboardAssistant.vue'
import DashboardTour from '@/components/dashboard/DashboardTour.vue'
import { isDevelopment } from '@/config/environment'
import { useDashboardStore, type HouseholdProfile } from '@/stores/dashboard'
import { storeToRefs } from 'pinia'
import { formatCurrency, formatCO2 } from '@/utils/formatters'
import { calculateDaysUntilExpiry } from '@/utils/dateHelpers'

const router = useRouter()
const inventoryStore = useInventoryStore()
const authStore = useAuthStore()
const impactStore = useImpactStore()
const dashboardStore = useDashboardStore()
const { slots, activeProfile, profiles } = storeToRefs(dashboardStore)
const { markItemAsUsedUnified } = useInventoryAccess()

const userDisplayName = computed(() => authStore.user?.inventoryName || 'Your Household')
const isOwner = computed(() => authStore.user?.isOwner ?? false)
const loginCode = computed(() => authStore.user?.loginCode ?? '')
const inventoryId = computed(() => authStore.user?.inventoryId ?? '')

const loadingItemId = ref<string | null>(null)

// Determine private/shared from profile position first; fall back to visibility flag
const isItemPrivate = (item: InventoryItemType) => {
  const pos = item.profilePosition
  if (typeof pos === 'number' && Number.isFinite(pos)) return true
  return item.visibility === 'private'
}

// Map profile_id -> position from inventory info
const positionByProfileId = computed<Record<string, number>>(() => {
  const map: Record<string, number> = {}
  for (const p of (profiles?.value || [])) {
    if (p.profileId) map[p.profileId] = p.position
  }
  return map
})

function getItemPosition(item: InventoryItemType): number | undefined {
  if (typeof item.profilePosition === 'number') return item.profilePosition
  const pid = item.profileId
  if (pid && positionByProfileId.value[pid] != null) return positionByProfileId.value[pid]
  return undefined
}

const privateItems = computed(() => {
  const active = activeProfile.value
  if (!active) return []
  return inventoryStore.itemsByFilter.filter(item => {
    if (!isItemPrivate(item)) return false
    const pos = getItemPosition(item)
    return pos === active.position
  })
})

const sharedItems = computed(() => inventoryStore.itemsByFilter.filter(item => !isItemPrivate(item)))

type FilterType = 'all' | 'fresh' | 'warning' | 'expired'
const privateFilter = ref<FilterType>('all')
const sharedFilter = ref<FilterType>('all')

function freshnessOf(expiryDate: string): FilterType {
  try {
    const days = calculateDaysUntilExpiry(expiryDate)
    if (days < 0) return 'expired'
    if (days <= 3) return 'warning'
    return 'fresh'
  } catch {
    return 'expired'
  }
}

const privateFilteredItems = computed(() => {
  const list = privateItems.value
  if (privateFilter.value === 'all') return list
  return list.filter(it => freshnessOf(it.expiryDate) === privateFilter.value)
})

const sharedFilteredItems = computed(() => {
  const list = sharedItems.value
  if (sharedFilter.value === 'all') return list
  return list.filter(it => freshnessOf(it.expiryDate) === sharedFilter.value)
})

const privateFilterOptions = computed(() => {
  const base = privateItems.value
  const counts = {
    fresh: base.filter(i => freshnessOf(i.expiryDate) === 'fresh').length,
    warning: base.filter(i => freshnessOf(i.expiryDate) === 'warning').length,
    expired: base.filter(i => freshnessOf(i.expiryDate) === 'expired').length,
    total: base.length
  }
  return [
    { key: 'all' as FilterType, label: 'All', count: counts.total },
    { key: 'fresh' as FilterType, label: 'Fresh', count: counts.fresh },
    { key: 'warning' as FilterType, label: 'Warning', count: counts.warning },
    { key: 'expired' as FilterType, label: 'Expired', count: counts.expired }
  ]
})

const sharedFilterOptions = computed(() => {
  const base = sharedItems.value
  const counts = {
    fresh: base.filter(i => freshnessOf(i.expiryDate) === 'fresh').length,
    warning: base.filter(i => freshnessOf(i.expiryDate) === 'warning').length,
    expired: base.filter(i => freshnessOf(i.expiryDate) === 'expired').length,
    total: base.length
  }
  return [
    { key: 'all' as FilterType, label: 'All', count: counts.total },
    { key: 'fresh' as FilterType, label: 'Fresh', count: counts.fresh },
    { key: 'warning' as FilterType, label: 'Warning', count: counts.warning },
    { key: 'expired' as FilterType, label: 'Expired', count: counts.expired }
  ]
})

// Session-only impact accumulators by section (increase when items are used)
const sessionSharedImpact = ref({ money: 0, co2: 0, items: 0 })
const sessionPrivateImpact = ref<Record<number, { money: number; co2: number; items: number }>>({})

function bumpPrivateImpact(position: number, money: number, co2: number) {
  if (!sessionPrivateImpact.value[position]) {
    sessionPrivateImpact.value[position] = { money: 0, co2: 0, items: 0 }
  }
  const bucket = sessionPrivateImpact.value[position]
  bucket.money += money
  bucket.co2 += co2
  bucket.items += 1
}

const privateImpact = computed(() => {
  const pos = activeProfile.value?.position
  if (!pos) return { money: formatCurrency(0), co2: formatCO2(0) }
  return impactStore.profileImpactFormatted(pos)
})

const sharedImpact = computed(() => impactStore.sharedImpactFormatted)

const retryLoad = async () => {
  inventoryStore.clearError()
  await loadInventory()
}

const loadInventory = async () => {
  if (!authStore.user) {
    inventoryStore.error = 'Authentication required. Please log in again.'
    return
  }

  inventoryStore.clearError()

  try {
    // First load inventory details (profiles and their positions), then fetch items
    if (authStore.user?.loginCode && authStore.user?.inventoryId) {
      await dashboardStore.loadProfiles(authStore.user.loginCode, authStore.user.inventoryId)
    }

    if (authStore.user.loginCode) {
      await inventoryStore.fetchInventoryByLoginCode(authStore.user.loginCode, true)
      // Fetch persisted impact stats for dashboard counters
      await impactStore.fetchImpactStatsByLoginCode(authStore.user.loginCode)
    } else {
      await inventoryStore.fetchInventory(authStore.user.id)
    }
  } catch (error) {
    console.error('Failed to load inventory:', error)
  }
}

const handleUseItem = async (itemId: string) => {
  if (!authStore.user) return

  loadingItemId.value = itemId

  try {
    const originalItem = inventoryStore.getItemById(itemId)
    const { impact, consumedResponse } = await markItemAsUsedUnified(itemId)

    const resolvedImpact = impact ?? (originalItem
      ? {
          itemId: originalItem.id,
          itemName: originalItem.name,
          moneySaved: originalItem.estimatedCost ?? 0,
          co2Avoided: originalItem.estimatedCo2Kg ?? 0,
          actionType: 'used' as const,
          timestamp: new Date().toISOString()
        }
      : null)

    if (resolvedImpact) {
      impactStore.showImpact(resolvedImpact)
      impactStore.updateTotalImpact(resolvedImpact)

      // Refresh persisted stats from backend to reflect latest totals
      if (loginCode.value) {
        impactStore.fetchImpactStatsByLoginCode(loginCode.value)
      }
    } else if (consumedResponse) {
      console.warn('Item consumed but no impact data available', consumedResponse)
    }
  } catch (error) {
    console.error('Failed to mark item as used:', error)
  } finally {
    loadingItemId.value = null
  }
}

const logout = async () => {
  try {
    authStore.logout()
    await router.replace('/auth')
  } catch (error) {
    console.error('Logout error:', error)
    await router.replace('/auth')
  }
}

const handleUserSlotClick = async (slot: { position: number; profile: HouseholdProfile | null }) => {
  if (!authStore.user) return

  if (!slot.profile) {
    if (!isOwner.value) {
      window.alert('Only the household owner can add profiles.')
      return
    }

    if (!loginCode.value || !inventoryId.value) {
      window.alert('Missing login information. Please try again later.')
      return
    }

    const name = window.prompt('Enter a name for the new household member:')
    if (name && name.trim().length > 0) {
      try {
        await dashboardStore.addProfile(loginCode.value, inventoryId.value, name, slot.position)
      } catch (err) {
        console.error('Failed to add profile', err)
        window.alert(err instanceof Error ? err.message : 'Failed to add profile')
      }
    }
    return
  }

  dashboardStore.selectProfile(slot.profile.position)
}

const getInitials = (name: string) => {
  const parts = name.trim().split(/\s+/)
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + (parts[1] ? parts[1][0] : '')).toUpperCase()
}

const handleSlotContextMenu = async (slot: { position: number; profile: HouseholdProfile | null }) => {
  if (!slot.profile) return
  if (!isOwner.value) return

  if (!loginCode.value || !inventoryId.value) {
    window.alert('Missing login information. Please try again later.')
    return
  }

  const currentName = slot.profile.profileName
  const nextName = window.prompt('Rename profile', currentName)
  if (!nextName || nextName.trim().length === 0 || nextName.trim() === currentName) {
    return
  }

  try {
    await dashboardStore.renameProfile(loginCode.value, inventoryId.value, slot.profile.position, nextName.trim())
  } catch (err) {
    console.error('Failed to rename profile', err)
    window.alert(err instanceof Error ? err.message : 'Failed to rename profile')
  }
}

watch(
  () => authStore.user,
  async (newUser) => {
    // Whenever user becomes available, force reload fresh data
    if (newUser) {
      await nextTick()
      await loadInventory()
    } else {
      // Optionally clear per-session impact when logging out
      sessionSharedImpact.value = { money: 0, co2: 0, items: 0 }
      sessionPrivateImpact.value = {}
    }
  },
  { immediate: true }
)

onMounted(async () => {
  if (authStore.user) {
    await loadInventory()
  }
})
</script>

<style scoped>
.dashboard-view {
  padding: var(--spacing-md);
  min-height: 100vh;
  background: transparent;
}

.dashboard-header {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-sm);
  color: white;
  margin-bottom: var(--spacing-xl);
}

.header-main {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: var(--spacing-lg);
}

.header-text h1 {
  font-size: var(--font-size-xxl);
  font-weight: var(--font-weight-bold);
  margin: 0 0 var(--spacing-xs) 0;
}

.subtitle {
  color: rgba(255, 255, 255, 0.75);
  margin: 0;
}

.user-switch-stack {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: var(--spacing-sm);
}

.user-switch {
  display: flex;
  gap: var(--spacing-sm);
}

.user-switch__button {
  width: 44px;
  height: 44px;
  border-radius: 50%;
  border: 1px solid rgba(255, 255, 255, 0.4);
  background: rgba(255, 255, 255, 0.1);
  color: white;
  font-size: var(--font-size-base);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all var(--duration-fast) ease;
}

.user-switch__button:hover {
  background: rgba(255, 255, 255, 0.2);
  transform: translateY(-1px);
}

.user-switch__button--active {
  background: var(--color-primary);
  border-color: var(--color-primary-600);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
}

.user-switch__button--placeholder {
  background: rgba(255, 255, 255, 0.05);
  border-style: dashed;
  font-size: var(--font-size-lg);
}

.header-info__text {
  color: rgba(255, 255, 255, 0.75);
  font-size: var(--font-size-sm);
}

.dashboard-main {
  max-width: 1100px;
  margin: 0 auto;
}

.dashboard-content {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-xl);
}

.dashboard-section {
  padding: var(--spacing-xl);
  background: rgba(255, 255, 255, 0.08);
  border-radius: var(--border-radius-xl);
  border: 1px solid rgba(255, 255, 255, 0.12);
  backdrop-filter: blur(12px);
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: var(--spacing-lg);
  flex-wrap: wrap;
  margin-bottom: var(--spacing-lg);
}

.section-title h2 {
  margin: 0 0 var(--spacing-xs) 0;
  color: white;
  font-size: var(--font-size-xl);
}

.section-subtext {
  margin: 0;
  color: rgba(255, 255, 255, 0.65);
  font-size: var(--font-size-sm);
}

.section-controls {
  display: flex;
  align-items: center;
  gap: var(--spacing-lg);
}

.inventory-add-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  border-radius: 50%;
  border: 1px solid rgba(255, 255, 255, 0.4);
  color: rgba(255, 255, 255, 0.9);
  background: transparent;
  text-decoration: none;
  font-size: 1.5rem;
  line-height: 1;
  transition: transform 0.2s ease, border-color 0.2s ease, color 0.2s ease;
}

.inventory-add-button:hover {
  transform: translateY(-2px);
  border-color: rgba(255, 255, 255, 0.7);
  color: #ffffff;
}

.inventory-add-button:focus-visible {
  outline: 2px solid var(--color-primary);
  outline-offset: 3px;
}


.impact-summary {
  display: flex;
  gap: var(--spacing-md);
  background: rgba(255, 255, 255, 0.08);
  border-radius: var(--border-radius-lg);
  padding: var(--spacing-sm) var(--spacing-md);
  border: 1px solid rgba(255, 255, 255, 0.12);
}

.local-filter {
  display: flex;
  gap: var(--spacing-xs);
}

.filter-chip {
  border: 1px solid rgba(255, 255, 255, 0.25);
  background: rgba(255, 255, 255, 0.08);
  color: white;
  border-radius: 16px;
  padding: 4px 10px;
  cursor: pointer;
  font-size: var(--font-size-sm);
}

.filter-chip.active {
  background: var(--color-primary);
  border-color: var(--color-primary-600);
}

.chip-badge {
  margin-left: 6px;
  background: rgba(0,0,0,0.25);
  border-radius: 10px;
  padding: 0 6px;
  font-size: 11px;
}

.impact-summary__item {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
}

.impact-label {
  font-size: var(--font-size-xs);
  text-transform: uppercase;
  color: rgba(255, 255, 255, 0.6);
}

.impact-value {
  font-size: var(--font-size-md);
  color: white;
  font-weight: var(--font-weight-semibold);
}

.inventory-content {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-lg);
}

.inventory-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
  gap: var(--spacing-lg);
}

.empty-section {
  text-align: center;
  padding: var(--spacing-xl);
  background: rgba(255, 255, 255, 0.06);
  border-radius: var(--border-radius-lg);
  border: 1px dashed rgba(255, 255, 255, 0.15);
  color: rgba(255, 255, 255, 0.8);
}

.empty-icon {
  font-size: 2.5rem;
  margin-bottom: var(--spacing-md);
}

.loading-container,
.error-container {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 200px;
}

.error-message {
  background: rgba(255, 255, 255, 0.08);
  border-radius: var(--border-radius-lg);
  padding: var(--spacing-xl);
  border: 1px solid rgba(255, 83, 112, 0.35);
  max-width: 480px;
  text-align: center;
}

.debug-info {
  text-align: left;
  background: rgba(255, 255, 255, 0.08);
  padding: var(--spacing-md);
  border-radius: var(--border-radius-md);
  margin: var(--spacing-md) 0;
}

.user-info {
  margin-top: var(--spacing-xl);
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: rgba(255, 255, 255, 0.08);
  padding: var(--spacing-md);
  border-radius: var(--border-radius-lg);
  border: 1px solid rgba(255, 255, 255, 0.12);
}

.login-code {
  color: rgba(255, 255, 255, 0.85);
}

.logout-btn {
  background: transparent;
  color: rgba(255, 255, 255, 0.85);
  border: 1px solid rgba(255, 255, 255, 0.4);
  padding: var(--spacing-xs) var(--spacing-md);
  border-radius: var(--border-radius-md);
  cursor: pointer;
  transition: all var(--duration-fast) ease;
}

.logout-btn:hover {
  background: rgba(255, 255, 255, 0.2);
}

.inventory-actions {
  display: inline-flex;
  align-items: center;
  gap: var(--spacing-sm);
}

.inventory-info-fab {
  position: relative;
  width: 36px;
  height: 36px;
  border-radius: 50%;
  border: 1px solid rgba(255, 255, 255, 0.4);
  background: transparent;
  color: rgba(255, 255, 255, 0.85);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: var(--font-size-md);
  font-weight: var(--font-weight-semibold);
  cursor: pointer;
  user-select: none;
  transition: border-color var(--duration-fast) ease, color var(--duration-fast) ease;
}

.inventory-info-fab:focus-visible {
  outline: 2px solid rgba(255, 255, 255, 0.85);
  outline-offset: 3px;
}

.inventory-info-fab:hover,
.inventory-info-fab:focus-visible {
  border-color: rgba(255, 255, 255, 0.85);
  color: #ffffff;
}

.inventory-info-fab__tooltip {
  position: absolute;
  top: calc(100% + var(--spacing-sm));
  right: 0;
  max-width: 280px;
  padding: var(--spacing-sm) var(--spacing-md);
  background: rgba(17, 24, 39, 0.92);
  color: rgba(255, 255, 255, 0.92);
  border-radius: var(--border-radius-md);
  border: 1px solid rgba(255, 255, 255, 0.15);
  font-size: var(--font-size-xs);
  line-height: 1.4;
  opacity: 0;
  pointer-events: none;
  transform: translateY(-4px);
  transition: opacity var(--duration-fast) ease, transform var(--duration-fast) ease;
  box-shadow: 0 8px 16px rgba(15, 23, 42, 0.35);
  text-align: left;
  white-space: normal;
}

.inventory-info-fab:hover .inventory-info-fab__tooltip,
.inventory-info-fab:focus-visible .inventory-info-fab__tooltip {
  opacity: 1;
  transform: translateY(0);
}
@media (max-width: 768px) {
  .dashboard-view {
    padding: var(--spacing-sm);
  }

  .user-switch-stack {
    align-items: flex-start;
  }

  .header-main {
    flex-direction: column;
    align-items: flex-start;
  }

  .section-header {
    flex-direction: column;
    align-items: flex-start;
  }

  .section-controls {
    flex-direction: column;
    align-items: stretch;
    width: 100%;
  }

  .impact-summary {
    width: 100%;
    justify-content: space-between;
  }

  .inventory-grid {
    grid-template-columns: 1fr;
  }

  .inventory-actions {
    align-self: flex-start;
  }
}
</style>
