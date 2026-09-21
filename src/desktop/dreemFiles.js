import * as idb from 'idb-keyval'

import consts from '@/consts.js'

const invokeCommand = async (command, payload) => {
  const { invoke } = await import('@tauri-apps/api/core')
  return invoke(command, payload)
}

const FILENAME_MAP_KEY = 'dreem-filenames'
const writeTimers = {}

const isDesktop = () => consts.isTauri()

const sanitizeName = (name) => {
  const cleaned = String(name || 'space')
    .replace(/[<>:"/\\|?*]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 80)
  return cleaned || 'space'
}

const loadFilenameMap = async () => {
  return await idb.get(FILENAME_MAP_KEY) || {}
}

const saveFilenameMap = async (map) => {
  await idb.set(FILENAME_MAP_KEY, map)
}

export const filenameForSpace = (space, map) => {
  const base = sanitizeName(space.name)
  const preferred = `${base}.dreem`
  const takenByOther = Object.entries(map).some(([spaceId, filename]) => {
    return spaceId !== space.id && filename === preferred
  })
  if (takenByOther) {
    return `${base}--${space.id}.dreem`
  }
  return preferred
}

const writeSpaceFile = async (space) => {
  if (!isDesktop() || !space?.id) { return }
  const map = await loadFilenameMap()
  const filename = filenameForSpace(space, map)
  const previous = map[space.id]
  await invokeCommand('save_dreem_file', {
    filename,
    contents: JSON.stringify(space)
  })
  if (previous && previous !== filename) {
    await invokeCommand('remove_dreem_file', { filename: previous })
  }
  map[space.id] = filename
  await saveFilenameMap(map)
}

export const saveSpaceFile = (space) => {
  if (!isDesktop() || !space?.id) { return }
  const spaceId = space.id
  const snapshot = JSON.parse(JSON.stringify(space))
  clearTimeout(writeTimers[spaceId])
  writeTimers[spaceId] = setTimeout(() => {
    writeSpaceFile(snapshot).catch((error) => {
      console.error('🚒 save dreem file', error)
    })
  }, 400)
}

export const flushSpaceFile = async (space) => {
  if (!isDesktop() || !space?.id) { return }
  clearTimeout(writeTimers[space.id])
  try {
    await writeSpaceFile(space)
  } catch (error) {
    console.error('🚒 flush dreem file', error)
  }
}

export const removeSpaceFile = async (space) => {
  if (!isDesktop() || !space?.id) { return }
  clearTimeout(writeTimers[space.id])
  const map = await loadFilenameMap()
  const filename = map[space.id] || filenameForSpace(space, map)
  try {
    await invokeCommand('remove_dreem_file', { filename })
  } catch (error) {
    console.error('🚒 remove dreem file', error)
  }
  delete map[space.id]
  await saveFilenameMap(map)
}

export const syncAllSpaces = async (spaces) => {
  if (!isDesktop()) { return }
  for (const space of spaces || []) {
    await writeSpaceFile(space)
  }
}

export const isDreemFileName = (name) => {
  return String(name || '').toLowerCase().endsWith('.dreem')
}

export const spaceFromDreemContents = (contents, name = '') => {
  let parsed = contents
  if (typeof contents === 'string') {
    try {
      parsed = JSON.parse(contents)
    } catch (error) {
      return
    }
  }
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) { return }
  const fallbackName = String(name || '').replace(/\.dreem$/i, '')
  const id = parsed.id || fallbackName
  if (!id) { return }
  return {
    ...parsed,
    id,
    name: parsed.name || fallbackName || id
  }
}

export const spacesFromDreemFiles = (files) => {
  const spaces = []
  for (const file of files || []) {
    if (!isDreemFileName(file?.name)) { continue }
    const space = spaceFromDreemContents(file.contents, file.name)
    if (space) { spaces.push(space) }
  }
  return spaces
}

const notifySpacesChanged = async () => {
  try {
    const { useGlobalStore } = await import('@/stores/useGlobalStore.js')
    useGlobalStore().triggerSpaceDetailsUpdateLocalSpaces()
  } catch (error) {
    console.error('🚒 notifySpacesChanged', error)
  }
}

export const openDreemSpaces = async (spaces) => {
  if (!spaces?.length) { return [] }
  const { default: cache } = await import('@/cache.js')
  const { useSpaceStore } = await import('@/stores/useSpaceStore.js')
  for (const space of spaces) {
    await cache.saveSpace(space)
  }
  const spaceStore = useSpaceStore()
  await spaceStore.changeSpace(spaces[spaces.length - 1])
  await notifySpacesChanged()
  return spaces
}

export const collectDreemPaths = async (paths, listDirectoryFn) => {
  const collected = []
  for (const path of paths || []) {
    if (isDreemFileName(path)) {
      collected.push(path)
      continue
    }
    if (!listDirectoryFn) { continue }
    try {
      const nested = await listDirectoryFn(path)
      for (const nestedPath of nested || []) {
        if (isDreemFileName(nestedPath)) {
          collected.push(nestedPath)
        }
      }
    } catch (error) {
      console.error('🚒 collectDreemPaths', path, error)
    }
  }
  return collected
}

export const openDreemFileObjects = async (files) => {
  const spaces = []
  for (const file of files || []) {
    if (!file || !isDreemFileName(file.name)) { continue }
    try {
      const text = typeof file.text === 'function' ? await file.text() : file.contents
      const space = spaceFromDreemContents(text, file.name)
      if (space) { spaces.push(space) }
    } catch (error) {
      console.error('🚒 openDreemFileObjects', error)
    }
  }
  return openDreemSpaces(spaces)
}

export const openDreemPaths = async (paths) => {
  const { invoke } = await import('@tauri-apps/api/core')
  const dreemPaths = await collectDreemPaths(paths, (path) => invoke('list_dreem_paths', { path }))
  if (!dreemPaths.length) { return [] }
  const spaces = []
  for (const path of dreemPaths) {
    try {
      const contents = await invoke('read_dreem_path', { path })
      const name = String(path).split(/[/\\]/).pop()
      const space = spaceFromDreemContents(contents, name)
      if (space) { spaces.push(space) }
    } catch (error) {
      console.error('🚒 openDreemPaths', path, error)
    }
  }
  return openDreemSpaces(spaces)
}

let listeningForOpenedDreemFiles = false

export const listenForOpenedDreemFiles = async () => {
  if (!isDesktop() || listeningForOpenedDreemFiles) { return }
  listeningForOpenedDreemFiles = true
  const { listen } = await import('@tauri-apps/api/event')
  await listen('dreem-open', (event) => {
    openDreemPaths(event.payload).catch((error) => {
      console.error('🚒 dreem-open', error)
    })
  })
  await listen('tauri://drag-drop', (event) => {
    const paths = event.payload?.paths || []
    openDreemPaths(paths).catch((error) => {
      console.error('🚒 dreem drag-drop', error)
    })
  })
}

export const openPendingDreemFiles = async () => {
  if (!isDesktop()) { return [] }
  const { invoke } = await import('@tauri-apps/api/core')
  const paths = await invoke('opened_dreem_paths')
  return openDreemPaths(paths)
}

export const resolveSpaceToLoad = (listedSpace, cachedSpace) => {
  const cacheIsEmpty = !cachedSpace?.id
  if (cacheIsEmpty && listedSpace?.id) {
    return listedSpace
  }
  return cachedSpace || listedSpace
}

export const mergeDiskSpaces = (cachedSpaces, diskSpaces) => {
  const byId = new Map()
  for (const space of diskSpaces || []) {
    if (space?.id) {
      byId.set(space.id, space)
    }
  }
  for (const space of cachedSpaces || []) {
    if (!space?.id) { continue }
    const fromDisk = byId.get(space.id)
    if (!fromDisk) {
      byId.set(space.id, space)
      continue
    }
    const diskDate = fromDisk.cacheDate || 0
    const cacheDate = space.cacheDate || 0
    byId.set(space.id, cacheDate >= diskDate ? { ...fromDisk, ...space } : { ...space, ...fromDisk })
  }
  return Array.from(byId.values())
}

export const spacesFromDiskListing = async (listFn, readFn) => {
  const names = await listFn()
  const files = []
  for (const name of names || []) {
    files.push({ name, contents: await readFn(name) })
  }
  return spacesFromDreemFiles(files)
}

export const loadDiskSpaces = async () => {
  if (!isDesktop()) { return [] }
  return spacesFromDiskListing(
    () => invokeCommand('list_dreem_files'),
    (filename) => invokeCommand('read_dreem_file', { filename })
  )
}
