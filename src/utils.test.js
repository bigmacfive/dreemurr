import { describe, it, expect, vi } from 'vitest'
import utils from './utils.js'

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
