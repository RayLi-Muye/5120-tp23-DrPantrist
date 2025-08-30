<template>
  <div class="quick-actions">
    <div class="actions-grid">
      <!-- Primary Action: Add Item -->
      <router-link
        to="/add-item"
        class="action-button action-button--primary"
      >
        <div class="action-button__icon">➕</div>
        <div class="action-button__content">
          <div class="action-button__title">Add Item</div>
          <div class="action-button__subtitle">Log new food</div>
        </div>
      </router-link>

      <!-- Secondary Actions -->
      <button
        class="action-button action-button--secondary"
        @click="viewExpiringItems"
        :disabled="expiringCount === 0"
      >
        <div class="action-button__icon">⚠️</div>
        <div class="action-button__content">
          <div class="action-button__title">Expiring Soon</div>
          <div class="action-button__subtitle">
            {{ expiringCount }} item{{ expiringCount !== 1 ? 's' : '' }}
          </div>
        </div>
      </button>

      <router-link
        to="/inventory"
        class="action-button action-button--secondary"
      >
        <div class="action-button__icon">📋</div>
        <div class="action-button__content">
          <div class="action-button__title">View All</div>
          <div class="action-button__subtitle">Full inventory</div>
        </div>
      </router-link>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { useInventoryStore } from '@/stores/inventory'

const router = useRouter()
const inventoryStore = useInventoryStore()

const expiringCount = computed(() => {
  return inventoryStore.itemsExpiringSoon.length
})

const viewExpiringItems = () => {
  if (expiringCount.value > 0) {
    // Set filter to show warning items (which includes both warning and expired)
    inventoryStore.updateFilter('warning')
    router.push('/inventory')
  }
}
</script>

<style scoped>
.quick-actions {
  margin-bottom: var(--spacing-lg);
}

.actions-grid {
  display: grid;
  gap: var(--spacing-md);
  grid-template-columns: 1fr;
}

@media (min-width: 576px) {
  .actions-grid {
    grid-template-columns: 1fr 1fr;
  }

  .action-button--primary {
    grid-column: 1 / -1;
  }
}

@media (min-width: 768px) {
  .actions-grid {
    grid-template-columns: 2fr 1fr 1fr;
  }

  .action-button--primary {
    grid-column: 1;
  }
}

.action-button {
  display: flex;
  align-items: center;
  gap: var(--spacing-md);
  padding: var(--spacing-lg);
  border-radius: 12px;
  text-decoration: none;
  border: none;
  cursor: pointer;
  transition: all 0.2s ease;
  min-height: 80px;
  font-family: inherit;
  text-align: left;
  background: var(--color-bg-primary);
  color: inherit;
}

.action-button:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.action-button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.action-button--primary {
  background: var(--color-primary);
  color: white;
  font-weight: 600;
}

.action-button--primary:hover {
  background: #0056b3;
}

.action-button--secondary {
  background: var(--color-bg-primary);
  border: 2px solid var(--color-border-light, #e9ecef);
}

.action-button--secondary:hover:not(:disabled) {
  border-color: var(--color-primary);
}

.action-button__icon {
  font-size: 1.5rem;
  flex-shrink: 0;
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 8px;
}

.action-button--secondary .action-button__icon {
  background: var(--color-bg-secondary, #f8f9fa);
}

.action-button__content {
  flex: 1;
  min-width: 0;
}

.action-button__title {
  font-size: var(--font-size-base);
  font-weight: 600;
  margin-bottom: var(--spacing-xs);
  line-height: 1.2;
}

.action-button__subtitle {
  font-size: var(--font-size-sm);
  opacity: 0.8;
  line-height: 1.2;
}

/* Ensure minimum touch target size */
@media (max-width: 575px) {
  .action-button {
    min-height: 64px;
    padding: var(--spacing-md);
  }

  .action-button__icon {
    width: 36px;
    height: 36px;
    font-size: 1.25rem;
  }

  .action-button__title {
    font-size: var(--font-size-sm);
  }

  .action-button__subtitle {
    font-size: var(--font-size-xs);
  }
}

/* Focus styles for accessibility */
.action-button:focus {
  outline: 2px solid var(--color-primary);
  outline-offset: 2px;
}

.action-button:focus:not(:focus-visible) {
  outline: none;
}
</style>
