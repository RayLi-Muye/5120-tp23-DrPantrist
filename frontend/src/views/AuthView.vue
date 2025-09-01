<template>
  <div class="auth-view">
    <div class="auth-container">
      <div class="auth-header">
        <h1 class="auth-title">UseItUp</h1>
        <p class="auth-subtitle">Track your groceries, reduce waste</p>
      </div>

      <!-- Create New Inventory -->
      <div v-if="!showLogin" class="auth-form">
        <h2>Create Your Inventory</h2>
        <p class="form-description">
          Give your inventory a name to get started
        </p>

        <form @submit.prevent="handleCreateInventory">
          <div class="form-group">
            <label for="inventoryName">Inventory Name</label>
            <input
              id="inventoryName"
              v-model="inventoryName"
              type="text"
              placeholder="e.g., My Kitchen, Family Pantry"
              maxlength="50"
              required
              :disabled="isLoading"
            />
          </div>

          <button
            type="submit"
            class="btn btn--primary btn--full"
            :disabled="isLoading || !inventoryName.trim()"
          >
            <span v-if="isLoading">Creating...</span>
            <span v-else>Create Inventory</span>
          </button>
        </form>

        <div class="auth-switch">
          <p>Already have an inventory?</p>
          <button @click="showLogin = true" class="link-button">
            Enter login code
          </button>
        </div>
      </div>

      <!-- Login with Code -->
      <div v-else class="auth-form">
        <h2>Enter Login Code</h2>
        <p class="form-description">
          Enter your 6-digit login code to access your inventory
        </p>

        <form @submit.prevent="handleLogin">
          <div class="form-group">
            <label for="loginCode">Login Code</label>
            <input
              id="loginCode"
              v-model="loginCode"
              type="text"
              placeholder="123456"
              maxlength="6"
              pattern="[0-9]{6}"
              required
              :disabled="isLoading"
            />
          </div>

          <button
            type="submit"
            class="btn btn--primary btn--full"
            :disabled="isLoading || loginCode.length !== 6"
          >
            <span v-if="isLoading">Logging in...</span>
            <span v-else>Access Inventory</span>
          </button>
        </form>

        <div class="auth-switch">
          <p>Don't have an inventory yet?</p>
          <button @click="showLogin = false" class="link-button">
            Create new inventory
          </button>
        </div>
      </div>

      <!-- Error Message -->
      <div v-if="authStore.error" class="error-message">
        {{ authStore.error }}
      </div>

      <!-- Success Message for New User -->
      <div v-if="newUserCode" class="success-message">
        <h3>🎉 Inventory Created!</h3>
        <p>Your login code is:</p>
        <div class="login-code-display">{{ newUserCode }}</div>
        <p class="code-warning">
          ⚠️ Save this code! You'll need it to access your inventory.
        </p>
        <button @click="proceedToDashboard" class="btn btn--secondary btn--full">
          Continue to Dashboard
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

const router = useRouter()
const authStore = useAuthStore()

// Local state
const showLogin = ref(false)
const inventoryName = ref('')
const loginCode = ref('')
const isLoading = ref(false)
const newUserCode = ref('')

const handleCreateInventory = async () => {
  if (!inventoryName.value.trim()) return

  isLoading.value = true
  authStore.clearError()

  try {
    const user = authStore.createInventory(inventoryName.value)
    newUserCode.value = user.loginCode
    inventoryName.value = ''
  } catch (error) {
    console.error('Failed to create inventory:', error)
  } finally {
    isLoading.value = false
  }
}

const handleLogin = async () => {
  if (loginCode.value.length !== 6) return

  isLoading.value = true
  authStore.clearError()

  try {
    const success = authStore.loginWithCode(loginCode.value)
    if (success) {
      router.push('/dashboard')
    }
  } catch (error) {
    console.error('Login failed:', error)
  } finally {
    isLoading.value = false
  }
}

const proceedToDashboard = () => {
  newUserCode.value = ''
  router.push('/dashboard')
}

// Check if user is already authenticated
onMounted(() => {
  if (authStore.loadSavedUser()) {
    router.push('/')
  }
})
</script>

<style scoped>
.auth-view {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: var(--spacing-md);
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}

.auth-container {
  background: white;
  border-radius: var(--border-radius-lg);
  padding: var(--spacing-xl);
  width: 100%;
  max-width: 400px;
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.1);
}

.auth-header {
  text-align: center;
  margin-bottom: var(--spacing-xl);
}

.auth-title {
  font-size: var(--font-size-xxl);
  font-weight: var(--font-weight-bold);
  color: var(--color-primary);
  margin-bottom: var(--spacing-xs);
}

.auth-subtitle {
  color: var(--color-text-secondary);
  margin: 0;
}

.auth-form h2 {
  font-size: var(--font-size-xl);
  color: var(--color-text-primary);
  margin-bottom: var(--spacing-sm);
  text-align: center;
}

.form-description {
  color: var(--color-text-secondary);
  text-align: center;
  margin-bottom: var(--spacing-lg);
}

.form-group {
  margin-bottom: var(--spacing-lg);
}

.form-group label {
  display: block;
  font-weight: var(--font-weight-medium);
  color: var(--color-text-primary);
  margin-bottom: var(--spacing-xs);
}

.form-group input {
  width: 100%;
  padding: var(--spacing-md);
  border: 1px solid var(--color-border);
  border-radius: var(--border-radius-md);
  font-size: var(--font-size-base);
  transition: border-color var(--duration-fast) ease;
}

.form-group input:focus {
  outline: none;
  border-color: var(--color-primary);
  box-shadow: 0 0 0 3px rgba(0, 123, 255, 0.1);
}

.form-group input:disabled {
  background-color: var(--color-bg-secondary);
  cursor: not-allowed;
}

.btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: var(--spacing-md) var(--spacing-lg);
  font-size: var(--font-size-base);
  font-weight: var(--font-weight-medium);
  text-align: center;
  text-decoration: none;
  border: 1px solid transparent;
  border-radius: var(--border-radius-md);
  cursor: pointer;
  transition: all var(--duration-fast) ease;
  min-height: var(--touch-target-min);
}

.btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.btn--primary {
  color: white;
  background-color: var(--color-primary);
  border-color: var(--color-primary);
}

.btn--primary:hover:not(:disabled) {
  background-color: #0056b3;
  border-color: #0056b3;
}

.btn--secondary {
  color: var(--color-text-primary);
  background-color: var(--color-bg-secondary);
  border-color: var(--color-border);
}

.btn--secondary:hover:not(:disabled) {
  background-color: #e2e6ea;
  border-color: #dae0e5;
}

.btn--full {
  width: 100%;
}

.auth-switch {
  text-align: center;
  margin-top: var(--spacing-lg);
  padding-top: var(--spacing-lg);
  border-top: 1px solid var(--color-border);
}

.auth-switch p {
  color: var(--color-text-secondary);
  margin-bottom: var(--spacing-xs);
}

.link-button {
  background: none;
  border: none;
  color: var(--color-primary);
  text-decoration: underline;
  cursor: pointer;
  font-size: var(--font-size-base);
}

.link-button:hover {
  color: #0056b3;
}

.error-message {
  background-color: rgba(220, 53, 69, 0.1);
  border: 1px solid rgba(220, 53, 69, 0.2);
  color: #dc3545;
  padding: var(--spacing-md);
  border-radius: var(--border-radius-md);
  margin-top: var(--spacing-md);
  text-align: center;
}

.success-message {
  background-color: rgba(40, 167, 69, 0.1);
  border: 1px solid rgba(40, 167, 69, 0.2);
  padding: var(--spacing-lg);
  border-radius: var(--border-radius-md);
  margin-top: var(--spacing-md);
  text-align: center;
}

.success-message h3 {
  color: #28a745;
  margin-bottom: var(--spacing-md);
}

.login-code-display {
  font-size: var(--font-size-xl);
  font-weight: var(--font-weight-bold);
  color: var(--color-primary);
  background-color: var(--color-bg-secondary);
  padding: var(--spacing-md);
  border-radius: var(--border-radius-md);
  margin: var(--spacing-md) 0;
  letter-spacing: 2px;
}

.code-warning {
  color: #856404;
  font-size: var(--font-size-sm);
  margin-bottom: var(--spacing-lg);
}

/* Mobile optimizations */
@media (max-width: 480px) {
  .auth-view {
    padding: var(--spacing-sm);
  }

  .auth-container {
    padding: var(--spacing-lg);
  }

  .auth-title {
    font-size: var(--font-size-xl);
  }
}
</style>
