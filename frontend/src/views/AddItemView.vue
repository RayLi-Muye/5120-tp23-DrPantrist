<template>
  <div class="add-item-view">
    <header class="add-item-header">
      <button @click="goBack" class="back-button" aria-label="Go back">
        ← Back
      </button>
      <h1>Add Item</h1>
    </header>

    <main class="add-item-main">
      <!-- Step indicator -->
      <div class="step-indicator">
        <div class="step" :class="{ active: currentStep === 1 }">
          <span class="step-number">1</span>
          <span class="step-label">Select Item</span>
        </div>
        <div class="step-divider"></div>
        <div class="step" :class="{ active: currentStep === 2 }">
          <span class="step-number">2</span>
          <span class="step-label">Details</span>
        </div>
      </div>

      <!-- Step 1: Grocery Selection -->
      <section v-if="currentStep === 1" class="grocery-selection">
        <h2>Choose from common groceries</h2>
        <GroceryGrid
          :groceries="groceriesStore.masterList"
          @item-selected="handleItemSelected"
        />
      </section>

      <!-- Step 2: Item Details -->
      <section v-if="currentStep === 2" class="item-details">
        <h2>Item Details</h2>
        <AddItemForm
          v-if="selectedGrocery"
          :selected-grocery="selectedGrocery"
          :is-submitting="isSubmitting"
          @submit="handleFormSubmit"
          @cancel="handleFormCancel"
        />
      </section>

      <!-- Error Display -->
      <div v-if="error" class="error-banner">
        <p>{{ error }}</p>
        <button @click="clearError" class="error-close">×</button>
      </div>
    </main>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useGroceriesStore } from '@/stores/groceries'
import { useInventoryStore } from '@/stores/inventory'
import GroceryGrid from '@/components/inventory/GroceryGrid.vue'
import AddItemForm from '@/components/inventory/AddItemForm.vue'
import type { GroceryItem } from '@/stores/groceries'
import { formatDateForAPI } from '@/utils/dateHelpers'

const router = useRouter()
const groceriesStore = useGroceriesStore()
const inventoryStore = useInventoryStore()

// Component state
const currentStep = ref(1)
const selectedGrocery = ref<GroceryItem | null>(null)
const isSubmitting = ref(false)
const error = ref<string | null>(null)

// TODO: Replace with actual user ID from auth system
const currentUserId = 'demo-user-001'

const goBack = () => {
  if (currentStep.value > 1) {
    currentStep.value--
  } else {
    // Check if there's history to go back to, otherwise go to dashboard
    if (window.history.length > 1) {
      router.back()
    } else {
      router.push('/')
    }
  }
}

const handleItemSelected = (item: GroceryItem) => {
  selectedGrocery.value = item
  currentStep.value = 2
}

const handleFormSubmit = async (formData: { quantity: number; expiryDate: string; notes: string }) => {
  if (!selectedGrocery.value) {
    error.value = 'No item selected. Please go back and select an item.'
    return
  }

  isSubmitting.value = true
  error.value = null

  try {
    // Convert form date to API format
    const expiryDate = new Date(formData.expiryDate)

    const addItemRequest = {
      userId: currentUserId,
      itemId: selectedGrocery.value.id,
      quantity: formData.quantity,
      customExpiryDate: formatDateForAPI(expiryDate),
      notes: formData.notes || undefined
    }

    const result = await inventoryStore.addItem(addItemRequest)

    if (result) {
      // Success - navigate to inventory view
      router.push('/inventory')
    } else {
      // Handle case where addItem returns null (error already set in store)
      error.value = inventoryStore.error || 'Failed to add item. Please try again.'
    }
  } catch (err) {
    console.error('Error adding item:', err)
    error.value = 'An unexpected error occurred. Please try again.'
  } finally {
    isSubmitting.value = false
  }
}

const handleFormCancel = () => {
  currentStep.value = 1
  selectedGrocery.value = null
  clearError()
}

const clearError = () => {
  error.value = null
  inventoryStore.clearError()
}
</script>

<style scoped>
.add-item-view {
  padding: var(--spacing-md);
  min-height: 100vh;
}

.add-item-header {
  display: flex;
  align-items: center;
  margin-bottom: var(--spacing-lg);
}

.back-button {
  background: none;
  border: none;
  font-size: var(--font-size-lg);
  color: var(--color-primary);
  cursor: pointer;
  padding: var(--spacing-sm);
  margin-right: var(--spacing-md);
  border-radius: 4px;
  min-height: 44px;
  min-width: 44px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.back-button:hover {
  background: var(--color-bg-secondary);
}

.add-item-header h1 {
  font-size: var(--font-size-xl);
  color: var(--color-primary);
  margin: 0;
}

.add-item-main {
  max-width: 600px;
  margin: 0 auto;
}

.step-indicator {
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: var(--spacing-xl);
  padding: var(--spacing-lg);
}

.step {
  display: flex;
  flex-direction: column;
  align-items: center;
  opacity: 0.5;
  transition: opacity 0.2s ease;
}

.step.active {
  opacity: 1;
}

.step-number {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: var(--color-bg-secondary);
  color: var(--color-secondary);
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 500;
  margin-bottom: var(--spacing-xs);
}

.step.active .step-number {
  background: var(--color-primary);
  color: white;
}

.step-label {
  font-size: var(--font-size-sm);
  color: var(--color-secondary);
}

.step.active .step-label {
  color: var(--color-primary);
  font-weight: 500;
}

.step-divider {
  width: 60px;
  height: 2px;
  background: var(--color-bg-secondary);
  margin: 0 var(--spacing-md);
}

.grocery-selection h2,
.item-details h2 {
  font-size: var(--font-size-lg);
  margin-bottom: var(--spacing-lg);
  text-align: center;
}

.error-banner {
  position: fixed;
  top: var(--spacing-md);
  left: var(--spacing-md);
  right: var(--spacing-md);
  background: var(--color-expired);
  color: white;
  padding: var(--spacing-md);
  border-radius: 8px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  z-index: 1000;
  box-shadow: 0 4px 12px rgba(220, 53, 69, 0.3);
}

.error-banner p {
  margin: 0;
  font-weight: 500;
}

.error-close {
  background: none;
  border: none;
  color: white;
  font-size: var(--font-size-xl);
  cursor: pointer;
  padding: 0;
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 4px;
  transition: background-color 0.2s ease;
}

.error-close:hover {
  background: rgba(255, 255, 255, 0.2);
}

/* Mobile-first responsive design */
@media (max-width: 374px) {
  .add-item-view {
    padding: var(--spacing-xs);
  }

  .add-item-header h1 {
    font-size: var(--font-size-lg);
  }

  .back-button {
    font-size: var(--font-size-base);
    padding: var(--spacing-xs);
    margin-right: var(--spacing-sm);
  }

  .step-indicator {
    padding: var(--spacing-sm);
  }

  .step-number {
    width: 28px;
    height: 28px;
    font-size: var(--font-size-sm);
  }

  .step-label {
    font-size: var(--font-size-xs);
  }

  .step-divider {
    width: 30px;
    margin: 0 var(--spacing-sm);
  }

  .grocery-selection h2,
  .item-details h2 {
    font-size: var(--font-size-base);
    margin-bottom: var(--spacing-md);
  }

  .error-banner {
    top: var(--spacing-xs);
    left: var(--spacing-xs);
    right: var(--spacing-xs);
    padding: var(--spacing-sm);
  }
}

@media (min-width: 375px) and (max-width: 576px) {
  .step-indicator {
    padding: var(--spacing-md);
  }

  .step-divider {
    width: 40px;
  }

  .error-banner {
    top: var(--spacing-sm);
    left: var(--spacing-sm);
    right: var(--spacing-sm);
  }
}

/* Large mobile and tablet */
@media (min-width: 577px) {
  .add-item-main {
    max-width: 700px;
  }
}

/* Desktop */
@media (min-width: 768px) {
  .add-item-main {
    max-width: 800px;
  }

  .add-item-header h1 {
    font-size: var(--font-size-xxl);
  }

  .step-indicator {
    padding: var(--spacing-xl);
  }

  .step-number {
    width: 40px;
    height: 40px;
  }

  .grocery-selection h2,
  .item-details h2 {
    font-size: var(--font-size-xl);
  }
}
</style>
