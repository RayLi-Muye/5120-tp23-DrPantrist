<template>
  <div class="home-bg" aria-hidden="true">
    <video
      class="home-bg__video"
      :src="VIDEO_SRC"
      autoplay
      muted
      playsinline
      preload="auto"
      @ended="onEnded"
    />
    <div class="home-bg__overlay"></div>
  </div>
  
</template>

<script setup lang="ts">
// Import a specific asset so Vite bundles and fingerprints it correctly
// This ensures a stable path in development and in cloud deployments
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore - Vite returns a string URL for assets
import VIDEO_SRC from '@/assets/homepage/homepage_background.mp4'

function onEnded(e: Event) {
  const el = e.target as HTMLVideoElement
  try {
    // Ensure the video remains on the last frame and does not restart
    el.pause()
  } catch {
    // no-op
  }
}
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
