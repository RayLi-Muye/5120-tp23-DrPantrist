<template>
  <Teleport to="body">
    <Transition name="impact-trend-modal">
      <div v-if="visible" class="impact-trend-modal" role="dialog" aria-modal="true" :aria-labelledby="titleId"
        :aria-describedby="descriptionId" @click.self="handleClose">
        <div class="impact-trend-modal__backdrop" />
        <div class="impact-trend-modal__content" @click.stop>
          <button class="impact-trend-modal__close" type="button" aria-label="Close impact trend overlay"
            @click="handleClose">
            <span aria-hidden="true">&times;</span>
          </button>

          <header class="impact-trend-modal__header">
            <h2 :id="titleId">{{ contextTitle }}</h2>
          </header>

          <p :id="descriptionId" class="impact-trend-modal__description">
            {{ contextDescription }}
          </p>
          <div class="impact-trend-modal__chart">
            <div v-if="hasTrendData" class="impact-trend-modal__chart-container">
              <VChart class="impact-trend-modal__chart-instance" :option="chartOption" autoresize />
            </div>
            <p v-else class="impact-trend-modal__empty">
              No food usage recorded in the past 7 days yet. Come back after saving a few more meals!
            </p>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { computed, watch, onUnmounted } from 'vue';
import { use } from 'echarts/core';
import { CanvasRenderer } from 'echarts/renderers';
import { LineChart } from 'echarts/charts';
import { GridComponent, TooltipComponent, LegendComponent } from 'echarts/components';
import VChart from 'vue-echarts';
import type { WeeklyImpactTrend } from '@/stores/impact';

use([CanvasRenderer, LineChart, GridComponent, TooltipComponent, LegendComponent]);

interface ImpactSummaryDisplay {
  moneyLabel: string;
  moneyValue: string;
  co2Label: string;
  co2Value: string;
}

interface Props {
  visible: boolean;
  trend: WeeklyImpactTrend;
  context: 'private' | 'shared';
  summary: ImpactSummaryDisplay;
  profileName?: string;
}

const props = withDefaults(defineProps<Props>(), {
  visible: false,
  trend: () => ({
    labels: [],
    money: [],
    co2: [],
  }),
  context: 'shared',
  summary: () => ({
    moneyLabel: 'Well Spent',
    moneyValue: '$0.00',
    co2Label: 'CO₂ Avoided',
    co2Value: '0g CO₂',
  }),
  profileName: '',
});

const emit = defineEmits<{
  close: [];
}>();

const titleId = 'impact-trend-modal-title';
const descriptionId = 'impact-trend-modal-description';

const contextTitle = computed(() => {
  if (props.context === 'private') {
    return props.profileName ? `${props.profileName}'s Impact Trend` : 'Private Impact Trend';
  }
  return 'Shared Impact Trend';
});

const contextDescription = computed(() => {
  if (props.context === 'private') {
    const owner = props.profileName ? `${props.profileName}'s` : "This member's";
    return `${owner} savings tracked over the past 7 days.`;
  }
  return 'Shared household savings across the past 7 days.';
});

const hasTrendData = computed(
  () =>
    props.trend.money.some((value) => value > 0) || props.trend.co2.some((value) => value > 0),
);

const chartOption = computed(() => {
  const isSmallDataset = props.trend.labels.length <= 2;
  return {
    color: ['#34d399', '#60a5fa'],
    tooltip: {
      trigger: 'axis',
      valueFormatter: (value: number) => {
        if (Number.isFinite(value)) {
          return value.toFixed(value >= 1 ? 2 : 3);
        }
        return `${value}`;
      },
    },
    legend: {
      data: ['Money Well Spent', 'CO₂ Avoided'],
    },
    grid: {
      left: 48,
      right: 48,
      top: 60,
      bottom: 48,
    },
    xAxis: {
      type: 'category',
      boundaryGap: false,
      data: props.trend.labels,
      axisLabel: {
        color: '#4b5563',
      },
      axisLine: {
        lineStyle: {
          color: 'rgba(148, 163, 184, 0.4)',
        },
      },
    },
    yAxis: [
      {
        type: 'value',
        name: 'Money ($)',
        min: 0,
        axisLabel: {
          color: '#4b5563',
          formatter: (value: number) => `$${value.toFixed(value >= 1 ? 0 : 2)}`,
        },
        axisLine: {
          lineStyle: {
            color: 'rgba(148, 163, 184, 0.4)',
          },
        },
        splitLine: {
          lineStyle: {
            color: 'rgba(148, 163, 184, 0.2)',
          },
        },
      },
      {
        type: 'value',
        name: 'CO₂ (kg)',
        min: 0,
        axisLabel: {
          color: '#4b5563',
          formatter: (value: number) => `${value.toFixed(value >= 1 ? 1 : 3)}`,
        },
        axisLine: {
          lineStyle: {
            color: 'rgba(148, 163, 184, 0.4)',
          },
        },
        splitLine: {
          show: false,
        },
      },
    ],
    series: [
      {
        name: 'Money Well Spent',
        type: 'line',
        smooth: !isSmallDataset,
        showSymbol: isSmallDataset,
        symbolSize: isSmallDataset ? 10 : 6,
        data: props.trend.money,
        yAxisIndex: 0,
        areaStyle: {
          opacity: 0.1,
        },
      },
      {
        name: 'CO₂ Avoided',
        type: 'line',
        smooth: !isSmallDataset,
        showSymbol: isSmallDataset,
        symbolSize: isSmallDataset ? 10 : 6,
        data: props.trend.co2,
        yAxisIndex: 1,
        areaStyle: {
          opacity: 0.05,
        },
      },
    ],
  };
});

function handleClose() {
  emit('close');
}

const handleEscape = (event: KeyboardEvent) => {
  if (event.key === 'Escape') {
    handleClose();
  }
};

watch(
  () => props.visible,
  (newVisible) => {
    if (newVisible) {
      window.addEventListener('keydown', handleEscape);
    } else {
      window.removeEventListener('keydown', handleEscape);
    }
  },
  { immediate: false },
);

onUnmounted(() => {
  window.removeEventListener('keydown', handleEscape);
});
</script>

<style scoped lang="scss">
.impact-trend-modal {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  z-index: var(--z-index-modal);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: var(--spacing-lg);
}

.impact-trend-modal__backdrop {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.6);
  z-index: var(--z-index-modal-backdrop);
}

.impact-trend-modal__content {
  position: relative;
  z-index: var(--z-index-modal);
  background: var(--color-bg-primary);
  border-radius: var(--border-radius-xl);
  box-shadow: var(--shadow-lg);
  max-width: 640px;
  width: 100%;
  max-height: 90vh;
  overflow-y: auto;
  padding: var(--spacing-xl) var(--spacing-xl) var(--spacing-lg);
  color: var(--color-text-primary);
}

.impact-trend-modal__close {
  position: absolute;
  top: var(--spacing-md);
  right: var(--spacing-md);
  width: 32px;
  height: 32px;
  border: none;
  border-radius: 50%;
  background: transparent;
  color: var(--color-text-secondary);
  font-size: var(--font-size-xl);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background-color var(--duration-fast) ease, color var(--duration-fast) ease;

  &:hover,
  &:focus-visible {
    background-color: var(--color-bg-secondary);
    color: var(--color-text-primary);
    outline: none;
  }
}

.impact-trend-modal__header {
  text-align: center;
  margin-bottom: var(--spacing-lg);

  h2 {
    margin: 0 0 var(--spacing-sm);
    font-size: var(--font-size-xl);
    font-weight: var(--font-weight-semibold);
    color: var(--color-fresh);
  }
}

.impact-trend-modal__description {
  margin: 0;
  color: var(--color-text-secondary);
  font-size: var(--font-size-sm);
}

.impact-trend-modal__summary {
  display: flex;
  gap: var(--spacing-md);
  margin-bottom: var(--spacing-lg);
  background: rgba(52, 211, 153, 0.08);
  padding: var(--spacing-md);
  border-radius: var(--border-radius-lg);
  border: 1px solid rgba(52, 211, 153, 0.2);
  justify-content: center;
  flex-wrap: wrap;
}

.impact-trend-modal__summary-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  min-width: 140px;
}

.impact-trend-modal__summary-label {
  font-size: var(--font-size-xs);
  text-transform: uppercase;
  color: var(--color-text-secondary);
  letter-spacing: 0.08em;
}

.impact-trend-modal__summary-value {
  font-size: var(--font-size-lg);
  font-weight: var(--font-weight-bold);
  color: var(--color-text-primary);
  margin-top: var(--spacing-xs);
}

.impact-trend-modal__chart {
  background: var(--color-bg-secondary);
  border-radius: var(--border-radius-lg);
  padding: var(--spacing-lg);
}

.impact-trend-modal__chart-container {
  width: 100%;
  min-height: 280px;
}

.impact-trend-modal__chart-instance {
  width: 100%;
  height: 280px;
}

.impact-trend-modal__empty {
  margin: 0;
  text-align: center;
  font-size: var(--font-size-sm);
  color: var(--color-text-secondary);
}

.impact-trend-modal-enter-active,
.impact-trend-modal-leave-active {
  transition: opacity var(--duration-normal) ease, transform var(--duration-normal) ease;
}

.impact-trend-modal-enter-from,
.impact-trend-modal-leave-to {
  opacity: 0;
  transform: translateY(10px);
}

@media (max-width: 576px) {
  .impact-trend-modal {
    padding: var(--spacing-md);
  }

  .impact-trend-modal__content {
    padding: var(--spacing-lg);
  }

  .impact-trend-modal__chart-container,
  .impact-trend-modal__chart-instance {
    min-height: 220px;
    height: 220px;
  }
}
</style>
