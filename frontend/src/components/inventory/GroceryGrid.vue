<template>
  <div class="grocery-grid">
    <div class="grocery-items">
      <button
        v-for="item in groceries"
        :key="item.id"
        @click="selectItem(item)"
        class="grocery-item"
        :aria-label="`Select ${item.name}`"
      >
        <div class="item-icon">{{ item.icon }}</div>
        <div class="item-name">{{ item.name }}</div>
        <div class="item-category">{{ item.category }}</div>
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { GroceryItem } from '@/stores/groceries'

interface Props {
  groceries: GroceryItem[]
}

interface Emits {
  (e: 'item-selected', item: GroceryItem): void
}

defineProps<Props>()
const emit = defineEmits<Emits>()

const selectItem = (item: GroceryItem) => {
  emit('item-selected', item)
}
</script>

<style scoped>
.grocery-grid {
  padding: var(--spacing-md);
}

.grocery-items {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: var(--spacing-md);
  max-width: 600px;
  margin: 0 auto;
}

.grocery-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: var(--spacing-md);
  background: var(--color-bg-primary);
  border: 2px solid var(--color-bg-secondary);
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.2s ease;
  min-height: 120px;
  text-align: center;

  /* Touch target optimization */
  min-width: 44px;
  min-height: 44px;
}

.grocery-item:hover {
  border-color: var(--color-primary);
  background: var(--color-bg-secondary);
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 123, 255, 0.15);
}

.grocery-item:active {
  transform: translateY(0);
  box-shadow: 0 2px 8px rgba(0, 123, 255, 0.2);
}

.item-icon {
  font-size: 2.5rem;
  margin-bottom: var(--spacing-sm);
  line-height: 1;
}

.item-name {
  font-weight: 500;
  font-size: var(--font-size-sm);
  color: var(--color-primary);
  margin-bottom: var(--spacing-xs);
  line-height: 1.2;
}

.item-category {
  font-size: var(--font-size-xs);
  color: var(--color-secondary);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

/* Responsive adjustments */
@media (max-width: 576px) {
  .grocery-items {
    gap: var(--spacing-sm);
  }

  .grocery-item {
    padding: var(--spacing-sm);
    min-height: 100px;
  }

  .item-icon {
    font-size: 2rem;
  }

  .item-name {
    font-size: var(--font-size-xs);
  }
}

@media (max-width: 400px) {
  .grocery-items {
    grid-template-columns: repeat(2, 1fr);
  }

  .grocery-item {
    min-height: 110px;
  }
}
</style>
