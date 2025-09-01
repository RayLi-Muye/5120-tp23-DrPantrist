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

const router = useRouter();
const inventoryStore = useInventoryStore();
const impactStore = useImpactStore();
const authStore = useAuthStore();

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
    const impact = await inventoryStore.markItemAsUsed(itemId);
    if (impact) {
      impactStore.showImpact(impact);
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

const retryLoad = async () => {
  if (authStore.user) {
    try {
      await inventoryStore.fetchInventory(authStore.user.id, true);
    } catch (error) {
      console.error("Failed to retry load:", error);
    }
  }
};

// Load inventory on mount
onMounted(async () => {
  if (authStore.user) {
    try {
      await inventoryStore.fetchInventory(authStore.user.id);
    } catch (error) {
      console.error("Failed to load inventory:", error);
    }
  }
});
</script>

<style scoped>
.inventory-view {
  padding: var(--spacing-md);
  min-height: 100vh;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}

.inventory-header {
  margin-bottom: var(--spacing-xl);
}

.back-button {
  background: rgba(255, 255, 255, 0.15);
  border: 1px solid rgba(255, 255, 255, 0.2);
  font-size: var(--font-size-base);
  color: white;
  cursor: pointer;
  padding: var(--spacing-sm) var(--spacing-md);
  border-radius: var(--border-radius-md);
  min-height: var(--touch-target-min);
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all var(--duration-fast) ease;
  backdrop-filter: blur(10px);
}

.back-button:hover {
  background: rgba(255, 255, 255, 0.2);
  transform: translateY(-1px);
}

.inventory-main {
  max-width: 1000px;
  margin: 0 auto;
}

/* Dashboard Section Styling */
.dashboard-section {
  background: white;
  border-radius: var(--border-radius-lg);
  padding: var(--spacing-xl);
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
  transition: transform 0.2s ease, box-shadow 0.2s ease;
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

.inventory-section {
  background: linear-gradient(135deg, #e3f2fd 0%, #f1f8ff 100%);
  border-left: 4px solid #007bff;
}

.inventory-filters {
  margin-bottom: var(--spacing-lg);
}

.loading-container,
.error-container {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 300px;
}

.error-message {
  text-align: center;
  padding: var(--spacing-lg);
  background: white;
  border-radius: var(--border-radius-lg);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.empty-state {
  text-align: center;
  padding: var(--spacing-xxl);
  background: white;
  border-radius: var(--border-radius-lg);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.empty-icon {
  font-size: 4rem;
  margin-bottom: var(--spacing-lg);
  opacity: 0.6;
}

.empty-state h2 {
  color: var(--color-text-primary);
  margin-bottom: var(--spacing-md);
}

.empty-state p {
  color: var(--color-text-secondary);
  margin-bottom: var(--spacing-lg);
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

.inventory-content {
  margin-top: var(--spacing-lg);
}

.inventory-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: var(--spacing-lg);
}

/* Mobile optimizations */
@media (max-width: 480px) {
  .inventory-view {
    padding: var(--spacing-sm);
  }

  .dashboard-section {
    padding: var(--spacing-lg);
  }

  .section-header h2 {
    font-size: var(--font-size-lg);
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
}

/* Tablet */
@media (min-width: 481px) and (max-width: 768px) {
  .inventory-grid {
    grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
  }
}

/* Tablet and desktop */
@media (min-width: 768px) {
  .inventory-main {
    max-width: 1200px;
  }

  .inventory-view {
    padding: var(--spacing-lg);
  }

  .dashboard-section {
    padding: var(--spacing-xxl);
  }
}

/* Desktop */
@media (min-width: 1200px) {
  .inventory-grid {
    grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
  }
}
</style>
