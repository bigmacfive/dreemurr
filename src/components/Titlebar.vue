<script setup>
import { computed, onMounted, onBeforeUnmount, ref } from 'vue'
import { getCurrentWindow } from '@tauri-apps/api/window'

import { useSpaceStore } from '@/stores/useSpaceStore'

const spaceStore = useSpaceStore()
const win = getCurrentWindow()
const isFocused = ref(true)
let unlistenFocus

onMounted(async () => {
  isFocused.value = await win.isFocused()
  unlistenFocus = await win.onFocusChanged(({ payload }) => {
    isFocused.value = payload
  })
})
onBeforeUnmount(() => {
  if (unlistenFocus) {
    unlistenFocus()
  }
})

const spaceName = computed(() => spaceStore.name || 'dreemurr')
const closeWindow = () => win.close()
const minimizeWindow = () => win.minimize()
const toggleMaximize = () => win.toggleMaximize()
</script>

<template lang="pug">
.titlebar(:class="{ unfocused: !isFocused }")
  .titlebar-controls
    button.titlebar-light.close(type="button" aria-label="Close" @click.stop="closeWindow")
      span.dot
    button.titlebar-light.minimize(type="button" aria-label="Minimize" @click.stop="minimizeWindow")
      span.dot
    button.titlebar-light.zoom(type="button" aria-label="Zoom" @click.stop="toggleMaximize")
      span.dot
  .titlebar-drag(data-tauri-drag-region @dblclick="toggleMaximize")
    span.titlebar-name {{ spaceName }}
</template>
