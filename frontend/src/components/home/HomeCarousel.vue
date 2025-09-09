<template>
  <section class="home-carousel" aria-label="Food waste insights">
    <div class="slides" :style="{ transform: `translateX(-${currentIndex * 100}%)` }">
      <!-- Slide 1: Real-world headline stats -->
      <article class="slide slide--stats" aria-label="Global food waste facts">
        <h2 class="slide-title">Food Waste At A Glance</h2>
        <ul class="fact-list">
          <li>
            <span class="fact-number">~ 1/3</span>
            <span class="fact-text">of all food produced is lost or wasted</span>
          </li>
          <li>
            <span class="fact-number">≈ 1.3B t/yr</span>
            <span class="fact-text">global food loss and waste</span>
          </li>
          <li>
            <span class="fact-number">8–10%</span>
            <span class="fact-text">of global GHG emissions are linked to food loss and waste</span>
          </li>
        </ul>
        <p class="sources">Sources: FAO; UNEP Food Waste Index</p>
      </article>

      <!-- Slide 2: Interactive donut chart -->
      <article class="slide slide--donut" aria-label="Share of food wasted">
        <h2 class="slide-title">How Much Gets Wasted?</h2>
        <div class="donut-wrap">
          <svg class="donut" viewBox="0 0 42 42" role="img" aria-label="Donut showing share wasted">
            <circle class="donut-ring" cx="21" cy="21" r="15.915" fill="transparent" stroke-width="4" />
            <circle
              class="donut-segment"
              cx="21" cy="21" r="15.915" fill="transparent" stroke-width="4"
              :style="{ strokeDasharray: `${wastedPercent} ${100 - wastedPercent}` }"
              pathLength="100"
            />
          </svg>
          <div class="donut-center">
            <div class="donut-value">{{ wastedPercent }}%</div>
            <div class="donut-label">Wasted</div>
          </div>
        </div>
        <div class="toggle-row">
          <button class="toggle-btn" :class="{ active: mode === 'global' }" @click="setMode('global')">Global (~33%)</button>
          <button class="toggle-btn" :class="{ active: mode === 'household' }" @click="setMode('household')">Households (~17%)</button>
        </div>
        <p class="note">Percentages are indicative; values vary by method and country.</p>
      </article>

      <!-- Slide 3: Animated macro bar visualization -->
      <article class="slide slide--bars" aria-label="Where food is lost or wasted">
        <h2 class="slide-title">Loss Occurs Across The Chain</h2>
        <div class="bars">
          <div class="bar" v-for="s in stages" :key="s.name">
            <div class="bar-label">{{ s.name }}</div>
            <div class="bar-track">
              <div class="bar-fill" :style="{ width: `${s.value}%` }"></div>
            </div>
            <div class="bar-value">{{ s.value }}%</div>
          </div>
        </div>
        <div class="controls">
          <label>
            Scenario intensity
            <input type="range" min="50" max="120" step="1" v-model.number="scenario" />
          </label>
        </div>
        <p class="note">Illustrative distribution for exploration only; actual shares differ by region and product.</p>
      </article>
    </div>

    <!-- Bottom navigation -->
    <div class="nav-controls" role="group" aria-label="Slide navigation">
      <button class="nav-btn" aria-label="Previous" @click="prev" :disabled="currentIndex === 0">◀</button>
      <div class="dots" role="tablist">
        <button
          v-for="i in 3"
          :key="i"
          class="dot"
          :class="{ active: currentIndex === i - 1 }"
          :aria-label="`Go to slide ${i}`"
          @click="go(i - 1)"
        />
      </div>
      <button class="nav-btn" aria-label="Next" @click="next" :disabled="currentIndex === 2">▶</button>
    </div>
  </section>
  
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'

const currentIndex = ref(0)

function go(i: number) { currentIndex.value = Math.min(2, Math.max(0, i)) }
function next() { go(currentIndex.value + 1) }
function prev() { go(currentIndex.value - 1) }

// Slide 2: donut toggle between global (~33%) and household (~17%)
type Mode = 'global' | 'household'
const mode = ref<Mode>('global')
const wastedPercent = computed(() => mode.value === 'global' ? 33 : 17)
function setMode(m: Mode) { mode.value = m }

// Slide 3: illustrative chain bars with a scenario slider to animate
const scenario = ref(100)
const baseStages = [
  { name: 'Production', value: 10 },
  { name: 'Post-harvest', value: 8 },
  { name: 'Processing', value: 7 },
  { name: 'Retail', value: 6 },
  { name: 'Households', value: 17 }
]
const stages = computed(() => {
  const factor = scenario.value / 100
  return baseStages.map(s => ({ name: s.name, value: Math.round(s.value * factor) }))
})

// Keyboard arrows support
function onKey(e: KeyboardEvent) {
  if (e.key === 'ArrowRight') next()
  if (e.key === 'ArrowLeft') prev()
}
if (typeof window !== 'undefined') {
  window.addEventListener('keydown', onKey)
}
</script>

<style scoped>
.home-carousel {
  position: relative;
  width: 100%;
  overflow: hidden;
  background: rgba(255,255,255,0.8);
  border-radius: 16px;
  box-shadow: 0 8px 24px rgba(0,0,0,0.08);
  margin: 24px auto;
  max-width: 1100px;
}

.slides { display: flex; transition: transform 400ms ease; }
.slide { flex: 0 0 100%; padding: 28px 24px 56px; }
.slide-title { text-align: center; margin-bottom: 16px; }

.slide--stats .fact-list { display:flex; flex-wrap: wrap; justify-content:center; gap:16px; }
.slide--stats .fact-list li { display:flex; flex-direction:column; align-items:center; background:white; padding:16px 20px; border-radius:12px; box-shadow:0 2px 8px rgba(0,0,0,0.06); min-width:180px; }
.fact-number { font-size: 28px; font-weight: 800; color: var(--color-primary, #667eea); }
.fact-text { font-size: 14px; color: var(--color-text-secondary, #555); text-align:center; }
.sources { text-align:center; margin-top: 12px; color: #6b7280; font-size: 12px; }

.donut-wrap { position: relative; width: 220px; height: 220px; margin: 12px auto 8px; }
.donut { width: 100%; height: 100%; transform: rotate(-90deg); }
.donut-ring { stroke: #e5e7eb; }
.donut-segment { stroke: var(--color-primary, #667eea); transition: stroke-dasharray 400ms ease; }
.donut-center { position:absolute; inset:0; display:flex; align-items:center; justify-content:center; flex-direction:column; }
.donut-value { font-size: 32px; font-weight: 800; }
.donut-label { color:#6b7280; font-size: 12px; }
.toggle-row { display:flex; gap:8px; justify-content:center; margin-top: 8px; }
.toggle-btn { padding:8px 12px; border:1px solid #e5e7eb; border-radius:999px; background:white; cursor:pointer; }
.toggle-btn.active { background: var(--color-primary, #667eea); color:white; border-color: transparent; }
.note { text-align:center; font-size: 12px; color:#6b7280; margin-top: 8px; }

.bars { display:grid; gap:10px; max-width:680px; margin: 8px auto 0; }
.bar { display:grid; grid-template-columns: 120px 1fr 52px; align-items:center; gap:8px; }
.bar-label { text-align:right; color:#374151; font-weight:600; }
.bar-track { background:#f3f4f6; height:12px; border-radius:999px; overflow:hidden; }
.bar-fill { background:linear-gradient(90deg, #34d399, #10b981); height:100%; transition: width 400ms ease; }
.bar-value { text-align:right; color:#111827; font-weight:700; }
.controls { display:flex; justify-content:center; margin-top: 10px; }

.nav-controls { position:absolute; left:0; right:0; bottom:10px; display:flex; align-items:center; justify-content:center; gap:12px; }
.nav-btn { padding:8px 12px; border-radius:8px; border:1px solid #e5e7eb; background:white; cursor:pointer; }
.nav-btn:disabled { opacity:0.5; cursor:not-allowed; }
.dots { display:flex; gap:6px; }
.dot { width:10px; height:10px; border-radius:999px; background:#e5e7eb; border:none; cursor:pointer; }
.dot.active { background: var(--color-primary, #667eea); }

@media (max-width: 768px) {
  .slide { padding: 20px 16px 56px; }
  .bar { grid-template-columns: 90px 1fr 40px; }
}
</style>

