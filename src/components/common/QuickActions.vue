<template>
  <router-link
    to="/add-item"
    class="floating-add-button"
    data-testid="add-item-button"
    aria-label="Add new item"
  >
    <div class="add-icon">➕</div>
  </router-link>
</template>

<script setup lang="ts">
// No script needed for simple floating button
</script>

<style scoped>
.floating-add-button {
  position: fixed;
  bottom: var(--spacing-xl);
  right: var(--spacing-xl);
  width: 64px;
  height: 64px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  text-decoration: none;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.15);
  transition: all 0.3s ease;
  z-index: 1000;
  border: 3px solid white;
}

.floating-add-button:hover {
  transform: translateY(-4px) scale(1.05);
  box-shadow: 0 12px 32px rgba(0, 0, 0, 0.2);
}

.floating-add-button:active {
  transform: translateY(-2px) scale(1.02);
}

.add-icon {
  font-size: 1.75rem;
  color: white;
  font-weight: bold;
  text-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
}

/* Mobile optimizations */
@media (max-width: 768px) {
  .floating-add-button {
    bottom: var(--spacing-lg);
    right: var(--spacing-lg);
    width: 56px;
    height: 56px;
  }

  .add-icon {
    font-size: 1.5rem;
  }
}

/* Focus styles for accessibility */
.floating-add-button:focus {
  outline: 3px solid var(--color-primary);
  outline-offset: 4px;
}

.floating-add-button:focus:not(:focus-visible) {
  outline: none;
}

/* Ensure button stays above other content */
@media (max-width: 480px) {
  .floating-add-button {
    bottom: calc(var(--spacing-lg) + env(safe-area-inset-bottom));
    right: var(--spacing-md);
  }
}
</style>
