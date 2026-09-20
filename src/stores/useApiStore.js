import { defineStore } from 'pinia'
import cache from '@/cache.js'
import { useUserStore } from '@/stores/useUserStore'
import { fetchUrlPreview } from '@/urlPreview.js'

const noop = async () => null
const noopList = async () => []

const remoteNoops = [
  'addToQueue',
  'addToGetOtherItemsQueue',
  'addSpaceCollaborator',
  'applyStudentDiscount',
  'checkoutUrl',
  'communityBackgrounds',
  'createAppApiKey',
  'createCardInInbox',
  'createGroup',
  'createGroupUser',
  'createMultiplePresignedPosts',
  'createPresignedPost',
  'createSessionToken',
  'createSpace',
  'createSpaces',
  'customerPortalUrl',
  'deleteAllNotifications',
  'deleteAppApiKey',
  'deleteGroupPermanent',
  'deleteUserPermanent',
  'donationUrl',
  'getAffiliate',
  'getAppApiKeys',
  'getCardHistory',
  'getCardsWithLinkToSpaceId',
  'getCardsWithTag',
  'getChangelog',
  'getDate',
  'getEmojis',
  'getEveryoneSpaces',
  'getExploreSpaces',
  'getFollowingUsersSpaces',
  'getGroup',
  'getGroupsNotificationUnsubscribed',
  'getInboxSpace',
  'getNotifications',
  'getPublicSpaces',
  'getPublicUser',
  'getPublicUserExploreSpaces',
  'getSpace',
  'getSpaceAnonymously',
  'getSpaceFavorites',
  'getSpaceHistory',
  'getSpaceRemovedCards',
  'getSpacesNotificationUnsubscribed',
  'getSpaceUpdatedAt',
  'getStatus',
  'getUserGroupSpaces',
  'getUserGroups',
  'getUserInboxSpace',
  'getUserTemplateSpaces',
  'groupNotificationResubscribe',
  'moderatorRestartServer',
  'pdf',
  'removeGroupUser',
  'removeSpaceCollaborator',
  'resetPassword',
  'restoreRemovedSpace',
  'rotateAppApiKey',
  'searchExploreSpaces',
  'sendAnalyticsEvent',
  'sendResetPasswordEmail',
  'sendSpaceInviteEmails',
  'signIn',
  'signUp',
  'spaceNotificationResubscribe',
  'subscriptionUrl',
  'updateEmail',
  'updatePassword',
  'updateSpace',
  'updateSpacePreviewImage',
  'updateUrlPreviewImage'
]

const actions = {}
remoteNoops.forEach(name => {
  actions[name] = noop
})

actions.getUserSpaces = async () => cache.getAllSpaces()
actions.getUserTodos = async () => cache.getTodosBySpace()
actions.getUserAtUserMentions = async () => {
  const userStore = useUserStore()
  return cache.getAtUserMentionsBySpace(userStore.id)
}
actions.getUserAtDateMentions = async () => cache.getAtDateMentionsBySpace()
actions.searchCards = async ({ query } = {}) => cache.searchCards(query)
actions.getUserTags = async () => cache.allTags()
actions.getUserRemovedSpaces = async () => cache.getAllRemovedSpaces()
actions.downloadAllSpaces = async () => {
  const spaces = await cache.getAllSpaces()
  return new Blob([JSON.stringify(spaces, null, 2)], { type: 'application/json' })
}
actions.urlPreview = async ({ url, card }) => {
  const preview = await fetchUrlPreview(url)
  if (!preview) { return null }
  let host = ''
  try {
    host = new URL(url).host
  } catch (error) {}
  return {
    host,
    data: {
      id: card?.id,
      ...preview
    }
  }
}

export const useApiStore = defineStore('api', {
  actions
})
