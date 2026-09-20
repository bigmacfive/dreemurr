<script setup>
import { reactive, onMounted, onBeforeUnmount, watch, ref, nextTick } from 'vue'

import { useGlobalStore } from '@/stores/useGlobalStore'
import utils from '@/utils.js'
import consts from '@/consts.js'
import buddyHead from '@/assets/dreemurr/buddy-head-alpha.png'

const globalStore = useGlobalStore()
const dialogElement = ref(null)

onMounted(() => {
  window.addEventListener('resize', updateDialogHeight)
})
onBeforeUnmount(() => {
  window.removeEventListener('resize', updateDialogHeight)
  document.body.style.overflow = ''
})

const props = defineProps({
  visible: Boolean
})

const apps = [
  { name: 'snapdeck.app', href: 'https://snapdeck.app' },
  { name: 'yarr.computer', href: 'https://yarr.computer' },
  { name: 'kuku.mom', href: 'https://kuku.mom' },
  { name: 'ulpaso.app', href: 'https://ulpaso.app' }
]

const state = reactive({
  dialogHeight: null,
  pageIsVisible: false
})

watch(() => props.visible, (value) => {
  if (value) {
    state.pageIsVisible = false
    updateDialogHeight()
    globalStore.shouldExplicitlyHideFooter = true
  } else {
    state.pageIsVisible = false
    globalStore.shouldExplicitlyHideFooter = false
    document.body.style.overflow = ''
  }
})

watch(() => state.pageIsVisible, (value) => {
  document.body.style.overflow = value ? 'hidden' : ''
})

const updateDialogHeight = async () => {
  if (!props.visible) { return }
  await nextTick()
  const element = dialogElement.value
  state.dialogHeight = utils.elementHeight(element)
}

const refreshBrowser = () => {
  window.location.reload()
}

const openAboutPage = () => {
  state.pageIsVisible = true
}

const closeAboutPage = () => {
  state.pageIsVisible = false
}

const toggleKeyboardShortcutsIsVisible = () => {
  globalStore.closeAllDialogs()
  globalStore.triggerKeyboardShortcutsIsVisible()
}
</script>

<template lang="pug">
dialog.about.narrow(v-if="visible" :open="visible" @click.left.stop ref="dialogElement" :style="{'max-height': state.dialogHeight + 'px'}")
  section.title-section
    .row.title-row
      button.small-button(@click.left.stop="openAboutPage") About dreemurr
      .title-controls
        button.small-button(@click.left="refreshBrowser" title="Refresh")
          img.refresh.icon(src="@/assets/refresh.svg")

  section
    .row(v-for="app in apps" :key="app.href")
      .button-wrap
        a(:href="app.href" target="_blank" rel="noopener noreferrer")
          button {{ app.name }}
    .row
      .button-wrap
        button(@click.left.stop="toggleKeyboardShortcutsIsVisible")
          .badge.keyboard-shortcut.badge-in-button ?
          span Keyboard Shortcuts

teleport(to="body")
  Transition(name="about-fade")
    .about-overlay(v-if="state.pageIsVisible" @click.left="closeAboutPage")
      .about-modal(role="dialog" aria-modal="true" aria-labelledby="about-title" @click.left.stop @touchend.stop)
        button.about-close(type="button" title="Close" @click.left="closeAboutPage")
          img.icon.cancel(src="@/assets/add.svg")
        img.about-mascot(:src="buddyHead" alt="" width="128" height="110")
        h1#about-title.about-name {{ consts.appName }}
</template>

<style lang="stylus">
dialog.about
  top calc(100% - 6px) !important
  .keyboard-shortcut
    padding 0 4px !important
  .title-controls
    display flex

.about-overlay
  position fixed
  inset 0
  z-index var(--max-z)
  display flex
  align-items center
  justify-content center
  padding 24px
  background rgba(255, 248, 242, 0.58)
  backdrop-filter blur(16px) saturate(1.15)
  -webkit-backdrop-filter blur(16px) saturate(1.15)
  pointer-events all

.about-modal
  position relative
  width 100%
  max-width 360px
  padding 40px 28px 28px
  text-align center
  background var(--primary-background)
  border 1px solid var(--primary-border)
  border-radius 14px
  box-shadow var(--hover-shadow)
  pointer-events all

.about-close
  position absolute
  top 8px
  right 8px
  width 28px
  min-width 28px
  height 28px
  margin 0
  padding 0
  display flex
  align-items center
  justify-content center
  text-align center
  .icon
    margin 0

.about-mascot
  display block
  width 128px
  height auto
  margin 0 auto 14px
  user-select none
  pointer-events none

.about-name
  margin 0
  font-family var(--header-font-9)
  font-size 28px
  font-weight 700
  font-style italic
  letter-spacing -0.04em
  color #E85D04
  line-height 1.1

.about-fade-enter-active,
.about-fade-leave-active
  transition opacity 0.18s ease
  .about-modal
    transition transform 0.22s cubic-bezier(0.2, 0.85, 0.2, 1), opacity 0.18s ease

.about-fade-enter-from,
.about-fade-leave-to
  opacity 0
  .about-modal
    opacity 0
    transform translateY(12px) scale(0.98)

@media (max-width 500px)
  .about-modal
    max-width 100%
    padding 32px 20px 20px
  .about-name
    font-size 24px
</style>
