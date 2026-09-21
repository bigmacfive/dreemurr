<script setup>
import { onMounted, onBeforeUnmount } from 'vue'

import { useGlobalStore } from '@/stores/useGlobalStore'

import utils from '@/utils.js'

const globalStore = useGlobalStore()

// Adjust this value to change the momentum decay
// Lower values (closer to 0.92) make the scrolling slower and smoother
// Higher values (closer to 0.96) make the scrolling faster and more abrupt
const momentumDeceleration = 0.95

// Threshold for stopping when velocity is low
// A smaller threshold ensures the scrolling stops only when it's very slow.
const momentumThreshold = 0.5

let shouldStartPanning,
  startPosition,
  lastClient,
  panningTimer,
  shouldCancelPanningTimer,
  panningDelta,
  shouldPanNextFrame,
  velocity,
  momentumTimer,
  shouldCancelMomentumTimer,
  currentScroll

let unsubscribes

onMounted(() => {
  window.addEventListener('pointerdown', cancelMomentum)
  window.addEventListener('mousedown', cancelMomentum)
  window.addEventListener('pointermove', checkIfShouldStartPanning, { passive: false })
  window.addEventListener('mousemove', checkIfShouldStartPanning)
  window.addEventListener('pointerup', checkIfShouldStartMomentum)
  window.addEventListener('mouseup', checkIfShouldStartMomentum)
  window.addEventListener('wheel', cancelMomentum)

  const globalActionUnsubscribe = globalStore.$onAction(
    ({ name, args }) => {
      if (name === 'triggerPanningStart') {
        shouldStartPanning = true
      }
    }
  )
  unsubscribes = () => {
    globalActionUnsubscribe()
  }
})
onBeforeUnmount(() => {
  window.removeEventListener('pointerdown', cancelMomentum)
  window.removeEventListener('mousedown', cancelMomentum)
  window.removeEventListener('pointermove', checkIfShouldStartPanning)
  window.removeEventListener('mousemove', checkIfShouldStartPanning)
  window.removeEventListener('pointerup', checkIfShouldStartMomentum)
  window.removeEventListener('mouseup', checkIfShouldStartMomentum)
  window.removeEventListener('wheel', cancelMomentum)
  unsubscribes()
})

// handle pointer events

let handledPointerMove = false
const checkIfShouldStartPanning = (event) => {
  if (event?.type === 'pointermove') {
    handledPointerMove = true
  } else if (event?.type === 'mousemove' && handledPointerMove) {
    handledPointerMove = false
    return
  }
  const isMiddleHeld = event.buttons === 4
  if (isMiddleHeld && !globalStore.currentUserIsPanning) {
    globalStore.updateCurrentUserIsPanning(true)
  }
  if (globalStore.currentUserIsPanning) {
    event.preventDefault()
    initPanning(event)
    updatePanningPosition(event)
  }
}
let handledPointerUp = false
const checkIfShouldStartMomentum = (event) => {
  if (event?.type === 'pointerup') {
    handledPointerUp = true
  } else if (event?.type === 'mouseup' && handledPointerUp) {
    handledPointerUp = false
    return
  }
  const isPanning = Boolean(startPosition)
  if (isPanning && panningDelta) {
    startMomentum()
  }
  // clear the pending pan frame alongside its delta, momentum continues from velocity
  shouldPanNextFrame = false
  panningDelta = null
  shouldCancelPanningTimer = true
}
const cancelMomentum = (event) => {
  shouldCancelMomentumTimer = true
  if (event?.type === 'wheel') {
    shouldCancelPanningTimer = true
    startPosition = null
    lastClient = null
    panningDelta = null
    shouldPanNextFrame = false
  }
}

// safari fix

const updatecurrentScrollByDelta = (delta) => {
  currentScroll.x += delta.x
  currentScroll.y += delta.y
}
const safariFix = () => {
  // force safari to recompute internal element positions after panning
  // https://forum.kinopio.club/t/cursor-position-is-wrong-after-right-click-drag-to-pan/1799
  if (!utils.isSafari()) { return }
  window.scrollTo(currentScroll.x, currentScroll.y)
}

// panning

const initPanning = (event) => {
  currentScroll = { x: window.scrollX, y: window.scrollY }
  if (shouldStartPanning) {
    startPosition = true
    lastClient = { x: event.clientX, y: event.clientY }
    shouldStartPanning = false
    shouldCancelPanningTimer = false
    shouldCancelMomentumTimer = false
    panningTimer = window.requestAnimationFrame(panningFrame)
  }
}
const updatePanningPosition = (event) => {
  if (!lastClient) { return }
  const delta = {
    x: lastClient.x - event.clientX,
    y: lastClient.y - event.clientY
  }
  lastClient = { x: event.clientX, y: event.clientY }
  velocity = { x: delta.x, y: delta.y }
  panningDelta = delta
  shouldPanNextFrame = true
}

const panningFrame = () => {
  // scroll frame
  if (shouldPanNextFrame && panningDelta) {
    globalStore.panSpaceBy(panningDelta)
    updatecurrentScrollByDelta(panningDelta)
    shouldPanNextFrame = false
  } else if (velocity) {
    // no cursor movement this frame, decay velocity so that pausing
    // before releasing doesn't fling on momentum from an older movement
    velocity.x *= momentumDeceleration
    velocity.y *= momentumDeceleration
  }
  panningTimer = window.requestAnimationFrame(panningFrame)
  // cancel
  if (shouldCancelPanningTimer) {
    window.cancelAnimationFrame(panningTimer)
    panningTimer = null
    startPosition = null
    lastClient = null
  }
}

// momentum scrolling, post-panning

const startMomentum = () => {
  window.cancelAnimationFrame(momentumTimer)
  const momentumFrame = () => {
    // cancel
    const velocityIsLow = Math.abs(velocity.x) < momentumThreshold && Math.abs(velocity.y) < momentumThreshold
    if (velocityIsLow || shouldPanNextFrame || shouldCancelMomentumTimer) {
      window.cancelAnimationFrame(momentumTimer)
      safariFix()
      return
    }
    // scroll frame
    velocity.x *= momentumDeceleration
    velocity.y *= momentumDeceleration
    globalStore.panSpaceBy(velocity)
    updatecurrentScrollByDelta(velocity)
    momentumTimer = window.requestAnimationFrame(momentumFrame)
  }
  momentumTimer = window.requestAnimationFrame(momentumFrame)
}
</script>

<template lang="pug">
</template>

<style lang="stylus">
</style>
