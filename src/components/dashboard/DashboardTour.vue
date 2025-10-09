<template>
  <div class="dashboard-tour">
    <button
      class="tour-trigger"
      type="button"
      @click="startTour"
      :aria-expanded="isRunning"
      aria-controls="dashboard-tour-popover"
    >
      Quick Start Guide
    </button>

    <Teleport to="body">
      <div v-if="isRunning" class="tour-layer">
        <div class="tour-dismiss-zone" @click="endTour" aria-hidden="true"></div>
        <div
          class="tour-highlight"
          :style="highlightStyle"
          aria-hidden="true"
        ></div>
        <section
          id="dashboard-tour-popover"
          class="tour-popover"
          :class="`tour-popover--${placement}`"
          :style="popoverStyle"
          role="dialog"
          aria-modal="false"
          aria-live="polite"
        >
          <header class="tour-popover__header">
            <span class="tour-step">{{ activeStepLabel }}</span>
            <h3>{{ currentStep?.title }}</h3>
          </header>
          <p class="tour-popover__desc">{{ message }}</p>
          <footer class="tour-controls">
            <button
              type="button"
              class="tour-btn"
              @click="prevStep"
              :disabled="isFirst"
            >
              Back
            </button>
            <button
              type="button"
              class="tour-btn tour-btn--primary"
              @click="nextOrFinish"
            >
              {{ isLast ? 'Finish' : 'Next' }}
            </button>
          </footer>
        </section>
      </div>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue'

type TourPlacement = 'below' | 'above' | 'center'

interface TourStep {
  id: string
  selector: string
  title: string
  description: string
  fallback?: string
}

const steps: TourStep[] = [
  {
    id: 'add-item',
    selector: '[data-tour-id="add-item"]',
    title: 'Add Items',
    description: 'Press the + button to add private or shared items quickly.',
    fallback: 'Add button not found. Make sure the inventory sections have finished loading.'
  },
  {
    id: 'profile-manager',
    selector: '[data-tour-id="profile-manager"]',
    title: 'Manage Members',
    description: 'Use the household slots to add or rename members and create separate private inventories for each person.',
    fallback: 'Member controls are unavailable right now. Try reloading the dashboard.'
  },
  {
    id: 'use-item',
    selector: '[data-tour-id="use-item"]',
    title: 'Mark Items Used',
    description: 'Click on an item card to mark it as used so savings and carbon impact stay accurate.',
    fallback: 'No items are available to mark yet. Try adding something first.'
  },
  {
    id: 'ai-assistant',
    selector: '[data-tour-id="ai-assistant"]',
    title: 'AI Assistant',
    description: 'The bottom-right AI button reviews inventory and recent usage to recommend groceries purchasing options.',
    fallback: 'AI button not found. Confirm the page has finished loading.'
  },
  {
    id: 'impact-summary',
    selector: '[data-tour-id="impact-summary"]',
    title: 'Impact Summary',
    description: 'Well Spent shows the money saved, and CO2 Avoided highlights the emissions you prevented.',
    fallback: 'Impact summary is unavailable or still loading.'
  }
]

const activeIndex = ref<number>(-1)
const highlight = reactive({
  visible: false,
  top: 0,
  left: 0,
  width: 0,
  height: 0
})
const popoverPoint = reactive({ top: 0, left: 0 })
const placement = ref<TourPlacement>('below')
const missingTarget = ref(false)

let pendingAnimation: number | null = null
let scrollTargetId: string | null = null

const isRunning = computed(() => activeIndex.value >= 0)
const isFirst = computed(() => activeIndex.value === 0)
const isLast = computed(() => activeIndex.value === steps.length - 1)
const currentStep = computed(() => (activeIndex.value >= 0 ? steps[activeIndex.value] : null))
const activeStepLabel = computed(() => (activeIndex.value >= 0 ? `Step ${activeIndex.value + 1}/${steps.length}` : ''))

const message = computed(() => {
  if (!currentStep.value) return ''
  if (missingTarget.value && currentStep.value.fallback) {
    return currentStep.value.fallback
  }
  return currentStep.value.description
})

const highlightStyle = computed<Record<string, string>>(() => {
  if (!highlight.visible) {
    return {
      top: '-9999px',
      left: '-9999px',
      width: '0px',
      height: '0px',
      opacity: '0'
    }
  }

  return {
    top: `${highlight.top}px`,
    left: `${highlight.left}px`,
    width: `${highlight.width}px`,
    height: `${highlight.height}px`,
    opacity: '1'
  }
})

const popoverStyle = computed<Record<string, string>>(() => {
  if (!isRunning.value) {
    return {
      top: '-9999px',
      left: '-9999px',
      transform: 'translateY(0)'
    }
  }

  if (placement.value === 'center') {
    return {
      top: '50%',
      left: '50%',
      transform: 'translate(-50%, -50%)'
    }
  }

  return {
    top: `${popoverPoint.top}px`,
    left: `${popoverPoint.left}px`,
    transform: placement.value === 'above' ? 'translateY(-100%)' : 'translateY(0)'
  }
})

function startTour(): void {
  activeIndex.value = 0
  nextTick(() => updatePositions(true))
}

function endTour(): void {
  activeIndex.value = -1
  highlight.visible = false
  missingTarget.value = false
}

function nextOrFinish(): void {
  if (isLast.value) {
    endTour()
    return
  }
  activeIndex.value += 1
  nextTick(() => updatePositions(true))
}

function prevStep(): void {
  if (isFirst.value) return
  activeIndex.value -= 1
  nextTick(() => updatePositions(true))
}

function updatePositions(forceScroll = false): void {
  if (!isRunning.value) return
  const step = currentStep.value
  if (!step) return

  const target = document.querySelector<HTMLElement>(step.selector)

  if (!target) {
    missingTarget.value = true
    highlight.visible = false
    placement.value = 'center'
    popoverPoint.top = window.innerHeight / 2
    popoverPoint.left = window.innerWidth / 2
    return
  }

  const rect = target.getBoundingClientRect()
  const padding = 12
  const safeMargin = 16
  const fullyVisible =
    rect.top >= safeMargin && rect.bottom <= window.innerHeight - safeMargin

  if (!fullyVisible && (forceScroll || scrollTargetId !== step.id)) {
    scrollTargetId = step.id
    target.scrollIntoView({ block: 'center', behavior: forceScroll ? 'smooth' : 'auto' })
    window.setTimeout(() => updatePositions(false), 280)
    return
  }

  scrollTargetId = null
  missingTarget.value = false
  highlight.visible = true
  highlight.top = Math.max(rect.top - padding, safeMargin)
  highlight.left = Math.max(rect.left - padding, safeMargin)
  highlight.width = Math.min(rect.width + padding * 2, window.innerWidth - highlight.left - safeMargin)
  highlight.height = Math.min(rect.height + padding * 2, window.innerHeight - highlight.top - safeMargin)

  placement.value = 'below'
  popoverPoint.left = Math.min(
    Math.max(rect.left, safeMargin),
    window.innerWidth - 320 - safeMargin
  )
  popoverPoint.top = rect.bottom + 16

  if (popoverPoint.top + 200 > window.innerHeight) {
    placement.value = 'above'
    popoverPoint.top = Math.max(rect.top - 16, safeMargin)
  }
}

function handleWindowChange(): void {
  if (!isRunning.value) return
  if (pendingAnimation !== null) {
    cancelAnimationFrame(pendingAnimation)
  }
  pendingAnimation = requestAnimationFrame(() => {
    pendingAnimation = null
    updatePositions(false)
  })
}

onMounted(() => {
  window.addEventListener('resize', handleWindowChange)
  window.addEventListener('scroll', handleWindowChange, true)
})

onBeforeUnmount(() => {
  window.removeEventListener('resize', handleWindowChange)
  window.removeEventListener('scroll', handleWindowChange, true)
  if (pendingAnimation !== null) {
    cancelAnimationFrame(pendingAnimation)
  }
})

watch(isRunning, value => {
  if (!value) return
  nextTick(() => updatePositions(true))
})
</script>

<style scoped>
.dashboard-tour {
  width: 100%;
  display: flex;
  justify-content: flex-end;
}

.tour-trigger {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  padding: 0.55rem 0.9rem;
  border-radius: 999px;
  background: transparent;
  border: 1px solid rgba(148, 163, 184, 0.45);
  color: #e2e8f0;
  font-weight: 600;
  font-size: 0.9rem;
  cursor: pointer;
  transition: transform 0.2s ease, background 0.2s ease;
}

.tour-trigger:hover {
  transform: translateY(-1px);
  background: rgba(148, 163, 184, 0.16);
}

.tour-trigger:focus-visible {
  outline: 2px solid #60a5fa;
  outline-offset: 3px;
}

.tour-layer {
  position: fixed;
  inset: 0;
  z-index: 999;
  pointer-events: none;
}

.tour-dismiss-zone {
  position: fixed;
  inset: 0;
  pointer-events: auto;
  background: transparent;
}

.tour-highlight {
  position: fixed;
  border-radius: 18px;
  border: 2px solid rgba(96, 165, 250, 0.9);
  box-shadow: 0 0 0 9999px rgba(15, 23, 42, 0.62);
  background: rgba(59, 130, 246, 0.15);
  pointer-events: none;
  transition: top 0.2s ease, left 0.2s ease, width 0.2s ease, height 0.2s ease;
}

.tour-popover {
  position: fixed;
  pointer-events: auto;
  max-width: 320px;
  background: rgba(15, 23, 42, 0.95);
  border-radius: 16px;
  border: 1px solid rgba(148, 163, 184, 0.35);
  box-shadow: 0 20px 44px rgba(15, 23, 42, 0.45);
  padding: 1rem;
  color: #f8fafc;
}

.tour-popover__header {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
  margin-bottom: 0.6rem;
}

.tour-popover__header h3 {
  margin: 0;
  font-size: 1.05rem;
  font-weight: 700;
}

.tour-step {
  font-size: 0.75rem;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: rgba(148, 163, 184, 0.9);
}

.tour-popover__desc {
  margin: 0 0 0.85rem;
  font-size: 0.9rem;
  line-height: 1.5;
  color: rgba(226, 232, 240, 0.9);
}

.tour-controls {
  display: flex;
  justify-content: flex-end;
  gap: 0.5rem;
}

.tour-btn {
  padding: 0.45rem 0.9rem;
  border-radius: 12px;
  border: 1px solid rgba(148, 163, 184, 0.5);
  background: rgba(148, 163, 184, 0.15);
  color: #e2e8f0;
  font-size: 0.85rem;
  cursor: pointer;
  transition: background 0.2s ease, border 0.2s ease;
}

.tour-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.tour-btn:not(:disabled):hover {
  background: rgba(148, 163, 184, 0.3);
}

.tour-btn--primary {
  border-color: rgba(96, 165, 250, 0.6);
  background: rgba(59, 130, 246, 0.35);
}

.tour-btn--primary:not(:disabled):hover {
  background: rgba(59, 130, 246, 0.55);
}

@media (max-width: 768px) {
  .dashboard-tour {
    justify-content: flex-start;
  }

  .tour-popover {
    max-width: min(90vw, 320px);
  }
}
</style>
