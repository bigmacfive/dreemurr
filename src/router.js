import { createRouter, createWebHistory, createMemoryHistory } from 'vue-router'
import { useGlobalStore } from '@/stores/useGlobalStore'
import { useUserStore } from '@/stores/useUserStore'
import { useSpaceStore } from '@/stores/useSpaceStore'
import { useCardStore } from '@/stores/useCardStore'
import { useBoxStore } from '@/stores/useBoxStore'
import { useLineStore } from '@/stores/useLineStore'
import { useListStore } from '@/stores/useListStore'
import { useThemeStore } from '@/stores/useThemeStore'
import { useApiStore } from '@/stores/useApiStore'

import consts from './consts.js'
import utils from './utils.js'

// ensures space will load properly after
const resetStoresForStaticPage = () => {
  useGlobalStore().$reset()
  useSpaceStore().$reset()
  useCardStore().$reset()
  useBoxStore().$reset()
  useLineStore().$reset()
  useListStore().$reset()
}

const affiliatePromoCodes = ['foxy', 'phonetonote', 'fran']
const aboutPaths = ['/about', '/from']

const router = {
  history: consts.isStaticPrerenderingPage ? createMemoryHistory() : createWebHistory(import.meta.env.BASE_URL),

  // server level redirects in _redirects

  routes: [
    {
      path: '/add',
      redirect: '/app'
    }, {
      path: '/api',
      name: 'api',
      component: () => import('./views/Api.vue'),
      beforeEnter: (to, from, next) => {
        const globalStore = useGlobalStore()
        resetStoresForStaticPage()
        next()
      }
    }, {
      path: '/help/:page?',
      name: 'help',
      component: () => import('./views/Help.vue'),
      beforeEnter: (to, from, next) => {
        resetStoresForStaticPage()
        next()
      }
    }, {
      path: '/from/:promoCode',
      redirect: to => ({
        path: '/',
        query: { promoCode: to.params.promoCode }
      })
    }, {
      path: '/',
      alias: aboutPaths,
      redirect: '/app'
    }, {
      path: '/app',
      name: 'space',
      component: () => import('./views/Space.vue'),
      beforeEnter: (to, from, next) => {
        if (!consts.isStaticPrerenderingPage) {
          const globalStore = useGlobalStore()
          globalStore.disableViewportOptimizations = utils.stringToBoolean(to.query.disableViewportOptimizations)
        }
        next()
      }
    }, {
      path: '/reset-password',
      redirect: '/app'
    }, {
      path: '/update-arena-access-token',
      redirect: '/app'
    }, {
      path: '/explore',
      redirect: '/app'
    }, {
      path: '/new',
      component: () => import('./views/Space.vue'),
      beforeEnter: (to, from, next) => {
        const globalStore = useGlobalStore()
        globalStore.loadNewSpace = true
        next()
      }
    }, {
      path: '/inbox',
      redirect: '/app'
    }, {
      path: '/:space/:card',
      component: () => import('./views/Space.vue'),
      beforeEnter: (to, from, next) => {
        const globalStore = useGlobalStore()
        globalStore.disableViewportOptimizations = utils.stringToBoolean(to.query.disableViewportOptimizations)
        globalStore.isCommentMode = utils.stringToBoolean(to.query.comment)
        const url = window.location.toString()
        globalStore.updateSpaceAndCardUrlToLoad(url)
        next()
      }
    }, {
      path: '/embed',
      component: () => import('./views/Space.vue'),
      beforeEnter: (to, from, next) => {
        const globalStore = useGlobalStore()
        const spaceId = to.query.spaceId
        const zoomLimit = {
          min: 40,
          max: 100
        }
        let zoom = parseInt(to.query.zoom)
        zoom = Math.max(zoomLimit.min, zoom)
        zoom = Math.min(zoomLimit.max, zoom)
        globalStore.spaceUrlToLoad = `${consts.kinopioDomain()}/${spaceId}`
        globalStore.spaceZoomPercent = zoom
        globalStore.isEmbedMode = true
        next()
      }
    }, {
      path: '/donation-success',
      redirect: '/app'
    }, {
      path: '/subscription-success',
      redirect: '/app'
    }, {
      path: '/group/invite/:groupId',
      redirect: '/app'
    }, {
      path: '/affiliates',
      name: 'affiliates',
      component: () => import('./views/Affiliates.vue'),
      beforeEnter: (to, from, next) => {
        const globalStore = useGlobalStore()
        next()
      }
    }, {
      path: '/space/invite/:spaceId',
      redirect: '/app'
    }, {
      path: '/group/:groupId',
      name: 'group',
      component: () => import('./views/Group.vue'),
      beforeEnter: (to, from, next) => {
        const globalStore = useGlobalStore()
        const groupId = to.params.groupId
        globalStore.groupIdPageToLoad = groupId
        next()
      }
    }, {
      path: '/:space',
      component: () => import('./views/Space.vue'),
      beforeEnter: (to, from, next) => {
        const globalStore = useGlobalStore()
        const url = window.location.toString()
        globalStore.updateSpaceAndCardUrlToLoad(url)
        next()
      }
    }
  ]
}

export default router

const inviteToEdit = async ({ spaceId, collaboratorKey }) => {
  const globalStore = useGlobalStore()
  const userStore = useUserStore()
  const apiStore = useApiStore()
  const isSignedIn = userStore.getUserIsSignedIn
  if (!isSignedIn) {
    globalStore.spaceUrlToLoad = `${consts.kinopioDomain()}/${spaceId}`
    globalStore.addToSpaceCollaboratorKeys({ spaceId, collaboratorKey })
    return
  }
  // join
  try {
    await apiStore.addSpaceCollaborator({ spaceId, collaboratorKey })
    globalStore.spaceUrlToLoad = `${consts.kinopioDomain()}/${spaceId}`
    globalStore.addNotification({ message: 'You can now edit this space', type: 'success' })
    globalStore.addToSpaceCollaboratorKeys({ spaceId, collaboratorKey })
  } catch (error) {
    console.error('🚒 inviteToEdit', error)
    if (error.status === 401) {
      globalStore.addNotification({ message: 'Space could not be found, or your invite was invalid', type: 'danger' })
    } else {
      globalStore.addNotification({ message: '(シ_ _)シ Something went wrong, Please try again or contact support', type: 'danger' })
    }
  }
}

const inviteToReadOnly = ({ spaceId, readOnlyKey }) => {
  const globalStore = useGlobalStore()
  globalStore.spaceUrlToLoad = `${consts.kinopioDomain()}/${spaceId}`
  globalStore.spaceReadOnlyKey = { spaceId, key: readOnlyKey }
}
