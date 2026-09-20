<template lang="pug">
  .window-frame(:class="{ desktop: isTauri, mac: isMacDesktop }")
    Titlebar(v-if="isMacDesktop")
    router-view
</template>

<script setup>
import { computed, onMounted } from 'vue'
import Titlebar from '@/components/Titlebar.vue'

const isTauri = computed(() => Boolean(window.__TAURI_INTERNALS__ || window.__TAURI__))
const isMacDesktop = computed(() => isTauri.value && /Mac/i.test(navigator.userAgent))

onMounted(() => {
  // remove page body content created by page-meta
  document.getElementById('static-space')?.remove()
  if (isTauri.value) {
    document.documentElement.classList.add('is-tauri')
    document.documentElement.classList.add(isMacDesktop.value ? 'is-tauri-mac' : 'is-tauri-win')
  }
})
</script>
