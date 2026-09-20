import { defineStore } from 'pinia'
import { useUserStore } from '@/stores/useUserStore'
import { useSpaceStore } from '@/stores/useSpaceStore'

import { useGlobalStore } from '@/stores/useGlobalStore'

import utils from '@/utils.js'

import { colord } from 'colord'
import randomColor from 'randomcolor'

const themes = {
  light: {
    name: 'light',
    colors: {
      'color-scheme': 'light',
      primary: 'black',
      'primary-border': 'rgba(0,0,0,0.3)',
      'primary-background': 'white',
      'text-link': '#143997',
      'primary-transparent': 'rgba(0,0,0,0.5)',
      'button-background': 'rgba(255,255,255,1)',
      'button-background-translucent': 'rgba(255,255,255,0.5)',
      'secondary-background': '#e3e3e3',
      'secondary-hover-background': '#d8d8d8',
      'secondary-active-background': '#cdcdcd',
      'tertiary-hover-background': '#c1c1c1',
      'danger-background': '#ffb8b3',
      'danger-hover-background': '#ffa49e',
      'danger-active-background': '#ff928b',
      'info-background': '#FFD4A8',
      'success-background': '#67ffbb',
      'search-background': 'yellow',
      'new-unread-background': '#57a8ff',
      'secondary-active-background-dark': '#cdcdcd',
      'light-shadow': 'rgba(0,0,0,0.20)',
      'heavy-shadow': 'rgba(0,0,0,0.25)',
      'inset-heavy-shadow': 'rgba(0,0,0,0.35)',
      // codeblock
      'code-comment': '#898989',
      'code-punctuation': 'black',
      'code-string': '#a2162d',
      'code-keyword': '#00119e',
      // user badges
      'badge-donor': '#ff9dff',
      'badge-upgraded': '#E85D04',
      // /about page sections
      'example-background': '#889e9a'
    }
  },
  dark: {
    name: 'dark',
    colors: {
      'color-scheme': 'dark',
      primary: 'white',
      'primary-border': 'rgba(255,255,255,0.3)',
      'primary-background': 'black',
      'text-link': '#788cc9',
      'primary-transparent': 'rgba(0,0,0,0.5)',
      'button-background': 'rgba(0,0,0,1)',
      'button-background-translucent': 'rgba(0,0,0,0.3)',
      'secondary-background': '#262626',
      'secondary-hover-background': '#555',
      'secondary-active-background': '#333',
      'tertiary-hover-background': '#444',
      'danger-background': '#732b26',
      'danger-hover-background': '#8f3832',
      'danger-active-background': '#a83730',
      'info-background': '#7A3A12',
      'success-background': '#183f24',
      'search-background': '#6f6d01',
      'new-unread-background': '#2f6fb5',
      'secondary-active-background-dark': '#444',
      'light-shadow': 'rgba(0,0,0,0.25)',
      'heavy-shadow': 'rgba(0,0,0,0.55)',
      'inset-heavy-shadow': 'rgba(0,0,0,0.65)',
      // codeblock
      'code-comment': '#898989',
      'code-punctuation': 'white',
      'code-string': '#fddd88',
      'code-keyword': '#79e6d9',
      // user badges
      'badge-donor': 'blueviolet',
      'badge-upgraded': 'green',
      'badge-moderator': 'olive',
      'badge-ambassador': '#0f9189',
      // /about page sections
      'example-background': '#14292d'
    }
  }
}

export const useThemeStore = defineStore('theme', {
  state: () => ({
    systemTheme: 'light'
  }),
  getters: {
    getIsThemeDark () {
      return false
    },
    getThemeName () {
      return 'light'
    },
    getThemeColors () {
      const themeName = this.getThemeName
      return themes[themeName].colors
    }
  },

  actions: {
    updateSystemTheme () {
      this.systemTheme = 'light'
      this.restoreTheme()
    },
    isCardColorThemeDefault (color) {
      color = colord(color).toHex()
      const lightThemeColor = '#e3e3e3'
      const darkThemeColor = '#262626'
      return color === lightThemeColor || color === darkThemeColor
    },

    // theme is system

    updateThemeIsSystem () {
      const userStore = useUserStore()
      userStore.updateUser({ themeIsSystem: false, theme: 'light' })
      this.updateTheme('light')
    },
    toggleThemeIsSystem () {
      this.updateThemeIsSystem()
    },

    // update

    toggleTheme () {
      this.updateTheme('light')
    },
    updateTheme () {
      const globalStore = useGlobalStore()
      const userStore = useUserStore()
      const theme = themes.light
      const colors = theme.colors
      const keys = Object.keys(colors)
      keys.forEach(key => {
        utils.setCssVariable(key, colors[key])
      })
      userStore.updateUser({ theme: 'light', themeIsSystem: false })
      globalStore.triggerUpdateTheme()
    },
    restoreTheme () {
      this.updateTheme('light')
    },

    // preview image

    previewImageThemeOptions () {
      const spaceStore = useSpaceStore()
      const isDarkTheme = this.getIsThemeDark
      let background = spaceStore.background
      let backgroundTint = spaceStore.backgroundTint
      const backgroundElement = document.querySelector('#space-background-image')
      const backgroundTintElement = document.querySelector('#space-background-tint')
      if (background && backgroundElement) {
        let domBackground = backgroundElement.style.backgroundImage
        domBackground = utils.urlFromCSSBackgroundImage(domBackground)
        background = domBackground || background
      }
      if (isDarkTheme && backgroundTintElement) {
        const domBackgroundTint = backgroundTintElement.style.backgroundColor
        backgroundTint = domBackgroundTint || backgroundTint
      }
      const theme = {
        secondaryBackground: this.getThemeColors['secondary-background'],
        primaryBorder: this.getThemeColors['primary-border'],
        primaryBackground: this.getThemeColors['primary-background'],
        entityRadius: 6,
        backgroundTint,
        background
      }
      return { isDarkTheme, theme }
    },

    // color

    randomColor () {
      const isDarkTheme = this.getIsThemeDark
      let color = randomColor({ luminosity: 'light', hue: 'orange' })
      if (isDarkTheme) {
        color = randomColor({ luminosity: 'dark', hue: 'orange' })
      }
      return color
    }
  }
})
