import App from './App.vue'
import router from './router'
import { ViteSSG } from 'vite-ssg'

import { createPinia } from 'pinia'
import { useUserStore } from './stores/useUserStore'

import './assets/main.styl'
import './assets/page.styl'

export const createApp = ViteSSG(
  // the root component
  App,
  // vue-router options
  router,
  // function to have custom setups
  async ({ app, router, isClient, initialState }) => {
    const pinia = createPinia()

    app.use(pinia)

    if (isClient) {
      const userStore = useUserStore()
      userStore.initializeUser().catch((error) => {
        console.error('🚒 initializeUser', error)
      })
    }
  }
)
