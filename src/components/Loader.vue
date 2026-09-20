<template lang="pug">
.loader(v-if="visible" :class="{ small: isSmall, static: isStatic }")
  .buddy(:style="sheetStyle")
</template>

<script>
import loaderSheet from '@/assets/dreemurr/loader-sheet.png'

export default {
  name: 'Loader',
  props: {
    visible: Boolean,
    isStatic: Boolean,
    isSmall: Boolean
  },
  computed: {
    sheetStyle () {
      return { backgroundImage: `url(${loaderSheet})` }
    }
  }
}
</script>

<style lang="stylus">
.loader
  overflow hidden
  display inline-block
  width 28px
  height 28px
  position relative
  vertical-align middle
  background-color transparent
  .buddy
    width 100%
    height 100%
    background-repeat no-repeat
    background-size 400% 100%
    background-position 0 0
    animation dreemurr-idle 1.4s steps(4) infinite
  &.small
    width 16px
    height 16px
  &.static
    .buddy
      animation none

@keyframes dreemurr-idle
  from
    background-position 0 0
  to
    background-position -400% 0
</style>
