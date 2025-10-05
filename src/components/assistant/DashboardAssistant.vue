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
      <span class="assistant-toggle__label">AI Assistant</span>
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
            <h3>Nutrition and Low-Carbon Ideas</h3>
            <p class="assistant-panel__subtitle">Tailored to your current inventory and recent consumption.</p>
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
import { computed, ref, watch } from 'vue'
import { storeToRefs } from 'pinia'
import { useInventoryStore } from '@/stores/inventory'
import { useAuthStore } from '@/stores/auth'
import { differenceInCalendarDays, format, isValid, parseISO } from 'date-fns'
import { fetchGroqAssistantSuggestions, type GroqItemSummary } from '@/api/groq'

const inventoryStore = useInventoryStore()
const authStore = useAuthStore()

const { items, activeItems } = storeToRefs(inventoryStore)

const isOpen = ref(false)
const isLoading = ref(false)
const error = ref<string | null>(null)
const suggestions = ref('')

const householdName = computed(() => {
  const user = authStore.user
  if (!user) return 'UseItUp Household'

  if (typeof user.inventoryName === 'string' && user.inventoryName.trim().length > 0) {
    return user.inventoryName
  }

  if (typeof user.displayName === 'string' && user.displayName.trim().length > 0) {
    return user.displayName
  }

  return 'UseItUp Household'
})

const consumedWithinThreeDays = computed(() => {
  const now = new Date()

  return items.value
    .filter(item => item.status === 'used')
    .filter(item => {
      const consumedDate = item.updatedAt || item.createdAt
      if (!consumedDate) return false
      const parsed = parseISO(consumedDate)
      if (!isValid(parsed)) return false
      const diff = differenceInCalendarDays(now, parsed)
      return diff <= 3
    })
})

const assistantPayload = computed(() => {
  const activeSummaries = activeItems.value.slice(0, 12).map<GroqItemSummary>(item => ({
    name: item.name,
    quantity: toNumberOrUndefined(item.quantity),
    unit: item.unit,
    expiresInDays: getDaysUntil(item.expiryDate),
    category: item.category,
    status: 'active'
  }))

  const consumedSummaries = consumedWithinThreeDays.value.slice(0, 10).map<GroqItemSummary>(item => ({
    name: item.name,
    quantity: toNumberOrUndefined(item.quantity),
    unit: item.unit,
    category: item.category,
    status: 'consumed',
    consumedAt: formatDate(item.updatedAt || item.createdAt)
  }))

  return {
    activeItems: activeSummaries,
    consumedItems: consumedSummaries,
    householdName: householdName.value
  }
})

const responseLines = computed(() => {
  if (!suggestions.value) return []
  return suggestions.value
    .split(/\n+/)
    .map(line => line.trim())
    .filter(Boolean)
})

watch(isOpen, value => {
  if (value && !suggestions.value) {
    refresh()
  }
})

watch(
  () => assistantPayload.value,
  () => {
    if (isOpen.value && !isLoading.value) {
      refresh()
    }
  },
  { deep: true }
)

function toggleAssistant() {
  isOpen.value = !isOpen.value
}

function closeAssistant() {
  isOpen.value = false
}

async function refresh() {
  if (isLoading.value) return

  try {
    isLoading.value = true
    error.value = null
    const content = await fetchGroqAssistantSuggestions(assistantPayload.value)
    suggestions.value = content
  } catch (err) {
    if (err instanceof Error) {
      error.value = err.message
    } else {
      error.value = '无法获取 Groq 建议，请稍后重试。'
    }
  } finally {
    isLoading.value = false
  }
}

function toNumberOrUndefined(value: unknown): number | undefined {
  const numeric = Number(value)
  return Number.isFinite(numeric) ? numeric : undefined
}

function getDaysUntil(dateString?: string): number | null {
  if (!dateString) return null
  const parsed = parseISO(dateString)
  if (!isValid(parsed)) return null
  const now = new Date()
  return differenceInCalendarDays(parsed, now)
}

function formatDate(dateString?: string): string | undefined {
  if (!dateString) return undefined
  const parsed = parseISO(dateString)
  if (!isValid(parsed)) return undefined
  return format(parsed, 'MM-dd HH:mm')
}
</script>

<style scoped>
.dashboard-assistant {
  position: fixed;
  right: 1.5rem;
  bottom: 1.5rem;
  z-index: 50;
  display: flex;
  flex-direction: column;
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
