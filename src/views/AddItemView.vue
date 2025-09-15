<template>
  <div class="add-item-view">
    <header class="add-item-header">
      <button @click="goBack" class="back-button" aria-label="Go back">←</button>
      <h1>Add Item</h1>
    </header>

    <main class="add-item-main">
      <!-- Step indicator -->
      <div class="step-indicator">
        <div class="step" :class="{ active: currentStep === 1 }">
          <span class="step-number">1</span>
          <span class="step-label">Category</span>
        </div>
        <div class="step-divider"></div>
        <div class="step" :class="{ active: currentStep === 2 }">
          <span class="step-number">2</span>
          <span class="step-label">Item</span>
        </div>
        <div class="step-divider"></div>
        <div class="step" :class="{ active: currentStep === 3 }">
          <span class="step-number">3</span>
          <span class="step-label">Details</span>
        </div>
      </div>

      <!-- Step 1: Category Selection -->
      <section v-if="currentStep === 1" class="category-selection">
        <h2>Choose a category</h2>
        <CategoryGrid :categories="categoryList" @category-selected="handleCategorySelected" />
      </section>

      <!-- Step 2: Grocery Selection -->
      <section v-if="currentStep === 2" class="grocery-selection">
        <div class="section-header">
          <button @click="goBackToCategories" class="back-to-categories" aria-label="Back to categories">
            ← {{ selectedCategory?.name }}
          </button>
          <h2>Choose an item</h2>
        </div>
        <GroceryGrid
          v-if="selectedCategory"
          :groceries="groceriesStore.getItemsByCategory(selectedCategory.name)"
          @item-selected="handleItemSelected"
        />
      </section>

      <!-- Step 3: Item Details -->
      <section v-if="currentStep === 3" class="item-details">
        <div class="section-header">
          <button @click="goBackToItems" class="back-to-items" aria-label="Back to items">
            ← {{ selectedGrocery?.name }}
          </button>
          <h2>Item Details</h2>
        </div>
        <AddItemForm
          v-if="selectedGrocery"
          :selected-grocery="selectedGrocery"
          :is-submitting="isSubmitting"
          :key="selectedGrocery.id + '-' + selectedGrocery.defaultShelfLife"
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
import { ref, onMounted, computed, watch } from "vue";
import { useRouter } from "vue-router";
import { useGroceriesStore } from "@/stores/groceries";
import { useInventoryStore } from "@/stores/inventory";
import inventoryRoomsAPI from "@/api/inventory-rooms";
import inventoryAPI from "@/api/inventory";
import { useAuthStore } from "@/stores/auth";
import CategoryGrid, { type CategoryInfo } from "@/components/inventory/CategoryGrid.vue";
import GroceryGrid from "@/components/inventory/GroceryGrid.vue";
import AddItemForm from "@/components/inventory/AddItemForm.vue";
import type { GroceryItem } from "@/stores/groceries";
import { formatDateForAPI } from "@/utils/dateHelpers";
import { useInventoryAccess } from "@/composables/useInventoryAccess";
import { logger } from "@/utils/logger";

const router = useRouter();
const groceriesStore = useGroceriesStore();
const inventoryStore = useInventoryStore();
const authStore = useAuthStore();
const { addInventoryItemUnified } = useInventoryAccess();

// Component state
const currentStep = ref(1);
const selectedCategory = ref<CategoryInfo | null>(null);
const selectedGrocery = ref<GroceryItem | null>(null);
const isSubmitting = ref(false);
const error = ref<string | null>(null);

// Category icons mapping
const getCategoryIcon = (categoryName: string): string => {
  const iconMap: Record<string, string> = {
    'Dairy': '🥛',
    'Bakery': '🍞',
    'Beverages': '🥤',
    'Condiments': '🍯',
    'Frozen': '🧊',
    'Grains': '🌾',
    'Meat': '🥩',
    'Poultry': '🐔',
    'Fruit': '🍎',
    'Vegetable': '🥬',
    'Seafood': '🐟',
    'Pantry': '🥫'
  }
  return iconMap[categoryName] || '🍽️'
}

// Computed category list with counts
const categoryList = computed(() => {
  return groceriesStore.categories.map(categoryName => ({
    name: categoryName,
    icon: getCategoryIcon(categoryName),
    count: groceriesStore.getItemsByCategory(categoryName).length
  }))
})

const goBack = () => {
  if (currentStep.value > 1) {
    currentStep.value--;
    // Clear selections when going back
    if (currentStep.value === 1) {
      selectedCategory.value = null;
      selectedGrocery.value = null;
    } else if (currentStep.value === 2) {
      selectedGrocery.value = null;
    }
  } else {
    // Check if there's history to go back to, otherwise go to dashboard
    if (window.history.length > 1) {
      router.back();
    } else {
      router.push("/");
    }
  }
};

const goBackToCategories = () => {
  currentStep.value = 1;
  selectedCategory.value = null;
  selectedGrocery.value = null;
};

const goBackToItems = () => {
  currentStep.value = 2;
  selectedGrocery.value = null;
};

const handleCategorySelected = (category: CategoryInfo) => {
  selectedCategory.value = category;
  currentStep.value = 2;
};

const handleItemSelected = (item: GroceryItem) => {
  selectedGrocery.value = item;
  currentStep.value = 3;
};

const handleFormSubmit = async (formData: {
  quantity: number;
  expiryDate: string;
  notes: string;
  visibility: 'shared' | 'private';
}) => {
  if (!selectedGrocery.value) {
    error.value = "No item selected. Please go back and select an item.";
    return;
  }

  if (!authStore.user) {
    error.value = "User not authenticated. Please log in again.";
    return;
  }

  // Get current room info
  const currentRoom = inventoryRoomsAPI.getCurrentRoom();
  if (!currentRoom) {
    error.value = "No active room found. Please create or join a room first.";
    return;
  }

  isSubmitting.value = true;
  error.value = null;

  try {
    // Convert form date to API format
    const expiryDate = new Date(formData.expiryDate);
    const today = new Date();

    // Extract grocery_id from frontend ID format (grocery-123 -> 123)
    const groceryIdMatch = selectedGrocery.value.id.match(/grocery-(\d+)/);
    const groceryId = groceryIdMatch ? parseInt(groceryIdMatch[1], 10) : parseInt(selectedGrocery.value.id, 10);

    const result = await addInventoryItemUnified({
      groceryId,
      quantity: formData.quantity,
      purchasedAt: formatDateForAPI(today),
      actualExpiry: formatDateForAPI(expiryDate),
      visibility: formData.visibility
    });

    if (result) {
      // Success - navigate to dashboard
      router.push("/dashboard");
    } else {
      // Handle case where addItem returns null (error already set in store)
      error.value = inventoryStore.error || "Failed to add item. Please try again.";
    }
  } catch (err) {
    logger.error("Error adding item", err);
    error.value = "An unexpected error occurred. Please try again.";
  } finally {
    isSubmitting.value = false;
  }
};

const handleFormCancel = () => {
  currentStep.value = 2;
  selectedGrocery.value = null;
  clearError();
};

const clearError = () => {
  error.value = null;
  inventoryStore.clearError();
};

// Load groceries data on component mount
onMounted(async () => {
  try {
    // Force refresh to ensure latest shelf life (Refrigerate) is used
    await groceriesStore.fetchGroceries(true);
  } catch (err) {
    logger.error('Failed to load groceries', err);
    // Error is handled in the store
  }
});

// When groceries list refreshes, sync selectedGrocery reference
watch(() => groceriesStore.masterList, (list) => {
  if (selectedGrocery.value) {
    const id = selectedGrocery.value.id
    const updated = list.find(g => g.id === id)
    if (updated && updated !== selectedGrocery.value) {
      selectedGrocery.value = updated
    }
  }
})
</script>

<style scoped>
.add-item-view {
  padding: var(--spacing-md);
  min-height: 100vh;
  background: transparent;
}

.add-item-header {
  display: flex;
  align-items: center;
  margin-bottom: var(--spacing-lg);
}

.back-button {
  background: rgba(255, 255, 255, 0.15);
  border: 1px solid rgba(255, 255, 255, 0.2);
  font-size: var(--font-size-lg);
  color: white;
  cursor: pointer;
  padding: var(--spacing-sm);
  margin-right: var(--spacing-md);
  border-radius: var(--border-radius-md);
  min-height: var(--touch-target-min);
  min-width: var(--touch-target-min);
  display: flex;
  align-items: center;
  justify-content: center;
  backdrop-filter: blur(10px);
  transition: all var(--duration-fast) ease;
}

.back-button:hover {
  background: rgba(255, 255, 255, 0.2);
  transform: translateY(-1px);
}

.add-item-header h1 {
  font-size: var(--font-size-xl);
  color: white;
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

.category-selection h2,
.grocery-selection h2,
.item-details h2 {
  font-size: var(--font-size-lg);
  margin-bottom: var(--spacing-lg);
  text-align: center;
  color: white;
}

.section-header {
  display: flex;
  flex-direction: column;
  align-items: center;
  margin-bottom: var(--spacing-lg);
}

.back-to-categories,
.back-to-items {
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.2);
  color: rgba(255, 255, 255, 0.8);
  padding: var(--spacing-xs) var(--spacing-sm);
  border-radius: var(--border-radius-sm);
  font-size: var(--font-size-sm);
  cursor: pointer;
  transition: all var(--duration-fast) ease;
  margin-bottom: var(--spacing-sm);
  backdrop-filter: blur(5px);
}

.back-to-categories:hover,
.back-to-items:hover {
  background: rgba(255, 255, 255, 0.15);
  color: white;
  transform: translateY(-1px);
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

  .category-selection h2,
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

  .category-selection h2,
  .grocery-selection h2,
  .item-details h2 {
    font-size: var(--font-size-xl);
  }
}
</style>
