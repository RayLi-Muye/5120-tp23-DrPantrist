<template>
  <div class="auth-view">
    <div class="auth-container">
      <!-- <div class="auth-header">
        <h1 class="auth-title">UseItUp</h1>
        <p class="auth-subtitle">Track your groceries, reduce waste</p>
      </div> -->

      <!-- Create New Inventory -->
      <div v-if="authMode === 'create'" class="auth-form">
        <template v-if="!newUserCode">
          <h1>Create Your Inventory</h1>
          <form @submit.prevent="handleCreateInventory">
            <div class="form-group">
              <label for="displayName">Your Name</label>
              <input
                id="displayName"
                v-model="displayName"
                type="text"
                placeholder="e.g., John, Mary"
                maxlength="30"
                required
                :disabled="isLoading"
              />
            </div>

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
              :disabled="isLoading || !inventoryName.trim() || !displayName.trim()"
            >
              <span v-if="isLoading">Creating...</span>
              <span v-else>Create Inventory</span>
            </button>
          </form>

          <div class="auth-options">
            <button @click="authMode = 'login'" class="option-button">
              Use Login Code
            </button>
          </div>
        </template>

        <!-- Post-create state: show only login code and CTA -->
        <template v-else>
          <h1>You're All Set</h1>
          <p class="form-description">Your login code:</p>
          <div class="login-code-display">{{ newUserCode }}</div>
          <button @click="proceedToDashboard" class="btn btn--primary btn--full">
            Go to Dashboard
          </button>
        </template>
      </div>

      <!-- Join Existing Room -->
      <div v-else-if="authMode === 'join'" class="auth-form">
        <h2>Join Existing Room</h2>
        <p class="form-description">
          Enter the room ID to join an existing inventory
        </p>

        <form @submit.prevent="handleJoinRoom">
          <div class="form-group">
            <label for="joinDisplayName">Your Name</label>
            <input
              id="joinDisplayName"
              v-model="joinDisplayName"
              type="text"
              placeholder="e.g., John, Mary"
              maxlength="30"
              required
              :disabled="isLoading"
            />
          </div>

          <div class="form-group">
            <label for="roomId">Room ID</label>
            <input
              id="roomId"
              v-model="roomId"
              type="text"
              placeholder="Enter room ID"
              required
              :disabled="isLoading"
            />
          </div>

          <button
            type="submit"
            class="btn btn--primary btn--full"
            :disabled="isLoading || !roomId.trim() || !joinDisplayName.trim()"
          >
            <span v-if="isLoading">Joining...</span>
            <span v-else>Join Room</span>
          </button>
        </form>

        <div class="auth-options">
          <button @click="authMode = 'create'" class="option-button">
            Create New Room
          </button>
          <button @click="authMode = 'login'" class="option-button">
            Use Login Code
          </button>
        </div>
      </div>

      <!-- Login with Code -->
      <div v-else-if="authMode === 'login'" class="auth-form">
        <h2>Enter Login Code</h2>
        <p class="form-description">
          Enter your 4-digit login code to access your inventory
        </p>

        <form @submit.prevent="handleLogin">
          <div class="form-group">
            <label for="loginCode">Login Code</label>
            <input
              id="loginCode"
              v-model="loginCode"
              type="text"
              placeholder="AB12"
              maxlength="4"
              required
              :disabled="isLoading"
            />
          </div>

          <button
            type="submit"
            class="btn btn--primary btn--full"
            :disabled="isLoading || loginCode.trim().length !== 4"
          >
            <span v-if="isLoading">Logging in...</span>
            <span v-else>Access Inventory</span>
          </button>
        </form>

        <div class="auth-options">
          <button @click="authMode = 'create'" class="option-button">
            Create New Room
          </button>
        </div>
      </div>

      <!-- Error Message -->
      <div v-if="authStore.error" class="error-message">
        {{ authStore.error }}
      </div>

      <!-- Success Message for New User moved into create section; Room ID intentionally hidden -->

      <!-- Success Message for Joined Room -->
      <div v-if="authMode === 'join' && joinedRoomName" class="success-message">
        <h3>🎉 Successfully Joined!</h3>
        <p>You've joined the inventory:</p>
        <div class="room-name-display">{{ joinedRoomName }}</div>
        <p>Your login code is:</p>
        <div class="login-code-display">{{ newUserCode }}</div>
        <p class="code-warning">
          ⚠️ Save this code! You'll need it to access this inventory.
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
const authMode = ref<'create' | 'join' | 'login'>('create')
const displayName = ref('')
const joinDisplayName = ref('')
const inventoryName = ref('')
const roomId = ref('')
const loginCode = ref('')
const isLoading = ref(false)
const newUserCode = ref('')
const joinedRoomName = ref('')

const handleCreateInventory = async () => {
  if (!inventoryName.value.trim() || !displayName.value.trim()) return

  isLoading.value = true
  authStore.clearError()

  try {
    const user = await authStore.createInventory(inventoryName.value, displayName.value)
    newUserCode.value = user.loginCode
    inventoryName.value = ''
    displayName.value = ''
  } catch (error) {
    console.error('Failed to create inventory:', error)
  } finally {
    isLoading.value = false
  }
}

const handleJoinRoom = async () => {
  if (!roomId.value.trim() || !joinDisplayName.value.trim()) return

  isLoading.value = true
  authStore.clearError()

  try {
    const user = await authStore.joinInventory(roomId.value, joinDisplayName.value)
    newUserCode.value = user.loginCode
    joinedRoomName.value = user.inventoryName
    roomId.value = ''
    joinDisplayName.value = ''
  } catch (error) {
    console.error('Failed to join room:', error)
  } finally {
    isLoading.value = false
  }
}

const handleLogin = async () => {
  const code = loginCode.value.trim().toUpperCase()
  if (code.length !== 4) return

  isLoading.value = true
  authStore.clearError()

  try {
    await authStore.loginWithCode(code)
    // If we get here, login was successful
    router.push('/dashboard')
  } catch (error) {
    console.error('Login failed:', error)
    // Error handling is done in the auth store
  } finally {
    isLoading.value = false
  }
}

const proceedToDashboard = () => {
  newUserCode.value = ''
  joinedRoomName.value = ''
  router.push('/dashboard')
}

// Check if user is already authenticated
onMounted(async () => {
  // First try loading saved user data
  if (authStore.loadSavedUser()) {
    router.push('/')
    return
  }

  // Try auto-login with saved login code
  try {
    const autoLoginSuccess = await authStore.tryAutoLogin()
    if (autoLoginSuccess) {
      router.push('/dashboard')
    }
  } catch (error) {
    console.warn('Auto-login failed:', error)
    // Stay on auth page
  }
})
</script>

<style scoped>
.auth-view {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: calc(var(--spacing-md) + 56px) var(--spacing-md) var(--spacing-md);
  background: transparent;
}

.top-toggle-nav {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  display: flex;
  gap: var(--spacing-sm);
  justify-content: center;
  padding: 10px 12px;
  z-index: 1000;
}

.top-toggle-nav {
  display: flex;
}

.toggle-btn {
  text-decoration: none;
  padding: 6px 12px;
  border: 1px solid rgba(255,255,255,0.4);
  border-radius: var(--border-radius-md);
  color: #fff;
  background: rgba(255,255,255,0.12);
  transition: all var(--duration-fast) ease;
}

.toggle-btn:hover {
  background: rgba(255,255,255,0.2);
}

.toggle-btn.active {
  background: #fff;
  color: #4b4b4b;
  border-color: #fff;
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

.auth-options {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-sm);
  margin-top: var(--spacing-lg);
  padding-top: var(--spacing-lg);
  border-top: 1px solid var(--color-border);
}

.option-button {
  background: none;
  border: 1px solid var(--color-border);
  color: var(--color-text-secondary);
  padding: var(--spacing-sm) var(--spacing-md);
  border-radius: var(--border-radius-md);
  cursor: pointer;
  font-size: var(--font-size-sm);
  transition: all var(--duration-fast) ease;
}

.option-button:hover {
  background-color: var(--color-bg-secondary);
  color: var(--color-text-primary);
  border-color: var(--color-primary);
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

.room-id-display {
  margin: var(--spacing-md) 0;
  padding: var(--spacing-md);
  background-color: rgba(0, 123, 255, 0.1);
  border-radius: var(--border-radius-md);
}

.room-id-display strong {
  color: var(--color-primary);
  font-family: monospace;
  font-size: var(--font-size-lg);
}

.room-id-note {
  font-size: var(--font-size-sm);
  color: var(--color-text-secondary);
  margin-top: var(--spacing-xs);
}

.room-name-display {
  font-size: var(--font-size-lg);
  font-weight: var(--font-weight-bold);
  color: var(--color-primary);
  background-color: var(--color-bg-secondary);
  padding: var(--spacing-md);
  border-radius: var(--border-radius-md);
  margin: var(--spacing-md) 0;
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

  .auth-options {
    gap: var(--spacing-xs);
  }

  .option-button {
    padding: var(--spacing-xs) var(--spacing-sm);
    font-size: var(--font-size-xs);
  }
}
</style>
