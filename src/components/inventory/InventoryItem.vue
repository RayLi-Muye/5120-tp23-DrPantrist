<template>
  <div
    class="inventory-item"
    :class="[
      `inventory-item--${status}`,
      {
        'inventory-item--swiping': isSwiping,
        'inventory-item--swipe-active': isSwipeActive
      }
    ]"
    @touchstart="handleTouchStart"
    @touchmove="handleTouchMove"
    @touchend="handleTouchEnd"
    @touchcancel="handleTouchCancel"
  >
    <!-- Enhanced swipe action background with progress -->
    <div
      class="inventory-item__swipe-action"
      :style="{
        opacity: isSwipeActive ? Math.min(swipeProgressPercent / 50, 1) : 0,
        transform: `translateX(-${100 - Math.min(swipeProgressPercent, 100)}%)`
      }"
    >
      <div class="inventory-item__swipe-content">
        <div class="inventory-item__swipe-icon">
          <span v-if="swipeProgressPercent < 100">✓</span>
          <span v-else class="inventory-item__swipe-icon--complete">🎉</span>
        </div>
        <span class="inventory-item__swipe-text">
          {{ swipeProgressPercent >= 100 ? 'Release to mark as used!' : 'Swipe to mark as used' }}
        </span>
      </div>

      <!-- Progress indicator -->
      <div
        class="inventory-item__swipe-progress"
        :style="{ width: `${swipeProgressPercent}%` }"
      />
    </div>

    <!-- Main item content with swipe transform -->
    <div
      class="inventory-item__content"
      :style="{
        transform: isSwipeActive ? `translateX(${Math.min(swipeProgressPercent * 0.3, 30)}px)` : 'translateX(0)'
      }"
    >
      <!-- Action button in top-right corner -->
      <button
        class="inventory-item__action-button"
        type="button"
        :disabled="isLoading"
        @click="handleMarkAsUsed"
        title="Mark as Used"
      >
        <span v-if="isLoading" class="loading-spinner">⟳</span>
        <span v-else>✓</span>
      </button>

      <!-- Item content -->
      <div class="inventory-item__main">
        <!-- Item name - full width row -->
        <h3 class="inventory-item__name">{{ item.name }}</h3>
        
        <!-- Item details - horizontal row with consistent spacing -->
        <div class="inventory-item__details">
          <span class="inventory-item__detail">
            <span class="detail-label">Qty:</span>
            <span class="detail-value">{{ formattedQuantity }}</span>
          </span>
          <span class="inventory-item__detail">
            <span class="detail-label">Category:</span>
            <span class="detail-value">{{ item.category }}</span>
          </span>
          <span class="inventory-item__detail">
            <span class="detail-label">Expires:</span>
            <span class="detail-value">{{ formattedExpiryDate }}</span>
          </span>
          <span class="inventory-item__detail inventory-item__detail--status">
            <div
              class="freshness-indicator__dot"
              :class="`freshness-indicator__dot--${status}`"
            />
            <span
              class="detail-value"
              :class="`freshness-indicator__text--${status}`"
            >
              {{ statusText }}
            </span>
          </span>
        </div>
      </div>
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
  readOnly?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  isLoading: false,
  readOnly: false
})

// Emits
interface Emits {
  use: [itemId: string]
}

const emit = defineEmits<Emits>()

// Reactive refs for composables
const expiryDate = toRef(props.item, 'expiryDate')

// Use expiry status composable
const { status, statusText } = useExpiryStatus(expiryDate)

// Use enhanced swipe gesture composable with visual feedback
const {
  handleTouchStart,
  handleTouchMove,
  handleTouchEnd,
  handleTouchCancel,
  isSwiping,
  swipeProgress,
  swipeProgressPercent,
  isSwipeActive
} = useSwipeGesture(
  () => handleMarkAsUsed(), // onSwipeRight
  undefined, // onSwipeLeft (not used)
  {
    threshold: 80, // Lower threshold for easier swiping
    velocityThreshold: 0.2, // Lower velocity requirement
    feedbackThreshold: 15 // Start feedback earlier
  }
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
  if (props.isLoading || props.readOnly) return
  emit('use', props.item.id)
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

  // Swiping states
  &--swiping {
    // Remove automatic transform - now handled by dynamic styles
  }

  &--swipe-active {
    // Add subtle shadow during active swipe
    box-shadow: var(--shadow-md);
  }
}

// Enhanced swipe action background
.inventory-item__swipe-action {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: linear-gradient(90deg, var(--color-fresh) 0%, #20c997 100%);
  display: flex;
  align-items: center;
  justify-content: flex-start;
  opacity: 0;
  z-index: 1;
  overflow: hidden;
  transition: opacity var(--duration-fast) ease;
}

.inventory-item__swipe-content {
  display: flex;
  align-items: center;
  padding-left: var(--spacing-md);
  z-index: 2;
  position: relative;
}

.inventory-item__swipe-icon {
  font-size: var(--font-size-xl);
  color: var(--color-text-light);
  margin-right: var(--spacing-sm);
  font-weight: var(--font-weight-bold);
  transition: transform var(--duration-fast) ease;

  &--complete {
    animation: bounce 0.3s ease;
  }
}

@keyframes bounce {
  0%, 20%, 60%, 100% {
    transform: translateY(0);
  }
  40% {
    transform: translateY(-10px);
  }
  80% {
    transform: translateY(-5px);
  }
}

.inventory-item__swipe-text {
  color: var(--color-text-light);
  font-weight: var(--font-weight-semibold);
  font-size: var(--font-size-sm);
  white-space: nowrap;
  transition: all var(--duration-fast) ease;
}

// Progress indicator
.inventory-item__swipe-progress {
  position: absolute;
  bottom: 0;
  left: 0;
  height: 3px;
  background-color: rgba(255, 255, 255, 0.8);
  transition: width var(--duration-fast) ease;
  border-radius: 0 2px 2px 0;
}

// Main content with enhanced swipe support
.inventory-item__content {
  position: relative;
  z-index: 2;
  background-color: var(--color-bg-primary);
  padding: var(--spacing-lg);
  min-height: 120px;
  transition: transform var(--duration-fast) ease;
  will-change: transform;
}

// Action button in top-right corner (Mac-style)
.inventory-item__action-button {
  position: absolute;
  top: var(--spacing-md);
  right: var(--spacing-md);
  width: 24px;
  height: 24px;
  border: none;
  border-radius: 50%;
  background: var(--color-success);
  color: white;
  font-size: 14px;
  font-weight: bold;
  cursor: pointer;
  transition: all var(--duration-fast) ease;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);
  z-index: 3;

  &:hover {
    transform: scale(1.1);
    background: #28a745;
    box-shadow: 0 2px 6px rgba(0, 0, 0, 0.3);
  }

  &:active {
    transform: scale(0.95);
  }

  &:disabled {
    background: var(--color-text-secondary);
    cursor: not-allowed;
    transform: none;
  }

  .loading-spinner {
    animation: spin 1s linear infinite;
  }
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

// Main content area (avoiding button area)
.inventory-item__main {
  padding-right: var(--spacing-xl); // Leave space for button
  display: flex;
  flex-direction: column;
  gap: var(--spacing-sm);
  height: 100%;
  justify-content: center;
}

// Item name - single row
.inventory-item__name {
  font-size: var(--font-size-base);
  font-weight: var(--font-weight-semibold);
  color: var(--color-text-primary);
  margin: 0;
  line-height: var(--line-height-tight);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

// Item details - horizontal row with consistent styling
.inventory-item__details {
  display: flex;
  flex-wrap: wrap;
  gap: var(--spacing-sm);
  align-items: center;
}

.inventory-item__detail {
  display: flex;
  align-items: center;
  gap: var(--spacing-xs);
  font-size: var(--font-size-sm);

  &--status {
    .freshness-indicator__dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      flex-shrink: 0;
    }
  }
}

.detail-label {
  color: var(--color-text-secondary);
  font-weight: var(--font-weight-medium);
  font-size: var(--font-size-sm);
}

.detail-value {
  color: var(--color-text-primary);
  font-weight: var(--font-weight-medium);
  font-size: var(--font-size-sm);
}

// Mobile responsive design
@media (max-width: 374px) {
  .inventory-item__content {
    padding: var(--spacing-md);
    min-height: 100px;
  }

  .inventory-item__action-button {
    top: var(--spacing-sm);
    right: var(--spacing-sm);
    width: 20px;
    height: 20px;
    font-size: 12px;
  }

  .inventory-item__main {
    padding-right: var(--spacing-lg);
  }

  .inventory-item__name {
    font-size: var(--font-size-sm);
  }

  .inventory-item__details {
    gap: var(--spacing-xs);
  }

  .detail-label,
  .detail-value {
    font-size: var(--font-size-xs);
  }
}

@media (min-width: 375px) and (max-width: 480px) {
  .inventory-item__details {
    flex-wrap: wrap;
    gap: var(--spacing-xs);
  }

  .detail-label,
  .detail-value {
    font-size: var(--font-size-sm);
  }
}

/* Large mobile and tablet optimizations */
@media (min-width: 481px) and (max-width: 767px) {
  .inventory-item__details {
    gap: var(--spacing-sm);
  }
}

/* Desktop optimizations */
@media (min-width: 768px) {
  .inventory-item__content {
    padding: var(--spacing-xl);
  }

  .inventory-item__name {
    font-size: var(--font-size-lg);
  }

  .detail-label,
  .detail-value {
    font-size: var(--font-size-base);
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
