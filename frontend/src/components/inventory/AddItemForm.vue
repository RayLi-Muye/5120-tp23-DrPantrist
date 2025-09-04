<template>
  <div class="add-item-form">
    <form @submit.prevent="handleSubmit" class="form">
      <!-- Selected Item Display -->
      <div class="selected-item">
        <div class="item-icon">{{ selectedGrocery.icon }}</div>
        <div class="item-info">
          <h3>{{ selectedGrocery.name }}</h3>
          <p class="category">{{ selectedGrocery.category }}</p>
        </div>
      </div>

      <!-- Quantity Field -->
      <div class="form-group">
        <label for="quantity" class="form-label">
          Quantity
        </label>
        <div class="quantity-input">
          <button
            type="button"
            @click="decrementQuantity"
            :disabled="formData.quantity <= 1"
            class="quantity-btn"
            aria-label="Decrease quantity"
          >
            -
          </button>
          <input
            id="quantity"
            v-model.number="formData.quantity"
            type="number"
            min="1"
            max="99"
            class="quantity-field"
            :class="{ 'error': errors.quantity }"
          />
          <button
            type="button"
            @click="incrementQuantity"
            :disabled="formData.quantity >= 99"
            class="quantity-btn"
            aria-label="Increase quantity"
          >
            +
          </button>
        </div>
        <span class="unit-label">{{ selectedGrocery.unit }}</span>
        <div v-if="errors.quantity" class="error-message">
          {{ errors.quantity }}
        </div>
      </div>

      <!-- Expiry Date Field -->
      <div class="form-group">
        <label for="expiryDate" class="form-label">
          Expiry Date
        </label>
        <input
          id="expiryDate"
          v-model="formData.expiryDate"
          type="date"
          class="form-input"
          :class="{ 'error': errors.expiryDate }"
          :min="minDate"
        />
        <div class="expiry-info">
          <span class="default-info">
            Default: {{ formatExpiryDate(defaultExpiryDate, 'MMM dd, yyyy') }}
          </span>
          <button
            type="button"
            @click="resetToDefault"
            class="reset-btn"
          >
            Use Default
          </button>
        </div>
        <div v-if="errors.expiryDate" class="error-message">
          {{ errors.expiryDate }}
        </div>
      </div>

      <!-- Notes Field (Optional) -->
      <div class="form-group">
        <label for="notes" class="form-label">
          Notes (Optional)
        </label>
        <textarea
          id="notes"
          v-model="formData.notes"
          placeholder="Add any notes about this item..."
          class="form-textarea"
          rows="3"
          maxlength="200"
        ></textarea>
        <div class="character-count">
          {{ formData.notes.length }}/200
        </div>
      </div>

      <!-- Form Actions -->
      <div class="form-actions">
        <button
          type="button"
          @click="$emit('cancel')"
          class="btn btn-secondary"
          :disabled="isSubmitting"
        >
          Cancel
        </button>
        <button
          type="submit"
          class="btn btn-primary"
          :disabled="isSubmitting || !isFormValid"
        >
          <span v-if="isSubmitting">Adding...</span>
          <span v-else>Add Item</span>
        </button>
      </div>
    </form>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import type { GroceryItem } from '@/stores/groceries'
import { getDefaultExpiryDate, formatExpiryDate, formatDateForAPI, isValidDate } from '@/utils/dateHelpers'

interface Props {
  selectedGrocery: GroceryItem
  isSubmitting?: boolean
}

interface FormData {
  quantity: number
  expiryDate: string
  notes: string
}

interface Emits {
  (e: 'submit', data: FormData): void
  (e: 'cancel'): void
}

const props = withDefaults(defineProps<Props>(), {
  isSubmitting: false
})

const emit = defineEmits<Emits>()

// Form data
const formData = ref<FormData>({
  quantity: 1,
  expiryDate: '',
  notes: ''
})

// Form validation errors
const errors = ref({
  quantity: '',
  expiryDate: ''
})

// Calculate default expiry date
const defaultExpiryDate = computed(() =>
  getDefaultExpiryDate(props.selectedGrocery.defaultShelfLife)
)

// Minimum date (today)
const minDate = computed(() => {
  const today = new Date()
  return today.toISOString().split('T')[0]
})

// Form validation
const isFormValid = computed(() => {
  return formData.value.quantity > 0 &&
         formData.value.quantity <= 99 &&
         formData.value.expiryDate &&
         isValidDate(formData.value.expiryDate) &&
         !errors.value.quantity &&
         !errors.value.expiryDate
})

// Initialize form with default values
onMounted(() => {
  resetToDefault()
})

// Watch for changes in selected grocery to reset form
watch(() => props.selectedGrocery.id, () => {
  resetToDefault()
  clearErrors()
})

// If default shelf life changes (e.g., after data refresh), reset default date
watch(() => props.selectedGrocery.defaultShelfLife, () => {
  resetToDefault()
})

// Quantity controls
const incrementQuantity = () => {
  if (formData.value.quantity < 99) {
    formData.value.quantity++
  }
}

const decrementQuantity = () => {
  if (formData.value.quantity > 1) {
    formData.value.quantity--
  }
}

// Reset expiry date to default
const resetToDefault = () => {
  const defaultDate = defaultExpiryDate.value
  formData.value.expiryDate = defaultDate.toISOString().split('T')[0]
}

// Clear validation errors
const clearErrors = () => {
  errors.value = {
    quantity: '',
    expiryDate: ''
  }
}

// Validate quantity
const validateQuantity = () => {
  if (!formData.value.quantity || formData.value.quantity < 1) {
    errors.value.quantity = 'Quantity must be at least 1'
  } else if (formData.value.quantity > 99) {
    errors.value.quantity = 'Quantity cannot exceed 99'
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
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    if (selectedDate < today) {
      errors.value.expiryDate = 'Expiry date cannot be in the past'
    } else {
      errors.value.expiryDate = ''
    }
  }
}

// Watch for form changes to validate
watch(() => formData.value.quantity, validateQuantity)
watch(() => formData.value.expiryDate, validateExpiryDate)

// Handle form submission
const handleSubmit = () => {
  // Validate all fields
  validateQuantity()
  validateExpiryDate()

  // If form is valid, emit submit event
  if (isFormValid.value) {
    emit('submit', { ...formData.value })
  }
}
</script>

<style scoped>
.add-item-form {
  padding: var(--spacing-md);
  max-width: 500px;
  margin: 0 auto;
}

.selected-item {
  display: flex;
  align-items: center;
  padding: var(--spacing-lg);
  background: var(--color-bg-secondary);
  border-radius: 12px;
  margin-bottom: var(--spacing-lg);
}

.item-icon {
  font-size: 3rem;
  margin-right: var(--spacing-md);
}

.item-info h3 {
  margin: 0 0 var(--spacing-xs) 0;
  font-size: var(--font-size-lg);
  color: var(--color-primary);
}

.category {
  margin: 0;
  font-size: var(--font-size-sm);
  color: var(--color-secondary);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.form-group {
  margin-bottom: var(--spacing-lg);
}

.form-label {
  display: block;
  font-weight: 500;
  margin-bottom: var(--spacing-sm);
  color: var(--color-primary);
}

.quantity-input {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  margin-bottom: var(--spacing-xs);
}

.quantity-btn {
  width: 44px;
  height: 44px;
  border: 2px solid var(--color-primary);
  background: var(--color-bg-primary);
  color: var(--color-primary);
  border-radius: 8px;
  font-size: var(--font-size-lg);
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  justify-content: center;
}

.quantity-btn:hover:not(:disabled) {
  background: var(--color-primary);
  color: white;
}

.quantity-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.quantity-field {
  width: 80px;
  height: 44px;
  text-align: center;
  border: 2px solid var(--color-bg-secondary);
  border-radius: 8px;
  font-size: var(--font-size-base);
  font-weight: 500;
}

.quantity-field:focus {
  outline: none;
  border-color: var(--color-primary);
}

.quantity-field.error {
  border-color: var(--color-expired);
}

.unit-label {
  font-size: var(--font-size-sm);
  color: var(--color-secondary);
  margin-left: var(--spacing-sm);
}

.form-input {
  width: 100%;
  height: 44px;
  padding: var(--spacing-sm) var(--spacing-md);
  border: 2px solid var(--color-bg-secondary);
  border-radius: 8px;
  font-size: var(--font-size-base);
  transition: border-color 0.2s ease;
}

.form-input:focus {
  outline: none;
  border-color: var(--color-primary);
}

.form-input.error {
  border-color: var(--color-expired);
}

.expiry-info {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: var(--spacing-sm);
}

.default-info {
  font-size: var(--font-size-sm);
  color: var(--color-secondary);
}

.reset-btn {
  background: none;
  border: none;
  color: var(--color-primary);
  font-size: var(--font-size-sm);
  cursor: pointer;
  text-decoration: underline;
  padding: var(--spacing-xs);
}

.reset-btn:hover {
  color: #0056b3;
}

.form-textarea {
  width: 100%;
  padding: var(--spacing-sm) var(--spacing-md);
  border: 2px solid var(--color-bg-secondary);
  border-radius: 8px;
  font-size: var(--font-size-base);
  font-family: inherit;
  resize: vertical;
  min-height: 80px;
  transition: border-color 0.2s ease;
}

.form-textarea:focus {
  outline: none;
  border-color: var(--color-primary);
}

.character-count {
  text-align: right;
  font-size: var(--font-size-xs);
  color: var(--color-secondary);
  margin-top: var(--spacing-xs);
}

.error-message {
  color: var(--color-expired);
  font-size: var(--font-size-sm);
  margin-top: var(--spacing-xs);
}

.form-actions {
  display: flex;
  gap: var(--spacing-md);
  justify-content: center;
  margin-top: var(--spacing-xl);
}

.btn {
  padding: var(--spacing-md) var(--spacing-lg);
  border: none;
  border-radius: 8px;
  font-weight: 500;
  text-align: center;
  cursor: pointer;
  transition: all 0.2s ease;
  min-height: 44px;
  min-width: 120px;
  display: flex;
  align-items: center;
  justify-content: center;
  text-decoration: none;
}

.btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.btn-primary {
  background: var(--color-primary);
  color: white;
}

.btn-primary:hover:not(:disabled) {
  background: #0056b3;
}

.btn-secondary {
  background: var(--color-bg-primary);
  color: var(--color-primary);
  border: 2px solid var(--color-primary);
}

.btn-secondary:hover:not(:disabled) {
  background: var(--color-primary);
  color: white;
}

@media (max-width: 576px) {
  .form-actions {
    flex-direction: column;
  }

  .btn {
    width: 100%;
  }

  .expiry-info {
    flex-direction: column;
    align-items: flex-start;
    gap: var(--spacing-xs);
  }
}
</style>
