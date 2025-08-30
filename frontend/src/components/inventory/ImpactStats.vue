<template>
  <div class="impact-stats">
    <h3 class="stats-title">Your Impact</h3>

    <div class="stats-grid">
      <div class="stat-card money-saved">
        <div class="stat-icon">💰</div>
        <div class="stat-content">
          <div class="stat-value">{{ formattedTotalImpact.totalMoneySaved }}</div>
          <div class="stat-label">Money Saved</div>
        </div>
      </div>

      <div class="stat-card co2-reduced">
        <div class="stat-icon">🌱</div>
        <div class="stat-content">
          <div class="stat-value">{{ formattedTotalImpact.totalCo2Avoided }}</div>
          <div class="stat-label">CO₂ Reduced</div>
        </div>
      </div>
    </div>

    <div class="stats-summary">
      <p class="summary-text">
        {{ formattedTotalImpact.itemsUsedText }} • {{ formattedTotalImpact.totalCo2Comparison }}
      </p>
    </div>

    <!-- Loading State -->
    <div v-if="impactStore.isLoadingTotal" class="stats-loading">
      <div class="loading-spinner"></div>
      <span>Loading your impact...</span>
    </div>

    <!-- Error State -->
    <div v-if="impactStore.error" class="stats-error">
      <span>{{ impactStore.error }}</span>
      <button @click="handleRetry" class="retry-button">
        Retry
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { useImpactStore } from '@/stores/impact'
import { useAuthStore } from '@/stores/auth'

const impactStore = useImpactStore()
const authStore = useAuthStore()

const formattedTotalImpact = computed(() => impactStore.formattedTotalImpact)

const handleRetry = async () => {
  if (authStore.user) {
    await impactStore.fetchTotalImpact(authStore.user.id)
  }
}

// Load impact data on mount
onMounted(async () => {
  if (authStore.user) {
    await impactStore.fetchTotalImpact(authStore.user.id)
  }
})
</script>

<style scoped>
.impact-stats {
  background: white;
  border-radius: var(--border-radius-lg);
  padding: var(--spacing-lg);
  margin-bottom: var(--spacing-lg);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.stats-title {
  font-size: var(--font-size-lg);
  font-weight: var(--font-weight-semibold);
  color: var(--color-text-primary);
  margin-bottom: var(--spacing-md);
  text-align: center;
}

.stats-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--spacing-md);
  margin-bottom: var(--spacing-md);
}

.stat-card {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  padding: var(--spacing-md);
  border-radius: var(--border-radius-md);
  transition: transform var(--duration-fast) ease;
}

.stat-card:hover {
  transform: translateY(-2px);
}

.money-saved {
  background: linear-gradient(135deg, #28a745 0%, #20c997 100%);
  color: white;
}

.co2-reduced {
  background: linear-gradient(135deg, #17a2b8 0%, #6f42c1 100%);
  color: white;
}

.stat-icon {
  font-size: var(--font-size-xl);
  flex-shrink: 0;
}

.stat-content {
  flex: 1;
  min-width: 0;
}

.stat-value {
  font-size: var(--font-size-lg);
  font-weight: var(--font-weight-bold);
  line-height: 1.2;
  word-break: break-word;
}

.stat-label {
  font-size: var(--font-size-sm);
  opacity: 0.9;
  margin-top: var(--spacing-xs);
}

.stats-summary {
  text-align: center;
  padding-top: var(--spacing-md);
  border-top: 1px solid var(--color-border);
}

.summary-text {
  color: var(--color-text-secondary);
  font-size: var(--font-size-sm);
  margin: 0;
  line-height: 1.4;
}

.stats-loading {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--spacing-sm);
  padding: var(--spacing-lg);
  color: var(--color-text-secondary);
}

.loading-spinner {
  width: 16px;
  height: 16px;
  border: 2px solid var(--color-border);
  border-top: 2px solid var(--color-primary);
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.stats-error {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--spacing-md);
  background-color: rgba(220, 53, 69, 0.1);
  border: 1px solid rgba(220, 53, 69, 0.2);
  border-radius: var(--border-radius-md);
  color: #dc3545;
  font-size: var(--font-size-sm);
}

.retry-button {
  background: none;
  border: 1px solid currentColor;
  color: inherit;
  padding: var(--spacing-xs) var(--spacing-sm);
  border-radius: var(--border-radius-sm);
  cursor: pointer;
  font-size: var(--font-size-xs);
  transition: background-color var(--duration-fast) ease;
}

.retry-button:hover {
  background-color: rgba(220, 53, 69, 0.1);
}

/* Mobile optimizations */
@media (max-width: 480px) {
  .impact-stats {
    padding: var(--spacing-md);
  }

  .stats-grid {
    gap: var(--spacing-sm);
  }

  .stat-card {
    padding: var(--spacing-sm);
    gap: var(--spacing-xs);
  }

  .stat-icon {
    font-size: var(--font-size-lg);
  }

  .stat-value {
    font-size: var(--font-size-base);
  }

  .stat-label {
    font-size: var(--font-size-xs);
  }

  .summary-text {
    font-size: var(--font-size-xs);
  }
}

/* Very small screens */
@media (max-width: 320px) {
  .stats-grid {
    grid-template-columns: 1fr;
  }
}
</style>
