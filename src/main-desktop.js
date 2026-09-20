import { createApp } from 'vue'
import { createPinia } from 'pinia'
import { createRouter } from 'vue-router'

import App from './App.vue'
import routerOptions from './router'
import { useUserStore } from './stores/useUserStore'
import cache from './cache.js'
import consts from './consts.js'

import './assets/main.styl'
import './assets/page.styl'

if (window.__TAURI_INTERNALS__ || window.__TAURI__) {
  document.documentElement.classList.add('is-tauri')
}

const app = createApp(App)
app.use(createPinia())
app.use(createRouter(routerOptions))
app.mount('#app')

useUserStore().initializeUser().then(() => {
  if (!consts.isTauri()) { return }
  return cache.syncDreemFiles()
}).catch((error) => {
  console.error('🚒 initializeUser', error)
})
