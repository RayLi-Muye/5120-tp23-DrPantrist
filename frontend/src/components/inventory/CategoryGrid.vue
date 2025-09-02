<template>
  <div class="category-grid">
    <div class="category-items">
      <button
        v-for="category in categories"
        :key="category.name"
        @click="selectCategory(category)"
        class="category-item"
        :aria-label="`Select ${category.name} category`"
      >
        <div class="category-icon">{{ category.icon }}</div>
        <div class="category-name">{{ category.name }}</div>
        <div class="category-count">{{ category.count }} items</div>
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
export interface CategoryInfo {
  name: string
  icon: string
  count: number
}

interface Props {
  categories: CategoryInfo[]
}

interface Emits {
  (e: 'category-selected', category: CategoryInfo): void
}

defineProps<Props>()
const emit = defineEmits<Emits>()

const selectCategory = (category: CategoryInfo) => {
  emit('category-selected', category)
}
</script>

<style scoped>
.category-grid {
  padding: var(--spacing-md);
}

.category-items {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: var(--spacing-md);
  max-width: 600px;
  margin: 0 auto;
}

.category-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: var(--spacing-lg);
  background: rgba(255, 255, 255, 0.9);
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-radius: 16px;
  cursor: pointer;
  transition: all 0.3s ease;
  min-height: 120px;
  text-align: center;
  backdrop-filter: blur(10px);
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);

  /* Touch target optimization */
  min-width: 44px;
  min-height: 44px;
}

.category-item:hover {
  border-color: rgba(255, 255, 255, 0.6);
  background: rgba(255, 255, 255, 0.95);
  transform: translateY(-4px);
  box-shadow: 0 8px 30px rgba(0, 0, 0, 0.15);
}

.category-item:active {
  transform: translateY(-2px);
  box-shadow: 0 6px 25px rgba(0, 0, 0, 0.2);
}

.category-icon {
  font-size: 3rem;
  margin-bottom: var(--spacing-sm);
  line-height: 1;
}

.category-name {
  font-weight: 600;
  font-size: var(--font-size-base);
  color: var(--color-text-primary);
  margin-bottom: var(--spacing-xs);
  line-height: 1.2;
}

.category-count {
  font-size: var(--font-size-sm);
  color: var(--color-text-secondary);
  font-weight: 500;
}

/* Mobile-first responsive adjustments */
@media (max-width: 374px) {
  .category-items {
    grid-template-columns: 1fr;
    gap: var(--spacing-sm);
  }

  .category-item {
    padding: var(--spacing-md);
    min-height: 100px;
  }

  .category-icon {
    font-size: 2.5rem;
  }

  .category-name {
    font-size: var(--font-size-sm);
  }

  .category-count {
    font-size: var(--font-size-xs);
  }
}

/* Standard mobile (375px - 575px) */
@media (min-width: 375px) and (max-width: 575px) {
  .category-items {
    gap: var(--spacing-sm);
  }

  .category-item {
    padding: var(--spacing-md);
    min-height: 110px;
  }

  .category-icon {
    font-size: 2.75rem;
  }

  .category-name {
    font-size: var(--font-size-sm);
  }
}

/* Large mobile and tablet (576px+) */
@media (min-width: 576px) {
  .category-items {
    grid-template-columns: repeat(3, 1fr);
    gap: var(--spacing-md);
    max-width: 700px;
  }

  .category-item {
    min-height: 130px;
  }
}

/* Desktop (768px+) */
@media (min-width: 768px) {
  .category-items {
    grid-template-columns: repeat(4, 1fr);
    max-width: 800px;
    gap: var(--spacing-lg);
  }

  .category-item {
    min-height: 140px;
    padding: var(--spacing-xl);
  }

  .category-icon {
    font-size: 3.5rem;
  }

  .category-name {
    font-size: var(--font-size-lg);
  }

  .category-count {
    font-size: var(--font-size-base);
  }
}
</style>
