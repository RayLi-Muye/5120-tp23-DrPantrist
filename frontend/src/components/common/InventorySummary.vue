<template>
  <div class="inventory-summary">
    <div class="summary-grid">
      <div
        v-for="card in summaryCards"
        :key="card.type"
        class="summary-card"
        :class="[`summary-card--${card.type}`, { 'summary-card--clickable': card.count > 0 }]"
        @click="handleCardClick(card.type)"
      >
        <div class="summary-card__icon">
          {{ card.icon }}
        </div>
        <div class="summary-card__content">
          <div class="summary-card__count">{{ card.count }}</div>
          <div class="summary-card__label">{{ card.label }}</div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { useInventoryStore, type FilterType } from '@/stores/inventory'

interface SummaryCard {
  type: FilterType
  icon: string
  label: string
  count: number
}

const router = useRouter()
const inventoryStore = useInventoryStore()

const summaryCards = computed((): SummaryCard[] => {
  const counts = inventoryStore.inventoryCounts

  return [
    {
      type: 'fresh',
      icon: '🟢',
      label: 'Fresh',
      count: counts.fresh
    },
    {
      type: 'warning',
      icon: '🟡',
      label: 'Warning',
      count: counts.warning
    },
    {
      type: 'expired',
      icon: '🔴',
      label: 'Expired',
      count: counts.expired
    }
  ]
})

const handleCardClick = (filterType: FilterType) => {
  const card = summaryCards.value.find(c => c.type === filterType)
  if (card && card.count > 0) {
    // Set the filter in the store
    inventoryStore.updateFilter(filterType)
    // Navigate to inventory view
    router.push('/inventory')
  }
}
</script>

<style scoped>
.inventory-summary {
  margin-bottom: var(--spacing-lg);
}

.summary-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--spacing-md);
}

@media (min-width: 768px) {
  .summary-grid {
    grid-template-columns: 1fr 1fr 1fr;
  }
}

.summary-card {
  background: var(--color-bg-primary);
  border-radius: 12px;
  padding: var(--spacing-lg);
  text-align: center;
  border: 2px solid transparent;
  transition: all 0.2s ease;
  min-height: 120px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: var(--spacing-sm);
}

.summary-card--clickable {
  cursor: pointer;
}

.summary-card--clickable:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.summary-card--fresh {
  border-color: var(--color-fresh);
  background: rgba(40, 167, 69, 0.05);
}

.summary-card--fresh.summary-card--clickable:hover {
  border-color: var(--color-fresh);
  background: rgba(40, 167, 69, 0.1);
}

.summary-card--warning {
  border-color: var(--color-warning);
  background: rgba(255, 193, 7, 0.05);
}

.summary-card--warning.summary-card--clickable:hover {
  border-color: var(--color-warning);
  background: rgba(255, 193, 7, 0.1);
}

.summary-card--expired {
  border-color: var(--color-expired);
  background: rgba(220, 53, 69, 0.05);
}

.summary-card--expired.summary-card--clickable:hover {
  border-color: var(--color-expired);
  background: rgba(220, 53, 69, 0.1);
}

.summary-card__icon {
  font-size: 2rem;
  margin-bottom: var(--spacing-xs);
}

.summary-card__content {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--spacing-xs);
}

.summary-card__count {
  font-size: var(--font-size-xl);
  font-weight: 600;
  color: var(--color-text-primary);
}

.summary-card__label {
  font-size: var(--font-size-sm);
  color: var(--color-text-secondary);
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

/* Ensure touch targets are at least 44px */
@media (max-width: 767px) {
  .summary-card {
    min-height: 100px;
    padding: var(--spacing-md);
  }

  .summary-card__icon {
    font-size: 1.5rem;
  }

  .summary-card__count {
    font-size: var(--font-size-lg);
  }
}
</style>
