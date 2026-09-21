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

  it('tracks pointer move and middle-button hold in Panning', () => {
    expect(panning).toContain("window.addEventListener('pointermove', checkIfShouldStartPanning")
    expect(panning).toContain("window.addEventListener('pointerup', checkIfShouldStartMomentum)")
    expect(panning).toMatch(/event\.buttons === 4/)
  })
})

describe('tauri mac clip-path', () => {
  it('clips #app instead of html so document scroll still works', () => {
    const macBlock = mainStyl.split('&.is-tauri-mac')[1]
    expect(macBlock).toBeTruthy()
    const beforeApp = macBlock.split('#app')[0]
    expect(beforeApp).not.toMatch(/clip-path/)
    expect(macBlock).toMatch(/#app[\s\S]*clip-path inset\(0 round 10px\)/)
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
