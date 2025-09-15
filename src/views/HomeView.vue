<template>
  <div class="home-page">
    <!-- Background is now provided globally -->

    <!-- Hero Section -->
    <section class="hero">
      <div class="hero-content">
        <div class="hero-text">
          <h1 class="hero-title">
            <span class="highlight">Use It Up</span>
            <br>
            Stop Food Waste, Start Saving
          </h1>
          <p class="hero-subtitle">
            Track your groceries, reduce waste, and make a positive impact on the environment.
            Every item you use instead of throwing away saves money and helps our planet.
          </p>
      <div
        class="hero-stats"
        ref="statsRef"
        @mousemove="onStatsMouseMove"
        @mouseleave="onStatsLeave"
      >
        <!-- Global Waste Card -->
        <div
          class="flip-card stat"
          :class="{ active: activeStat === 'global-waste' }"
          @click="onStatClick('global-waste')"
        >
          <div class="flip-card-inner">
            <div class="flip-front stat-btn">
              <span class="stat-number">30%</span>
              <span class="stat-label">Food wasted globally</span>
            </div>
            <div class="flip-back">
              <button class="close-btn" @click.stop="closeStat">✕</button>
              <div class="viz-wrap">
                <svg
                  class="donut"
                  viewBox="0 0 42 42"
                  role="img"
                  aria-label="Donut showing share wasted"
                >
                  <circle
                    class="donut-ring"
                    cx="21"
                    cy="21"
                    r="15.915"
                    fill="transparent"
                    stroke-width="4"
                  />
                  <circle
                    class="donut-segment"
                    cx="21"
                    cy="21"
                    r="15.915"
                    fill="transparent"
                    stroke-width="4"
                    :style="{ strokeDasharray: `${donutValue} ${100 - donutValue}` }"
                    pathLength="100"
                  />
                </svg>
                <div class="donut-center">{{ donutValue }}%</div>
                <div class="slider-row">
                  <label>Adjust share</label>
                  <input
                    type="range"
                    min="10"
                    max="60"
                    step="1"
                    v-model.number="donutValue"
                  />
                </div>
                <p class="viz-note">Interactive placeholder — replace with real data.</p>
              </div>
            </div>
          </div>
        </div>

        <!-- Family Cost Card -->
        <div
          class="flip-card stat"
          :class="{ active: activeStat === 'family-cost' }"
          @click="onStatClick('family-cost')"
        >
          <div class="flip-card-inner">
            <div class="flip-front stat-btn">
              <span class="stat-number">$1,500</span>
              <span class="stat-label">Average family waste/year</span>
            </div>
            <div class="flip-back">
              <button class="close-btn" @click.stop="closeStat">✕</button>
              <div class="viz-wrap">
                <div class="big-number">${{ familyCost.toLocaleString() }}</div>
                <div class="slider-row">
                  <label>Adjust cost</label>
                  <input
                    type="range"
                    min="200"
                    max="3000"
                    step="50"
                    v-model.number="familyCost"
                  />
                </div>
                <p class="viz-note">Interactive placeholder — yearly waste per family.</p>
              </div>
            </div>
          </div>
        </div>

        <!-- GHG Share Card -->
        <div
          class="flip-card stat"
          :class="{ active: activeStat === 'ghg-share' }"
          @click="onStatClick('ghg-share')"
        >
          <div class="flip-card-inner">
            <div class="flip-front stat-btn">
              <span class="stat-number">8%</span>
              <span class="stat-label">Global greenhouse gases</span>
            </div>
            <div class="flip-back">
              <button class="close-btn" @click.stop="closeStat">✕</button>
              <div class="viz-wrap">
                <div class="gauge">
                  <div class="gauge-fill" :style="{ width: `${ghgPercent}%` }"></div>
                </div>
                <div class="gauge-label">{{ ghgPercent }}% of global GHG emissions</div>
                <div class="slider-row">
                  <label>Adjust share</label>
                  <input
                    type="range"
                    min="2"
                    max="20"
                    step="1"
                    v-model.number="ghgPercent"
                  />
                </div>
                <p class="viz-note">Interactive placeholder — food loss and waste emissions.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
          <button @click="getStarted" class="cta-button">
            Get Started
            <span class="button-icon">🚀</span>
          </button>
        </div>
      </div>
    </section>
    <!-- Overlay for active flip card -->
    <div v-if="activeStat" class="stat-overlay" @click="closeStat" />
  </div>
</template>

<script setup lang="ts">
import { useRouter } from 'vue-router'
import { ref } from 'vue'

const router = useRouter()

type StatId = 'global-waste' | 'family-cost' | 'ghg-share'

const statsRef = ref<HTMLElement | null>(null)

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

const getStarted = () => {
  router.push('/auth')
}

function onStatClick(id: StatId) {
  activeStat.value = id
}

function closeStat() {
  activeStat.value = null
}

const activeStat = ref<StatId | null>(null)
const donutValue = ref(33)
const familyCost = ref(1500)
const ghgPercent = ref(8)
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
  width: min(90vw, 560px);
  height: min(78vh, 520px);
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


<!-- Modal content styles (scoped to this SFC) -->
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
