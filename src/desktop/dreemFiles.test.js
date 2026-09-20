import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { filenameForSpace, spacesFromDreemFiles, mergeDiskSpaces, spacesFromDiskListing, resolveSpaceToLoad } from './dreemFiles.js'

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
