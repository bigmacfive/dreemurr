import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { filenameForSpace, isDreemFileName, spaceFromDreemContents, spacesFromDreemFiles, mergeDiskSpaces, spacesFromDiskListing, resolveSpaceToLoad, collectDreemPaths } from './dreemFiles.js'

describe('filenameForSpace', () => {
  it('uses the space name and dreem extension', () => {
    expect(filenameForSpace({ id: 'abc', name: 'September 20, 2026' }, {})).toBe('September 20, 2026.dreem')
  })

  it('avoids collisions by appending the space id', () => {
    const map = { other: 'Inbox.dreem' }
    expect(filenameForSpace({ id: 'abc', name: 'Inbox' }, map)).toBe('Inbox--abc.dreem')
  })

  it('strips illegal filename characters', () => {
    expect(filenameForSpace({ id: 'abc', name: 'a/b:c*.txt' }, {})).toBe('abc.txt.dreem')
  })
})

describe('isDreemFileName', () => {
  it('accepts dreem files and ignores others', () => {
    expect(isDreemFileName('Garden.dreem')).toBe(true)
    expect(isDreemFileName('/Users/me/Inbox.DREEM')).toBe(true)
    expect(isDreemFileName('notes.txt')).toBe(false)
  })
})

describe('spaceFromDreemContents', () => {
  it('parses a space and fills id from the filename when missing', () => {
    const space = spaceFromDreemContents('{"name":"Garden","cards":[]}', 'Garden.dreem')
    expect(space.id).toBe('Garden')
    expect(space.name).toBe('Garden')
    expect(space.cards).toEqual([])
  })

  it('returns nothing for invalid JSON', () => {
    expect(spaceFromDreemContents('{nope', 'broken.dreem')).toBeUndefined()
  })
})

describe('spacesFromDreemFiles', () => {
  it('parses valid dreem JSON and skips other names', () => {
    const spaces = spacesFromDreemFiles([
      { name: 'Alpha.dreem', contents: JSON.stringify({ id: 'a', name: 'Alpha', cacheDate: 2 }) },
      { name: 'notes.txt', contents: JSON.stringify({ id: 'nope', name: 'Nope' }) },
      { name: 'broken.dreem', contents: '{not-json' },
      { name: 'Beta.dreem', contents: JSON.stringify({ id: 'b', name: 'Beta' }) }
    ])
    expect(spaces.map(space => space.id).sort()).toEqual(['a', 'b'])
  })
})

describe('cache.getAllSpaces disk merge', () => {
  it('awaits loadDiskSpaces and mergeDiskSpaces on Tauri', () => {
    const cacheSource = readFileSync(resolve(import.meta.dirname, '../cache.js'), 'utf8')
    expect(cacheSource).toContain('loadDiskSpaces')
    expect(cacheSource).toContain('mergeDiskSpaces')
    expect(cacheSource).toMatch(/if \(consts\.isTauri\(\)\) \{[\s\S]*await loadDiskSpaces\(\)/)
    expect(cacheSource).toMatch(/spacesWithNames = mergeDiskSpaces\(spacesWithNames, diskSpaces\)/)
  })
})

describe('mergeDiskSpaces', () => {
  it('includes disk-only spaces that were never in cache', () => {
    const merged = mergeDiskSpaces(
      [{ id: 'cached', name: 'Cached', cacheDate: 1 }],
      [{ id: 'disk-only', name: 'From Disk', cacheDate: 9 }]
    )
    const ids = merged.map(space => space.id).sort()
    expect(ids).toEqual(['cached', 'disk-only'])
  })
})

describe('resolveSpaceToLoad', () => {
  it('uses disk JSON when IndexedDB returns an empty clients stub', () => {
    const listed = {
      id: 'disk-only',
      name: 'From Disk',
      cards: [{ id: 'card-1', name: 'hello' }]
    }
    const emptyIdb = { clients: [] }
    const resolved = resolveSpaceToLoad(listed, emptyIdb)
    expect(resolved.id).toBe('disk-only')
    expect(resolved.cards).toHaveLength(1)
    expect(resolved.cards[0].name).toBe('hello')
  })

  it('is used by loadSpace so empty IDB cannot wipe a listed dreem file', () => {
    const spaceStore = readFileSync(resolve(import.meta.dirname, '../stores/useSpaceStore.js'), 'utf8')
    expect(spaceStore).toContain("import { resolveSpaceToLoad } from '@/desktop/dreemFiles.js'")
    expect(spaceStore).toMatch(/const cachedSpace = await cache\.space\(space\.id\)/)
    expect(spaceStore).toMatch(/resolveSpaceToLoad\(space, cachedSpace\)/)
    expect(spaceStore).not.toMatch(/await cache\.space\(space\.id\) \|\| space/)
  })

  it('keeps a cached space when IndexedDB has a real id', () => {
    const listed = { id: 'abc', name: 'Listed', cards: [] }
    const cached = { id: 'abc', name: 'Cached', cards: [{ id: 'c' }] }
    const resolved = resolveSpaceToLoad(listed, cached)
    expect(resolved.name).toBe('Cached')
    expect(resolved.cards).toHaveLength(1)
  })
})

describe('spacesFromDiskListing', () => {
  it('returns an entry for each valid dreem file from list+read', async () => {
    const listFn = async () => ['Inbox.dreem', 'skip.txt', 'Garden.dreem']
    const readFn = async (name) => {
      if (name === 'Inbox.dreem') {
        return JSON.stringify({ id: 'inbox', name: 'Inbox' })
      }
      if (name === 'Garden.dreem') {
        return JSON.stringify({ id: 'garden', name: 'Garden' })
      }
      return 'not-a-space'
    }
    const spaces = await spacesFromDiskListing(listFn, readFn)
    expect(spaces.map(space => space.id).sort()).toEqual(['garden', 'inbox'])
    expect(spaces.find(space => space.id === 'garden').name).toBe('Garden')
  })
})

describe('collectDreemPaths', () => {
  it('keeps dreem files and expands folders through listDirectoryFn', async () => {
    const paths = await collectDreemPaths(
      ['/tmp/Inbox.dreem', '/tmp/spaces', '/tmp/notes.txt'],
      async (path) => {
        expect(path).toBe('/tmp/spaces')
        return ['/tmp/spaces/Garden.dreem', '/tmp/spaces/skip.txt', '/tmp/spaces/nested/Beta.dreem']
      }
    )
    expect(paths).toEqual([
      '/tmp/Inbox.dreem',
      '/tmp/spaces/Garden.dreem',
      '/tmp/spaces/nested/Beta.dreem'
    ])
  })
})

describe('finder and drop open', () => {
  it('registers .dreem file associations and open-path commands', () => {
    const tauriConf = readFileSync(resolve(import.meta.dirname, '../../src-tauri/tauri.conf.json'), 'utf8')
    const rust = readFileSync(resolve(import.meta.dirname, '../../src-tauri/src/lib.rs'), 'utf8')
    const desktop = readFileSync(resolve(import.meta.dirname, 'dreemFiles.js'), 'utf8')
    const mainDesktop = readFileSync(resolve(import.meta.dirname, '../main-desktop.js'), 'utf8')
    const spaceDetails = readFileSync(resolve(import.meta.dirname, '../components/dialogs/SpaceDetails.vue'), 'utf8')
    expect(tauriConf).toContain('fileAssociations')
    expect(tauriConf).toContain('"ext": ["dreem"]')
    expect(rust).toContain('read_dreem_path')
    expect(rust).toContain('list_dreem_paths')
    expect(rust).toContain('collect_dreem_filenames')
    expect(rust).toContain('RunEvent::Opened')
    expect(desktop).toContain('listenForOpenedDreemFiles')
    expect(desktop).toContain('tauri://drag-drop')
    expect(desktop).toContain('list_dreem_paths')
    expect(desktop).toContain('triggerSpaceDetailsUpdateLocalSpaces')
    expect(mainDesktop).toContain('openPendingDreemFiles')
    expect(spaceDetails).toMatch(/await updateLocalSpaces\(\)/)
    expect(spaceDetails).not.toMatch(/if \(!state\.spaces\.length\) \{[\s\S]*updateLocalSpaces\(\)/)
  })
})
