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

export const spacesFromDreemFiles = (files) => {
  const spaces = []
  for (const file of files || []) {
    const name = String(file?.name || '')
    if (!name.toLowerCase().endsWith('.dreem')) { continue }
    let parsed
    try {
      parsed = JSON.parse(file.contents)
    } catch (error) {
      continue
    }
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) { continue }
    const id = parsed.id || name.replace(/\.dreem$/i, '')
    if (!id) { continue }
    spaces.push({
      ...parsed,
      id,
      name: parsed.name || name.replace(/\.dreem$/i, '')
    })
  }
  return spaces
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
