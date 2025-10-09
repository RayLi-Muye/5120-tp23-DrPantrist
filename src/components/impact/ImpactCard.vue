<template>
  <Teleport to="body">
    <Transition name="impact-modal" appear>
      <div
        v-if="visible"
        class="impact-modal"
        role="dialog"
        aria-labelledby="impact-title"
        aria-describedby="impact-description"
        @click="handleBackdropClick"
      >
        <div class="impact-modal__backdrop" />
        <div class="impact-modal__content" @click.stop>
          <!-- Close button -->
          <button
            class="impact-modal__close"
            type="button"
            aria-label="Close impact card"
            @click="$emit('dismissed')"
          >
            <span aria-hidden="true">&times;</span>
          </button>

          <!-- Impact celebration -->
          <div class="impact-celebration">
            <div class="impact-celebration__icon">🎉</div>
            <h2 id="impact-title" class="impact-celebration__title">Great job!</h2>
            <p class="impact-celebration__message">
              {{ motivationalMessage }}
            </p>
          </div>

          <!-- Impact metrics -->
          <div class="impact-metrics">
            <div class="impact-metrics__item">
              <div class="impact-metrics__icon">💰</div>
              <div class="impact-metrics__content">
                <div class="impact-metrics__label">Well Spent</div>
                <div class="impact-metrics__value">{{ formattedImpact.moneySaved }}</div>
              </div>
            </div>

            <div class="impact-metrics__item">
              <div class="impact-metrics__icon">🌱</div>
              <div class="impact-metrics__content">
                <div class="impact-metrics__label">CO₂ Avoided</div>
                <div class="impact-metrics__value">{{ formattedImpact.co2Avoided }}</div>
                <div class="impact-metrics__comparison">{{ formattedImpact.co2Comparison }}</div>
              </div>
            </div>
          </div>

          <!-- Item details -->
          <div id="impact-description" class="impact-details">
            <p class="impact-details__text">
              You used <strong>{{ formattedImpact.itemName }}</strong> before it expired!
            </p>
          </div>

          <!-- Actions -->
          <div class="impact-actions">
            <button
              class="impact-trend__toggle"
              :class="{ 'impact-trend__toggle--active': showTrend }"
              type="button"
              :aria-pressed="showTrend"
              @click="handleToggleTrend"
            >
              {{ trendToggleLabel }}
            </button>
          </div>

          <Transition name="impact-trend">
            <div v-if="showTrend" class="impact-trend">
              <div v-if="hasTrendData" class="impact-trend__chart-container">
                <VChart class="impact-trend__chart" :option="trendChartOption" autoresize />
              </div>
              <p v-else class="impact-trend__empty">
                No food consumption recorded in the last 7 days yet. Keep saving!
              </p>
            </div>
          </Transition>

          <!-- Auto-dismiss indicator -->
          <div v-if="!showTrend" class="impact-auto-dismiss">
            <div class="impact-auto-dismiss__progress" :style="progressStyle" />
            <p class="impact-auto-dismiss__text">Auto-closing in {{ remainingSeconds }}s</p>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { computed, ref, onMounted, onUnmounted, watch } from "vue";
import { use } from "echarts/core";
import { CanvasRenderer } from "echarts/renderers";
import { LineChart } from "echarts/charts";
import { GridComponent, TooltipComponent, LegendComponent } from "echarts/components";
import VChart from "vue-echarts";
import type { FormattedImpactData, WeeklyImpactTrend } from "@/stores/impact";

use([CanvasRenderer, LineChart, GridComponent, TooltipComponent, LegendComponent]);

// Props
interface Props {
  visible: boolean;
  impact: FormattedImpactData | null;
  motivationalMessage: string;
  weeklyTrend: WeeklyImpactTrend;
}

const props = withDefaults(defineProps<Props>(), {
  visible: false,
  impact: null,
  motivationalMessage: "Great job!",
  weeklyTrend: () => ({
    labels: [],
    money: [],
    co2: [],
  }),
});

// Emits
interface Emits {
  dismissed: [];
}

const emit = defineEmits<Emits>();

// Auto-dismiss timer state
const remainingSeconds = ref(3);
const progressWidth = ref(100);
const autoHideTimer = ref<number | null>(null);
const progressTimer = ref<number | null>(null);
const showTrend = ref(false);

// Computed properties
const formattedImpact = computed(() => {
  return (
    props.impact || {
      moneySaved: "$0.00",
      co2Avoided: "0g CO₂",
      co2Comparison: "",
      itemName: "",
      actionType: "used",
    }
  );
});

const progressStyle = computed(() => ({
  width: `${progressWidth.value}%`,
}));

const hasTrendData = computed(() => {
  return (
    props.weeklyTrend.money.some((value) => value > 0) ||
    props.weeklyTrend.co2.some((value) => value > 0)
  );
});

const trendChartOption = computed(() => {
  const isSmallDataset = props.weeklyTrend.labels.length <= 2;
  return {
    color: ["#34d399", "#60a5fa"],
    tooltip: {
      trigger: "axis",
      valueFormatter: (value: number) => {
        if (Number.isFinite(value)) {
          return value.toFixed(value >= 1 ? 2 : 3);
        }
        return `${value}`;
      },
    },
    legend: {
      data: ["Money Well Spent", "CO₂ Avoided"],
    },
    grid: {
      left: 40,
      right: 40,
      top: 40,
      bottom: 40,
    },
    xAxis: {
      type: "category",
      boundaryGap: false,
      data: props.weeklyTrend.labels,
      axisLabel: {
        color: "#4b5563",
      },
    },
    yAxis: [
      {
        type: "value",
        name: "Money ($)",
        min: 0,
        axisLabel: {
          color: "#4b5563",
          formatter: (value: number) => `$${value.toFixed(value >= 1 ? 0 : 2)}`,
        },
      },
      {
        type: "value",
        name: "CO₂ (kg)",
        min: 0,
        axisLabel: {
          color: "#4b5563",
          formatter: (value: number) => `${value.toFixed(value >= 1 ? 1 : 3)}`,
        },
      },
    ],
    series: [
      {
        name: "Money Well Spent",
        type: "line",
        smooth: !isSmallDataset,
        showSymbol: isSmallDataset,
        symbolSize: isSmallDataset ? 10 : 6,
        data: props.weeklyTrend.money,
        yAxisIndex: 0,
        areaStyle: {
          opacity: 0.1,
        },
      },
      {
        name: "CO₂ Avoided",
        type: "line",
        smooth: !isSmallDataset,
        showSymbol: isSmallDataset,
        symbolSize: isSmallDataset ? 10 : 6,
        data: props.weeklyTrend.co2,
        yAxisIndex: 1,
        areaStyle: {
          opacity: 0.05,
        },
      },
    ],
  };
});

const trendToggleLabel = computed(() => (showTrend.value ? "Hide 7-day trend" : "View 7-day trend"));

// Methods
function handleBackdropClick() {
  emit("dismissed");
}

function startAutoHideTimer() {
  clearTimers();

  progressWidth.value = 100;
  remainingSeconds.value = 3;

  if (showTrend.value) {
    return;
  }

  // Update countdown every 100ms for smooth progress bar
  progressTimer.value = window.setInterval(() => {
    progressWidth.value -= 100 / 30; // 30 intervals over 3 seconds

    if (progressWidth.value <= 0) {
      progressWidth.value = 0;
    }
  }, 100);

  // Update seconds display every second
  autoHideTimer.value = window.setInterval(() => {
    remainingSeconds.value--;

    if (remainingSeconds.value <= 0) {
      emit("dismissed");
    }
  }, 1000);
}

function clearTimers() {
  if (autoHideTimer.value) {
    clearInterval(autoHideTimer.value);
    autoHideTimer.value = null;
  }

  if (progressTimer.value) {
    clearInterval(progressTimer.value);
    progressTimer.value = null;
  }
}

function handleToggleTrend() {
  showTrend.value = !showTrend.value;
}

// Watchers
watch(
  () => props.visible,
  (newVisible) => {
    if (newVisible) {
      showTrend.value = false;
      startAutoHideTimer();
    } else {
      clearTimers();
      showTrend.value = false;
    }
  }
);

watch(
  () => showTrend.value,
  (isActive) => {
    if (isActive) {
      clearTimers();
    } else if (props.visible) {
      startAutoHideTimer();
    }
  }
);

// Lifecycle
onMounted(() => {
  if (props.visible) {
    startAutoHideTimer();
  }
});

onUnmounted(() => {
  clearTimers();
});
</script>

<style scoped lang="scss">
// Impact Modal Overlay
.impact-modal {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  z-index: var(--z-index-modal);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: var(--spacing-md);

  &__backdrop {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background-color: rgba(0, 0, 0, 0.6);
    z-index: var(--z-index-modal-backdrop);
  }

  &__content {
    position: relative;
    background-color: var(--color-bg-primary);
    border-radius: var(--border-radius-xl);
    box-shadow: var(--shadow-lg);
    max-width: 400px;
    width: 100%;
    max-height: 90vh;
    overflow-y: auto;
    z-index: var(--z-index-modal);
    padding: var(--spacing-xl);
    text-align: center;
  }

  &__close {
    position: absolute;
    top: var(--spacing-md);
    right: var(--spacing-md);
    width: 32px;
    height: 32px;
    border: none;
    background: none;
    font-size: var(--font-size-xl);
    color: var(--color-text-secondary);
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 50%;
    transition: all var(--duration-fast) ease;

    &:hover {
      background-color: var(--color-bg-secondary);
      color: var(--color-text-primary);
    }
  }
}

// Impact Celebration Section
.impact-celebration {
  margin-bottom: var(--spacing-xl);

  &__icon {
    font-size: 3rem;
    margin-bottom: var(--spacing-md);
    animation: bounce 0.6s ease-in-out;
  }

  &__title {
    font-size: var(--font-size-xl);
    font-weight: var(--font-weight-bold);
    color: var(--color-fresh);
    margin-bottom: var(--spacing-sm);
  }

  &__message {
    font-size: var(--font-size-lg);
    color: var(--color-text-primary);
    font-weight: var(--font-weight-medium);
  }
}

// Impact Metrics Section
.impact-metrics {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-lg);
  margin-bottom: var(--spacing-xl);

  &__item {
    display: flex;
    align-items: center;
    gap: var(--spacing-md);
    padding: var(--spacing-md);
    background-color: var(--color-bg-secondary);
    border-radius: var(--border-radius-lg);
    text-align: left;
  }

  &__icon {
    font-size: 2rem;
    flex-shrink: 0;
  }

  &__content {
    flex: 1;
  }

  &__label {
    font-size: var(--font-size-sm);
    color: var(--color-text-secondary);
    font-weight: var(--font-weight-medium);
    margin-bottom: var(--spacing-xs);
  }

  &__value {
    font-size: var(--font-size-lg);
    font-weight: var(--font-weight-bold);
    color: var(--color-fresh);
    margin-bottom: var(--spacing-xs);
  }

  &__comparison {
    font-size: var(--font-size-xs);
    color: var(--color-text-secondary);
    font-style: italic;
  }
}

// Impact Details Section
.impact-details {
  margin-bottom: var(--spacing-xl);
  padding: var(--spacing-md);
  background-color: rgba(40, 167, 69, 0.1);
  border-radius: var(--border-radius-md);
  border-left: 4px solid var(--color-fresh);

  &__text {
    font-size: var(--font-size-base);
    color: var(--color-text-primary);
    margin: 0;

    strong {
      color: var(--color-fresh);
      font-weight: var(--font-weight-semibold);
    }
  }
}

.impact-actions {
  display: flex;
  justify-content: center;
  margin-bottom: var(--spacing-lg);
}

.impact-trend__toggle {
  border: none;
  background-color: var(--color-primary);
  color: #fff;
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-semibold);
  padding: var(--spacing-sm) var(--spacing-lg);
  border-radius: var(--border-radius-lg);
  cursor: pointer;
  transition: filter var(--duration-fast) ease, transform var(--duration-fast) ease;

  &:hover,
  &:focus-visible {
    filter: brightness(0.95);
    transform: translateY(-1px);
  }

  &:active {
    transform: translateY(0);
  }

  &--active {
    background-color: var(--color-fresh);
  }
}

.impact-trend {
  background-color: var(--color-bg-secondary);
  border-radius: var(--border-radius-lg);
  padding: var(--spacing-lg);
  margin-bottom: var(--spacing-lg);
}

.impact-trend__chart-container {
  width: 100%;
  min-height: 220px;
}

.impact-trend__chart {
  width: 100%;
  height: 220px;
}

.impact-trend__empty {
  margin: 0;
  font-size: var(--font-size-sm);
  color: var(--color-text-secondary);
  text-align: center;
}

// Auto-dismiss Indicator
.impact-auto-dismiss {
  &__progress {
    height: 3px;
    background-color: var(--color-primary);
    border-radius: var(--border-radius-sm);
    transition: width 100ms linear;
    margin-bottom: var(--spacing-sm);
  }

  &__text {
    font-size: var(--font-size-xs);
    color: var(--color-text-secondary);
    margin: 0;
  }
}

// Animations
@keyframes bounce {
  0%,
  20%,
  53%,
  80%,
  100% {
    transform: translate3d(0, 0, 0);
  }
  40%,
  43% {
    transform: translate3d(0, -15px, 0);
  }
  70% {
    transform: translate3d(0, -7px, 0);
  }
  90% {
    transform: translate3d(0, -2px, 0);
  }
}

// Modal Transitions
.impact-modal-enter-active {
  transition: all var(--duration-normal) ease-out;
}

.impact-modal-leave-active {
  transition: all var(--duration-fast) ease-in;
}

.impact-modal-enter-from {
  opacity: 0;
}

.impact-modal-leave-to {
  opacity: 0;
}

.impact-modal-enter-from .impact-modal__content {
  transform: scale(0.9) translateY(20px);
  opacity: 0;
}

.impact-modal-leave-to .impact-modal__content {
  transform: scale(0.95) translateY(-10px);
  opacity: 0;
}

.impact-trend-enter-active,
.impact-trend-leave-active {
  transition: opacity var(--duration-normal) ease, transform var(--duration-normal) ease;
}

.impact-trend-enter-from,
.impact-trend-leave-to {
  opacity: 0;
  transform: translateY(10px);
}

.impact-modal__content {
  transition: all var(--duration-normal) ease-out;
}

// Responsive Design
@media (max-width: 480px) {
  .impact-modal {
    padding: var(--spacing-sm);
  }

  .impact-modal__content {
    padding: var(--spacing-lg);
  }

  .impact-celebration__icon {
    font-size: 2.5rem;
  }

  .impact-celebration__title {
    font-size: var(--font-size-lg);
  }

  .impact-celebration__message {
    font-size: var(--font-size-base);
  }

  .impact-metrics__item {
    padding: var(--spacing-sm);
  }

  .impact-metrics__icon {
    font-size: 1.5rem;
  }
}

// Accessibility improvements
@media (prefers-reduced-motion: reduce) {
  .impact-celebration__icon {
    animation: none;
  }

  .impact-modal-enter-active,
  .impact-modal-leave-active,
  .impact-modal__content {
    transition: none;
  }
}

// High contrast mode support
@media (prefers-contrast: high) {
  .impact-modal__content {
    border: 2px solid var(--color-text-primary);
  }

  .impact-metrics__item {
    border: 1px solid var(--color-border);
  }
}
</style>
