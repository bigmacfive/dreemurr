import { describe, it, expect } from 'vitest'
import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const mainStyl = readFileSync(resolve(import.meta.dirname, 'assets/main.styl'), 'utf8')
const scrollHandler = readFileSync(resolve(import.meta.dirname, 'components/ScrollAndTouchHandler.vue'), 'utf8')
const shortcuts = readFileSync(resolve(import.meta.dirname, 'components/KeyboardShortcutsHandler.vue'), 'utf8')
const panning = readFileSync(resolve(import.meta.dirname, 'components/Panning.vue'), 'utf8')
const publicDir = resolve(import.meta.dirname, '../public')

describe('tauri two-finger trackpad pan', () => {
  it('keeps body overflow auto so window.scroll pans the space', () => {
    const tauriBlock = mainStyl.split('&.is-tauri')[1]
    expect(tauriBlock).toBeTruthy()
    const bodyBlock = tauriBlock.split('body')[1]?.split('#app')[0] || ''
    expect(bodyBlock).toMatch(/overflow auto/)
    expect(bodyBlock).not.toMatch(/overflow hidden/)
  })

  it('does not trap the canvas in an overflow-hidden desktop frame', () => {
    const frameBlock = mainStyl.split('.window-frame.desktop')[1]?.split('.titlebar')[0] || ''
    expect(frameBlock).not.toMatch(/overflow hidden/)
    expect(frameBlock).not.toMatch(/inset 0/)
  })

  it('lets the desktop frame grow with page size', () => {
    const frameBlock = mainStyl.split('.window-frame.desktop')[1]?.split('.titlebar')[0] || ''
    expect(frameBlock).toMatch(/width max-content/)
    expect(frameBlock).toMatch(/height max-content/)
  })

  it('only preventDefault on wheel when pinching/zooming with meta', () => {
    expect(scrollHandler).toContain("window.addEventListener('wheel', handleMouseWheelEvents")
    expect(scrollHandler).toMatch(/if \(!isMeta\) \{[\s\S]*?return\s*\}[\s\S]*?event\.preventDefault\(\)/)
  })

  it('falls back to window.scrollBy on tauri when native wheel does not move', () => {
    expect(scrollHandler).toContain('applyTauriWheelPan')
    expect(scrollHandler).toMatch(/if \(!consts\.isTauri\(\)\) \{ return \}/)
    expect(scrollHandler).toContain('window.scrollBy(deltaX, deltaY)')
  })
})

describe('tauri middle-click pan', () => {
  it('starts pan from pointerdown and auxclick with preventDefault', () => {
    expect(shortcuts).toContain("window.addEventListener('pointerdown', handlePointerDownEvents, pointerEventOptions)")
    expect(shortcuts).toContain("window.addEventListener('auxclick', handleAuxClickEvents, pointerEventOptions)")
    expect(shortcuts).toContain('capture: true, passive: false')
    expect(shortcuts).toMatch(/event\.buttons === 4/)
  })

  it('lets middle-click pan start even on chrome buttons', () => {
    expect(shortcuts).toContain('checkIsTitlebarScope')
    expect(shortcuts).toMatch(/if \(isButtonScope && !shouldPan\) \{ return \}/)
    expect(shortcuts).toContain('capturePanPointer')
    expect(shortcuts).toContain('setPointerCapture')
  })

  it('tracks pointer move and middle-button hold in Panning', () => {
    expect(panning).toContain("window.addEventListener('pointermove', checkIfShouldStartPanning")
    expect(panning).toContain("window.addEventListener('pointerup', checkIfShouldStartMomentum)")
    expect(panning).toMatch(/event\.buttons === 4/)
  })
})

describe('tauri mac window chrome', () => {
  it('does not clip #app so top-left hit testing and document scroll stay correct', () => {
    const macBlock = mainStyl.split('&.is-tauri-mac')[1]
    expect(macBlock).toBeTruthy()
    expect(macBlock).not.toMatch(/clip-path/)
    const titlebarBlock = macBlock.split('.titlebar')[1]?.split('.titlebar-controls')[0] || ''
    expect(titlebarBlock).toMatch(/pointer-events none/)
  })

  it('starts window drag from left-click only so middle-click can pan', () => {
    const titlebar = readFileSync(resolve(import.meta.dirname, 'components/Titlebar.vue'), 'utf8')
    expect(titlebar).not.toContain('data-tauri-drag-region')
    expect(titlebar).toContain('startDragging')
    expect(titlebar).toMatch(/if \(event\.button !== 0\) \{ return \}/)
  })
})

describe('space chrome inset', () => {
  const globalStore = readFileSync(resolve(import.meta.dirname, 'stores/useGlobalStore.js'), 'utf8')
  const spaceStore = readFileSync(resolve(import.meta.dirname, 'stores/useSpaceStore.js'), 'utf8')
  const spaceZoom = readFileSync(resolve(import.meta.dirname, 'components/SpaceZoom.vue'), 'utf8')
  const constsSource = readFileSync(resolve(import.meta.dirname, 'consts.js'), 'utf8')

  it('defines a larger top-left gutter for tauri mac chrome', () => {
    expect(constsSource).toContain('spaceChromeInset')
    expect(constsSource).toMatch(/tauriMac:\s*\{\s*x:\s*56,\s*y:\s*124/)
  })

  it('keeps the chrome inset when zooming in past 100%', () => {
    expect(globalStore).toContain('getSpaceChromeInset')
    expect(globalStore).toContain('resetSpaceZoomOffset')
    expect(globalStore).toMatch(/newOffset\[axis\] = minOffset\[axis\]/)
    expect(globalStore).not.toMatch(/at >100% there should be no outside space margin/)
  })

  it('restores the chrome inset on space load and zoom reset', () => {
    expect(spaceStore).toContain('resetSpaceZoomOffset')
    expect(spaceStore).not.toMatch(/spaceZoomOffset = \{ x: 0, y: 0 \}/)
    expect(spaceZoom).toContain('resetSpaceZoomOffset')
    expect(spaceZoom).not.toMatch(/spaceZoomOffset = \{ x: 0, y: 0 \}/)
  })
})

describe('bundled default images', () => {
  it('keeps yarr and default background in public/', () => {
    expect(existsSync(resolve(publicDir, 'yarr.png'))).toBe(true)
    expect(existsSync(resolve(publicDir, 'background-2x.png'))).toBe(true)
    expect(existsSync(resolve(publicDir, 'favicon-32x32.png'))).toBe(true)
    expect(existsSync(resolve(publicDir, 'favicon-16x16.png'))).toBe(true)
    expect(existsSync(resolve(publicDir, 'apple-touch-icon.png'))).toBe(true)
  })
})
