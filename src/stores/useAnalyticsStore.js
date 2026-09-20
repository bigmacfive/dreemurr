import { nextTick } from 'vue'
import { defineStore } from 'pinia'

import { useUserStore } from '@/stores/useUserStore'

export const useAnalyticsStore = defineStore('analytics', {
  getters: {
    shouldSend () {
      return false
    }
  },

  actions: {
    async send (body) {
      // local-only: analytics are disabled
    },
    event (eventName) {
      const userStore = useUserStore()
      const body = {
        domain: 'kinopio.club',
        name: eventName,
        url: window.location.href,
        referrer: document.referrer,
        props: {
          isSignedIn: userStore.getUserIsSignedIn
        }
      }
      this.send(body)
    }

  }
})
