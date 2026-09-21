import { describe, it, expect, vi } from 'vitest'
import utils from './utils.js'

describe('cursorPositionInPage', () => {
  it('uses client coordinates plus scroll so horizontal pan can move', () => {
    vi.stubGlobal('scrollX', 40)
    vi.stubGlobal('scrollY', 12)
    const position = utils.cursorPositionInPage({
      clientX: 80,
      clientY: 20,
      pageX: 0,
      pageY: 0
    })
    expect(position).toEqual({ x: 120, y: 32 })
    vi.unstubAllGlobals()
  })
})

describe('bundledAssetUrl', () => {
  it('keeps a root-relative path', () => {
    expect(utils.bundledAssetUrl('/yarr.png')).toBe('/yarr.png')
  })

  it('prefixes a bare filename', () => {
    expect(utils.bundledAssetUrl('background-2x.png')).toBe('/background-2x.png')
  })

  it('returns empty string for a missing path', () => {
    expect(utils.bundledAssetUrl()).toBe('')
    expect(utils.bundledAssetUrl('')).toBe('')
  })
})

describe('clearTrailingSlash', () => {
  it('removes trailing slash from string', () => {
    const result = utils.clearTrailingSlash('https://example.com/')
    expect(result).toBe('https://example.com')
  })

  it('handles string without trailing slash', () => {
    const result = utils.clearTrailingSlash('https://example.com')
    expect(result).toBe('https://example.com')
  })

  it('handles empty string', () => {
    const result = utils.clearTrailingSlash('')
    expect(result).toBeUndefined()
  })
})

describe('spaceIdFromUrl', () => {
  it('extracts space ID from URL and strips hidden parameter', () => {
    const url = 'https://kinopio.club/space-abcdefghijk1mn0pqrstu?hidden=true'
    const result = utils.spaceIdFromUrl(url)
    expect(result).toBe('abcdefghijk1mn0pqrstu')
  })

  it('extracts space ID from URL without hidden parameter', () => {
    const url = 'https://kinopio.club/space-abcdefghijk1mn0pqrstu'
    const result = utils.spaceIdFromUrl(url)
    expect(result).toBe('abcdefghijk1mn0pqrstu')
  })

  it('handles URLs with multiple hidden parameters', () => {
    const url = 'https://kinopio.club/space-abcdefghijk1mn0pqrstu?hidden=true&foo=bar&hidden=true'
    const result = utils.spaceIdFromUrl(url)
    expect(result).toBe('abcdefghijk1mn0pqrstu')
  })

  it('handles URLs with fragments', () => {
    const url = 'https://kinopio.club/space-abcdefghijk1mn0pqrstu#hello'
    const result = utils.spaceIdFromUrl(url)
    expect(result).toBe('abcdefghijk1mn0pqrstu')
  })

  it('returns undefined for invalid space IDs', () => {
    const url = 'https://kinopio.club/abcdefghijk1/n0pqrstu'
    const result = utils.spaceIdFromUrl(url)
    expect(result).toBeUndefined()
  })

  it('handles URLs that are too short to be a space', () => {
    const url = 'https://kinopio.club/k1mn0pqrstu'
    const result = utils.spaceIdFromUrl(url)
    expect(result).toBeUndefined()
  })

  it('uses window.location.href when no URL provided', () => {
    const originalLocation = window.location

    // Mock window.location
    delete window.location
    window.location = { href: 'https://kinopio.club/abcdefghijk1mn0pqrstu' }

    const result = utils.spaceIdFromUrl()
    expect(result).toBe('abcdefghijk1mn0pqrstu')

    // Restore original location
    window.location = originalLocation
  })

  it('handles empty URL gracefully', () => {
    const result = utils.spaceIdFromUrl('')
    expect(result).toBeUndefined()
  })
})

describe('idIsValid', () => {
  it('returns true for valid IDs', () => {
    const result = utils.idIsValid('validid123456789')
    expect(result).toBe(true)
  })

  it('returns undefined for IDs containing forward slash', () => {
    const result = utils.idIsValid('invalid/id')
    expect(result).toBeUndefined()
  })

  it('returns undefined for empty/null IDs', () => {
    expect(utils.idIsValid('')).toBeUndefined()
    expect(utils.idIsValid(null)).toBeUndefined()
    expect(utils.idIsValid(undefined)).toBeUndefined()
  })
})

describe('urlsFromString', () => {
  it('does not extract when scheme is missing', () => {
    const input = 'Visit example.com for info'
    const result = utils.urlsFromString(input)
    expect(result).toEqual(undefined)
  })

  it('extracts domain with trailing /', () => {
    const input = 'Visit https://example.com/ for info'
    const result = utils.urlsFromString(input)
    expect(result).toEqual(['https://example.com/'])
  })

  it('extracts domain with path URL', () => {
    const input = 'Check out https://example.com/about page'
    const result = utils.urlsFromString(input)
    expect(result).toEqual(['https://example.com/about'])
  })

  it('extracts domain with path and query parameters', () => {
    const input = 'Visit https://example.com/search?q=test&category=web'
    const result = utils.urlsFromString(input)
    expect(result).toEqual(['https://example.com/search?q=test&category=web'])
  })

  it('extracts domain with path and fragment', () => {
    const input = 'Go to https://example.com/docs#installation section'
    const result = utils.urlsFromString(input)
    expect(result).toEqual(['https://example.com/docs#installation'])
  })

  it('extracts domain with path, query parameters and fragment', () => {
    const input = 'https://example.com/page?id=123&type=full#section2 '
    const result = utils.urlsFromString(input)
    expect(result).toEqual(['https://example.com/page?id=123&type=full#section2'])
  })

  it('extracts multiple URLs from text', () => {
    const input = 'Visit https://example.com and https://www.example.com/api for more info'
    const result = utils.urlsFromString(input)
    expect(result).toEqual(['https://example.com', 'https://www.example.com/api'])
  })

  it('does not extract the trailing ?', () => {
    const input = 'Visit https://example.com/?'
    const result = utils.urlsFromString(input)
    expect(result).toEqual(['https://example.com/'])
  })

  it('extracts a data image URL', () => {
    const dataUrl = 'data:image/png;base64,iVBORw0KGgo='
    const result = utils.urlsFromString(`yarr ${dataUrl}`)
    expect(result).toEqual([dataUrl])
  })

  it('extracts a bundled root-relative image path', () => {
    const result = utils.urlsFromString('yarr /yarr.png')
    expect(result).toEqual(['/yarr.png'])
  })

  it('does not treat a remote image path as a bundled asset twice', () => {
    const result = utils.urlsFromString('https://cdn.example.com/yarr.png')
    expect(result).toEqual(['https://cdn.example.com/yarr.png'])
  })
})

describe('urlIsImage', () => {
  it('treats data image URLs as images', () => {
    expect(utils.urlIsImage('data:image/png;base64,iVBORw0KGgo=')).toBe(true)
  })
})

describe('urlIsGif', () => {
  it('detects gif data URLs', () => {
    expect(utils.urlIsGif('data:image/gif;base64,R0lGODlhAQABAAAAACw=')).toBe(true)
  })

  it('detects gif file URLs', () => {
    expect(utils.urlIsGif('https://cdn.example.com/yarr.gif')).toBe(true)
  })

  it('ignores still images', () => {
    expect(utils.urlIsGif('data:image/png;base64,iVBORw0KGgo=')).toBe(false)
  })

  it('detects gif magic inside a mislabeled data URL', () => {
    expect(utils.urlIsGif('data:image/png;base64,R0lGODlhAQABAAAAACw=')).toBe(true)
  })
})

describe('blobUrlFromDataUrl', () => {
  it('turns a gif data URL into a blob URL with image/gif type', async () => {
    const blobUrl = utils.blobUrlFromDataUrl('data:image/gif;base64,R0lGODlhAQABAAAAACw=')
    expect(blobUrl).toMatch(/^blob:/)
    const blob = await fetch(blobUrl).then(response => response.blob())
    expect(blob.type).toBe('image/gif')
    URL.revokeObjectURL(blobUrl)
  })
})

describe('shouldCompressImageFile', () => {
  it('compresses still images and skips gifs and svgs', () => {
    expect(utils.shouldCompressImageFile(new File(['x'], 'shot.png', { type: 'image/png' }))).toBe(true)
    expect(utils.shouldCompressImageFile(new File(['x'], 'shot.jpg', { type: 'image/jpeg' }))).toBe(true)
    expect(utils.shouldCompressImageFile(new File(['x'], 'anim.gif', { type: 'image/gif' }))).toBe(false)
    expect(utils.shouldCompressImageFile(new File(['x'], 'mark.svg', { type: 'image/svg+xml' }))).toBe(false)
  })
})

describe('scaledImageSize', () => {
  it('keeps images within the pasted max edge', () => {
    expect(utils.scaledImageSize({ width: 800, height: 600, maxEdge: 1920 })).toEqual({
      width: 800,
      height: 600,
      scale: 1
    })
    expect(utils.scaledImageSize({ width: 4000, height: 2000, maxEdge: 1920 })).toEqual({
      width: 1920,
      height: 960,
      scale: 1920 / 4000
    })
  })
})

describe('compressImageFile', () => {
  it('leaves gifs unchanged', async () => {
    const gif = new File(['GIF89a'], 'yarr.gif', { type: 'image/gif' })
    expect(await utils.compressImageFile(gif)).toBe(gif)
  })
})

describe('normalizePastedImageFile', () => {
  it('treats clipboard png snapshots of gifs as gifs', async () => {
    const gifBytes = new Uint8Array([0x47, 0x49, 0x46, 0x38, 0x39, 0x61, 0x00, 0x00])
    const disguised = new File([gifBytes], 'pasted.png', { type: 'image/png' })
    const normalized = await utils.normalizePastedImageFile(disguised)
    expect(normalized.type).toBe('image/gif')
    expect(normalized.name).toBe('pasted.gif')
    expect(utils.shouldCompressImageFile(normalized)).toBe(false)
  })

  it('leaves real pngs alone', async () => {
    const png = new File(['\x89PNG'], 'shot.png', { type: 'image/png' })
    expect(await utils.normalizePastedImageFile(png)).toBe(png)
  })
})

describe('fileFromClipboardEvent', () => {
  const fileOf = (type, name) => new File(['x'], name, { type })
  const itemOf = (file) => ({
    type: file.type,
    getAsFile: () => file
  })

  it('prefers a gif when the clipboard also has a png snapshot', () => {
    const gif = fileOf('image/gif', 'yarr.gif')
    const png = fileOf('image/png', 'yarr.png')
    const event = {
      clipboardData: {
        files: [png, gif],
        items: [itemOf(png), itemOf(gif)]
      }
    }
    expect(utils.fileFromClipboardEvent(event)).toBe(gif)
  })

  it('uses the gif from items when files only has a png snapshot', () => {
    const gif = fileOf('image/gif', 'yarr.gif')
    const png = fileOf('image/png', 'yarr.png')
    const event = {
      clipboardData: {
        files: [png],
        items: [itemOf(png), itemOf(gif)]
      }
    }
    expect(utils.fileFromClipboardEvent(event)).toBe(gif)
  })

  it('replaces a png snapshot with the gif from clipboard.read', async () => {
    const gif = fileOf('image/gif', 'pasted.gif')
    const png = fileOf('image/png', 'still.png')
    const previousRead = navigator.clipboard?.read
    navigator.clipboard = {
      read: async () => [{
        types: ['image/gif'],
        getType: async () => gif
      }]
    }
    const result = await utils.dataFromClipboard({
      clipboardData: {
        files: [png],
        items: [itemOf(png)],
        getData: () => ''
      }
    })
    expect(result.file.type).toBe('image/gif')
    expect(result.file.name).toBe('pasted.gif')
    if (previousRead) {
      navigator.clipboard.read = previousRead
    }
  })

  it('falls back to the first image when no gif is present', () => {
    const png = fileOf('image/png', 'still.png')
    const event = {
      clipboardData: {
        files: [png],
        items: [itemOf(png)]
      }
    }
    expect(utils.fileFromClipboardEvent(event)).toBe(png)
  })
})

describe('urlWithoutQueryString', () => {
  it('removes query string from URL', () => {
    const result = utils.urlWithoutQueryString('https://example.com/path?foo=bar')
    expect(result).toBe('https://example.com/path')
  })

  it('handles URL without query string', () => {
    const result = utils.urlWithoutQueryString('https://example.com/path')
    expect(result).toBe('https://example.com/path')
  })

  it('handles URL with trailing slash via urlWithoutTrailingSlash', () => {
    const originalUrlWithoutTrailingSlash = utils.urlWithoutTrailingSlash
    utils.urlWithoutTrailingSlash = vi.fn().mockReturnValue('https://example.com')

    const result = utils.urlWithoutQueryString('https://example.com/?foo=bar')

    expect(utils.urlWithoutTrailingSlash).toHaveBeenCalledWith('https://example.com/?foo=bar')
    expect(result).toBe('https://example.com')

    utils.urlWithoutTrailingSlash = originalUrlWithoutTrailingSlash
  })
})

describe('queryString', () => {
  it('extracts query string from URL', () => {
    const result = utils.queryString('https://example.com?foo=bar&baz=qux')
    expect(result).toBe('foo=bar&baz=qux')
  })

  it('returns undefined for URL without query string', () => {
    const result = utils.queryString('https://example.com')
    expect(result).toBeUndefined()
  })

  it('returns empty string for URL with empty query string', () => {
    const result = utils.queryString('https://example.com?')
    expect(result).toBe('')
  })

  it('handles URLs with fragments', () => {
    const result = utils.queryString('https://example.com?foo=bar#fragment')
    expect(result).toBe('foo=bar')
  })
})

describe('isCompositionKeyboardEvent', () => {
  const enterKeydown = (options = {}) => {
    return new KeyboardEvent('keydown', { key: 'Enter', keyCode: 13, ...options })
  }
  const composition = (type) => {
    window.dispatchEvent(new CompositionEvent(type, { data: '日本' }))
  }

  it('ignores a normal enter keypress', () => {
    composition('compositionstart')
    composition('compositionend')
    const now = Date.now()
    vi.spyOn(Date, 'now').mockReturnValue(now + 1000)
    expect(utils.isCompositionKeyboardEvent(enterKeydown())).toBe(false)
    vi.restoreAllMocks()
  })

  it('detects the enter that confirms IME input in chromium and firefox', () => {
    // keydown fires while still composing
    composition('compositionstart')
    expect(utils.isCompositionKeyboardEvent(enterKeydown({ isComposing: true }))).toBe(true)
    composition('compositionend')
  })

  it('detects composition keydowns that report keyCode 229', () => {
    const event = new KeyboardEvent('keydown', { keyCode: 229 })
    Object.defineProperty(event, 'timeStamp', { value: 999999 })
    expect(utils.isCompositionKeyboardEvent(event)).toBe(true)
  })

  it('detects the enter that confirms IME input in safari, where compositionend fires first', () => {
    composition('compositionstart')
    composition('compositionend')
    // safari keydown has isComposing false, but arrives in the same tick
    expect(utils.isCompositionKeyboardEvent(enterKeydown())).toBe(true)
  })

  it('detects enter shortly after hangul syllable compositionend', () => {
    composition('compositionstart')
    composition('compositionend')
    const now = Date.now()
    vi.spyOn(Date, 'now').mockReturnValue(now + 80)
    expect(utils.isCompositionKeyboardEvent(enterKeydown())).toBe(true)
    vi.restoreAllMocks()
  })
})

describe('applySpacePanDelta', () => {
  it('grows outside space offset when scroll would go past the origin', () => {
    const result = utils.applySpacePanDelta({
      offset: { x: 0, y: 0 },
      scroll: { x: 0, y: 0 },
      delta: { x: -40, y: -25 },
      canGrowOffset: true
    })
    expect(result.offset).toEqual({ x: 40, y: 25 })
    expect(result.scroll).toEqual({ x: 0, y: 0 })
  })

  it('uses existing scroll before growing offset', () => {
    const result = utils.applySpacePanDelta({
      offset: { x: 0, y: 0 },
      scroll: { x: 10, y: 8 },
      delta: { x: -40, y: -25 },
      canGrowOffset: true
    })
    expect(result.offset).toEqual({ x: 30, y: 17 })
    expect(result.scroll).toEqual({ x: 0, y: 0 })
  })

  it('shrinks offset before scrolling the other way', () => {
    const result = utils.applySpacePanDelta({
      offset: { x: 20, y: 10 },
      scroll: { x: 0, y: 0 },
      delta: { x: 50, y: 4 },
      canGrowOffset: true
    })
    expect(result.offset).toEqual({ x: 0, y: 6 })
    expect(result.scroll).toEqual({ x: 30, y: 0 })
  })

  it('does not grow offset at 100% zoom', () => {
    const result = utils.applySpacePanDelta({
      offset: { x: 0, y: 0 },
      scroll: { x: 0, y: 0 },
      delta: { x: -40, y: -25 },
      canGrowOffset: false
    })
    expect(result.offset).toEqual({ x: 0, y: 0 })
    expect(result.scroll).toEqual({ x: 0, y: 0 })
  })
})

describe('computeSpaceZoomTo', () => {
  const zoom = {
    min: 20,
    max: 300
  }

  it('grows offset when zooming out from the viewport center like Kinopio', () => {
    const result = utils.computeSpaceZoomTo({
      percent: 40,
      origin: { x: 400, y: 300 },
      prevZoom: 1,
      offset: { x: 0, y: 0 },
      scroll: { x: 0, y: 0 },
      ...zoom
    })
    expect(result.percent).toBe(40)
    expect(result.offset).toEqual({ x: 240, y: 180 })
    expect(result.scroll).toEqual({ x: 0, y: 0 })
  })

  it('restores offset when zooming back to 100% at the same origin', () => {
    const result = utils.computeSpaceZoomTo({
      percent: 100,
      origin: { x: 400, y: 300 },
      prevZoom: 0.4,
      offset: { x: 240, y: 180 },
      scroll: { x: 0, y: 0 },
      ...zoom
    })
    expect(result.offset).toEqual({ x: 0, y: 0 })
    expect(result.scroll).toEqual({ x: 0, y: 0 })
  })

  it('keeps the cursor point fixed when zooming in past 100%', () => {
    const origin = { x: 400, y: 300 }
    const result = utils.computeSpaceZoomTo({
      percent: 110,
      origin,
      prevZoom: 1,
      offset: { x: 0, y: 0 },
      scroll: { x: 0, y: 0 },
      ...zoom
    })
    expect(result.offset.x).toBeCloseTo(-40)
    expect(result.offset.y).toBeCloseTo(-30)
    expect(result.offset.x + 400 * 1.1).toBeCloseTo(origin.x)
    expect(result.offset.y + 300 * 1.1).toBeCloseTo(origin.y)
  })

  it('keeps the cursor point fixed after the canvas has been panned', () => {
    const origin = { x: 400, y: 300 }
    const result = utils.computeSpaceZoomTo({
      percent: 110,
      origin,
      prevZoom: 1,
      offset: { x: -200, y: 50 },
      scroll: { x: 0, y: 0 },
      ...zoom
    })
    const point = {
      x: (origin.x - (-200)) / 1,
      y: (origin.y - 50) / 1
    }
    expect(result.offset.x + point.x * 1.1).toBeCloseTo(origin.x)
    expect(result.offset.y + point.y * 1.1).toBeCloseTo(origin.y)
  })
})

describe('wheelPanDelta', () => {
  it('uses native scroll when the document still has room', () => {
    const result = utils.wheelPanDelta({
      delta: { x: 30, y: 20 },
      scroll: { x: 10, y: 10 },
      viewport: { width: 800, height: 600 },
      page: { width: 2000, height: 1600 }
    })
    expect(result).toMatchObject({ x: 0, y: 0, canScrollX: true, canScrollY: true })
  })

  it('applies only the blocked axis so the other can native-scroll', () => {
    const result = utils.wheelPanDelta({
      delta: { x: -20, y: 16 },
      scroll: { x: 0, y: 10 },
      viewport: { width: 800, height: 600 },
      page: { width: 2000, height: 1600 }
    })
    expect(result).toMatchObject({ x: -20, y: 0, canScrollX: false, canScrollY: true })
  })

  it('applies both axes at the origin when native scroll cannot move', () => {
    const result = utils.wheelPanDelta({
      delta: { x: -12, y: -8 },
      scroll: { x: 0, y: 0 },
      viewport: { width: 800, height: 600 },
      page: { width: 800, height: 600 }
    })
    expect(result).toMatchObject({ x: -12, y: -8, canScrollX: false, canScrollY: false })
  })
})
