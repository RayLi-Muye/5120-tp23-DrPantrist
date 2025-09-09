<template>
  <nav class="app-navbar" aria-label="Primary">
    <div class="nav-inner">
      <div class="nav-left">
        <router-link to="/" class="brand">UseItUp</router-link>
      </div>
      <div class="nav-center">
        <router-link
          to="/"
          class="nav-link"
          :class="{ active: $route.name === 'home' }"
        >Home</router-link>

        <router-link
          v-if="isAuthenticated"
          to="/dashboard"
          class="nav-link"
          :class="{ active: $route.name === 'dashboard' }"
        >Dashboard</router-link>

        <router-link
          v-if="isAuthenticated"
          to="/add-item"
          class="nav-link"
          :class="{ active: $route.name === 'add-item' }"
        >Add Item</router-link>

        <router-link
          to="/about"
          class="nav-link"
          :class="{ active: $route.name === 'about' }"
        >About</router-link>
      </div>
      <div class="nav-right">
        <router-link
          v-if="!isAuthenticated"
          to="/auth"
          class="nav-link auth"
          :class="{ active: $route.name === 'auth' }"
        >Login</router-link>
        <button v-else class="nav-link logout" @click="handleLogout">Logout</button>
      </div>
    </div>
  </nav>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

const router = useRouter()
const authStore = useAuthStore()
const isAuthenticated = computed(() => authStore.isAuthenticated)

async function handleLogout() {
  try {
    authStore.logout()
  } finally {
    await router.replace('/auth')
  }
}
</script>

<style scoped>
.app-navbar {
  width: 100%;
  background: rgba(255, 255, 255, 0.85);
  border-bottom: 1px solid rgba(0, 0, 0, 0.06);
  backdrop-filter: blur(8px);
  position: sticky;
  top: 0;
  z-index: 100;
}

.nav-inner {
  max-width: 1200px;
  margin: 0 auto;
  display: grid;
  grid-template-columns: 1fr auto 1fr;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
}

.nav-left { justify-self: start; }
.nav-center { justify-self: center; display: flex; gap: 8px; }
.nav-right { justify-self: end; display: flex; gap: 8px; }

.brand {
  text-decoration: none;
  font-weight: 700;
  color: var(--color-text-primary, #333);
}

.nav-link {
  text-decoration: none;
  padding: 6px 10px;
  border-radius: 8px;
  border: 1px solid transparent;
  color: var(--color-text-primary, #333);
  background: transparent;
  transition: all 0.2s ease;
}

.nav-link:hover {
  background: rgba(0, 0, 0, 0.05);
}

.nav-link.active {
  background: var(--color-primary, #667eea);
  color: white;
}

.nav-link.logout {
  background: rgba(220, 53, 69, 0.08);
  color: #c0392b;
  border: 1px solid rgba(220, 53, 69, 0.2);
}

.nav-link.logout:hover {
  background: rgba(220, 53, 69, 0.15);
}
</style>

