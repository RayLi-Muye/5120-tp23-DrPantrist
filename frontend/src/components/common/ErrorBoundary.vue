<template>
  <div class="error-boundary">
    <!-- Error Notifications -->
    <Transition name="slide-down">
      <div
        v-if="errorNotifications.length > 0"
        class="error-notifications"
      >
        <div
          v-for="notification in errorNotifications"
          :key="notification.id"
          :class="[
            'error-notification',
            `error-notification--${notification.type}`
          ]"
        >
          <div class="error-notification__content">
            <div class="error-notification__header">
              <h4 class="error-notification__title">{{ notification.title }}</h4>
              <button
                class="error-notification__close"
                @click="removeErrorNotification(notification.id)"
                aria-label="Dismiss notification"
              >
                ×
              </button>
            </div>
            <p class="error-notification__message">{{ notification.message }}</p>
            <div
              v-if="notification.action"
              class="error-notification__actions"
            >
              <button
                class="error-notification__action-btn"
                @click="notification.action!.handler()"
              >
                {{ notification.action.label }}
              </button>
            </div>
          </div>
        </div>
      </div>
    </Transition>

    <!-- Network Status Indicator -->
    <Transition name="slide-up">
      <div
        v-if="!networkStatus.isOnline"
        class="network-status network-status--offline"
      >
        <div class="network-status__content">
          <span class="network-status__icon">📡</span>
          <span class="network-status__text">You are offline</span>
        </div>
      </div>
    </Transition>

    <!-- Main Content -->
    <slot />
  </div>
</template>

<script setup lang="ts">
import {
  errorNotifications,
  networkStatus,
  removeErrorNotification,
  initializeErrorHandler
} from '@/utils/errorHandler'
import { onMounted } from 'vue'

// Initialize error handling when component mounts
onMounted(() => {
  initializeErrorHandler()
})
</script>

<style scoped lang="scss">
.error-boundary {
  position: relative;
  min-height: 100vh;
}

.error-notifications {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 1000;
  padding: var(--spacing-md);
  pointer-events: none;
}

.error-notification {
  background: var(--color-bg-primary);
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  margin-bottom: var(--spacing-sm);
  pointer-events: auto;
  border-left: 4px solid;

  &--error {
    border-left-color: var(--color-expired);
  }

  &--warning {
    border-left-color: var(--color-warning);
  }

  &--info {
    border-left-color: var(--color-primary);
  }
}

.error-notification__content {
  padding: var(--spacing-md);
}

.error-notification__header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: var(--spacing-sm);
}

.error-notification__title {
  margin: 0;
  font-size: var(--font-size-base);
  font-weight: 600;
  color: var(--color-text-primary);
}

.error-notification__close {
  background: none;
  border: none;
  font-size: 1.5rem;
  line-height: 1;
  cursor: pointer;
  color: var(--color-text-secondary);
  padding: 0;
  margin-left: var(--spacing-sm);

  &:hover {
    color: var(--color-text-primary);
  }
}

.error-notification__message {
  margin: 0;
  font-size: var(--font-size-sm);
  color: var(--color-text-secondary);
  line-height: 1.4;
  white-space: pre-line;
}

.error-notification__actions {
  margin-top: var(--spacing-md);
  display: flex;
  gap: var(--spacing-sm);
}

.error-notification__action-btn {
  background: var(--color-primary);
  color: white;
  border: none;
  border-radius: 4px;
  padding: var(--spacing-sm) var(--spacing-md);
  font-size: var(--font-size-sm);
  font-weight: 500;
  cursor: pointer;
  transition: background-color 0.2s ease;

  &:hover {
    background: var(--color-primary-dark, #0056b3);
  }
}

.network-status {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  z-index: 999;
  padding: var(--spacing-sm) var(--spacing-md);

  &--offline {
    background: var(--color-warning);
    color: var(--color-text-primary);
  }
}

.network-status__content {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--spacing-sm);
  font-size: var(--font-size-sm);
  font-weight: 500;
}

.network-status__icon {
  font-size: var(--font-size-base);
}

/* Transitions */
.slide-down-enter-active,
.slide-down-leave-active {
  transition: all 0.3s ease;
}

.slide-down-enter-from {
  transform: translateY(-100%);
  opacity: 0;
}

.slide-down-leave-to {
  transform: translateY(-100%);
  opacity: 0;
}

.slide-up-enter-active,
.slide-up-leave-active {
  transition: all 0.3s ease;
}

.slide-up-enter-from {
  transform: translateY(100%);
  opacity: 0;
}

.slide-up-leave-to {
  transform: translateY(100%);
  opacity: 0;
}

/* Responsive Design */
@media (max-width: 576px) {
  .error-notifications {
    padding: var(--spacing-sm);
  }

  .error-notification__content {
    padding: var(--spacing-sm);
  }

  .error-notification__title {
    font-size: var(--font-size-sm);
  }

  .error-notification__message {
    font-size: var(--font-size-xs);
  }
}
</style>
