<template>
  <div
    class="inventory-item"
    :class="[
      `inventory-item--${status}`,
      { 'inventory-item--swiping': isSwiping }
    ]"
    @touchstart="handleTouchStart"
    @touchmove="handleTouchMove"
    @touchend="handleTouchEnd"
    @touchcancel="handleTouchCancel"
  >
    <!-- Swipe action background -->
    <div class="inventory-item__swipe-action">
      <div class="inventory-item__swipe-icon">✓</div>
      <span class="inventory-item__swipe-text">Mark as Used</span>
    </div>

    <!-- Main item content -->
    <div class="inventory-item__content">
      <!-- Item info -->
      <div class="inventory-item__info">
        <h3 class="inventory-item__name">{{ item.name }}</h3>
        <div class="inventory-item__details">
          <span class="inventory-item__quantity">{{ formattedQuantity }}</span>
          <span class="inventory-item__category">{{ item.category }}</span>
        </div>
      </div>

      <!-- Expiry status -->
      <div class="inventory-item__expiry">
        <div class="freshness-indicator">
          <div
            class="freshness-indicator__dot"
            :class="`freshness-indicator__dot--${status}`"
          />
          <span
            class="freshness-indicator__text"
            :class="`freshness-indicator__text--${status}`"
          >
            {{ statusText }}
          </span>
        </div>
        <div class="inventory-item__expiry-date">
          {{ formattedExpiryDate }}
        </div>
      </div>

      <!-- Action button -->
      <button
        class="inventory-item__action btn btn--success btn--sm"
        type="button"
        :disabled="isLoading"
        @click="handleMarkAsUsed"
      >
        <span v-if="isLoading" class="loading" />
        <span v-else>Mark as Used</span>
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, toRef } from 'vue'
import { useSwipeGesture } from '@/composables/useSwipeGesture'
import { useExpiryStatus } from '@/composables/useExpiryStatus'
import { formatQuantity } from '@/utils/formatters'
import type { InventoryItem } from '@/api/inventory'

// Props
interface Props {
  item: InventoryItem
  isLoading?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  isLoading: false
})

// Emits
interface Emits {
  itemUsed: [itemId: string]
}

const emit = defineEmits<Emits>()

// Reactive refs for composables
const expiryDate = toRef(props.item, 'expiryDate')

// Use expiry status composable
const { status, statusText } = useExpiryStatus(expiryDate)

// Use swipe gesture composable
const { handleTouchStart, handleTouchMove, handleTouchEnd, handleTouchCancel, isSwiping } =
  useSwipeGesture(
    () => handleMarkAsUsed(), // onSwipeRight
    undefined, // onSwipeLeft (not used)
    { threshold: 80 } // Lower threshold for easier swiping
  )

// Computed properties
const formattedQuantity = computed(() => {
  return formatQuantity(props.item.quantity, props.item.unit)
})

const formattedExpiryDate = computed(() => {
  try {
    const date = new Date(props.item.expiryDate)
    return date.toLocaleDateString('en-AU', {
      day: 'numeric',
      month: 'short',
      year: date.getFullYear() !== new Date().getFullYear() ? 'numeric' : undefined
    })
  } catch (error) {
    console.error('Error formatting expiry date:', error)
    return 'Invalid date'
  }
})

// Methods
function handleMarkAsUsed() {
  if (props.isLoading) return
  emit('itemUsed', props.item.id)
}
</script>

<style scoped lang="scss">
.inventory-item {
  position: relative;
  background-color: var(--color-bg-primary);
  border: 1px solid var(--color-border-light);
  border-radius: var(--border-radius-lg);
  overflow: hidden;
  transition: all var(--duration-fast) ease;
  margin-bottom: var(--spacing-md);

  &:hover {
    box-shadow: var(--shadow-md);
  }

  // Status-based styling
  &--fresh {
    border-left: 4px solid var(--color-fresh);
  }

  &--warning {
    border-left: 4px solid var(--color-warning);
  }

  &--expired {
    border-left: 4px solid var(--color-expired);
  }

  // Swiping state
  &--swiping {
    transform: translateX(20px);
    transition: transform var(--duration-fast) ease;
  }

  &--swiping &__swipe-action {
    opacity: 1;
  }
}

// Swipe action background
.inventory-item__swipe-action {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: var(--color-fresh);
  display: flex;
  align-items: center;
  justify-content: flex-start;
  padding-left: var(--spacing-md);
  opacity: 0;
  transition: opacity var(--duration-fast) ease;
  z-index: 1;
}

.inventory-item__swipe-icon {
  font-size: var(--font-size-xl);
  color: var(--color-text-light);
  margin-right: var(--spacing-sm);
  font-weight: var(--font-weight-bold);
}

.inventory-item__swipe-text {
  color: var(--color-text-light);
  font-weight: var(--font-weight-semibold);
  font-size: var(--font-size-sm);
}

// Main content
.inventory-item__content {
  position: relative;
  z-index: 2;
  background-color: var(--color-bg-primary);
  padding: var(--spacing-md);
  display: grid;
  grid-template-columns: 1fr auto auto;
  gap: var(--spacing-md);
  align-items: center;
  transition: transform var(--duration-fast) ease;

  .inventory-item--swiping & {
    transform: translateX(20px);
  }
}

// Item info section
.inventory-item__info {
  min-width: 0; // Allow text truncation
}

.inventory-item__name {
  font-size: var(--font-size-base);
  font-weight: var(--font-weight-semibold);
  color: var(--color-text-primary);
  margin: 0 0 var(--spacing-xs) 0;
  line-height: var(--line-height-tight);
}

.inventory-item__details {
  display: flex;
  gap: var(--spacing-sm);
  font-size: var(--font-size-sm);
  color: var(--color-text-secondary);
}

.inventory-item__quantity {
  font-weight: var(--font-weight-medium);
}

.inventory-item__category {
  &::before {
    content: '•';
    margin-right: var(--spacing-xs);
  }
}

// Expiry section
.inventory-item__expiry {
  text-align: right;
  min-width: 0;
}

.inventory-item__expiry-date {
  font-size: var(--font-size-xs);
  color: var(--color-text-secondary);
  margin-top: var(--spacing-xs);
}

// Action button
.inventory-item__action {
  flex-shrink: 0;
  white-space: nowrap;
}

// Responsive design
@media (max-width: 480px) {
  .inventory-item__content {
    grid-template-columns: 1fr;
    gap: var(--spacing-sm);
    text-align: left;
  }

  .inventory-item__expiry {
    text-align: left;
    order: -1;
  }

  .inventory-item__action {
    justify-self: stretch;
  }

  .inventory-item__details {
    flex-wrap: wrap;
  }
}

// Accessibility improvements
@media (prefers-reduced-motion: reduce) {
  .inventory-item,
  .inventory-item__content,
  .inventory-item__swipe-action {
    transition: none;
  }

  .inventory-item--swiping {
    transform: none;
  }

  .inventory-item--swiping .inventory-item__content {
    transform: none;
  }
}

// High contrast mode
@media (prefers-contrast: high) {
  .inventory-item {
    border-width: 2px;
  }

  .inventory-item--fresh {
    border-left-width: 6px;
  }

  .inventory-item--warning {
    border-left-width: 6px;
  }

  .inventory-item--expired {
    border-left-width: 6px;
  }
}

// Focus styles for keyboard navigation
.inventory-item__action:focus {
  outline: 2px solid var(--color-primary);
  outline-offset: 2px;
}
</style>
