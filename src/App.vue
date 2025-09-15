<template>
  <div id="app">
    <BackgroundVideo />
    <NavBar />
    <!-- Router View with Transitions -->
    <RouterView v-slot="{ Component, route }">
      <Transition :name="transitionName" mode="out-in">
        <component :is="Component" :key="route.path" />
      </Transition>
    </RouterView>

  </div>
</template>

<script setup lang="ts">
import { RouterView, useRouter } from 'vue-router'
import { ref, watch, onMounted } from 'vue'
import { useAuthStore } from '@/stores/auth'
import NavBar from '@/components/common/NavBar.vue'
import BackgroundVideo from '@/components/common/BackgroundVideo.vue'

const router = useRouter()
const transitionName = ref('route')
const authStore = useAuthStore()

// Initialize auth on app mount
onMounted(async () => {
  // First try loading saved user data
  if (!authStore.loadSavedUser()) {
    // If no saved user, try auto-login with saved login code
    try {
      await authStore.tryAutoLogin()
    } catch (error) {
      console.warn('Auto-login failed on app mount:', error)
      // Continue with normal flow - user will need to log in manually
    }
  }
})

// Watch for route changes to determine transition direction
watch(
  () => router.currentRoute.value,
  (to, from) => {
    if (!from || !to) return

    // Determine if this is a back navigation
    const isBackNavigation =
      (from.name === 'inventory' && to.name === 'dashboard') ||
      (from.name === 'add-item' && (to.name === 'dashboard' || to.name === 'inventory')) ||
      (from.name === 'add-item' && to.name === 'dashboard')

    transitionName.value = isBackNavigation ? 'route-back' : 'route'
  }
)
</script>

<style>
#app {
  min-height: 100vh;
  background-color: var(--color-bg-primary);
}

/* Route transitions */
.route-enter-active,
.route-leave-active {
  transition: all 0.3s ease;
}

.route-enter-from {
  opacity: 0;
  transform: translateX(30px);
}

.route-leave-to {
  opacity: 0;
  transform: translateX(-30px);
}

.route-back-enter-from {
  opacity: 0;
  transform: translateX(-30px);
}

.route-back-leave-to {
  opacity: 0;
  transform: translateX(30px);
}

/* Ensure smooth transitions on mobile */
@media (max-width: 767px) {
  #app {
    overflow-x: hidden;
  }
}

/* Loading state for better UX */
.route-transitioning #app {
  cursor: wait;
}
</style>
