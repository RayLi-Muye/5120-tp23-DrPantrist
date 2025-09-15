<template>
  <div class="inventory-view">
    <header class="inventory-header">
      <button @click="goBack" class="back-button" aria-label="Go back">← Back</button>
    </header>

    <main class="inventory-main">
      <section class="dashboard-section inventory-section">
        <div class="section-header">
          <h2>Inventory Overview</h2>
          <p class="section-subtitle">Keep track of your items</p>
        </div>

        <!-- Filter Section -->
        <div class="inventory-filters">
          <InventoryFilter />
        </div>

        <!-- Loading State -->
        <div v-if="inventoryStore.isLoading" class="loading-container">
          <LoadingState :visible="true" message="Loading your inventory..." />
        </div>

        <!-- Error State -->
        <div v-else-if="inventoryStore.error" class="error-container">
          <div class="error-message">
            <p>{{ inventoryStore.error }}</p>
            <button @click="retryLoad" class="btn btn--primary">Retry</button>
          </div>
        </div>

        <!-- Empty State -->
        <div v-else-if="inventoryStore.items.length === 0" class="empty-state">
          <div class="empty-icon">📦</div>
          <h2>No items in your inventory</h2>
          <p>Start by adding some groceries to track</p>
          <router-link to="/add-item" class="btn btn--primary"> Add Your First Item </router-link>
        </div>

        <!-- Inventory Items -->
        <div v-else class="inventory-content">
          <div class="inventory-grid">
            <InventoryItem
              v-for="item in inventoryStore.items"
              :key="item.id"
              :item="item"
              :loading="loadingItemId === item.id"
              @use="handleUseItem"
              @delete="handleDeleteItem"
            />
          </div>
        </div>
      </section>
    </main>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from "vue";
import { useRouter } from "vue-router";
import InventoryItem from "@/components/inventory/InventoryItem.vue";
import InventoryFilter from "@/components/inventory/InventoryFilter.vue";
import LoadingState from "@/components/common/LoadingState.vue";
import { useInventoryStore } from "@/stores/inventory";
import { useImpactStore } from "@/stores/impact";
import { useAuthStore } from "@/stores/auth";
import { useInventoryAccess } from "@/composables/useInventoryAccess";
import { logger } from "@/utils/logger";

const router = useRouter();
const inventoryStore = useInventoryStore();
const impactStore = useImpactStore();
const authStore = useAuthStore();
const { loadInventory, markItemAsUsedUnified, deleteInventoryItem } = useInventoryAccess();

// Local state for tracking loading states
const loadingItemId = ref<string | null>(null);

const goBack = () => {
  if (window.history.length > 1) {
    router.back();
  } else {
    router.push("/dashboard");
  }
};

const handleUseItem = async (itemId: string) => {
  if (!authStore.user) return;

  loadingItemId.value = itemId;

  try {
    const { impact, consumedResponse } = await markItemAsUsedUnified(itemId);
    if (impact) {
      impactStore.showImpact(impact);
    } else if (consumedResponse) {
      // Show a simple impact toast since consume endpoint does not return impact
      const mockImpact = {
        itemId,
        itemName: 'Item',
        moneySaved: 2.5,
        co2Avoided: 0.5,
        actionType: 'used' as const,
        timestamp: new Date().toISOString()
      };
      impactStore.showImpact(mockImpact);
    }
  } catch (error) {
    logger.error("Failed to mark item as used", error);
  } finally {
    loadingItemId.value = null;
  }
};

const handleDeleteItem = async (itemId: string) => {
  if (!authStore.user) return;

  loadingItemId.value = itemId;

  try {
    await deleteInventoryItem(itemId);
  } catch (error) {
    logger.error("Failed to delete item", error);
  } finally {
    loadingItemId.value = null;
  }
};

const retryLoad = async () => {
  if (!authStore.user) return;
  try {
    await loadInventory(true);
  } catch (error) {
    logger.error("Failed to retry load", error);
  }
};

// Load inventory on mount
onMounted(async () => {
  if (!authStore.user) return;
  try {
    await loadInventory();
  } catch (error) {
    logger.error("Failed to load inventory", error);
  }
});
</script>

<style scoped>
.inventory-view { min-height: 100vh; background: transparent; padding: var(--spacing-md); }
.inventory-main { max-width: 1100px; margin: 0 auto; }
</style>
