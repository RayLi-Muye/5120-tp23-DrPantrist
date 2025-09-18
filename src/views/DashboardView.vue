<template>
  <div class="dashboard-view">
    <header class="dashboard-header">
      <div class="header-content">
        <div class="header-left">
          <h1>{{ userDisplayName }}</h1>
          <p class="subtitle">Your Food Inventory Tracker</p>
        </div>

        <div class="header-center"></div>

        <div class="header-right">
          <div class="impact-cards">
            <div class="impact-card money-card">
              <div class="card-icon">💰</div>
              <div class="card-content">
                <div class="card-value">{{ formattedTotalImpact.totalMoneySaved }}</div>
                <div class="card-label">Saved</div>
              </div>
            </div>
            <div class="impact-card co2-card">
              <div class="card-icon">🌱</div>
              <div class="card-content">
                <div class="card-value">{{ formattedTotalImpact.totalCo2Avoided }}</div>
                <div class="card-label">CO₂ Reduced</div>
              </div>
            </div>
            <router-link to="/household" class="impact-card" style="text-decoration:none">
              <div class="card-icon">👥</div>
              <div class="card-content">
                <div class="card-value" style="font-size: var(--font-size-base);">Household</div>
                <div class="card-label">Manage</div>
              </div>
            </router-link>
          </div>
        </div>
      </div>
    </header>

    <main class="dashboard-main">
      <!-- Loading State -->
      <div v-if="inventoryStore.isLoading" class="loading-container">
        <LoadingState :visible="true" message="Loading your dashboard..." />
      </div>

      <!-- Error State -->
      <div v-else-if="inventoryStore.error" class="error-container">
        <div class="error-message">
          <h3>Failed to load dashboard</h3>
          <p><strong>Error:</strong> {{ inventoryStore.error }}</p>

          <!-- Debug Information -->
          <div v-if="isDevelopment()" class="debug-info" style="background: #f8f9fa; padding: 15px; border-radius: 5px; margin: 15px 0; text-align: left;">
            <h4>🔧 Debug Info:</h4>
            <p><strong>User:</strong> {{ authStore.user ? 'Authenticated' : 'Not authenticated' }}</p>
            <p v-if="authStore.user"><strong>Login Code:</strong> {{ authStore.user.loginCode || 'Missing' }}</p>
            <p v-if="authStore.user"><strong>User ID:</strong> {{ authStore.user.id }}</p>
            <p><strong>Loading:</strong> {{ inventoryStore.isLoading }}</p>
            <p><strong>Items Count:</strong> {{ inventoryStore.items.length }}</p>
            <p><strong>Last Fetch:</strong> {{ inventoryStore.lastFetch ? new Date(inventoryStore.lastFetch).toLocaleTimeString() : 'Never' }}</p>
          </div>

          <button @click="retryLoad" class="btn btn--primary">Retry</button>
        </div>
      </div>

      <!-- Dashboard Content -->
      <div v-else class="dashboard-content">
        <!-- Inventory Section -->
        <section class="dashboard-section inventory-section">
          <div class="inventory-filters">
            <InventoryFilter />
          </div>

          <!-- Empty State -->
          <div v-if="inventoryStore.items.length === 0" class="empty-state">
            <div class="empty-icon">📦</div>
            <router-link to="/add-item" class="btn btn--primary"> Add Your First Item </router-link>
          </div>

          <!-- Inventory Items (EPIC4 grouping) -->
          <div v-else class="inventory-content">
            <!-- Shared Section -->
            <div v-if="showSharedSection" class="section-block shared-section">
              <div class="section-header">
                <h2>Shared Inventory</h2>
                <p class="section-subtext">Visible to everyone in the household.</p>
              </div>
              <div v-if="sharedItems.length" class="inventory-grid">
                <InventoryItem
                  v-for="item in sharedItems"
                  :key="item.id"
                  :item="item"
                  :loading="loadingItemId === item.id"
                  @use="handleUseItem"
                />
              </div>
              <p v-else class="section-empty">No shared items yet.</p>
            </div>

            <!-- Private Sections per Member -->
            <div
              v-for="section in privateSections"
              :key="section.member.user_id"
              class="section-block private-section"
              :class="section.colorClass"
            >
              <div class="section-header">
                <h2>{{ section.heading }}</h2>
                <p v-if="section.readOnly" class="section-subtext">Read-only view</p>
              </div>
              <div v-if="section.items.length" class="inventory-grid">
                <InventoryItem
                  v-for="item in section.items"
                  :key="item.id"
                  :item="item"
                  :loading="loadingItemId === item.id"
                  :read-only="section.readOnly"
                  @use="handleUseItem"
                />
              </div>
              <p v-else class="section-empty">No private items yet.</p>
            </div>
          </div>
        </section>
      </div>
      <!-- User Info -->
      <div v-if="authStore.user" class="user-info">
        <span class="login-code">Code: {{ authStore.user.loginCode }}</span>
        <button @click="logout" class="logout-btn">Logout</button>
      </div>

      <!-- Development Info
      <div v-if="isDevelopment() && apiStatus" class="dev-info">
        <h3>Development Info</h3>
        <p>API Mode: {{ apiStatus.mode }}</p>
      </div> -->
    </main>

    <!-- Floating Add Button -->
    <QuickActions />
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref, computed, watch, nextTick } from "vue";
import { useRouter } from "vue-router";
import { useInventoryStore } from "@/stores/inventory";
import { useAuthStore } from "@/stores/auth";
import QuickActions from "@/components/common/QuickActions.vue";
import InventoryItem from "@/components/inventory/InventoryItem.vue";
import InventoryFilter from "@/components/inventory/InventoryFilter.vue";
import { useImpactStore } from "@/stores/impact";
import inventoryRoomsAPI from '@/api/inventory-rooms'
import { useInventoryAccess } from '@/composables/useInventoryAccess'
import type { InventoryItem as InventoryItemType } from '@/api/inventory'

import LoadingState from "@/components/common/LoadingState.vue";
import { isDevelopment } from "@/config/environment";

const router = useRouter();
const inventoryStore = useInventoryStore();
const authStore = useAuthStore();
const impactStore = useImpactStore();
const apiStatus = ref<{ mode: string } | null>(null);
const members = ref<Array<{ user_id: string; display_name: string; role: string }>>([])
const { markItemAsUsedUnified } = useInventoryAccess()

const userDisplayName = computed(() => {
  return authStore.user?.inventoryName || "Your Inventory";
});

const formattedTotalImpact = computed(() => impactStore.formattedTotalImpact);

// Local state for tracking loading states
const loadingItemId = ref<string | null>(null);

// EPIC4: grouping helpers using temporary visibility overrides
const householdMembers = computed(() => {
  if (members.value.length > 0) return members.value
  if (authStore.user) {
    return [{
      user_id: authStore.user.id,
      display_name: authStore.user.displayName,
      role: authStore.user.isOwner ? 'owner' : 'member'
    }]
  }
  return []
})

const visibilityForItem = (item: InventoryItemType) =>
  inventoryStore.getItemVisibility(item.id, item.visibility || 'shared')

const sharedItems = computed(() =>
  inventoryStore.items.filter(item => visibilityForItem(item) === 'shared')
)

const privateItemsMap = computed(() => {
  const map = new Map<string, InventoryItemType[]>()
  const includeShared = householdMembers.value.length <= 1
  const fallbackOwner = authStore.user?.id

  for (const member of householdMembers.value) {
    map.set(member.user_id, [])
  }

  for (const item of inventoryStore.items) {
    const visibility = visibilityForItem(item)
    const ownerId = item.ownerUserId || item.userId || fallbackOwner
    if (!ownerId) continue

    if (visibility === 'private' || (visibility === 'shared' && includeShared)) {
      if (!map.has(ownerId)) map.set(ownerId, [])
      map.get(ownerId)!.push(item)
    }
  }

  return map
})

const privateSectionPalette = ['private-theme-mint', 'private-theme-plum', 'private-theme-sand']

const privateSections = computed(() => householdMembers.value.map((member, index) => {
  const itemsForMember = privateItemsMap.value.get(member.user_id) ?? []
  const isCurrentUser = member.user_id === authStore.user?.id
  return {
    member,
    items: itemsForMember,
    colorClass: privateSectionPalette[index % privateSectionPalette.length],
    heading: isCurrentUser ? 'My Private Items' : `${member.display_name}'s Private Items`,
    readOnly: !isCurrentUser
  }
}))

const showSharedSection = computed(() => householdMembers.value.length > 1)

const retryLoad = async () => {
  inventoryStore.clearError();
  await loadInventory();
};

const loadInventory = async () => {
  if (!authStore.user) {
    console.error("No authenticated user found");
    // Set a clear error message instead of silently failing
    inventoryStore.error = "Authentication required. Please log in again.";
    return;
  }

  // Clear any previous errors
  inventoryStore.clearError();

  try {
    // Always use login_code based fetching if available (which it should be for all auth flows)
    if (authStore.user.loginCode) {
      console.log('🔄 Loading inventory using login_code:', authStore.user.loginCode);
      await inventoryStore.fetchInventoryByLoginCode(authStore.user.loginCode);
      // Fetch members for EPIC4 grouping
      try {
        members.value = await inventoryRoomsAPI.getInventoryMembersByLoginCode(authStore.user.loginCode)
      } catch (membersError) {
        console.warn('Failed to fetch members', membersError)
        members.value = authStore.user ? [{ user_id: authStore.user.id, display_name: authStore.user.displayName, role: authStore.user.isOwner ? 'owner' : 'member' }] : []
      }
    } else {
      console.warn('⚠️ No login_code found, falling back to legacy user ID method');
      await inventoryStore.fetchInventory(authStore.user.id);
    }
    // TODO: Impact endpoint not available in current backend
    // await impactStore.fetchTotalImpact(authStore.user.id);

    // Update API status for development display
    if (isDevelopment()) {
      // API status tracking removed
    }
  } catch (error) {
    console.error("Failed to load inventory:", error);
  }
};

const handleUseItem = async (itemId: string) => {
  if (!authStore.user) return;

  loadingItemId.value = itemId;

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
    } else if (consumedResponse) {
      console.warn('Item consumed but no impact data available', consumedResponse)
    }
  } catch (error) {
    console.error("Failed to mark item as used:", error);
  } finally {
    loadingItemId.value = null;
  }
};

const handleDeleteItem = async (itemId: string) => {
  if (!authStore.user) return;

  loadingItemId.value = itemId;

  try {
    await inventoryStore.deleteItem(itemId);
  } catch (error) {
    console.error("Failed to delete item:", error);
  } finally {
    loadingItemId.value = null;
  }
};

const logout = async () => {
  try {
    authStore.logout();
    // Force immediate redirect to auth page
    await router.replace("/auth");
  } catch (error) {
    console.error("Logout error:", error);
    // Fallback: force redirect anyway
    await router.replace("/auth");
  }
};

// Watch for auth state changes to handle async auth loading
watch(
  () => authStore.user,
  async (newUser, oldUser) => {
    // When user becomes available, load inventory
    if (newUser && !oldUser) {
      console.log('🔐 Auth state loaded, loading inventory...');
      await nextTick(); // Ensure DOM is ready
      await loadInventory();
    }
  },
  { immediate: true }
);

onMounted(async () => {
  // If user is already authenticated, load immediately
  if (authStore.user) {
    console.log('🚀 User already authenticated, loading inventory...');
    await loadInventory();
  } else {
    console.log('⏳ Waiting for auth state to load...');
  }
});
</script>

<style scoped>
.dashboard-view {
  padding: var(--spacing-md);
  min-height: 100vh;
  background: transparent;
}

.dashboard-header {
  color: white;
  margin-bottom: var(--spacing-xl);
}

.header-content {
  display: grid;
  grid-template-columns: 1fr auto 1fr;
  align-items: flex-start;
  gap: var(--spacing-lg);
  margin-bottom: var(--spacing-lg);
}

.header-left {
  justify-self: start;
}

.header-center {
  justify-self: center;
}

.header-right {
  justify-self: end;
}

.header-left h1 {
  font-size: var(--font-size-xxl);
  font-weight: var(--font-weight-bold);
  margin-bottom: var(--spacing-xs);
}

.subtitle {
  color: rgba(255, 255, 255, 0.8);
  font-size: var(--font-size-sm);
}

/* Navigation Bar */
.navigation-bar {
  display: flex;
  gap: var(--spacing-xs);
  background: rgba(255, 255, 255, 0.1);
  border-radius: var(--border-radius-lg);
  padding: var(--spacing-xs);
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.2);
}

.nav-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--spacing-xs);
  padding: var(--spacing-sm) var(--spacing-md);
  border-radius: var(--border-radius-md);
  text-decoration: none;
  color: rgba(255, 255, 255, 0.8);
  transition: all 0.3s ease;
  min-width: 60px;
}

.nav-item:hover {
  background: rgba(255, 255, 255, 0.15);
  color: white;
  transform: translateY(-1px);
}

.nav-item.active {
  background: rgba(255, 255, 255, 0.2);
  color: white;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.nav-icon {
  font-size: var(--font-size-lg);
}

.nav-label {
  font-size: var(--font-size-xs);
  font-weight: var(--font-weight-medium);
  text-align: center;
}

.impact-cards {
  display: flex;
  gap: var(--spacing-md);
}

.impact-card {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  padding: var(--spacing-md);
  background: rgba(255, 255, 255, 0.15);
  border-radius: var(--border-radius-lg);
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.2);
  min-width: 120px;
  transition: all 0.3s ease;
}

.impact-card:hover {
  background: rgba(255, 255, 255, 0.2);
  transform: translateY(-2px);
}

.money-card {
  border-left: 3px solid #ffd700;
}

.co2-card {
  border-left: 3px solid #28a745;
}

.card-icon {
  font-size: var(--font-size-lg);
  flex-shrink: 0;
}

.card-content {
  flex: 1;
  min-width: 0;
}

.card-value {
  font-size: var(--font-size-base);
  font-weight: var(--font-weight-bold);
  line-height: 1.2;
  color: white;
  word-break: break-word;
}

.card-label {
  font-size: var(--font-size-xs);
  color: rgba(255, 255, 255, 0.8);
  margin-top: 2px;
}

.user-info {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--spacing-md);
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
  max-width: 1400px;
  margin: 0 auto;
  width: 100%;
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

/* Dashboard Content */
.dashboard-content {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-xl);
}

.dashboard-section {
  background: white;
  border-radius: var(--border-radius-lg);
  padding: var(--spacing-lg);
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
  transition: transform 0.2s ease, box-shadow 0.2s ease;
  min-height: 400px;
}

.dashboard-section:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 30px rgba(0, 0, 0, 0.15);
}

.section-header {
  margin-bottom: var(--spacing-lg);
  text-align: center;
}

.section-header h2 {
  font-size: var(--font-size-xl);
  font-weight: var(--font-weight-bold);
  color: var(--color-text-primary);
  margin-bottom: var(--spacing-xs);
}

.section-subtitle {
  color: var(--color-text-secondary);
  font-size: var(--font-size-sm);
  margin: 0;
}

/* Section-specific styling */
.inventory-section {
  background: linear-gradient(135deg, #e3f2fd 0%, #f1f8ff 100%);
  border-left: 4px solid #007bff;
}

/* Inventory specific styles */
.inventory-filters {
  margin-bottom: var(--spacing-md);
}

.empty-state {
  text-align: center;
  padding: var(--spacing-xl);
  background: rgba(255, 255, 255, 0.5);
  border-radius: var(--border-radius-lg);
  margin-top: var(--spacing-md);
}

.empty-icon {
  font-size: 4rem;
  margin-bottom: var(--spacing-lg);
  opacity: 0.6;
}

.empty-state h3 {
  color: var(--color-text-primary);
  margin-bottom: var(--spacing-md);
  font-size: var(--font-size-lg);
}

.empty-state p {
  color: var(--color-text-secondary);
  margin-bottom: var(--spacing-lg);
}

.inventory-content {
  margin-top: var(--spacing-sm);
}

.inventory-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(380px, 1fr));
  gap: var(--spacing-xl);
  max-width: none;
}

/* EPIC4 sections */
.section-block { margin-bottom: var(--spacing-xl); }
.section-header {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 4px;
  margin-bottom: var(--spacing-sm);
}
.section-header h2 {
  margin: 0;
  color: var(--color-text-primary);
}
.section-subtext {
  margin: 0;
  font-size: 0.85rem;
  color: rgba(255, 255, 255, 0.65);
}
.section-empty {
  margin: 0;
  padding: var(--spacing-md);
  border-radius: var(--border-radius-md);
  background: rgba(255, 255, 255, 0.06);
  color: rgba(255, 255, 255, 0.7);
  text-align: center;
}
.shared-section,
.private-section {
  padding: var(--spacing-lg);
  border-radius: var(--border-radius-lg);
  border: 1px solid rgba(255, 255, 255, 0.1);
  background: rgba(15, 23, 42, 0.35);
  backdrop-filter: blur(8px);
}
.shared-section {
  border-left: 4px solid rgba(129, 140, 248, 0.8);
}
.private-theme-mint {
  border-left: 4px solid rgba(16, 185, 129, 0.9);
  background: rgba(16, 185, 129, 0.18);
}
.private-theme-plum {
  border-left: 4px solid rgba(192, 132, 252, 0.9);
  background: rgba(192, 132, 252, 0.18);
}
.private-theme-sand {
  border-left: 4px solid rgba(250, 204, 21, 0.85);
  background: rgba(250, 204, 21, 0.18);
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
@media (max-width: 768px) {
  .header-content {
    grid-template-columns: 1fr;
    justify-items: center;
    text-align: center;
    gap: var(--spacing-md);
  }

  .header-left,
  .header-center,
  .header-right {
    justify-self: center;
  }

  .impact-cards {
    justify-content: center;
  }

  .navigation-bar {
    order: 2;
  }

  .header-right {
    order: 3;
  }
}

@media (max-width: 480px) {
  .dashboard-view {
    padding: var(--spacing-sm);
  }

  .header-left h1 {
    font-size: var(--font-size-xl);
  }

  .user-info {
    flex-direction: column;
    gap: var(--spacing-sm);
  }

  .dashboard-section {
    padding: var(--spacing-lg);
  }

  .section-header h2 {
    font-size: var(--font-size-lg);
  }

  .dashboard-content {
    gap: var(--spacing-lg);
  }

  .impact-cards {
    flex-direction: column;
    gap: var(--spacing-sm);
  }

  .impact-card {
    min-width: auto;
    padding: var(--spacing-sm);
  }

  .card-value {
    font-size: var(--font-size-sm);
  }

  .inventory-grid {
    grid-template-columns: 1fr;
    gap: var(--spacing-md);
  }

  .empty-state {
    padding: var(--spacing-xl);
  }

  .empty-icon {
    font-size: 3rem;
  }

  .navigation-bar {
    gap: var(--spacing-xs);
    padding: var(--spacing-xs);
  }

  .nav-item {
    padding: var(--spacing-xs) var(--spacing-sm);
    min-width: 50px;
  }

  .nav-icon {
    font-size: var(--font-size-base);
  }

  .nav-label {
    font-size: 10px;
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

  .dashboard-content {
    gap: var(--spacing-xxl);
  }

  .dashboard-section {
    padding: var(--spacing-xxl);
  }
}

/* Tablet */
@media (min-width: 481px) and (max-width: 768px) {
  .inventory-grid {
    grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
    gap: var(--spacing-lg);
  }
}

/* Large screens */
@media (min-width: 1200px) {
  .dashboard-main {
    max-width: 1600px;
  }

  .inventory-grid {
    grid-template-columns: repeat(auto-fill, minmax(420px, 1fr));
    gap: var(--spacing-xxl);
  }
}
</style>
