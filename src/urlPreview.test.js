import { describe, it, expect } from 'vitest'
import {
  youtubeVideoId,
  previewFieldsFromYoutubeUrl,
  previewFieldsFromHtml,
  previewFieldsFromMetadata,
  fetchUrlPreview
} from './urlPreview.js'

const watchUrl = 'https://www.youtube.com/watch?v=dQw4w9WgXcQ'
const shortUrl = 'https://youtu.be/dQw4w9WgXcQ'
const videoId = 'dQw4w9WgXcQ'

describe('previewFieldsFromYoutubeUrl', () => {
  it('maps a youtube.com/watch URL to embed preview fields', () => {
    const preview = previewFieldsFromYoutubeUrl(watchUrl)
    expect(preview.urlPreviewIsVisible).toBe(true)
    expect(preview.urlPreviewUrl).toBe(watchUrl)
    expect(preview.urlPreviewIframeUrl).toBe(`https://www.youtube.com/embed/${videoId}`)
    expect(preview.urlPreviewIframeUrl).toContain(youtubeVideoId(watchUrl))
    expect(preview.urlPreviewImage).toContain(videoId)
  })

  it('maps a youtu.be URL to the same embed video id', () => {
    const preview = previewFieldsFromYoutubeUrl(shortUrl)
    expect(preview.urlPreviewIsVisible).toBe(true)
    expect(preview.urlPreviewUrl).toBe(shortUrl)
    expect(preview.urlPreviewIframeUrl).toBe(`https://www.youtube.com/embed/${videoId}`)
    expect(youtubeVideoId(shortUrl)).toBe(youtubeVideoId(watchUrl))
  })
})

describe('previewFieldsFromHtml', () => {
  it('reads og:title and og:image from fixture HTML', () => {
    const pageUrl = 'https://example.com/article'
    const html = `
      <html>
        <head>
          <meta property="og:title" content="Example Article">
          <meta property="og:image" content="https://example.com/cover.jpg">
          <meta property="og:description" content="A public page">
        </head>
      </html>
    `
    const preview = previewFieldsFromHtml(pageUrl, html)
    expect(preview.urlPreviewTitle).toBe('Example Article')
    expect(preview.urlPreviewImage).toBe('https://example.com/cover.jpg')
    expect(preview.urlPreviewUrl).toBe(pageUrl)
    expect(preview.urlPreviewIsVisible).toBe(true)
  })

  it('resolves relative og:image against the page URL', () => {
    const preview = previewFieldsFromHtml('https://example.com/post', `
      <meta property="og:title" content="Rel">
      <meta property="og:image" content="/img/og.png">
    `)
    expect(preview.urlPreviewImage).toBe('https://example.com/img/og.png')
  })
})

describe('fetchUrlPreview', () => {
  it('returns youtube embed fields without needing HTML', async () => {
    const preview = await fetchUrlPreview(watchUrl, {
      fetchJson: async () => {
        throw new Error('oembed unavailable')
      },
      fetchHtml: async () => {
        throw new Error('html should not be fetched for youtube')
      }
    })
    expect(preview.urlPreviewIframeUrl).toBe(`https://www.youtube.com/embed/${videoId}`)
    expect(preview.urlPreviewIsVisible).toBe(true)
  })

  it('parses OG through the I/O edge when HTML is provided', async () => {
    const pageUrl = 'https://example.com/og'
    const preview = await fetchUrlPreview(pageUrl, {
      fetchHtml: async (url) => {
        expect(url).toBe(pageUrl)
        return '<meta property="og:title" content="From Fetch"><meta property="og:image" content="https://example.com/a.png">'
      }
    })
    expect(preview.urlPreviewTitle).toBe('From Fetch')
    expect(preview.urlPreviewImage).toBe('https://example.com/a.png')
    expect(preview.urlPreviewUrl).toBe(pageUrl)
  })

  it('uses CORS metadata for a generic page like snapdeck.app', async () => {
    const pageUrl = 'https://snapdeck.app'
    const preview = await fetchUrlPreview(pageUrl, {
      fetchJson: async () => ({
        status: 'success',
        data: {
          title: 'snapdeck - Build a winning deck in a snap',
          image: { url: 'https://www.snapdeck.app/meta.png' }
        }
      })
    })
    expect(preview.urlPreviewTitle).toBe('snapdeck - Build a winning deck in a snap')
    expect(preview.urlPreviewImage).toBe('https://www.snapdeck.app/meta.png')
    expect(preview.urlPreviewUrl).toBe(pageUrl)
    expect(preview.urlPreviewIsVisible).toBe(true)
  })
})

describe('previewFieldsFromMetadata', () => {
  it('maps microlink-style OG fields including nested image.url', () => {
    const preview = previewFieldsFromMetadata('https://snapdeck.app', {
      status: 'success',
      data: {
        title: 'snapdeck - Build a winning deck in a snap',
        description: 'Build a winning deck in a snap.',
        image: { url: 'https://www.snapdeck.app/meta.png' },
        logo: { url: 'https://www.snapdeck.app/favicon.svg' }
      }
    })
    expect(preview.urlPreviewTitle).toBe('snapdeck - Build a winning deck in a snap')
    expect(preview.urlPreviewImage).toBe('https://www.snapdeck.app/meta.png')
    expect(preview.urlPreviewUrl).toBe('https://snapdeck.app')
    expect(preview.urlPreviewIsVisible).toBe(true)
  })
})
