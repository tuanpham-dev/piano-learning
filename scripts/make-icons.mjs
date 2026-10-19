// Draws the app icons — Do the note (red C) on a mint tile with a navy outline — as PNGs in public/icons/.
// Pure Node: shapes are signed-distance tests sampled 4×4 per pixel, so no image library is needed.
import { writeFileSync, mkdirSync } from 'node:fs'
import { deflateSync } from 'node:zlib'
import { join } from 'node:path'

const OUT = join(import.meta.dirname, '..', 'public', 'icons')
mkdirSync(OUT, { recursive: true })

const MINT = [220, 244, 232]
const NAVY = [20, 33, 61]
const RED = [230, 57, 70]
const WHITE = [255, 255, 255]
const BLUSH = [244, 150, 160]

// ---------- PNG encoding ----------
const CRC = new Uint32Array(256).map((_, n) => {
  let c = n
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
  return c >>> 0
})
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
    for (let x = 0; x < size; x++) {
      const [r, g, b, a] = pixel(x, y)
      const o = y * (size * 4 + 1) + 1 + x * 4
      raw[o] = r
      raw[o + 1] = g
      raw[o + 2] = b
      raw[o + 3] = a
    }
  }
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(size, 0)
  ihdr.writeUInt32BE(size, 4)
  ihdr[8] = 8
  ihdr[9] = 6
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ihdr), chunk('IDAT', deflateSync(raw, { level: 9 })), chunk('IEND', Buffer.alloc(0))])
}

// ---------- shapes in Do's 120-unit space (same geometry as Mascot.tsx) ----------
const rot = (x, y, cx, cy, deg) => {
  const a = (deg * Math.PI) / 180
  const dx = x - cx
  const dy = y - cy
  return [cx + dx * Math.cos(a) - dy * Math.sin(a), cy + dx * Math.sin(a) + dy * Math.cos(a)]
}
const inEllipse = (x, y, cx, cy, rx, ry, grow = 0) => ((x - cx) / (rx + grow)) ** 2 + ((y - cy) / (ry + grow)) ** 2 <= 1
const inHead = (x, y, grow = 0) => {
  const [u, v] = rot(x, y, 52, 84, 18)
  return inEllipse(u, v, 52, 84, 33, 25, grow)
}
const inStem = (x, y, grow = 0) => x >= 78 - grow && x <= 84 + grow && y >= 10 - grow && y <= 76
// Flag: a thick curve from the stem top sweeping right and down.
const flagPts = Array.from({ length: 40 }, (_, i) => {
  const t = i / 39
  const p0 = [82, 12], p1 = [106, 18], p2 = [99, 50]
  return [(1 - t) ** 2 * p0[0] + 2 * (1 - t) * t * p1[0] + t * t * p2[0], (1 - t) ** 2 * p0[1] + 2 * (1 - t) * t * p1[1] + t * t * p2[1], 4.2 - 1.8 * t]
})
const inFlag = (x, y, grow = 0) => flagPts.some(([px, py, w]) => (x - px) ** 2 + (y - py) ** 2 <= (w + grow) ** 2)
const inDo = (x, y, grow = 0) => inHead(x, y, grow) || inStem(x, y, grow) || inFlag(x, y, grow)
const inSmile = (x, y) => {
  // Two small arcs: centers (48,94) and (54,94), radius 3, lower halves, stroke 1.4.
  for (const cx of [48, 54]) {
    const d = Math.hypot(x - cx, y - 94)
    if (Math.abs(d - 3) <= 1.3 && y >= 94) return true
  }
  return false
}

/** Color of Do-space point (x, y), or null for background. */
function doColor(x, y) {
  if (inEllipse(x, y, 40, 82, 4.1, 5) || inEllipse(x, y, 62, 82, 4.1, 5)) {
    if (Math.hypot(x - 41.6, y - 79.8) <= 1.6 || Math.hypot(x - 63.6, y - 79.8) <= 1.6) return WHITE
    return NAVY
  }
  if (inSmile(x, y)) return NAVY
  if (inEllipse(x, y, 30, 92, 5, 3.4) || inEllipse(x, y, 72, 86, 5, 3.4)) return BLUSH
  if (inDo(x, y)) return RED
  if (inDo(x, y, 3.2)) return NAVY // outline
  return null
}

function icon(size, { maskable }) {
  const S = 4
  // Tile: rounded square (non-maskable) or full bleed (maskable). Do sits in the safe zone.
  const area = maskable ? [0.2, 0.8] : [0.13, 0.87]
  const span = area[1] - area[0]
  return png(size, (px, py) => {
    let r = 0, g = 0, b = 0, a = 0
    for (let sy = 0; sy < S; sy++) {
      for (let sx = 0; sx < S; sx++) {
        const u = (px + (sx + 0.5) / S) / size
        const v = (py + (sy + 0.5) / S) / size
        let c
        const radius = 0.22
        const cu = Math.min(Math.max(u, radius), 1 - radius)
        const cv = Math.min(Math.max(v, radius), 1 - radius)
        const inTile = maskable || Math.hypot(u - cu, v - cv) <= radius
        if (!inTile) continue
        const edge = maskable ? 1 : radius - Math.hypot(u - cu, v - cv)
        const nearEdge = !maskable && (u < 0.035 || u > 0.965 || v < 0.035 || v > 0.965 || edge < 0.035)
        // Do's art spans roughly x 8..108, y 6..112 in its 120-unit space.
        const X = 8 + ((u - area[0]) / span) * 102
        const Y = 6 + ((v - area[0]) / span) * 106
        c = nearEdge ? NAVY : (doColor(X, Y) ?? MINT)
        r += c[0]; g += c[1]; b += c[2]; a += 255
      }
    }
    const n = S * S
    return a ? [Math.round(r / (a / 255)), Math.round(g / (a / 255)), Math.round(b / (a / 255)), Math.round(a / n)] : [0, 0, 0, 0]
  })
}

writeFileSync(join(OUT, 'icon-192.png'), icon(192, { maskable: false }))
writeFileSync(join(OUT, 'icon-512.png'), icon(512, { maskable: false }))
writeFileSync(join(OUT, 'maskable-512.png'), icon(512, { maskable: true }))
writeFileSync(join(OUT, 'apple-touch-icon.png'), icon(180, { maskable: true }))
console.log('icons written')
