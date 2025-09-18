import './assets/styles/main.scss'

import { createApp } from 'vue'
import { createPinia } from 'pinia'

import App from './App.vue'
import router from './router'
// Import logo so Vite resolves the built URL
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import customLogo from '@/assets/logo/logo.png'

function applyFavicon(url: string) {
  if (typeof document === 'undefined') return
  // Update standard favicon
  let link = document.querySelector<HTMLLinkElement>("link[rel='icon']")
  if (!link) {
    link = document.createElement('link')
    link.rel = 'icon'
    document.head.appendChild(link)
  }
  link.type = 'image/png'
  link.href = url

  // Update apple touch icon
  let apple = document.querySelector<HTMLLinkElement>("link[rel='apple-touch-icon']")
  if (!apple) {
    apple = document.createElement('link')
    apple.rel = 'apple-touch-icon'
    document.head.appendChild(apple)
  }
  apple.href = url
}

const app = createApp(App)

app.use(createPinia())
app.use(router)

app.mount('#app')

// Import API test in development
if (import.meta.env.DEV) {
  import('./utils/testGroceriesAPI')
}

// Apply site favicon from project logo
try {
  applyFavicon(customLogo as string)
} catch {
  // silently ignore if asset not available
}
