// Draws the app icons (a keyboard on the accent red) as PNGs into public/icons/. No image libraries needed.
import { writeFileSync, mkdirSync } from 'node:fs'
import { deflateSync } from 'node:zlib'
import { join } from 'node:path'

const OUT = join(import.meta.dirname, '..', 'public', 'icons')
mkdirSync(OUT, { recursive: true })

const RED = [181, 48, 58]
const CREAM = [251, 250, 246]
const INK = [39, 36, 31]
const GOLD = [246, 201, 14]

function crcTable() {
  const t = new Uint32Array(256)
  for (let n = 0; n < 256; n++) {
    let c = n
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    t[n] = c >>> 0
  }
  return t
}
const CRC = crcTable()
const crc32 = (buf) => {
  let c = 0xffffffff
  for (const b of buf) c = CRC[(c ^ b) & 0xff] ^ (c >>> 8)
  return (c ^ 0xffffffff) >>> 0
}
function chunk(type, data) {
  const len = Buffer.alloc(4)
  len.writeUInt32BE(data.length)
  const td = Buffer.concat([Buffer.from(type), data])
  const crc = Buffer.alloc(4)
  crc.writeUInt32BE(crc32(td))
  return Buffer.concat([len, td, crc])
}
function png(size, pixel) {
  const raw = Buffer.alloc(size * (size * 4 + 1))
  for (let y = 0; y < size; y++) {
    raw[y * (size * 4 + 1)] = 0
    for (let x = 0; x < size; x++) {
      const [r, g, b, a] = pixel(x + 0.5, y + 0.5)
      const o = y * (size * 4 + 1) + 1 + x * 4
      raw[o] = r; raw[o + 1] = g; raw[o + 2] = b; raw[o + 3] = a
    }
  }
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(size, 0); ihdr.writeUInt32BE(size, 4)
  ihdr[8] = 8; ihdr[9] = 6; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ihdr), chunk('IDAT', deflateSync(raw, { level: 9 })), chunk('IEND', Buffer.alloc(0))])
}

const inRoundRect = (x, y, x0, y0, x1, y1, r) => {
  if (x < x0 || x > x1 || y < y0 || y > y1) return false
  const cx = Math.min(Math.max(x, x0 + r), x1 - r)
  const cy = Math.min(Math.max(y, y0 + r), y1 - r)
  return (x - cx) ** 2 + (y - cy) ** 2 <= r * r
}

/** u,v in 0..1 over the artwork box. */
function art(u, v) {
  // keyboard body
  const kx0 = 0.14, kx1 = 0.86, ky0 = 0.3, ky1 = 0.78
  if (u >= kx0 && u <= kx1 && v >= ky0 && v <= ky1) {
    const kw = (kx1 - kx0) / 5
    const ku = (u - kx0) / kw
    const i = Math.floor(ku)
    const frac = ku - i
    // black keys between whites 0-1, 1-2, 3-4
    const blackAt = [1, 2, 4]
    for (const b of blackAt) {
      if (Math.abs(ku - b) < 0.3 && v < ky0 + (ky1 - ky0) * 0.6) return INK
    }
    if (frac < 0.04 || frac > 0.96) return INK
    // gold dot on the middle key (middle C)
    const cx = kx0 + kw * 2.5, cy = ky1 - 0.09
    if ((u - cx) ** 2 + (v - cy) ** 2 < 0.045 ** 2) return GOLD
    return CREAM
  }
  return null
}

function icon(size, { maskable }) {
  const pad = maskable ? 0.1 : 0
  return png(size, (x, y) => {
    const u = x / size, v = y / size
    const inside = maskable ? true : inRoundRect(u, v, 0, 0, 1, 1, 0.2)
    if (!inside) return [0, 0, 0, 0]
    const au = (u - pad) / (1 - 2 * pad), av = (v - pad) / (1 - 2 * pad)
    const c = art(au, av)
    return [...(c ?? RED), 255]
  })
}

writeFileSync(join(OUT, 'icon-192.png'), icon(192, { maskable: false }))
writeFileSync(join(OUT, 'icon-512.png'), icon(512, { maskable: false }))
writeFileSync(join(OUT, 'maskable-512.png'), icon(512, { maskable: true }))
writeFileSync(join(OUT, 'apple-touch-icon.png'), icon(180, { maskable: true }))
console.log('icons written')
