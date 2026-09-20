import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const mainStyl = readFileSync(resolve(import.meta.dirname, 'assets/main.styl'), 'utf8')
const scrollHandler = readFileSync(resolve(import.meta.dirname, 'components/ScrollAndTouchHandler.vue'), 'utf8')

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

  it('only preventDefault on wheel when pinching/zooming with meta', () => {
    expect(scrollHandler).toContain("window.addEventListener('wheel', handleMouseWheelEvents")
    expect(scrollHandler).toMatch(/if \(!isMeta\) \{[\s\S]*?return\s*\}[\s\S]*?event\.preventDefault\(\)/)
  })
})
