import { nextTick } from 'vue'
import { defineStore } from 'pinia'

import { useGlobalStore } from '@/stores/useGlobalStore'
import { useConnectionStore } from '@/stores/useConnectionStore'
import { useCardStore } from '@/stores/useCardStore'
import { useUserStore } from '@/stores/useUserStore'
import { useSpaceStore } from '@/stores/useSpaceStore'

import utils from '@/utils.js'
import consts from '@/consts.js'
import { isDreemFileName, openDreemFileObjects } from '@/desktop/dreemFiles.js'

import { nanoid } from 'nanoid'

const blockedExtensions = ['.exe', '.msi', '.bat', '.ps1', '.sh', '.dmg', '.pkg']

export const useUploadStore = defineStore('upload', {
  state: () => ({
    pendingUploads: [],
    sessionUploadDataUrl: {}
  }),
  actions: {
    getPendingUploadByItemId (id) {
      return this.pendingUploads.find(item => item.cardId === id)
    },
    getSessionUploadByItemId (id) {
      return this.sessionUploadDataUrl[id]
    },
    s3Policy (value) {
      utils.typeCheck({ value, type: 'object', origin: 's3Policy' })
      this.s3Policy = value
    },
    addPendingUpload (upload) { // key, fileName, spaceId
      upload.percentComplete = 0
      this.pendingUploads = this.pendingUploads.filter(item => (item.cardId !== upload.cardId || item.spaceId === upload.spaceId))
      this.pendingUploads.push(upload)
    },
    updatePendingUpload ({ cardId, spaceId, percentComplete, imageDataUrl }) {
      this.pendingUploads = this.pendingUploads.map(item => {
        if (percentComplete && item.cardId === cardId) {
          item.percentComplete = percentComplete
        }
        if (imageDataUrl && item.cardId === cardId) {
          item.imageDataUrl = imageDataUrl
        }
        return item
      })
      if (percentComplete === 100) {
        this.updateCardSessionUploadDataUrl(cardId)
      }
      this.pendingUploads = this.pendingUploads.filter(item => item.percentComplete < 100)
    },
    updateCardSessionUploadDataUrl (cardId) {
      if (!cardId) { return }
      const cardStore = useCardStore()
      const upload = this.getPendingUploadByItemId(cardId)
      if (!upload) { return }
      this.sessionUploadDataUrl[cardId] = upload
    },
    removePendingUpload ({ cardId, spaceId, boxId } = {}) {
      this.updateCardSessionUploadDataUrl(cardId)
      this.pendingUploads = this.pendingUploads.filter(item => {
        if (cardId && item.cardId === cardId) { return false }
        if (spaceId && item.spaceId === spaceId) { return false }
        if (boxId && item.boxId === boxId) { return false }
        return true
      })
    },

    checkIfFileTooBig (file) {
      const userStore = useUserStore()
      const userIsUpgraded = userStore.isUpgraded
      const isFileTooBig = utils.isFileTooBig({ file, userIsUpgraded })
      if (isFileTooBig) {
        throw {
          type: 'sizeLimit',
          message: `To upload files over ${consts.freeUploadSizeLimit}mb, upgrade for unlimited size uploads`
        }
      }
    },
    checkIfFileTypeBlocked (file) {
      const name = file.name.toLowerCase()
      const isBlocked = blockedExtensions.some(ext => name.endsWith(ext))
      if (isBlocked) {
        throw {
          type: 'blockedFileType',
          message: 'for security reasons, executable files cannot be uploaded'
        }
      }
    },
    addImageDataUrl ({ file, cardId, spaceId }) {
      const fileType = file.type || utils.imageFileTypeFromName(file) || ''
      const isImage = fileType.includes('image')
      if (!isImage) { return null }
      this.updatePendingUpload({
        cardId,
        spaceId,
        imageDataUrl: URL.createObjectURL(file)
      })
    },
    fileToDataUrl (file) {
      return new Promise((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = () => resolve(reader.result)
        reader.onerror = reject
        reader.readAsDataURL(file)
      })
    },
    async storeLocalFile (file) {
      file = await utils.normalizePastedImageFile(file)
      const type = file.type || utils.imageFileTypeFromName(file)
      if (type && type !== file.type) {
        file = new File([file], file.name || `pasted.${type.replace('image/', '')}`, { type })
      }
      if (utils.shouldCompressImageFile(file)) {
        file = await utils.compressImageFile(file)
      }
      return this.fileToDataUrl(file)
    },
    async uploadFile ({ file, cardId, spaceId, boxId }) {
      const cardStore = useCardStore()
      file = await utils.normalizePastedImageFile(file)
      this.checkIfFileTypeBlocked(file)
      this.addPendingUpload({ cardId, spaceId, boxId, fileName: file.name, isGif: utils.isGifFile(file) })
      try {
        this.addImageDataUrl({ file, cardId, spaceId, boxId })
        this.updatePendingUpload({ cardId, percentComplete: 50 })
        const dataUrl = await this.storeLocalFile(file)
        if (cardId && dataUrl) {
          await cardStore.updateCard({ id: cardId, name: dataUrl })
        }
        return dataUrl
      } finally {
        this.removePendingUpload({ cardId, spaceId, boxId })
      }
    },
    async addCardsAndUploadFiles ({ files, event, position }) {
      const userStore = useUserStore()
      const cardStore = useCardStore()
      const globalStore = useGlobalStore()
      const list = Array.from(files || [])
      const dreemFiles = list.filter(file => isDreemFileName(file?.name))
      files = list.filter(file => !isDreemFileName(file?.name))
      if (dreemFiles.length) {
        await openDreemFileObjects(dreemFiles)
      }
      if (!files.length) { return }
      position = position || utils.cursorPositionInSpace(event)
      userStore.notifyReadOnly(position)
      const canEditSpace = userStore.getUserCanEditSpace
      if (!canEditSpace) {
        globalStore.addNotification({ message: 'You can only upload files on spaces you can edit', type: 'info' })
        return
      }
      const isOutsideSpace = utils.isPositionOutsideOfSpace(position)
      if (isOutsideSpace) {
        globalStore.addNotification({ message: 'Outside Space', type: 'info' })
        return
      }
      const hasBlockedFile = files.find(file => blockedExtensions.some(ext => file.name.toLowerCase().endsWith(ext)))
      if (hasBlockedFile) {
        globalStore.addNotification({ message: 'Executable files cannot be uploaded', type: 'danger' })
        return
      }
      const cards = cardStore.getAllCards
      const highestCardZ = utils.highestItemZ(cards)
      for (const [index, file] of files.entries()) {
        const offset = index * 20
        const cardId = nanoid()
        try {
          cardStore.createCard({
            id: cardId,
            x: position.x + offset,
            y: position.y + offset,
            z: highestCardZ + 1 + index,
            name: consts.uploadPlaceholder
          }, true)
          await this.uploadFile({ file, cardId })
        } catch (error) {
          console.error('🚒 addCardsAndUploadFiles', error)
          globalStore.addNotification({ message: error.message || 'Could not paste image', type: 'danger' })
        }
      }
    }

  }
})
