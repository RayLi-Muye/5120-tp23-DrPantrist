<template>
  <div class="retry-action">
    <div class="retry-action__content">
      <div class="retry-action__icon">
        <span v-if="!isRetrying">⚠️</span>
        <div v-else class="retry-spinner"></div>
      </div>

      <div class="retry-action__text">
        <h4 class="retry-action__title">{{ title }}</h4>
        <p class="retry-action__message">{{ message }}</p>
      </div>

      <div class="retry-action__buttons">
        <button
          class="retry-action__button retry-action__button--primary"
          :disabled="isRetrying"
          @click="handleRetry"
        >
          {{ isRetrying ? 'Retrying...' : 'Retry' }}
        </button>

        <button
          v-if="showCancel"
          class="retry-action__button retry-action__button--secondary"
          :disabled="isRetrying"
          @click="handleCancel"
        >
          Cancel
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'

interface Props {
  title?: string
  message?: string
  showCancel?: boolean
  retryDelay?: number
}

interface Emits {
  retry: []
  cancel: []
}

const props = withDefaults(defineProps<Props>(), {
  title: 'Something went wrong',
  message: 'Please try again or check your connection.',
  showCancel: true,
  retryDelay: 0
})

const emit = defineEmits<Emits>()

const isRetrying = ref(false)

async function handleRetry() {
  isRetrying.value = true

  try {
    // Add delay if specified
    if (props.retryDelay > 0) {
      await new Promise(resolve => setTimeout(resolve, props.retryDelay))
    }

    emit('retry')
  } finally {
    isRetrying.value = false
  }
}

function handleCancel() {
  emit('cancel')
}
</script>

<style scoped lang="scss">
.retry-action {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: var(--spacing-lg);
  background: var(--color-bg-secondary);
  border-radius: 8px;
  border: 1px solid var(--color-border, #e0e0e0);
}

.retry-action__content {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--spacing-md);
  text-align: center;
  max-width: 400px;
}

.retry-action__icon {
  font-size: 2rem;
  display: flex;
  align-items: center;
  justify-content: center;
}

.retry-spinner {
  width: 24px;
  height: 24px;
  border: 2px solid var(--color-bg-primary);
  border-top: 2px solid var(--color-primary);
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

.retry-action__text {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-sm);
}

.retry-action__title {
  margin: 0;
  font-size: var(--font-size-lg);
  font-weight: 600;
  color: var(--color-text-primary);
}

.retry-action__message {
  margin: 0;
  font-size: var(--font-size-sm);
  color: var(--color-text-secondary);
  line-height: 1.4;
}

.retry-action__buttons {
  display: flex;
  gap: var(--spacing-sm);
  flex-wrap: wrap;
  justify-content: center;
}

.retry-action__button {
  padding: var(--spacing-sm) var(--spacing-lg);
  border-radius: 6px;
  font-size: var(--font-size-sm);
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
  min-width: 80px;

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  &--primary {
    background: var(--color-primary);
    color: white;
    border: none;

    &:hover:not(:disabled) {
      background: var(--color-primary-dark, #0056b3);
    }
  }

  &--secondary {
    background: transparent;
    color: var(--color-text-secondary);
    border: 1px solid var(--color-border, #e0e0e0);

    &:hover:not(:disabled) {
      background: var(--color-bg-primary);
      color: var(--color-text-primary);
    }
  }
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

/* Responsive Design */
@media (max-width: 576px) {
  .retry-action {
    padding: var(--spacing-md);
  }

  .retry-action__buttons {
    flex-direction: column;
    width: 100%;
  }

  .retry-action__button {
    width: 100%;
  }
}
</style>
