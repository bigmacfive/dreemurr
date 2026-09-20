import { nextTick } from 'vue'
import { defineStore } from 'pinia'

import { useGlobalStore } from '@/stores/useGlobalStore'
import { useConnectionStore } from '@/stores/useConnectionStore'
import { useSpaceStore } from '@/stores/useSpaceStore'
import { useUserNotificationStore } from '@/stores/useUserNotificationStore'
import { useBroadcastStore } from '@/stores/useBroadcastStore'
import { useThemeStore } from '@/stores/useThemeStore'

import utils from '@/utils.js'
import consts from '@/consts.js'
import cache from '@/cache.js'

import { nanoid } from 'nanoid'
import uniqBy from 'lodash-es/uniqBy'
import dayjs from 'dayjs'
import timezone from 'dayjs/plugin/timezone'
dayjs.extend(timezone)

export const useUserStore = defineStore('user', {
  state: () => ({
    id: nanoid(),
    lastSpaceId: '',
    color: consts.accent,
    name: undefined,
    description: undefined,
    website: undefined,
    apiKey: '',
    arenaAccessToken: '',
    favoriteUsers: [],
    favoriteSpaces: [],
    favoriteColors: [],
    hiddenSpaces: [],
    cardsCreatedCount: 0,
    cardsCreatedCountRaw: 0,
    isUpgraded: false,
    isModerator: false,
    filterShowUsers: false,
    filterShowDateUpdated: false,
    filterShowAbsoluteDates: false,
    filterUnchecked: false,
    filterComments: false,
    shouldHideTutorialCards: false,
    shouldHideDateCards: false,
    shouldEmailNotifications: true,
    shouldEmailBulletin: true,
    shouldEmailWeeklyReview: true,
    shouldShowMoreAlignOptions: false,
    shouldUseLastConnectionColor: true,
    shouldShowItemActions: false,
    shouldShowMultipleSelectedLineActions: false,
    shouldShowMultipleSelectedBoxActions: false,
    shouldShowMultipleSelectedListActions: false,
    shouldShowCurrentSpaceTags: false,
    showInExploreUpdatedAt: null, // date
    defaultSpaceBackground: undefined,
    defaultSpaceBackgroundGradient: undefined,
    defaultSpaceBackgroundTint: undefined,
    defaultCardBackgroundColor: undefined,
    defaultConnectionControlPoint: consts.straightLineConnectionPathControlPoint,
    shouldUseStickyCards: true,
    shouldIncreaseUIContrast: false,
    shouldPauseConnectionDirections: false,
    shouldInvertZoom: false,
    lastUsedImagePickerService: '',
    theme: null,
    themeIsSystem: false,
    outsideSpaceBackgroundIsStatic: false,
    shouldDisableHapticFeedback: false,
    isDebugMode: false,
    studentDiscountIsAvailable: false,
    lastSidebarSection: '',
    prevInviteEmails: '',
    prevHeaderFontId: 0,
    cardSettingsShiftEnterShouldAddChildCard: true,
    cardSettingsCardWrapWidth: consts.normalCardWrapWidth,
    prevSettingsSection: null,
    disabledKeyboardShortcuts: ['newSpace'],
    cardDetailsResizeWidth: null,
    cardDetailsIsBelowCard: false,
    shouldShowMinimap: true,
    affiliatePromoCode: null,

    // billing

    downgradeAt: null,
    appleAppAccountToken: null,
    appleSubscriptionIsActive: null,
    stripePlanIsPurchased: null,
    stripeSubscriptionId: null,

    // space filters

    dialogSpaceFilterByGroup: {},
    dialogSpaceFilterByUser: {},
    dialogSpaceFilterShowHidden: false,
    dialogSpaceFilterSortBy: null, // null, updatedAt, createdAt, alphabetical
    dialogSpaceFilterByTemplates: false,

    // user tags

    tags: [],

    // drawing

    drawingBrushSize: 'm',
    drawingColor: undefined
  }),

  getters: {
    getUserAllState () {
      return { ...this.$state }
    },
    getUserPublicMeta () {
      const spaceStore = useSpaceStore()
      return utils.userMeta(this.getUserAllState, spaceStore.getSpaceAllState)
    },
    getUserIsSignedIn () {
      return true
    },
    getUserCardsCreatedIsOverLimit () {
      return false
    },
    getShouldPreventCardsCreatedCountUpdate () {
      const spaceStore = useSpaceStore()
      const spaceCreatorIsUpgraded = spaceStore.getSpaceCreatorIsUpgraded
      const userIsCreator = spaceStore.getSpaceCreatorIsCurrentUser
      return (spaceCreatorIsUpgraded && !userIsCreator)
    },
    getUserTotalItemFadingFiltersActive () {
      const globalStore = useGlobalStore()
      let userFilters = 0
      if (this.filterUnchecked) {
        userFilters += 1
      }
      const tagNames = globalStore.filteredTagNames
      const connections = globalStore.filteredConnectionColors
      const frames = globalStore.filteredFrameIds
      const boxes = globalStore.filteredBoxIds
      return userFilters + tagNames.length + connections.length + frames.length + boxes.length
    },
    getUserIsUnableToEditUnlessSignedIn () {
      return false
    },
    getUserIsSpaceCreator () {
      const spaceStore = useSpaceStore()
      return spaceStore.getSpaceCreator?.id === this.id
    },
    getUserIsSpaceUser () {
      const spaceStore = useSpaceStore()
      const space = spaceStore.getSpaceAllState
      let userIsInSpace = Boolean(space.users?.find(user => {
        return user.id === this.id
      }))
      userIsInSpace = userIsInSpace || space.userId === this.id
      return userIsInSpace
    },
    getUserIsSpaceCollaborator () {
      const spaceStore = useSpaceStore()
      if (spaceStore.collaborators) {
        return Boolean(spaceStore.collaborators.find(collaborator => {
          return collaborator.id === this.id
        }))
      }
      return false
    },
    getUserDrawingColor () {
      return this.drawingColor || this.color
    },
    getUserIsSpaceMember () {
      return true
    },
    getUserCanEditSpace () {
      const globalStore = useGlobalStore()
      if (globalStore.isEmbedMode) { return }
      return true
    },
    getUserSpacePermission () {
      const spaceStore = useSpaceStore()
      const isSpaceUser = this.getUserIsSpaceUser
      const isSpaceCollaborator = this.getUserIsSpaceCollaborator
      const spaceHasNoUsers = !spaceStore.users?.length
      if (isSpaceUser || spaceHasNoUsers) {
        return 'user'
      } else if (isSpaceCollaborator) {
        return 'collaborator'
      } else {
        return 'spectator'
      }
    },
    getUserIsCommentOnly () {
      const canEditSpace = this.getUserCanEditSpace
      const isSpaceMember = this.getUserIsSpaceMember
      return canEditSpace && !isSpaceMember
    }
  },

  actions: {

    getUserIsCurrentUser (user) {
      return Boolean(this.id === user?.id)
    },
    getUserTagByName (name) {
      return this.tags.find(tag => tag.name === name)
    },
    getUserIsOtherSpaceMember (space) {
      return true
    },
    getUserCanEditBox (box) {
      const isSpaceMember = this.getUserIsSpaceMember
      if (isSpaceMember) { return true }
      const canEditSpace = this.getUserCanEditSpace
      const createdBox = this.getUserIsBoxCreator(box)
      if (canEditSpace && createdBox) { return true }
      return false
    },
    getUserIsBoxCreator (box) {
      const isCreatedByUser = this.id === box.userId
      const isNoUser = !box.userId
      return isCreatedByUser || isNoUser
    },
    getUserIsCardCreator (card) {
      if (!card) { return }
      const isCreatedByUser = this.id === card.userId
      const isUpdatedByUser = this.id === card.nameUpdatedByUserId
      const isNoUser = !card.userId && !card.nameUpdatedByUserId
      return isCreatedByUser || isUpdatedByUser || isNoUser
    },
    getUserCanEditCard (card) {
      const isSpaceMember = this.getUserIsSpaceMember
      if (isSpaceMember) { return true }
      const canEditSpace = this.getUserCanEditSpace
      const getUserIsCardCreator = this.getUserIsCardCreator(card)
      if (canEditSpace && getUserIsCardCreator) { return true }
      return false
    },
    getUserTotalFiltersActive () {
      let userFilters = this.getUserTotalItemFadingFiltersActive
      if (this.filterShowUsers) {
        userFilters += 1
      }
      if (this.filterShowDateUpdated) {
        userFilters += 1
      }
      if (this.filterComments) {
        userFilters += 1
      }
      return userFilters
    },
    getUserIsReadOnlyInvitedToSpace (space) {
      const globalStore = useGlobalStore()
      return globalStore.spaceReadOnlyKey.spaceId === space.id
    },
    getItemIsCreatedByUser (item) {
      return this.id === item.userId
    },
    getUserIsSpaceUserByUser (user) {
      const spaceStore = useSpaceStore()
      const isUser = spaceStore.users.find(spaceUser => spaceUser.id === user.id)
      return isUser
    },
    getUsersByCardAtUserMentions (card) {
      const isAtUserMentions = utils.arrayHasItems(card.atUserMentions)
      if (!isAtUserMentions) { return [] }
      let users = card.atUserMentions.map(mention => this.getAtUserMentionById(mention.userId))
      users = users.filter(user => Boolean(user))
      users = uniqBy(users, 'id')
      return users
    },
    getAtUserMentionById (userId) {
      const globalStore = useGlobalStore()
      const spaceStore = useSpaceStore()
      return spaceStore.getSpaceUserById(userId) || globalStore.getOtherUserById(userId)
    },

    // init

    async initializeUserState (user) {
      user.isUpgraded = true
      user.apiKey = ''
      user.theme = 'light'
      user.themeIsSystem = false
      this.$state = user
      await cache.saveUser(user)
    },
    updateUserDefaultTimezone () {
      if (this.timezone) { return }
      const timezone = dayjs.tz.guess()
      this.updateUser({ timezone })
    },

    // create

    async createNewUser () {
      console.info('🌸 Create new user')
      this.theme = 'light'
      this.themeIsSystem = false
      this.apiKey = ''
      this.isUpgraded = true
      this.appleAppAccountToken = self.crypto.randomUUID()
      if (utils.isMobile()) {
        this.shouldShowMinimap = false
      }
      const allState = { ...this.$state }
      cache.saveUser(allState)
    },
    async restoreRemoteUser () {

    },
    async restoreUserAssociatedData () {

    },
    checkIfShouldJoinGroup () {

    },
    checkIfShouldApplyAffiliatePromo () {
      const globalStore = useGlobalStore()
      if (!globalStore.currentUserAffiliatePromoCode) { return }
      this.updateUser({
        affiliatePromoCode: globalStore.currentUserAffiliatePromoCode
      })
    },
    async initializeUser () {
      const globalStore = useGlobalStore()
      const themeStore = useThemeStore()
      const cachedUser = await cache.user()
      if (utils.objectHasKeys(cachedUser)) {
        console.info('🌸 Initialize user from cache', cachedUser.id)
        cachedUser.apiKey = ''
        cachedUser.theme = 'light'
        cachedUser.themeIsSystem = false
        cachedUser.isUpgraded = true
        cachedUser.color = consts.accent
        this.updateUserState(cachedUser)
        await cache.saveUser({ ...this.$state })
        themeStore.restoreTheme()
      } else {
        this.createNewUser()
        themeStore.restoreTheme()
      }
      globalStore.triggerUserIsLoaded()
      this.updateUserDefaultTimezone()
      console.log('🍍 initializeUser', this.getUserAllState)
    },

    // update

    updateUserState (update) {
      const keys = Object.keys(update)
      for (const key of keys) {
        this[key] = update[key]
      }
    },
    broadcastUpdateUser (update) {
      const spaceStore = useSpaceStore()
      const broadcastStore = useBroadcastStore()
      const permission = utils.capitalizeFirstLetter(this.getUserSpacePermission) // User, Collaborator, Spectator
      const action = `update${permission}`
      broadcastStore.update({ updates: update, store: 'spaceStore', action })
      const user = { ...this.$state }
      user.userId = user.id
      spaceStore.updateUser(user)
      spaceStore.updateCollaborator(user)
    },
    async updateUser (update) {
      this.updateUserState(update)
      await cache.updateUser(update)
      this.broadcastUpdateUser(update)
    },

    // favorites

    async updateUserFavoriteSpace (space, shouldAdd) {
      const userNotificationStore = useUserNotificationStore()
      if (shouldAdd) {
        this.favoriteSpaces.push(space)
        userNotificationStore.addFavoriteSpace(space)
      } else {
        this.favoriteSpaces = this.favoriteSpaces.filter(favoriteSpace => {
          return favoriteSpace.id !== space.id
        })
        userNotificationStore.removeFavoriteSpace(space)
      }
      await cache.updateUser({ favoriteSpaces: this.favoriteSpaces })
    },
    async updateUserFavoriteUser (user, shouldAdd) {
      const userNotificationStore = useUserNotificationStore()
      if (shouldAdd) {
        this.favoriteUsers.push(user)
        userNotificationStore.addFavoriteUser(user)
      } else {
        this.favoriteUsers = this.favoriteUsers.filter(favoriteUser => {
          return favoriteUser.id !== user.id
        })
        userNotificationStore.removeFavoriteUser(user)
      }
      await cache.updateUser({ favoriteUsers: this.favoriteUsers })
    },
    async updateUserFavoriteColor (color, shouldAdd) {
      color = color.color
      if (shouldAdd) {
        this.favoriteColors.push(color)
      } else {
        this.favoriteColors = this.favoriteColors.filter(favoriteColor => {
          return favoriteColor !== color
        })
      }
      await cache.updateUser({ favoriteColors: this.favoriteColors })
    },

    async updateUserFavoriteSpaceIsEdited (space) {
      this.favoriteSpaces = this.favoriteSpaces.map(favoriteSpace => {
        if (favoriteSpace.id === space.id) {
          favoriteSpace.isEdited = false
        }
        return space
      })
      await cache.updateUser({
        favoriteSpaces: this.favoriteSpaces
      })
    },

    // keyboard shortcuts

    async addToDisabledKeyboardShortcuts (value) {
      this.disabledKeyboardShortcuts.push(value)
      const disabled = utils.clone(this.disabledKeyboardShortcuts)
      await cache.updateUser({
        disabledKeyboardShortcuts: disabled
      })
    },
    async removeFromDisabledKeyboardShortcuts (value) {
      this.disabledKeyboardShortcuts = this.disabledKeyboardShortcuts.filter(shortcutName => value !== shortcutName)
      const disabled = utils.clone(this.disabledKeyboardShortcuts)
      await cache.updateUser({
        disabledKeyboardShortcuts: disabled
      })
    },

    // last space id

    async clearUserLastSpaceId () {
      const spaces = await cache.getAllSpaces()
      const lastSpace = spaces[1]
      if (lastSpace) {
        this.updateUser({ lastSpace: lastSpace.id })
      } else {
        this.updateUser({ lastSpace: '' })
      }
    },

    // card limit

    async updateUserCardsCreatedCount (cards, shouldDecrement) {
      cards = cards.filter(card => Boolean(card))
      cards = cards.filter(card => !card.isCreatedThroughPublicApi)
      cards = cards.filter(card => this.getUserIsCurrentUser({ id: card.userId }))
      let delta = cards.length
      if (!delta) { return }
      if (shouldDecrement) {
        delta = -delta
      }
      const count = this.cardsCreatedCount + delta
      this.cardsCreatedCountRaw = count
      this.cardsCreatedCount = count
      cache.updateUser({ cardsCreatedCount: count, cardsCreatedCountRaw: count })
    },
    checkIfShouldNotifyCardsCreatedIsOverLimit () {
      const globalStore = useGlobalStore()
      const spaceStore = useSpaceStore()
      if (!globalStore.notifyCardsCreatedIsOverLimit) { return }
      if (spaceStore.getShouldPreventAddFreeCard) { return }
      globalStore.updateNotifyCardsCreatedIsOverLimit(false)
    },
    getUserCardsCreatedWillBeOverLimit (count) {
      return false
    },

    // inbox

    async getInboxSpace () {
      return cache.getInboxSpace()
    },

    // are.na

    async updateUserArenaAccessToken () {

    },

    // drawing

    cycleDrawingBrushSize () {
      const prevValue = this.drawingBrushSize
      const sizes = Object.keys(consts.drawingBrushSizeDiameter)
      const currentIndex = sizes.indexOf(prevValue)
      let value
      if (currentIndex === -1 || currentIndex === sizes.length - 1) {
        value = sizes[0]
      } else {
        value = sizes[currentIndex + 1]
      }
      this.drawingBrushSize = value
    },

    // notify

    notifyReadOnly (position) {
      const globalStore = useGlobalStore()
      const canEditSpace = this.getUserCanEditSpace
      if (canEditSpace) { return }
      const cannotEdit = this.getUserIsUnableToEditUnlessSignedIn
      const notificationWithPosition = document.querySelector('.notifications-with-position .item')
      if (cannotEdit) {
        globalStore.addNotificationWithPosition({ message: 'Sign in to Edit', position, type: 'info', layer: 'space', icon: 'cancel' })
      } else {
        globalStore.addNotificationWithPosition({ message: 'Space is Read Only', position, type: 'info', layer: 'space', icon: 'cancel' })
      }
    },
    notifyUpgrade (position) {
      const globalStore = useGlobalStore()
      const spaceStore = useSpaceStore()
      const cannotAdd = spaceStore.getShouldPreventAddFreeCard
      if (cannotAdd) {
        globalStore.addNotificationWithPosition({ message: 'Upgrade to Add', position, type: 'danger', layer: 'app', icon: 'cancel' })
      }
    },

    // hidden spaces

    async updateUserHiddenSpace (spaceId, isHidden) {
      const space = { id: spaceId }
      if (isHidden) {
        this.hiddenSpaces.push(space)
      } else {
        this.hiddenSpaces = this.hiddenSpaces.filter(space => {
          return space?.id !== spaceId
        })
      }
      await cache.updateUser({ hiddenSpaces: this.hiddenSpaces })
    },

    // filters

    clearUserFilters () {
      this.updateUser({
        filterShowUsers: false,
        filterShowDateUpdated: false,
        filterShowAbsoluteDates: false,
        filterUnchecked: false,
        filterComments: false
      })
    }
  }
})
