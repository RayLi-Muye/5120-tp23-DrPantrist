<template>
  <div class="home-page">
    <section class="hero">
      <div class="hero-content">
        <div class="hero-text">
          <h1 class="hero-title">
            <span class="highlight">Stop Food Waste</span>
            <br />
            Dr.Pantrist
          </h1>
          <p class="hero-subtitle">
            Track your groceries, saves money and helps our planet.
            <br />
            Make a positive impact on where we live.
          </p>
          <div
            class="hero-stats"
            ref="statsRef"
            @mousemove="onStatsMouseMove"
            @mouseleave="onStatsLeave"
          >
            <div
              class="flip-card stat"
              :class="{ active: activeStat === 'global-waste' }"
              @click="onStatClick('global-waste')"
            >
              <div class="flip-card-inner">
                <div class="flip-front stat-btn">
                  <span class="stat-number">1/3</span>
                  <span class="stat-label"><Picture></Picture>Reduced food wasted</span>
                </div>
                <div class="flip-back">
                  <button class="close-btn" @click.stop="closeStat">✕</button>
                  <DataInsightCard
                    title="Global Food Waste"
                    description="Nearly one-third of all food produced for human consumption is lost or wasted, amounting to 1.3 billion tonnes per year."
                    source="United Nations FAO"
                    :chart-option="globalWasteOption"
                  />
                </div>
              </div>
            </div>

            <div
              class="flip-card stat"
              :class="{ active: activeStat === 'aussie-impact' }"
              @click="onStatClick('aussie-impact')"
            >
              <div class="flip-card-inner">
                <div class="flip-front stat-btn">
                  <span class="stat-number">7,600,000 t</span>
                  <span class="stat-label">Food wasted in Australia per year</span>
                </div>
                <div class="flip-back">
                  <button class="close-btn" @click.stop="closeStat">✕</button>
                   <DataInsightCard
                    title="Australia's Annual Impact"
                    description="Australia's food waste contributes significantly to economic loss and environmental damage, with households being the largest source."
                    source="National Food Waste Baseline"
                    :chart-option="australianImpactOption"
                  />
                </div>
              </div>
            </div>

            <div
              class="flip-card stat"
              :class="{ active: activeStat === 'ghg-emissions' }"
              @click="onStatClick('ghg-emissions')"
            >
              <div class="flip-card-inner">
                <div class="flip-front stat-btn">
                  <span class="stat-number">Top 3</span>
                  <span class="stat-label">Global greenhouse gas emitter</span>
                </div>
                <div class="flip-back">
                  <button class="close-btn" @click.stop="closeStat">✕</button>
                   <DataInsightCard
                    title="A Staggering Carbon Footprint"
                    description="If food waste were a country, it would be the third-largest greenhouse gas emitter after the USA and China."
                    source="UNEP Food Waste Index Report"
                    :chart-option="ghgEmitterOption"
                  />
                </div>
              </div>
            </div>

            <div
              class="flip-card stat"
              :class="{ active: activeStat === 'water-footprint' }"
              @click="onStatClick('water-footprint')"
            >
              <div class="flip-card-inner">
                <div class="flip-front stat-btn">
                  <span class="stat-number">250km³</span>
                  <span class="stat-label">water wasted annually</span>
                </div>
                <div class="flip-back">
                  <button class="close-btn" @click.stop="closeStat">✕</button>
                   <DataInsightCard
                    title="Wasting Food = Wasting Water"
                    description="Food waste consumes 250 cubic kilometers of water annually—equivalent to 38× the water footprint of all US households."
                    source="FAO Food Wastage Footprint Report (2013)"
                    :chart-option="waterFootprintOption"
                  />
                </div>
              </div>
            </div>

            <div
              class="flip-card stat"
              :class="{ active: activeStat === 'waste-sources' }"
              @click="onStatClick('waste-sources')"
            >
              <div class="flip-card-inner">
                <div class="flip-front stat-btn">
                  <span class="stat-number">931M</span>
                  <span class="stat-label">tonnes from consumers</span>
                </div>
                <div class="flip-back">
                  <button class="close-btn" @click.stop="closeStat">✕</button>
                   <DataInsightCard
                    title="Where Does Food Waste Occur?"
                    description="In 2019, consumers wasted 931 million tonnes of food: households 61%, food service 26%, retail 13%. Halving this by 2030 is key to SDG 12.3."
                    source="UNEP Food Waste Index Report (2024)"
                    :chart-option="wasteSourcesOption"
                  />
                </div>
              </div>
            </div>
          </div>
          <button @click="getStarted" class="cta-button">
            Get Started
            <span class="button-icon">🚪</span>
          </button>
        </div>
      </div>
    </section>
    <div v-if="activeStat" class="stat-overlay" @click="closeStat" />
  </div>
</template>

<script setup lang="ts">
import { useRouter } from 'vue-router'
import { ref } from 'vue'
import DataInsightCard from '@/components/home/DataInsightCard.vue' // Adjust path if needed

const router = useRouter()

// --- State for Flip Cards ---
type StatId = 'global-waste' | 'aussie-impact' | 'ghg-emissions' | 'water-footprint' | 'waste-sources'
const activeStat = ref<StatId | null>(null)
const statsRef = ref<HTMLElement | null>(null)

function onStatClick(id: StatId) {
  activeStat.value = id
}
function closeStat() {
  activeStat.value = null
}

const getStarted = () => {
  router.push('/auth')
}

// --- Mouse Proximity Effect Logic ---
function onStatsMouseMove(e: MouseEvent) {
  const el = statsRef.value
  if (!el) return
  const rect = el.getBoundingClientRect()
  const x = e.clientX - rect.left
  const y = e.clientY - rect.top
  el.style.setProperty('--mx', `${x}px`)
  el.style.setProperty('--my', `${y}px`)
}
function onStatsLeave() {
  const el = statsRef.value
  if (!el) return
  el.style.removeProperty('--mx')
  el.style.removeProperty('--my')
}


// --- ECharts Data Configurations ---

// Chart 1: Global Waste Donut Chart
const globalWasteOption = ref({
  tooltip: { trigger: 'item', formatter: '{b}: {d}%' },
  series: [{
    name: 'Food Status',
    type: 'pie',
    radius: ['60%', '80%'],
    avoidLabelOverlap: false,
    label: { show: false },
    emphasis: {
      label: {
        show: true,
        fontSize: '16',
        fontWeight: 'bold',
        formatter: '{b}\n{d}%',
      },
    },
    data: [
      { value: 67, name: 'Consumed', itemStyle: { color: '#5cb85c' } },
      { value: 33, name: 'Wasted', itemStyle: { color: '#d9534f' } },
    ],
  }],
})

// Chart 2: Australian Impact Bar Chart
const australianImpactOption = ref({
  tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
  grid: { left: '3%', right: '4%', bottom: '3%', containLabel: true },
  xAxis: { type: 'value' },
  yAxis: {
    type: 'category',
    data: ['Emissions (M Tonnes CO₂e)', 'Cost ($ Billion)', 'Waste (M Tonnes)'],
    axisLabel: { interval: 0, rotate: 0 }
  },
  series: [{
    name: 'Annual Impact',
    type: 'bar',
    data: [
      { value: 25.3, itemStyle: { color: '#f0ad4e' } },
      { value: 36.6, itemStyle: { color: '#5cb85c' } },
      { value: 7.6, itemStyle: { color: '#d9534f' } },
    ],
  }],
})

// Chart 3: GHG Emitter Ranking Bar Chart
const ghgEmitterOption = ref({
  tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
  grid: { left: '10%', right: '8%', bottom: 70, top: 24, containLabel: true },
  xAxis: {
    type: 'value',
    name: 'Billion Tonnes CO₂e',
    nameLocation: 'middle',
    nameGap: 28,
  },
  yAxis: { type: 'category', data: ['India', 'Food Waste', 'USA', 'China'] },
  series: [{
    name: 'GHG Emissions',
    type: 'bar',
    data: [
      { value: 3.5, itemStyle: { color: '#6c757d' } },
      { value: 4.8, itemStyle: { color: '#d9534f' } }, // Highlight
      { value: 6.1, itemStyle: { color: '#6c757d' } },
      { value: 12.4, itemStyle: { color: '#6c757d' } },
    ],
  }],
})

// Chart 4: Water footprint comparison (food waste vs US households)
const waterFootprintOption = ref({
  tooltip: {
    trigger: 'axis',
    axisPointer: { type: 'shadow' },
    formatter: (params: Array<{ name: string; value: number }>) => {
      const first = params[0]
      return `${first.name}<br/>${first.value} km³ of water`
    }
  },
  grid: { left: '12%', right: '8%', bottom: '10%', top: '12%', containLabel: true },
  xAxis: {
    type: 'value',
    name: 'Km³ of water',
    nameLocation: 'middle',
    nameGap: 28,
    axisLine: { lineStyle: { color: '#9ca3af' } },
    splitLine: { lineStyle: { type: 'dashed', color: '#e5e7eb' } }
  },
  yAxis: {
    type: 'category',
    data: ['Food Waste', 'All US Households'],
    axisLine: { show: false },
    axisTick: { show: false },
    axisLabel: { color: '#4b5563' }
  },
  series: [{
    name: 'Water Footprint',
    type: 'bar',
    barWidth: '45%',
    data: [
      { value: 250, itemStyle: { color: '#1d4ed8' } },
      { value: 6.6, itemStyle: { color: '#60a5fa' } }
    ],
    label: {
      show: true,
      position: 'right',
      formatter: '{c} km³',
      color: '#1f2937'
    }
  }],
})

// Chart 5: Consumer-level food waste breakdown
const wasteSourcesOption = ref({
  tooltip: { trigger: 'item', formatter: '{b}: {c} Mt ({d}%)' },
  legend: {
    orient: 'vertical',
    right: 0,
    top: 'center',
    textStyle: { color: '#4b5563', fontSize: 12 }
  },
  series: [{
    name: 'Waste Sources',
    type: 'pie',
    radius: ['45%', '70%'],
    center: ['38%', '50%'],
    avoidLabelOverlap: true,
    label: {
      formatter: '{b}\n{d}%',
      color: '#1f2937',
      fontSize: 12
    },
    labelLine: { smooth: true, length: 10, length2: 12 },
    data: [
      { value: 568, name: 'Households', itemStyle: { color: '#f97316' } },
      { value: 242, name: 'Food Service', itemStyle: { color: '#22c55e' } },
      { value: 121, name: 'Retail', itemStyle: { color: '#6366f1' } }
    ]
  }]
})
</script>

<style scoped>
.home-page {
  position: relative;
  min-height: 100vh;
  color: #fff;
  /* Fallback background if video not available */
  background: transparent;
}



/* Hero Section */
.hero {
  padding: 2rem 1rem;
  min-height: 100vh;
  display: flex;
  align-items: center;
}

.hero-content {
  max-width: 1200px;
  margin: 0 auto;
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 3rem;
  align-items: center;
}

.hero-text {
  color: #fff;
  text-shadow: 0 2px 8px rgba(0,0,0,0.35);
}

.hero-title {
  font-size: 3.5rem;
  font-weight: bold;
  line-height: 1.1;
  margin-bottom: 1.5rem;
}

.highlight {
  color: #ffd700;
  text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.3);
}

.hero-subtitle {
  font-size: 1.25rem;
  line-height: 1.6;
  margin-bottom: 2rem;
  opacity: 0.9;
}

.hero-stats {
  position: relative;
  display: flex;
  gap: 2rem;
  margin-bottom: 2.5rem;
  /* cursor-proximity variables */
  --mx: -1000px;
  --my: -1000px;
}

.stat-btn {
  appearance: none;
  -webkit-appearance: none;
  background: rgba(255, 255, 255, 0.08);
  border: 1px solid rgba(255, 255, 255, 0.25);
  border-radius: 14px;
  padding: 14px 18px;
  min-width: 180px;
  color: inherit;
  text-align: center;
  position: relative;
  transition: transform 160ms ease, box-shadow 160ms ease, background-color 160ms ease, border-color 160ms ease;
  cursor: pointer;
  overflow: hidden;
}

.stat-btn::before {
  content: '';
  position: absolute;
  inset: -2px;
  background: radial-gradient(220px circle at var(--mx) var(--my), rgba(255,255,255,0.22), transparent 60%);
  opacity: 0;
  transition: opacity 160ms ease;
  pointer-events: none;
  mix-blend-mode: screen;
}

.hero-stats:hover .stat-btn::before { opacity: 1; }
.stat-btn:hover { transform: translateY(-4px) scale(1.02); box-shadow: 0 10px 24px rgba(0,0,0,0.25); }
.stat-btn:focus-visible { outline: 2px solid #ffd700; outline-offset: 2px; }

/* Flip card layout */
.flip-card {
  width: 220px;
  height: 220px;
  position: relative;
  border-radius: 14px;
  perspective: 1200px;
}

.flip-card-inner {
  position: relative;
  width: 100%;
  height: 100%;
  transform-style: preserve-3d;
  transition: transform 600ms cubic-bezier(0.2, 0.8, 0.2, 1);
}

.flip-front,
.flip-back {
  position: absolute;
  inset: 0;
  backface-visibility: hidden;
  border-radius: 14px;
}

.flip-front {
  display: grid;
  place-content: center;
}

.flip-back {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 12px;
  background: rgba(255, 255, 255, 0.96);
  color: #1f2937;
  transform: rotateY(180deg);
  border: 1px solid rgba(0,0,0,0.08);
  box-shadow: 0 12px 30px rgba(0,0,0,0.3);
  overflow: auto;
}
.flip-card.active {
  z-index: 1000;
  position: fixed;
  left: 50%;
  top: 50%;
  transform: translate(-50%, -50%);
  width: min(92vw, 620px);
  height: min(82vh, 560px);
}
.flip-card.active .flip-card-inner { transform: rotateY(180deg) scale(1.08); }

.close-btn {
  position: absolute;
  top: 8px;
  right: 8px;
  border: none;
  background: transparent;
  color: #111827;
  font-size: 16px;
  width: 28px;
  height: 28px;
  border-radius: 999px;
  cursor: pointer;
}
.close-btn:hover { background: rgba(0,0,0,0.06); }

.big-number { font-size: 28px; font-weight: 800; }
.gauge-label { font-weight: 700; margin-top: 6px; }
.viz-note { text-align: center; color: #6b7280; }

/* Dim overlay when a card is active */
.stat-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.35);
  backdrop-filter: blur(2px);
  z-index: 900;
}

.stat-number {
  display: block;
  font-size: 2rem;
  font-weight: bold;
  color: #ffd700;
}

.stat-label {
  font-size: 0.875rem;
  opacity: 0.8;
}

.cta-button {
  background: linear-gradient(45deg, #ff6b6b, #ffd93d);
  color: #333;
  border: none;
  padding: 1rem 2rem;
  font-size: 1.125rem;
  font-weight: bold;
  border-radius: 50px;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  transition: all 0.3s ease;
  box-shadow: 0 4px 15px rgba(0, 0, 0, 0.2);
}

.cta-button:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(0, 0, 0, 0.3);
}

.cta-button.large {
  padding: 1.25rem 2.5rem;
  font-size: 1.25rem;
}

.button-icon {
  font-size: 1.2em;
}

/* Phone Mockup */
.hero-visual {
  display: flex;
  justify-content: center;
}

.phone-mockup {
  width: 280px;
  height: 560px;
  background: #333;
  border-radius: 30px;
  padding: 20px;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
}

.phone-screen {
  width: 100%;
  height: 100%;
  background: white;
  border-radius: 20px;
  overflow: hidden;
}

.app-preview {
  padding: 1.5rem 1rem;
}

.preview-header {
  margin-bottom: 1.5rem;
}

.preview-title {
  font-size: 1.25rem;
  font-weight: bold;
  color: #333;
  margin-bottom: 0.5rem;
}

.preview-stats {
  display: flex;
  gap: 1rem;
}

.stat-item {
  font-size: 0.875rem;
  color: #666;
}

.preview-items {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.preview-item {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.75rem;
  border-radius: 12px;
  background: #f8f9fa;
}

.preview-item.fresh {
  border-left: 4px solid #28a745;
}

.preview-item.warning {
  border-left: 4px solid #ffc107;
}

.item-emoji {
  font-size: 1.5rem;
}

.item-name {
  flex: 1;
  font-weight: 500;
}

.item-status {
  font-size: 0.875rem;
  color: #666;
}

/* Features Section */
.features {
  padding: 5rem 1rem;
  background: white;
}

.container {
  max-width: 1200px;
  margin: 0 auto;
}

.section-title {
  text-align: center;
  font-size: 2.5rem;
  color: #333;
  margin-bottom: 3rem;
}

.features-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 2rem;
}

.feature-card {
  text-align: center;
  padding: 2rem;
  border-radius: 16px;
  background: #f8f9fa;
  transition: transform 0.3s ease;
}

.feature-card:hover {
  transform: translateY(-5px);
}

.feature-icon {
  font-size: 3rem;
  margin-bottom: 1rem;
}

.feature-card h3 {
  font-size: 1.5rem;
  color: #333;
  margin-bottom: 1rem;
}

.feature-card p {
  color: #666;
  line-height: 1.6;
}

/* Impact Section */
.impact {
  padding: 5rem 1rem;
  background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
  color: white;
}

.impact-content {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 3rem;
  align-items: center;
}

.impact-text h2 {
  font-size: 2.5rem;
  margin-bottom: 1.5rem;
}

.impact-text p {
  font-size: 1.125rem;
  line-height: 1.6;
  margin-bottom: 2rem;
  opacity: 0.9;
}

.impact-list {
  list-style: none;
  padding: 0;
}

.impact-list li {
  font-size: 1.125rem;
  margin-bottom: 0.75rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.impact-visual {
  display: flex;
  justify-content: center;
}

.impact-circle {
  width: 300px;
  height: 300px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.1);
  display: flex;
  align-items: center;
  justify-content: center;
  backdrop-filter: blur(10px);
}

.circle-content {
  text-align: center;
}

.circle-emoji {
  font-size: 4rem;
  display: block;
  margin-bottom: 1rem;
}

.circle-text {
  font-size: 1.125rem;
  font-weight: 500;
}

/* Final CTA Section */
.final-cta {
  padding: 5rem 1rem;
  background: #333;
  color: white;
  text-align: center;
}

.cta-content h2 {
  font-size: 2.5rem;
  margin-bottom: 1rem;
}

.cta-content p {
  font-size: 1.25rem;
  margin-bottom: 2rem;
  opacity: 0.9;
}

.cta-note {
  margin-top: 1rem !important;
  font-size: 0.875rem !important;
  opacity: 0.7 !important;
}

/* Mobile Responsive */
@media (max-width: 768px) {
  .hero-content {
    grid-template-columns: 1fr;
    text-align: center;
  }

  .hero-title {
    font-size: 2.5rem;
  }

  .hero-stats {
    justify-content: center;
  }

  .phone-mockup {
    width: 240px;
    height: 480px;
  }

  .impact-content {
    grid-template-columns: 1fr;
    text-align: center;
  }

  .impact-circle {
    width: 250px;
    height: 250px;
  }

  .section-title {
    font-size: 2rem;
  }

  .features-grid {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 480px) {
  .hero {
    padding: 1rem;
  }

  .hero-title {
    font-size: 2rem;
  }

  .hero-stats {
    flex-direction: column;
    gap: 1rem;
  }

  .phone-mockup {
    width: 200px;
    height: 400px;
    padding: 15px;
  }

  .cta-button {
    padding: 0.875rem 1.5rem;
    font-size: 1rem;
  }
}
</style>


<style scoped>
.viz-wrap { display:grid; place-items:center; gap: 14px; padding: 8px; }
.donut { width: 200px; height: 200px; transform: rotate(-90deg); }
.donut-ring { stroke: #e5e7eb; }
.donut-segment { stroke: #667eea; transition: stroke-dasharray 300ms ease; }
.donut-center { position: relative; transform: rotate(90deg); text-align:center; margin-top: -150px; font-weight: 800; font-size: 28px; }
.slider-row { display:flex; gap:10px; align-items:center; justify-content:center; }
.gauge { width: 100%; max-width: 560px; height: 14px; background:#f3f4f6; border-radius: 999px; overflow:hidden; }
.gauge-fill { height:100%; background: linear-gradient(90deg,#34d399,#10b981); transition: width 300ms ease; }
</style>
