const youtubeIdPattern = /^[A-Za-z0-9_-]{11}$/

const decodeHtml = (value) => {
  if (!value) { return '' }
  return value
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
}

const attrValue = (tag, attr) => {
  const match = tag.match(new RegExp(`${attr}\\s*=\\s*["']([^"']*)["']`, 'i'))
  return match ? decodeHtml(match[1].trim()) : ''
}

const metaContent = (html, keys) => {
  const tags = html.match(/<meta\b[^>]*>/gi) || []
  for (const tag of tags) {
    const property = attrValue(tag, 'property') || attrValue(tag, 'name')
    if (!keys.includes(property.toLowerCase())) { continue }
    const content = attrValue(tag, 'content')
    if (content) { return content }
  }
  return ''
}

const titleFromHtml = (html) => {
  const match = html.match(/<title[^>]*>([^<]*)<\/title>/i)
  return match ? decodeHtml(match[1].trim()) : ''
}

const iconFromHtml = (html, pageUrl) => {
  const tags = html.match(/<link\b[^>]*>/gi) || []
  for (const tag of tags) {
    const rel = attrValue(tag, 'rel').toLowerCase()
    if (!rel.split(/\s+/).includes('icon') && rel !== 'shortcut icon') { continue }
    const href = attrValue(tag, 'href')
    if (href) { return resolveUrl(pageUrl, href) }
  }
  return ''
}

const resolveUrl = (base, value) => {
  if (!value) { return '' }
  try {
    return new URL(value, base).href
  } catch (error) {
    return value
  }
}

export const youtubeVideoId = (url) => {
  if (!url || typeof url !== 'string') { return null }
  try {
    const parsed = new URL(url.trim())
    const host = parsed.hostname.replace(/^www\./, '').replace(/^m\./, '')
    if (host === 'youtu.be') {
      const id = parsed.pathname.split('/').filter(Boolean)[0]
      return youtubeIdPattern.test(id) ? id : null
    }
    if (host === 'youtube.com' || host === 'youtube-nocookie.com') {
      const fromQuery = parsed.searchParams.get('v')
      if (youtubeIdPattern.test(fromQuery)) { return fromQuery }
      const parts = parsed.pathname.split('/').filter(Boolean)
      if (['embed', 'shorts', 'live', 'v'].includes(parts[0]) && youtubeIdPattern.test(parts[1])) {
        return parts[1]
      }
    }
  } catch (error) {}
  return null
}

export const previewFieldsFromYoutubeUrl = (url) => {
  const id = youtubeVideoId(url)
  if (!id) { return null }
  const watchUrl = `https://www.youtube.com/watch?v=${id}`
  return {
    urlPreviewIsVisible: true,
    urlPreviewUrl: url.trim(),
    urlPreviewIframeUrl: `https://www.youtube.com/embed/${id}`,
    urlPreviewImage: `https://i.ytimg.com/vi/${id}/hqdefault.jpg`,
    urlPreviewTitle: '',
    urlPreviewFavicon: 'https://www.youtube.com/favicon.ico',
    urlPreviewErrorUrl: '',
    urlPreviewWatchUrl: watchUrl
  }
}

export const previewFieldsFromHtml = (pageUrl, html) => {
  if (!html) { return null }
  const title = metaContent(html, ['og:title', 'twitter:title']) || titleFromHtml(html)
  const image = resolveUrl(pageUrl, metaContent(html, ['og:image', 'og:image:url', 'twitter:image', 'twitter:image:src']))
  const description = metaContent(html, ['og:description', 'twitter:description', 'description'])
  if (!title && !image) { return null }
  return {
    urlPreviewIsVisible: true,
    urlPreviewUrl: pageUrl,
    urlPreviewTitle: title,
    urlPreviewImage: image,
    urlPreviewDescription: description,
    urlPreviewFavicon: iconFromHtml(html, pageUrl),
    urlPreviewIframeUrl: '',
    urlPreviewErrorUrl: ''
  }
}

const metadataImage = (value) => {
  if (!value) { return '' }
  if (typeof value === 'string') { return value }
  return value.url || ''
}

export const previewFieldsFromMetadata = (pageUrl, payload) => {
  const data = payload?.data || payload
  if (!data || typeof data !== 'object') { return null }
  const title = data.title || ''
  const image = metadataImage(data.image)
  const description = data.description || ''
  const favicon = metadataImage(data.logo) || metadataImage(data.favicon)
  if (!title && !image) { return null }
  return {
    urlPreviewIsVisible: true,
    urlPreviewUrl: pageUrl,
    urlPreviewTitle: title,
    urlPreviewImage: image,
    urlPreviewDescription: description,
    urlPreviewFavicon: favicon,
    urlPreviewIframeUrl: '',
    urlPreviewErrorUrl: ''
  }
}

const defaultFetchJson = async (url) => {
  const response = await fetch(url)
  if (!response.ok) { throw new Error(`json ${response.status}`) }
  return response.json()
}

const defaultFetchHtml = async (url) => {
  try {
    const response = await fetch(url)
    if (response.ok) {
      const html = await response.text()
      if (html && /<html|<meta|<title/i.test(html)) { return html }
    }
  } catch (error) {}
  try {
    const proxy = `https://api.allorigins.win/get?url=${encodeURIComponent(url)}`
    const response = await fetch(proxy)
    if (response.ok) {
      const body = await response.json()
      const html = body?.contents
      if (html && /<html|<meta|<title/i.test(html)) { return html }
    }
  } catch (error) {}
  throw new Error('html unavailable')
}

const defaultFetchMetadata = async (url, fetchJson) => {
  const microlinkUrl = `https://api.microlink.io/?url=${encodeURIComponent(url)}`
  const payload = await fetchJson(microlinkUrl)
  if (payload?.status && payload.status !== 'success') { return null }
  return previewFieldsFromMetadata(url, payload)
}

export const fetchUrlPreview = async (url, io = {}) => {
  const fetchJson = io.fetchJson || defaultFetchJson
  const fetchHtml = io.fetchHtml
  const youtube = previewFieldsFromYoutubeUrl(url)
  if (youtube) {
    try {
      const oembedUrl = `https://www.youtube.com/oembed?url=${encodeURIComponent(youtube.urlPreviewWatchUrl)}&format=json`
      const oembed = await fetchJson(oembedUrl)
      if (oembed?.title) { youtube.urlPreviewTitle = oembed.title }
      if (oembed?.thumbnail_url) { youtube.urlPreviewImage = oembed.thumbnail_url }
    } catch (error) {}
    delete youtube.urlPreviewWatchUrl
    return youtube
  }
  if (fetchHtml) {
    const html = await fetchHtml(url)
    return previewFieldsFromHtml(url, html)
  }
  try {
    const metadata = await defaultFetchMetadata(url, fetchJson)
    if (metadata) { return metadata }
  } catch (error) {}
  const html = await defaultFetchHtml(url)
  return previewFieldsFromHtml(url, html)
}
