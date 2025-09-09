<template>
  <div class="home-bg" aria-hidden="true">
    <video
      v-if="videoUrl"
      class="home-bg__video"
      :src="videoUrl"
      autoplay
      muted
      loop
      playsinline
      preload="auto"
    />
    <div class="home-bg__overlay"></div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

interface Props { src?: string }
const props = defineProps<Props>()

// Try prop -> env -> first matching asset in src/assets
const foundFromEnv = (import.meta.env.VITE_HOME_BG_VIDEO as string | undefined) || ''
// Eagerly collect common video types under src/assets or src/asset (typo-friendly)
// Vite replaces these with URLs during build
// @ts-ignore - vite glob typing for non-code assets
const videoModulesA = import.meta.glob('/src/assets/**/*.{mp4,webm,ogg,mov}', { eager: true, as: 'url' }) as Record<string, string>
// @ts-ignore
const videoModulesB = import.meta.glob('/src/asset/**/*.{mp4,webm,ogg,mov}', { eager: true, as: 'url' }) as Record<string, string>
const discovered = [...Object.values(videoModulesA), ...Object.values(videoModulesB)][0] || ''

const videoUrl = computed(() => props.src || foundFromEnv || discovered)
</script>

<style scoped>
.home-bg {
  position: fixed;
  inset: 0;
  z-index: 0;
  overflow: hidden;
  pointer-events: none;
}

.home-bg__video {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
  filter: brightness(0.45) saturate(0.9);
}

.home-bg__overlay {
  position: absolute;
  inset: 0;
  background: linear-gradient(
      to bottom,
      rgba(0, 0, 0, 0.5),
      rgba(0, 0, 0, 0.6)
    );
}
</style>
