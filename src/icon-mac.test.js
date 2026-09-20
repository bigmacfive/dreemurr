import { describe, it, expect } from 'vitest'
import { readFileSync, existsSync } from 'node:fs'
import { execFileSync } from 'node:child_process'
import { resolve } from 'node:path'

const root = resolve(import.meta.dirname, '..')
const master = resolve(root, 'src-tauri/icons/icon-1024.png')
const icns = resolve(root, 'src-tauri/icons/icon.icns')

function pngSize (path) {
  const buf = readFileSync(path)
  expect(buf.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))).toBe(true)
  return {
    width: buf.readUInt32BE(16),
    height: buf.readUInt32BE(20)
  }
}

describe('mac app icon master', () => {
  it('is a 1024×1024 square PNG', () => {
    expect(existsSync(master)).toBe(true)
    const { width, height } = pngSize(master)
    expect(width).toBe(1024)
    expect(height).toBe(1024)
  })

  it('uses a rounded plate: extreme corners are transparent', () => {
    const out = execFileSync('identify', [
      '-format',
      '%[pixel:u.p{0,0}] %[pixel:u.p{1023,0}] %[pixel:u.p{0,1023}] %[pixel:u.p{1023,1023}] %[pixel:u.p{20,20}]',
      master
    ], { encoding: 'utf8' })
    const pixels = out.trim().split(/\s+/)
    expect(pixels.length).toBeGreaterThanOrEqual(4)
    for (const pixel of pixels) {
      expect(pixel).toMatch(/,\s*0\)$/)
    }
  })

  it('fills the rounded plate with the robot (center is opaque, not a tiny stamp)', () => {
    const out = execFileSync('identify', [
      '-format',
      '%[pixel:u.p{512,512}] %[pixel:u.p{512,80}]',
      master
    ], { encoding: 'utf8' })
    const [center, upper] = out.trim().split(/\s+/)
    expect(center).not.toMatch(/,\s*0\)$/)
    expect(upper).not.toMatch(/,\s*0\)$/)
    expect(upper).not.toMatch(/255,\s*255,\s*255/)
  })

  it('ships an icns that includes a 1024px representation', () => {
    expect(existsSync(icns)).toBe(true)
    const data = readFileSync(icns)
    expect(data.subarray(0, 4).toString('latin1')).toBe('icns')
    let offset = 8
    const types = []
    while (offset + 8 <= data.length) {
      const type = data.subarray(offset, offset + 4).toString('latin1')
      const length = data.readUInt32BE(offset + 4)
      types.push(type)
      offset += length
    }
    expect(types).toContain('ic10')
  })
})
