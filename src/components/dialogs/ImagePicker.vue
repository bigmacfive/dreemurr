<script setup>
import { reactive, computed, onMounted, watch, ref, nextTick } from 'vue'

import { useGlobalStore } from '@/stores/useGlobalStore'
import { useCardStore } from '@/stores/useCardStore'
import { useUserStore } from '@/stores/useUserStore'
import { useUploadStore } from '@/stores/useUploadStore'

import Loader from '@/components/Loader.vue'
import utils from '@/utils.js'
import consts from '@/consts.js'

const globalStore = useGlobalStore()
const cardStore = useCardStore()
const userStore = useUserStore()
const uploadStore = useUploadStore()

const dialogElement = ref(null)
const inputElement = ref(null)

onMounted(() => {
  window.addEventListener('resize', updateDialogHeight)
})

const props = defineProps({
  visible: Boolean,
  initialSearch: String,
  cardUrl: String,
  cardId: String,
  removeIsVisible: Boolean
})
watch(() => props.visible, async (value, prevValue) => {
  await nextTick()
  if (value) {
    updateDialogHeight()
    scrollIntoView()
  } else {
    closeImagePicker()
  }
})

const emit = defineEmits(['removeImage', 'selectImage'])

const state = reactive({
  dialogHeight: null,
  error: {
    signUpToUpload: false,
    sizeLimit: false,
    unknownUploadError: false
  }
})

const currentUserIsSignedIn = computed(() => userStore.getUserIsSignedIn)
const triggerSignUpOrInIsVisible = () => {
  globalStore.closeAllDialogs()
  globalStore.triggerSignUpOrInIsVisible()
}
const triggerUpgradeUserIsVisible = () => {
  globalStore.closeAllDialogs()
  globalStore.triggerUpgradeUserIsVisible()
}
const closeImagePicker = () => {
  cardStore.clearCardNameUploadPlaceholder(props.cardId)
}
const freeUploadSizeLimit = computed(() => consts.freeUploadSizeLimit)

const clearErrors = () => {
  state.error.signUpToUpload = false
  state.error.sizeLimit = false
  state.error.unknownUploadError = false
}

const cardPendingUpload = computed(() => {
  const pendingUploads = uploadStore.pendingUploads
  return pendingUploads.find(upload => upload.cardId === props.cardId)
})
const removeImage = () => {
  emit('removeImage')
}
const selectFile = (event) => {
  clearErrors()
  if (!currentUserIsSignedIn.value) {
    state.error.signUpToUpload = true
    return
  }
  const input = inputElement.value
  input.click()
}

const uploadOtherSelectedFiles = (otherSelectedFiles) => {
  if (!otherSelectedFiles.length) { return }
  try {
    const cardId = props.cardId
    const card = cardStore.getCard(cardId)
    const positionOffset = 20
    const position = {
      x: card.x + positionOffset,
      y: card.y + positionOffset
    }
    uploadStore.addCardsAndUploadFiles({
      files: otherSelectedFiles,
      position
    })
  } catch (error) {
    console.warn('🚒', error)
  }
}
const uploadSelectedFile = async (selectedFile) => {
  const cardId = props.cardId
  try {
    await uploadStore.uploadFile({ file: selectedFile, cardId })
  } catch (error) {
    console.warn('🚒', error)
    if (error.type === 'sizeLimit') {
      state.error.sizeLimit = true
    } else {
      state.error.unknownUploadError = true
    }
  }
}
const uploadFiles = async (event) => {
  const files = Array.from(event.target.files)
  const selectedFile = files[0]
  const otherSelectedFiles = files.slice(1)
  uploadOtherSelectedFiles(otherSelectedFiles)
  uploadSelectedFile(selectedFile)
}
const addPlaceholderToCardName = (event) => {
  // prevents empty cards from being removed on blur by the @change event on iOS
  const card = cardStore.getCard(props.cardId)
  if (!card.name) {
    const update = {
      id: card.id,
      name: consts.uploadPlaceholder
    }
    cardStore.updateCard(update)
  }
}

const scrollIntoView = () => {
  if (!props.visible) { return }
  const element = dialogElement.value
  if (!element) { return }
  globalStore.scrollElementIntoView({ element })
  globalStore.triggerUpdateHeaderAndFooterPosition()
}
const updateDialogHeight = async () => {
  if (!props.visible) { return }
  await nextTick()
  const element = dialogElement.value
  state.dialogHeight = utils.elementHeight(element)
}
</script>

<template lang="pug">
dialog.image-picker(v-if="visible" :open="visible" @click.left.stop ref="dialogElement" :style="{'max-height': state.dialogHeight + 'px'}")
  section
    .row.title-row-flex
      .button-wrap
        button(@click.left.stop="selectFile") Upload
        input.hidden(type="file" ref="inputElement" @change="uploadFiles" multiple="true" @click="addPlaceholderToCardName")
      .button-wrap(v-if="removeIsVisible")
        button(@click.left.stop="removeImage") Remove

    .uploading-container(v-if="cardPendingUpload")
      img(v-if="cardPendingUpload" :src="cardPendingUpload.imageDataUrl")
      .badge.info(:class="{absolute : cardPendingUpload.imageDataUrl}")
        Loader(:visible="true")
        span {{cardPendingUpload.percentComplete}}%
    .error-container-top(v-if="state.error.signUpToUpload")
      p
        span To upload files,
        span.badge.info
          span you need to Sign Up or In
      button(@click.left="triggerSignUpOrInIsVisible") Sign Up or In
    .error-container-top(v-if="state.error.sizeLimit")
      p
        span.badge.danger
          img.icon.cancel(src="@/assets/add.svg")
          span Too Big
      p
        span To upload files over {{freeUploadSizeLimit}}mb,
        span.badge.info upgrade for unlimited
      button(@click.left="triggerUpgradeUserIsVisible") Upgrade for Unlimited
    .error-container-top(v-if="state.error.unknownUploadError")
      .badge.danger
        span (シ_ _)シ Something went wrong, Please try again or contact support
</template>

<style lang="stylus">
dialog.image-picker
  min-height 80px
  max-height 70vh
  overflow auto
  .hidden
    display none

  .error-container-top + label
    margin-top 10px

  .uploading-container
    position relative
    img
      border-radius var(--small-entity-radius)
    .badge
      display inline-block
      &.absolute
        position absolute
        top 6px
        left 6px
</style>
