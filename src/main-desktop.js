import { createApp } from 'vue'
import { createPinia } from 'pinia'
import { createRouter } from 'vue-router'

import App from './App.vue'
import routerOptions from './router'
import { useUserStore } from './stores/useUserStore'
import cache from './cache.js'
import consts from './consts.js'
import { listenForOpenedDreemFiles, openPendingDreemFiles } from './desktop/dreemFiles.js'

import './assets/main.styl'
import './assets/page.styl'

if (window.__TAURI_INTERNALS__ || window.__TAURI__) {
  document.documentElement.classList.add('is-tauri')
  document.documentElement.classList.add(/Mac/i.test(navigator.userAgent) ? 'is-tauri-mac' : 'is-tauri-win')
}

const app = createApp(App)
app.use(createPinia())
app.use(createRouter(routerOptions))
app.mount('#app')

useUserStore().initializeUser().then(async () => {
  if (!consts.isTauri()) { return }
  await cache.syncDreemFiles()
  await listenForOpenedDreemFiles()
  await openPendingDreemFiles()
}).catch((error) => {
  console.error('🚒 initializeUser', error)
})
