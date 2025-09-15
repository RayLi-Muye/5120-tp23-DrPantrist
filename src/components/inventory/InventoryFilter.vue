<template>
  <div class="inventory-filter">
    <div class="filter-tabs">
      <button
        v-for="filter in filters"
        :key="filter.key"
        :class="[
          'filter-tab',
          { 'filter-tab--active': currentFilter === filter.key }
        ]"
        @click="handleFilterChange(filter.key)"
        :aria-pressed="currentFilter === filter.key"
      >
        <span class="filter-tab__label">{{ filter.label }}</span>
        <span
          v-if="filter.count > 0"
          :class="[
            'filter-tab__badge',
            `filter-tab__badge--${filter.key}`
          ]"
        >
          {{ filter.count }}
        </span>
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useInventoryStore, type FilterType } from '@/stores/inventory'

const inventoryStore = useInventoryStore()

// Current filter from store
const currentFilter = computed(() => inventoryStore.currentFilter)

// Filter options with counts
const filters = computed(() => {
  const counts = inventoryStore.inventoryCounts

  return [
    {
      key: 'all' as FilterType,
      label: 'All',
      count: counts.total
    },
    {
      key: 'fresh' as FilterType,
      label: 'Fresh',
      count: counts.fresh
    },
    {
      key: 'warning' as FilterType,
      label: 'Warning',
      count: counts.warning
    },
    {
      key: 'expired' as FilterType,
      label: 'Expired',
      count: counts.expired
    }
  ]
})

// Handle filter change
const handleFilterChange = (filter: FilterType) => {
  inventoryStore.updateFilter(filter)
}
</script>

<style scoped>
.inventory-filter {
  margin-bottom: var(--spacing-lg);
}

.filter-tabs {
  display: flex;
  gap: var(--spacing-xs);
  background: var(--color-bg-secondary);
  padding: var(--spacing-xs);
  border-radius: var(--border-radius-lg);
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;
}

.filter-tab {
  display: flex;
  align-items: center;
  gap: var(--spacing-xs);
  padding: var(--spacing-sm) var(--spacing-md);
  background: transparent;
  border: none;
  border-radius: var(--border-radius-md);
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-medium);
  color: var(--color-text-secondary);
  cursor: pointer;
  transition: all var(--duration-fast) ease;
  white-space: nowrap;
  min-height: var(--touch-target-min);
  position: relative;

  &:hover {
    background: var(--color-primary-100);
    color: var(--color-primary);
  }

  &:focus {
    outline: 2px solid var(--color-primary);
    outline-offset: 2px;
  }
}

.filter-tab--active {
  background: var(--color-primary);
  color: var(--color-text-light);

  &:hover {
    background: var(--color-primary-600);
  }

  .filter-tab__badge {
    background: rgba(255, 255, 255, 0.2);
    color: var(--color-text-light);
  }
}

.filter-tab__label {
  font-weight: var(--font-weight-medium);
}

.filter-tab__badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 20px;
  height: 20px;
  padding: 0 var(--spacing-xs);
  background: var(--color-bg-tertiary);
  color: var(--color-text-primary);
  font-size: var(--font-size-xs);
  font-weight: var(--font-weight-semibold);
  border-radius: 10px;
  line-height: 1;
}

/* Color-coded badges for different filter types */
.filter-tab__badge--fresh {
  background: var(--color-fresh);
  color: white;
}

.filter-tab__badge--warning {
  background: var(--color-warning);
  color: var(--color-text-primary);
}

.filter-tab__badge--expired {
  background: var(--color-expired);
  color: white;
}

.filter-tab__badge--all {
  background: var(--color-primary);
  color: white;
}

/* Active state overrides badge colors */
.filter-tab--active .filter-tab__badge {
  background: rgba(255, 255, 255, 0.2) !important;
  color: var(--color-text-light) !important;
}

/* Responsive Design */
@media (max-width: 480px) {
  .filter-tabs {
    gap: 2px;
    padding: 2px;
  }

  .filter-tab {
    padding: var(--spacing-xs) var(--spacing-sm);
    font-size: var(--font-size-xs);
    min-width: 0;
    flex: 1;
  }

  .filter-tab__badge {
    min-width: 18px;
    height: 18px;
    font-size: 10px;
  }
}

/* Ensure horizontal scrolling works on mobile */
@media (max-width: 360px) {
  .filter-tabs {
    justify-content: flex-start;
  }

  .filter-tab {
    flex: none;
    min-width: fit-content;
  }
}
</style>
