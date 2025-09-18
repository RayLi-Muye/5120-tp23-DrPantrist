<template>
  <div class="insight-card-content">
    <h3>{{ title }}</h3>
    <p class="description">{{ description }}</p>
    <v-chart class="chart" :option="chartOption" autoresize />
    <p class="source">Source: {{ source }}</p>
  </div>
</template>

<script setup lang="ts">
import { use } from 'echarts/core';
import { CanvasRenderer } from 'echarts/renderers';
import { PieChart, BarChart } from 'echarts/charts';
import {
  TitleComponent,
  TooltipComponent,
  LegendComponent,
  GridComponent,
} from 'echarts/components';
import VChart from 'vue-echarts';
import { defineProps } from 'vue';
import type { PropType } from 'vue';

// ECharts setup
use([
  CanvasRenderer,
  PieChart,
  BarChart,
  TitleComponent,
  TooltipComponent,
  LegendComponent,
  GridComponent,
]);

// Define props with TypeScript types
defineProps({
  title: {
    type: String,
    required: true,
  },
  description: {
    type: String,
    required: true,
  },
  source: {
    type: String,
    required: true,
  },
  chartOption: {
    type: Object as PropType<Record<string, unknown>>,
    required: true,
  },
});
</script>

<style scoped>
.insight-card-content {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  padding: 1.5rem 1rem 1rem;
  box-sizing: border-box;
  text-align: center;
}

h3 {
  font-size: 1.25rem;
  color: #111827;
  margin: 0 0 0.5rem;
}

.description {
  font-size: 0.9rem;
  color: #4b5563;
  margin: 0 0 1rem;
  flex-shrink: 0;
}

.chart {
  width: 100%;
  flex-grow: 1; /* Allow chart to take available space */
  min-height: 200px; /* Ensure chart has a minimum height */
}

.source {
  font-size: 0.75rem;
  color: #9ca3af;
  margin-top: auto; /* Push to the bottom */
  flex-shrink: 0;
  padding-top: 0.5rem;
}
</style>
