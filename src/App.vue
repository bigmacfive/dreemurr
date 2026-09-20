<template lang="pug">
  .window-frame(:class="{ desktop: isTauri }")
    Titlebar(v-if="isTauri")
    router-view
</template>

<script setup>
import { computed, onMounted } from 'vue'
import Titlebar from '@/components/Titlebar.vue'

const isTauri = computed(() => Boolean(window.__TAURI_INTERNALS__ || window.__TAURI__))

onMounted(() => {
  // remove page body content created by page-meta
  document.getElementById('static-space')?.remove()
  if (isTauri.value) {
    document.documentElement.classList.add('is-tauri')
  }
})
</script>
