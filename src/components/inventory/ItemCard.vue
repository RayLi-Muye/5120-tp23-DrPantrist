<template>
  <div
    ref="cardRef"
    class="item-card"
    :class="[`status-${status}`]"
    @mouseenter="showTooltip = true"
    @mouseleave="handleMouseLeave"
    @mousemove="handleMouseMove"
  >
    <button
      class="item-circle"
      type="button"
      :disabled="isDisabled"
      :aria-label="actionAriaLabel"
      @click="handleUse"
    >
      <span
        v-if="primaryIcon && primaryIcon.type === 'emoji'"
        class="item-emoji"
        aria-hidden="true"
      >
        {{ primaryIcon.value }}
      </span>
      <img
        v-else-if="primaryIcon"
        class="item-image"
        :src="primaryIcon.value"
        :alt="iconAltText"
        loading="lazy"
        decoding="async"
      />
      <span class="item-name">{{ item.name }}</span>
      <span v-if="isLoading" class="loader" aria-hidden="true"></span>
    </button>

    <Transition name="tooltip">
      <article
        v-if="showTooltip"
        class="item-tooltip"
        role="dialog"
        :style="tooltipStyle"
        @mouseenter="showTooltip = true"
        @mouseleave="handleMouseLeave"
      >
        <header class="tooltip-header">
          <div class="tooltip-title">
            <span
              v-if="primaryIcon && primaryIcon.type === 'emoji'"
              class="tooltip-emoji"
              aria-hidden="true"
            >
              {{ iconSymbol }}
            </span>
            <img
              v-else-if="primaryIcon"
              class="tooltip-image"
              :src="primaryIcon.value"
              :alt="iconAltText"
              loading="lazy"
              decoding="async"
            />
            <div>
              <h3>{{ item.name }}</h3>
              <p class="tooltip-category">{{ item.category }}</p>
            </div>
          </div>
          <button
            class="tooltip-action"
            type="button"
            :disabled="isDisabled"
            @click="handleUse"
            :aria-label="isExpired ? 'Expired items cannot be marked as used' : 'Mark as used'"
          >
            ✓
          </button>
        </header>

        <dl class="tooltip-grid">
          <div>
            <dt>Quantity</dt>
            <dd>{{ quantityLabel }}</dd>
          </div>
          <div>
            <dt>Estimated Cost</dt>
            <dd>{{ formattedCost }}</dd>
          </div>
          <div>
            <dt>CO₂ Saved</dt>
            <dd>{{ formattedCo2 }}</dd>
          </div>
          <div>
            <dt>Expiry</dt>
            <dd>{{ formattedExpiry }}</dd>
          </div>
        </dl>

        <footer class="tooltip-footer">
          <span class="status-indicator" :class="`status-${status}`">{{ statusText }}</span>
        </footer>
      </article>
    </Transition>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import type { InventoryItem } from '@/api/inventory'
import { useExpiryStatus } from '@/composables/useExpiryStatus'
import { formatCurrency, formatCO2 } from '@/utils/formatters'

interface Props {
  item: InventoryItem
  isLoading?: boolean
  readOnly?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  isLoading: false,
  readOnly: false,
})

const emit = defineEmits<{ (e: 'use', itemId: string): void }>()

const cardRef = ref<HTMLDivElement | null>(null)
const showTooltip = ref(false)
const hoverPosition = ref({ x: 0.5, y: 0 })

const { status, statusText } = useExpiryStatus(computed(() => props.item.expiryDate))
const isExpired = computed(() => status.value === 'expired')

const isLikelyImageSource = (value: string): boolean => {
  const normalized = value.trim().toLowerCase()
  return normalized.startsWith('http') ||
    normalized.startsWith('/') ||
    normalized.endsWith('.svg') ||
    normalized.endsWith('.png') ||
    normalized.endsWith('.jpg') ||
    normalized.endsWith('.jpeg') ||
    normalized.endsWith('.webp') ||
    normalized.endsWith('.gif')
}

type IconDescriptor = { type: 'emoji' | 'image'; value: string }

const iconSymbol = computed(() => {
  const icon = props.item.icon?.trim()
  if (icon && !isLikelyImageSource(icon)) {
    return icon
  }
  return null
})

const primaryIcon = computed<IconDescriptor | null>(() => {
  const imageUrl = props.item.imageUrl?.trim()
  if (imageUrl) {
    return { type: 'image', value: imageUrl }
  }

  const icon = props.item.icon?.trim()
  if (icon && isLikelyImageSource(icon)) {
    return { type: 'image', value: icon }
  }

  const emoji = iconSymbol.value
  if (emoji) {
    return { type: 'emoji', value: emoji }
  }

  return null
})

const iconAltText = computed(() => `${props.item.name} icon`)

const quantityLabel = computed(() => {
  const unit = (props.item.unit || 'pcs').toLowerCase()
  const qty = Number(props.item.quantity)

  const fmt = (n: number): string => {
    if (!Number.isFinite(n)) return '0'
    const fixed = n.toFixed(2)
    return fixed.replace(/\.00$/, '').replace(/(\.\d)0$/, '$1')
  }

  if (unit === 'kg') return `${fmt(qty)} kg`
  if (unit === 'l') return `${fmt(qty)} l`
  if (unit === 'g/ml' || unit === 'kg/l') return `${fmt(qty)} kg/l`
  return `${fmt(qty)} ${props.item.unit || 'pcs'}`
})
const formattedCost = computed(() => props.item.estimatedCost != null ? formatCurrency(props.item.estimatedCost) : '—')
const formattedCo2 = computed(() => props.item.estimatedCo2Kg != null ? formatCO2(props.item.estimatedCo2Kg) : '—')
const formattedExpiry = computed(() => {
  try {
    return new Date(props.item.expiryDate).toLocaleDateString('en-AU', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    })
  } catch {
    return props.item.expiryDate
  }
})

const isDisabled = computed(() => props.isLoading || props.readOnly || isExpired.value)

const actionAriaLabel = computed(() => {
  if (isExpired.value) {
    return `${props.item.name} has expired and cannot be marked as used`
  }
  return `Mark ${props.item.name} as used`
})

const tooltipStyle = computed(() => {
  const { x, y } = hoverPosition.value
  const offsetX = (x - 0.5) * 60
  const offsetY = (y - 0.5) * 40
  return {
    transform: `translate(${offsetX}px, ${Math.min(-20, offsetY - 20)}px)`
  }
})

function handleMouseMove(event: MouseEvent) {
  const el = cardRef.value
  if (!el) return
  const rect = el.getBoundingClientRect()
  hoverPosition.value = {
    x: Math.min(1, Math.max(0, (event.clientX - rect.left) / rect.width)),
    y: Math.min(1, Math.max(0, (event.clientY - rect.top) / rect.height)),
  }
}

function handleMouseLeave() {
  showTooltip.value = false
}

function handleUse() {
  if (isDisabled.value) return
  emit('use', props.item.id)
}
</script>

<style scoped>
.item-card {
  position: relative;
  width: 140px;
  height: 140px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.item-circle {
  position: relative;
  width: 120px;
  height: 120px;
  border-radius: 50%;
  border: none;
  background: rgba(255, 255, 255, 0.1);
  color: white;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 2px;
  cursor: pointer;
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}

.item-circle:disabled {
  cursor: default;
  opacity: 0.6;
}

.item-card:hover .item-circle:not(:disabled) {
  transform: scale(1.05);
  box-shadow: 0 12px 24px rgba(0, 0, 0, 0.25);
}

.item-emoji {
  font-size: 1.9rem;
}

.item-image {
  width: 56px;
  height: 56px;
  border-radius: 50%;
  object-fit: cover;
  box-shadow: 0 6px 18px rgba(0, 0, 0, 0.25);
  flex-shrink: 0;
}

.item-name {
  font-size: 0.85rem;
  text-transform: capitalize;
}

.loader {
  position: absolute;
  border: 2px solid rgba(255, 255, 255, 0.2);
  border-top-color: white;
  border-radius: 50%;
  width: 24px;
  height: 24px;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.item-tooltip {
  position: absolute;
  top: 0;
  left: 50%;
  transform: translate(-50%, -20px);
  min-width: 220px;
  background: rgba(17, 24, 39, 0.92);
  color: white;
  border-radius: 16px;
  padding: 16px;
  box-shadow: 0 24px 40px rgba(0, 0, 0, 0.35);
  border: 1px solid rgba(255, 255, 255, 0.08);
  backdrop-filter: blur(12px);
  z-index: 20;
}

.tooltip-enter-active,
.tooltip-leave-active {
  transition: opacity 0.18s ease, transform 0.18s ease;
}

.tooltip-enter-from,
.tooltip-leave-to {
  opacity: 0;
  transform: translate(-50%, -10px) scale(0.96);
}

.tooltip-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 12px;
  margin-bottom: 12px;
}

.tooltip-title {
  display: flex;
  align-items: center;
  gap: 12px;
}

.tooltip-title h3 {
  margin: 0;
  font-size: 1.1rem;
}

.tooltip-category {
  margin: 0;
  font-size: 0.85rem;
  opacity: 0.7;
}

.tooltip-emoji {
  font-size: 1.5rem;
}

.tooltip-image {
  width: 40px;
  height: 40px;
  border-radius: 12px;
  object-fit: cover;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
  flex-shrink: 0;
}

.tooltip-action {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  border: none;
  background: rgba(148, 163, 184, 0.3);
  color: white;
  cursor: pointer;
  transition: background 0.2s ease;
}

.tooltip-action:hover:not(:disabled) {
  background: rgba(34, 197, 94, 0.8);
}

.tooltip-action:disabled {
  cursor: default;
  opacity: 0.6;
}

.tooltip-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
  margin: 0;
}

.tooltip-grid dt {
  font-size: 0.75rem;
  opacity: 0.6;
}

.tooltip-grid dd {
  margin: 0;
  font-size: 0.95rem;
}

.tooltip-footer {
  margin-top: 16px;
  display: flex;
  justify-content: flex-end;
}

.status-indicator {
  padding: 4px 10px;
  border-radius: 999px;
  font-size: 0.75rem;
  background: rgba(255, 255, 255, 0.12);
}

.status-fresh .item-circle {
  background: rgba(34, 197, 94, 0.18);
}

.status-warning .item-circle {
  background: rgba(234, 179, 8, 0.2);
}

.status-expired .item-circle {
  background: rgba(239, 68, 68, 0.18);
}

.status-fresh .status-indicator {
  color: #bbf7d0;
}

.status-warning .status-indicator {
  color: #fde68a;
}

.status-expired .status-indicator {
  color: #fecaca;
}

@media (max-width: 640px) {
  .item-card {
    width: 120px;
    height: 120px;
  }

  .item-circle {
    width: 100px;
    height: 100px;
  }
}
</style>
