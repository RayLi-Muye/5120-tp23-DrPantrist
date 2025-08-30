<template>
  <div
    v-if="visible"
    :class="[
      'loading-state',
      `loading-state--${variant}`,
      { 'loading-state--overlay': overlay }
    ]"
  >
    <div class="loading-state__content">
      <!-- Spinner -->
      <div class="loading-state__spinner">
        <div class="spinner"></div>
      </div>

      <!-- Message -->
      <p v-if="message" class="loading-state__message">
        {{ message }}
      </p>
    </div>
  </div>
</template>

<script setup lang="ts">
interface Props {
  visible: boolean
  message?: string
  variant?: 'inline' | 'overlay' | 'fullscreen'
  overlay?: boolean
}

withDefaults(defineProps<Props>(), {
  message: 'Loading...',
  variant: 'inline',
  overlay: false
})
</script>

<style scoped lang="scss">
.loading-state {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: var(--spacing-lg);

  &--overlay {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(255, 255, 255, 0.9);
    z-index: 10;
  }

  &--fullscreen {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: var(--color-bg-primary);
    z-index: 1000;
  }

  &--inline {
    min-height: 120px;
  }
}

.loading-state__content {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--spacing-md);
}

.loading-state__spinner {
  display: flex;
  align-items: center;
  justify-content: center;
}

.spinner {
  width: 32px;
  height: 32px;
  border: 3px solid var(--color-bg-secondary);
  border-top: 3px solid var(--color-primary);
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

.loading-state__message {
  margin: 0;
  font-size: var(--font-size-sm);
  color: var(--color-text-secondary);
  text-align: center;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

/* Responsive Design */
@media (max-width: 576px) {
  .loading-state {
    padding: var(--spacing-md);
  }

  .spinner {
    width: 24px;
    height: 24px;
    border-width: 2px;
  }

  .loading-state__message {
    font-size: var(--font-size-xs);
  }
}
</style>
