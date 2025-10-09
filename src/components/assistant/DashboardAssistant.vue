<template>
  <div class="dashboard-assistant">
    <button
      class="assistant-toggle"
      data-tour-id="ai-assistant"
      type="button"
      @click="toggleAssistant"
      :aria-expanded="isOpen"
      aria-controls="dashboard-ai-panel"
    >
      <span class="assistant-toggle__icon" aria-hidden="true">AI</span>
      <span class="assistant-toggle__label">What to buy next?</span>
    </button>

    <transition name="assistant-panel">
      <section
        v-if="isOpen"
        class="assistant-panel"
        id="dashboard-ai-panel"
        role="dialog"
        aria-modal="false"
      >
        <header class="assistant-panel__header">
          <div>
            <h3>Powered by Llama</h3>
          </div>
          <div class="assistant-panel__actions">
            <button class="assistant-panel__action" type="button" @click="refresh" :disabled="isLoading">
              Refresh
            </button>
            <button class="assistant-panel__action" type="button" @click="closeAssistant">
              Close
            </button>
          </div>
        </header>

        <div class="assistant-panel__body" aria-live="polite">
          <p v-if="isLoading" class="assistant-status">Fetching suggestions from Groq...</p>
          <p v-else-if="error" class="assistant-status assistant-status--error">{{ error }}</p>
          <div v-else-if="responseLines.length > 0" class="assistant-response">
            <p v-for="(line, index) in responseLines" :key="index">{{ line }}</p>
          </div>
          <p v-else class="assistant-status">Press refresh to get the latest tips.</p>
        </div>
      </section>
    </transition>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { fetchGroqAssistantSuggestions } from '@/api/groq'

const authStore = useAuthStore()

const isOpen = ref(false)
const isLoading = ref(false)
const error = ref<string | null>(null)
const suggestions = ref('')

const householdName = computed(() => {
  const user = authStore.user
  if (!user) return 'Dr.Pantrist Household'

  if (typeof user.inventoryName === 'string' && user.inventoryName.trim().length > 0) {
    return user.inventoryName
  }

  if (typeof user.displayName === 'string' && user.displayName.trim().length > 0) {
    return user.displayName
  }

  return 'Dr.Pantrist Household'
})

const responseLines = computed(() => {
  if (!suggestions.value) return []
  return suggestions.value
    .split(/\n+/)
    .map(line => line.trim())
    .filter(Boolean)
})

function toggleAssistant() {
  isOpen.value = !isOpen.value

  if (isOpen.value && !suggestions.value && !isLoading.value) {
    void refresh()
  }
}

function closeAssistant() {
  isOpen.value = false
}

async function refresh() {
  if (isLoading.value) return

  const loginCode = authStore.user?.loginCode?.trim()
  if (!loginCode) {
    error.value = 'Missing login code. Please log in again to use the assistant.'
    suggestions.value = ''
    return
  }

  try {
    isLoading.value = true
    error.value = null

    const content = await fetchGroqAssistantSuggestions({
      loginCode,
      householdName: householdName.value
    })

    suggestions.value = content
  } catch (err) {
    if (err instanceof Error) {
      error.value = err.message
    } else {
      error.value = 'Unable to fetch Groq suggestions right now. Please try again later.'
    }
  } finally {
    isLoading.value = false
  }
}
</script>

<style scoped>
.dashboard-assistant {
  position: fixed;
  right: 1.5rem;
  bottom: 1.5rem;
  z-index: 50;
  display: flex;
  flex-direction: column-reverse;
  align-items: flex-end;
  gap: 0.75rem;
}

.assistant-toggle {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem 1rem;
  border-radius: 999px;
  background: linear-gradient(135deg, #3d7bea, #30cfa5);
  color: #ffffff;
  border: none;
  font-weight: 600;
  cursor: pointer;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.25);
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}

.assistant-toggle:hover {
  transform: translateY(-2px);
  box-shadow: 0 14px 32px rgba(0, 0, 0, 0.28);
}

.assistant-toggle__icon {
  font-size: 1.25rem;
}

.assistant-toggle__label {
  font-size: 0.95rem;
}

.assistant-panel-enter-active,
.assistant-panel-leave-active {
  transition: opacity 0.18s ease, transform 0.18s ease;
}

.assistant-panel-enter-from,
.assistant-panel-leave-to {
  opacity: 0;
  transform: translateY(6px);
}

.assistant-panel {
  width: min(320px, 90vw);
  background: rgba(17, 24, 39, 0.98);
  backdrop-filter: blur(16px);
  border-radius: 18px;
  border: 1px solid rgba(148, 163, 184, 0.25);
  box-shadow: 0 20px 40px rgba(15, 23, 42, 0.4);
  padding: 1.25rem;
  color: #f8fafc;
}

.assistant-panel__header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 0.75rem;
  margin-bottom: 0.75rem;
}

.assistant-panel__header h3 {
  margin: 0;
  font-size: 1.1rem;
  font-weight: 700;
}

.assistant-panel__subtitle {
  margin: 0.25rem 0 0;
  font-size: 0.8rem;
  color: rgba(226, 232, 240, 0.8);
}

.assistant-panel__actions {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
}

.assistant-panel__action {
  background: rgba(148, 163, 184, 0.2);
  border: none;
  border-radius: 12px;
  padding: 0.35rem 0.6rem;
  color: inherit;
  cursor: pointer;
  font-size: 0.8rem;
  transition: background 0.2s ease;
}

.assistant-panel__action:hover:enabled {
  background: rgba(148, 163, 184, 0.35);
}

.assistant-panel__action:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.assistant-panel__body {
  max-height: 280px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 0.6rem;
}

.assistant-response p {
  margin: 0;
  line-height: 1.4;
  font-size: 0.9rem;
  white-space: pre-wrap;
}

.assistant-status {
  margin: 0;
  font-size: 0.85rem;
  color: rgba(226, 232, 240, 0.9);
}

.assistant-status--error {
  color: #f87171;
}

@media (max-width: 640px) {
  .dashboard-assistant {
    right: 1rem;
    bottom: 1rem;
  }

  .assistant-toggle {
    padding: 0.65rem 0.9rem;
  }
}
</style>
