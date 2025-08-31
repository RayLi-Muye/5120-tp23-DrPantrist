<template>
  <div id="app">
    <!-- Router View with Transitions -->
    <RouterView v-slot="{ Component, route }">
      <Transition :name="transitionName" mode="out-in">
        <component :is="Component" :key="route.path" />
      </Transition>
    </RouterView>

    <!-- Global Impact Card -->
    <ImpactCard />
  </div>
</template>

<script setup lang="ts">
import { RouterView, useRouter } from 'vue-router'
import { ref, watch, onMounted } from 'vue'
import ImpactCard from '@/components/impact/ImpactCard.vue'
import { useAuthStore } from '@/stores/auth'

const router = useRouter()
const transitionName = ref('route')
const authStore = useAuthStore()

// Initialize auth on app mount
onMounted(() => {
  authStore.loadSavedUser()
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
