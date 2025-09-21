<template>
  <div class="bgv" aria-hidden="true">
    <!-- Primary background video (loops everywhere) -->
    <video
      ref="loopRef"
      class="bgv__video bgv__video--loop"
      :src="LOOP_VIDEO"
      autoplay
      muted
      playsinline
      preload="auto"
      loop
    />

    <!-- Intro video shown on Home only, then fades to primary -->
    <video
      v-if="showIntro"
      ref="introRef"
      class="bgv__video bgv__video--intro"
      :class="{ 'is-fading': fadingOut }"
      :src="INTRO_VIDEO"
      autoplay
      muted
      playsinline
      preload="auto"
      @ended="handleIntroEnd"
    />


  </div>
</template>

<script setup lang="ts">
import { onMounted, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import INTRO_VIDEO from '@/assets/homepage/homepage_background.mp4'
import LOOP_VIDEO from '@/assets/pageBackground/7898649-hd_1920_1080_15fps.mp4'

const route = useRoute()
const introRef = ref<HTMLVideoElement | null>(null)
const loopRef = ref<HTMLVideoElement | null>(null)
const showIntro = ref(false)
const fadingOut = ref(false)

function startIntroIfNeeded() {
  const isHome = route.name === 'home'
  const playedKey = 'bg_intro_played'
  const alreadyPlayed = sessionStorage.getItem(playedKey) === '1'

  showIntro.value = isHome && !alreadyPlayed

  if (showIntro.value) {
    // Ensure the loop video is playing behind intro for a seamless crossfade
    requestAnimationFrame(() => {
      loopRef.value?.play().catch(() => {})
      introRef.value?.play().catch(() => {})
    })
  } else {
    // If no intro, make sure loop video is visible
    loopRef.value?.play().catch(() => {})
  }
}

function handleIntroEnd() {
  // Crossfade to the loop video
  fadingOut.value = true
  sessionStorage.setItem('bg_intro_played', '1')
  setTimeout(() => {
    showIntro.value = false
    fadingOut.value = false
  }, 600)
}

onMounted(() => {
  startIntroIfNeeded()
})

watch(
  () => route.name,
  () => {
    // When navigating back to home within the same session, do not replay intro
    startIntroIfNeeded()
  }
)
</script>

<style scoped>
.bgv {
  position: fixed;
  inset: 0;
  z-index: 0;
  overflow: hidden;
  pointer-events: none;
}

.bgv__video {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.bgv__video--loop {}

.bgv__video--intro {
  transition: opacity 600ms ease;
  filter: brightness(0.5);
}

.bgv__video--intro.is-fading {
  opacity: 0;
}


</style>
