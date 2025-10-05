<template>
  <div class="add-item-form redesigned">
    <form @submit.prevent="handleSubmit" class="form">
      <!-- Header summary -->
      <section class="header-card">
        <div class="header-row">
          <div
            v-if="selectedGrocery.icon"
            class="item-icon"
            aria-hidden="true"
          >
            {{ selectedGrocery.icon }}
          </div>
          <div class="title-and-stats">
            <div class="title-line">
              <h3 class="item-name">{{ selectedGrocery.name }}</h3>
              <div class="stats-inline">
                <span class="stat-pill">
                  <span class="pill-label">Est. Price</span>
                  <span class="pill-value">{{ estimatedCost }}</span>
                </span>
                <span class="stat-pill">
                  <span class="pill-label">Est. CO₂</span>
                  <span class="pill-value">{{ estimatedCo2 }}</span>
                </span>
              </div>
            </div>
            <p class="item-meta">{{ selectedGrocery.category }}</p>
          </div>
        </div>
      </section>

      <section class="single-card">
        <div class="row">
          <label class="field-label" for="quantity">Amount</label>
          <div class="field-body">
            <div class="amount-row">
              <div class="quantity-input">
                <button type="button" @click="decrementQuantity" :disabled="formData.quantity <= minQuantity" class="quantity-btn" aria-label="Decrease">-</button>
                <input
                  id="quantity"
                  v-model.number="formData.quantity"
                  type="number"
                  :min="minQuantity"
                  :max="maxQuantity"
                  :step="inputStep"
                  class="quantity-field"
                  :class="{ 'error': errors.quantity }"
                />
                <button type="button" @click="incrementQuantity" :disabled="formData.quantity >= maxQuantity" class="quantity-btn" aria-label="Increase">+</button>
              </div>
              <span class="unit-label">{{ displayUnit }}</span>
            </div>
            <div v-if="errors.quantity" class="error-message">{{ errors.quantity }}</div>
            <div class="chips" v-if="suggestedQuantities.length">
              <button
                v-for="q in suggestedQuantities"
                :key="q"
                type="button"
                class="chip"
                :class="{ active: formData.quantity === q }"
                @click="formData.quantity = q"
              >{{ q }} {{ displayUnit }}</button>
            </div>
          </div>
        </div>

        <div class="row">
          <label class="field-label" for="expiryDate">Expiry Date</label>
          <div class="field-body">
            <input
              id="expiryDate"
              v-model="formData.expiryDate"
              type="date"
              class="form-input"
              :class="{ 'error': errors.expiryDate }"
              :min="minDate"
            />
            <div class="expiry-hint">Default: {{ formatExpiryDate(defaultExpiryDate, 'MMM dd, yyyy') }}</div>
            <div v-if="errors.expiryDate" class="error-message">{{ errors.expiryDate }}</div>
          </div>
        </div>

        <div class="row">
          <span class="field-label">Visibility</span>
          <div class="field-body">
            <div class="segmented">
              <label class="segmented-option">
                <input type="radio" name="visibility" value="shared" v-model="visibilityChoice" />
                <span>Shared</span>
                <span v-if="visibilityChoice === 'shared'" class="check-badge">✓</span>
              </label>
              <label class="segmented-option">
                <input type="radio" name="visibility" value="private" v-model="visibilityChoice" />
                <span>Private</span>
                <span v-if="visibilityChoice === 'private'" class="check-badge">✓</span>
              </label>
            </div>
            <div v-if="isPrivateWithNoProfile" class="inline-warning">Select a household member on the dashboard to add private items.</div>
            <div v-if="errors.visibility" class="error-message">{{ errors.visibility }}</div>
          </div>
        </div>
      </section>

      <div class="form-actions sticky">
        <div class="actions">
          <button type="button" @click="$emit('cancel')" class="btn btn-secondary" :disabled="isSubmitting">Cancel</button>
          <button type="submit" class="btn btn-primary" :disabled="isSubmitting || !isFormValid || (visibilityChoice === 'private' && isPrivateWithNoProfile)">
            <span v-if="isSubmitting">Adding...</span>
            <span v-else>Add Item</span>
          </button>
        </div>
      </div>
    </form>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import type { GroceryItem } from '@/stores/groceries'
import { getDefaultExpiryDate, formatExpiryDate, isValidDate } from '@/utils/dateHelpers'
import { useDashboardStore } from '@/stores/dashboard'
import { storeToRefs } from 'pinia'

interface Props {
  selectedGrocery: GroceryItem
  isSubmitting?: boolean
}

interface FormData {
  quantity: number
  expiryDate: string
  // kept for compatibility with parent event payload
  notes: string
}

type Visibility = 'shared' | 'private'
interface SubmitData extends FormData { visibility: Visibility }
interface Emits {
  (e: 'submit', data: SubmitData): void
  (e: 'cancel'): void
}

const props = withDefaults(defineProps<Props>(), {
  isSubmitting: false
})

const emit = defineEmits<Emits>()

// Form data
const formData = ref<FormData>({ quantity: 1, expiryDate: '', notes: '' })

const visibilityChoice = ref<Visibility>('private')
const dashboardStore = useDashboardStore()
const { activeProfile } = storeToRefs(dashboardStore)

// Form validation errors
const errors = ref({
  quantity: '',
  expiryDate: '',
  visibility: ''
})

// Calculate default expiry date
const defaultExpiryDate = computed(() => getDefaultExpiryDate(props.selectedGrocery.defaultShelfLife))

// Minimum date (today)
const minDate = computed(() => {
  const today = new Date()
  return today.toISOString().split('T')[0]
})

function toYMD(d: Date): string { return d.toISOString().split('T')[0] }

const expiryPresets = computed(() => {
  const now = new Date()
  const mk = (days: number, label: string) => ({ label, value: toYMD(new Date(now.getFullYear(), now.getMonth(), now.getDate() + days)) })
  return [mk(3, '+3d'), mk(7, '+7d'), mk(14, '+14d')]
})

// Form validation
const isFormValid = computed(() => {
  const q = Number(formData.value.quantity)
  const quantityOk = Number.isFinite(q) && q >= minQuantity.value && q <= maxQuantity.value
  const expiryOk = !!formData.value.expiryDate && isValidDate(formData.value.expiryDate)
  const visibilityOk = visibilityChoice.value === 'shared' || visibilityChoice.value === 'private'
  return quantityOk && expiryOk && visibilityOk &&
         !errors.value.quantity && !errors.value.expiryDate && !errors.value.visibility
})

const rawUnit = computed(() => props.selectedGrocery.unit?.trim().toLowerCase())
const unitKind = computed<'mass' | 'volume' | 'either' | 'count'>(() => {
  const u = rawUnit.value
  if (!u) return 'count'
  if (u === 'g' || u === 'kg') return 'mass'
  if (u === 'ml' || u === 'l') return 'volume'
  if (u === 'g/ml' || u === 'kg/l') return 'either'
  return 'count'
})
const displayUnit = computed(() => {
  const u = rawUnit.value
  if (!u) return 'pcs'
  if (u === 'g' || u === 'kg') return 'kg'
  if (u === 'ml' || u === 'l') return 'l'
  if (u === 'g/ml' || u === 'kg/l') return 'kg/l'
  return props.selectedGrocery.unit || 'pcs'
})

const isMassOrVolume = computed(() => unitKind.value === 'mass' || unitKind.value === 'volume' || unitKind.value === 'either')

const minQuantity = computed(() => isMassOrVolume.value ? 0.1 : 1)
const maxQuantity = computed(() => isMassOrVolume.value ? 100 : 99)
const stepQuantity = computed(() => isMassOrVolume.value ? 0.25 : 1)
const suggestedQuantities = computed<number[]>(() => {
  if (isMassOrVolume.value) return [0.25, 0.5, 0.75, 1, 1.5, 2]
  return [1, 2, 3]
})

// Use a permissive input step for free-form decimal entry
const inputStep = computed(() => (isMassOrVolume.value ? 'any' : 1))

function normalizeForEstimate(q: number): number {
  // Quantities already in kg/L when applicable
  return q
}

const estimatedCost = computed(() => {
  const q = normalizeForEstimate(formData.value.quantity)
  const price = props.selectedGrocery.avgPrice || 0
  const total = price * q
  return Number.isFinite(total) ? `$${total.toFixed(2)}` : '—'
})

const estimatedCo2 = computed(() => {
  const q = normalizeForEstimate(formData.value.quantity)
  const f = props.selectedGrocery.co2Factor || 0
  const total = f * q
  return Number.isFinite(total) ? `${total.toFixed(2)} kg` : '—'
})

const isPrivateWithNoProfile = computed(() => visibilityChoice.value === 'private' && !activeProfile.value)

// Initialize form with default values
onMounted(() => { resetToDefault() })

// Watch for changes in selected grocery to reset form
watch(() => props.selectedGrocery.id, () => { resetToDefault(); clearErrors() })
watch(() => props.selectedGrocery.defaultShelfLife, () => { resetToDefault() })

// Quantity controls
const incrementQuantity = () => {
  const step = stepQuantity.value
  const max = maxQuantity.value
  if (formData.value.quantity < max) {
    formData.value.quantity = Math.min(max, formData.value.quantity + step)
  }
}

const decrementQuantity = () => {
  const step = stepQuantity.value
  if (formData.value.quantity > minQuantity.value) {
    const updated = formData.value.quantity - step
    formData.value.quantity = Math.max(minQuantity.value, Number(updated.toFixed(3)))
  }
}

// Reset expiry date to default
const resetToDefault = () => {
  const defaultDate = defaultExpiryDate.value
  formData.value.expiryDate = defaultDate.toISOString().split('T')[0]
  // Default: 1 for mass/volume (kg/L) and others
  formData.value.quantity = 1
  formData.value.notes = ''
  visibilityChoice.value = 'private'
  // Prime validation state
  validateQuantity()
  validateExpiryDate()
}

// Clear validation errors
const clearErrors = () => {
  errors.value = { quantity: '', expiryDate: '', visibility: '' }
}

// Validate quantity
const validateQuantity = () => {
  const q = Number(formData.value.quantity)
  if (!Number.isFinite(q)) {
    errors.value.quantity = 'Please enter a valid number'
    return
  }
  if (q < minQuantity.value) {
    errors.value.quantity = `Quantity must be at least ${minQuantity.value}`
  } else if (q > maxQuantity.value) {
    errors.value.quantity = `Quantity cannot exceed ${maxQuantity.value}`
  } else {
    errors.value.quantity = ''
  }
}

// Validate expiry date
const validateExpiryDate = () => {
  if (!formData.value.expiryDate) {
    errors.value.expiryDate = 'Expiry date is required'
  } else if (!isValidDate(formData.value.expiryDate)) {
    errors.value.expiryDate = 'Please enter a valid date'
  } else {
    const selectedDate = new Date(formData.value.expiryDate)
    const today = new Date(); today.setHours(0, 0, 0, 0)
    if (selectedDate < today) {
      errors.value.expiryDate = 'Expiry date cannot be in the past'
    } else {
      errors.value.expiryDate = ''
    }
  }
}

const validateVisibility = () => {
  if (visibilityChoice.value !== 'shared' && visibilityChoice.value !== 'private') {
    errors.value.visibility = 'Please choose where to add the item'
  } else {
    errors.value.visibility = ''
  }
}

// Watch for form changes to validate
watch(() => formData.value.quantity, validateQuantity)
watch(() => formData.value.expiryDate, validateExpiryDate)
watch(() => visibilityChoice.value, validateVisibility)

// Handle form submission
const handleSubmit = () => {
  validateQuantity(); validateExpiryDate(); validateVisibility()
  if (isFormValid.value) {
    const payload: SubmitData = { ...formData.value, visibility: visibilityChoice.value as Visibility }
    emit('submit', payload)
  }
}
</script>

<style scoped>
.redesigned { padding: var(--spacing-md); max-width: 720px; margin: 0 auto; }
.header-card { background: var(--color-bg-secondary); border-radius: 12px; padding: 14px 16px; margin: 0 auto 14px; max-width: 720px; }
.header-row { display: flex; align-items: center; gap: 12px; }
.item-icon { font-size: 2.2rem; }
.item-info .item-name { margin: 0; font-size: 1.1rem; color: var(--color-primary); }
.item-info .item-meta { margin: 2px 0 0; font-size: 0.85rem; color: var(--color-secondary); }
.title-and-stats { display: grid; gap: 4px; width: 100%; }
.title-line { display: flex; align-items: center; gap: 10px; justify-content: space-between; }
.stats-inline { display: flex; gap: 8px; }
.stat-pill { display: grid; gap: 2px; align-items: center; justify-items: center; background: var(--color-bg-primary); border: 1px solid var(--color-border-light); padding: 6px 10px; border-radius: 10px; min-width: 110px; }
.pill-label { font-size: 0.72rem; color: var(--color-secondary); line-height: 1; }
.pill-value { font-size: 0.95rem; font-weight: 700; line-height: 1; }

.content-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 12px; }
.card { background: var(--color-bg-secondary); border-radius: 12px; padding: 12px; }
.card-title { margin: 0 0 8px; font-size: 0.95rem; color: var(--color-text-primary); }

/* Single combined section */
.single-card { background: var(--color-bg-secondary); border-radius: 12px; padding: 18px; display: grid; gap: 16px; text-align: left; max-width: 720px; margin: 0 auto; }
.row { display: grid; grid-template-columns: 160px minmax(320px, 1fr); gap: 14px; align-items: center; justify-content: center; }
.field-label { font-size: 0.95rem; color: var(--color-secondary); justify-self: end; }
.field-body { display: grid; gap: 8px; justify-items: start; }

.amount-row { display: flex; align-items: center; justify-content: flex-start; gap: 10px; margin-bottom: 8px; }
.quantity-input { display: inline-flex; align-items: center; gap: 6px; background: var(--color-bg-primary); border-radius: 8px; padding: 4px; }
.quantity-btn { width: 32px; height: 32px; display: grid; place-items: center; border: none; background: transparent; font-size: 18px; cursor: pointer; }
.quantity-field { width: 100px; height: 32px; text-align: center; border: 2px solid var(--color-bg-secondary); border-radius: 8px; }
.quantity-field.error { border-color: var(--color-expired); }
.unit-label { font-size: 0.85rem; color: var(--color-secondary); }

.chips { display: flex; flex-wrap: wrap; gap: 6px; justify-content: flex-start; }
.chip { padding: 6px 10px; border-radius: 20px; border: 1px solid var(--color-border-light); background: var(--color-bg-primary); font-size: 0.85rem; cursor: pointer; }
.chip.active { background: var(--color-primary); color: #fff; border-color: var(--color-primary); }

.form-label { display: block; margin-bottom: 6px; font-size: 0.85rem; color: var(--color-secondary); }
.form-input { width: 100%; height: 40px; padding: 6px 10px; border: 2px solid var(--color-bg-primary); border-radius: 8px; }
.form-input.error { border-color: var(--color-expired); }

.expiry-presets { display: flex; gap: 6px; align-items: center; justify-content: flex-start; margin-top: 8px; flex-wrap: wrap; }
.preset-label { font-size: 0.8rem; color: var(--color-secondary); margin-right: 4px; }
.expiry-hint { margin-top: 6px; font-size: 0.8rem; color: var(--color-secondary); }

.segmented { display: grid; grid-auto-flow: column; gap: 8px; justify-content: flex-start; }
.segmented-option { position: relative; display: inline-flex; gap: 8px; align-items: center; padding: 8px 10px; background: var(--color-bg-primary); border-radius: 8px; user-select: none; }
.segmented-option input { accent-color: var(--color-primary); }
.check-badge { position: absolute; top: -6px; right: -6px; width: 16px; height: 16px; border-radius: 50%; background: #10b981; color: #fff; display: grid; place-items: center; font-size: 12px; box-shadow: 0 2px 6px rgba(0,0,0,0.2); transform: scale(1); }
.inline-warning { margin-top: 8px; font-size: 0.85rem; color: var(--color-warning-700, #92400e); }

.form-textarea { width: 100%; padding: 8px 10px; border: 2px solid var(--color-bg-primary); border-radius: 8px; min-height: 88px; }
.character-count { text-align: right; font-size: 0.75rem; color: var(--color-secondary); margin-top: 4px; }
.error-message { color: var(--color-expired); font-size: 0.85rem; margin-top: 6px; }

.form-actions.sticky { position: sticky; bottom: 0; background: rgba(255,255,255,0.85); backdrop-filter: blur(6px); border-top: 1px solid var(--color-border-light); display: flex; justify-content: center; align-items: center; gap: 16px; padding: 10px; margin-top: 12px; border-radius: 10px; flex-wrap: wrap; }
.summary { display: flex; gap: 8px; align-items: center; color: var(--color-secondary); font-size: 0.9rem; justify-content: center; }
.actions { display: flex; gap: 8px; }

.btn { padding: var(--spacing-md) var(--spacing-lg); border: none; border-radius: 8px; font-weight: 500; text-align: center; cursor: pointer; transition: all 0.2s ease; min-height: 40px; min-width: 120px; display: flex; align-items: center; justify-content: center; text-decoration: none; }
.btn:disabled { opacity: 0.6; cursor: not-allowed; }
.btn-primary { background: var(--color-primary); color: white; }
.btn-secondary { background: var(--color-bg-primary); color: var(--color-primary); border: 2px solid var(--color-primary); }
.btn-primary:hover:not(:disabled) { filter: brightness(0.95); }
.btn-secondary:hover:not(:disabled) { background: #f3f4f6; }

@media (max-width: 520px) { .header-right { display: none; } }
</style>
