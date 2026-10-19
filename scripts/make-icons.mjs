// Draws the app icons — Miu the cat's face with a red bow tie on a mint tile — as PNGs in public/icons/.
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

// ---------- Miu's face in a 120-unit space (same geometry as Mascot.tsx, head only) ----------
const FUR = [245, 185, 66]
const LIGHT = [252, 217, 138]
const DARK = [224, 154, 38]
const PINK = [240, 138, 156]
const inEllipse = (x, y, cx, cy, rx, ry, grow = 0) => ((x - cx) / (rx + grow)) ** 2 + ((y - cy) / (ry + grow)) ** 2 <= 1
const sign = (p1, p2, p3) => (p1[0] - p3[0]) * (p2[1] - p3[1]) - (p2[0] - p3[0]) * (p1[1] - p3[1])
const inTri = (x, y, a, b, c) => {
  const p = [x, y]
  const d1 = sign(p, a, b), d2 = sign(p, b, c), d3 = sign(p, c, a)
  return !((d1 < 0 || d2 < 0 || d3 < 0) && (d1 > 0 || d2 > 0 || d3 > 0))
}
const distSeg = (x, y, [ax, ay], [bx, by]) => {
  const t = Math.max(0, Math.min(1, ((x - ax) * (bx - ax) + (y - ay) * (by - ay)) / ((bx - ax) ** 2 + (by - ay) ** 2)))
  return Math.hypot(x - (ax + t * (bx - ax)), y - (ay + t * (by - ay)))
}
const EAR_L = [[27, 50], [22, 8], [54, 30]]
const EAR_R = [[93, 50], [98, 8], [66, 30]]
const inEars = (x, y, grow = 0) =>
  [EAR_L, EAR_R].some((t) => inTri(x, y, ...t) || (grow > 0 && Math.min(distSeg(x, y, t[0], t[1]), distSeg(x, y, t[1], t[2]), distSeg(x, y, t[2], t[0])) <= grow))
const inHead = (x, y, grow = 0) => inEllipse(x, y, 60, 58, 40, 34, grow) || inEars(x, y, grow)
const inBow = (x, y) => inTri(x, y, [60, 98], [42, 89], [42, 107]) || inTri(x, y, [60, 98], [78, 89], [78, 107]) || Math.hypot(x - 60, y - 98) <= 5
const inBowOutline = (x, y) =>
  !inBow(x, y) && (inTri(x, y, [60, 98], [39, 86], [39, 110]) || inTri(x, y, [60, 98], [81, 86], [81, 110]) || Math.hypot(x - 60, y - 98) <= 7.2)
const arc = (x, y, cx, cy, r, w) => Math.abs(Math.hypot(x - cx, y - cy) - r) <= w && y >= cy

/** Color of face-space point (x, y), or null for background. */
function faceColor(x, y) {
  if (inBow(x, y)) return RED
  if (inBowOutline(x, y)) return NAVY
  if (inHead(x, y)) {
    if (inEllipse(x, y, 45, 57, 5.2, 6.4) || inEllipse(x, y, 75, 57, 5.2, 6.4)) {
      if (Math.hypot(x - 46.8, y - 54) <= 2 || Math.hypot(x - 76.8, y - 54) <= 2) return WHITE
      return NAVY
    }
    if (inTri(x, y, [55.5, 66], [64.5, 66], [60, 71.5])) return PINK
    if (arc(x, y, 56.5, 73, 3.4, 1.35) || arc(x, y, 63.5, 73, 3.4, 1.35)) return NAVY
    if (inTri(x, y, [30, 40], [28, 18], [45, 30]) || inTri(x, y, [90, 40], [92, 18], [75, 30])) return PINK
    if (inEllipse(x, y, 32, 69, 6.5, 4.4) || inEllipse(x, y, 88, 69, 6.5, 4.4)) return BLUSH
    if (inEllipse(x, y, 60, 72, 20, 13)) return LIGHT
    for (const [a, b] of [[[52, 26], [51, 37]], [[60, 25], [60, 36]], [[68, 26], [69, 37]]]) if (distSeg(x, y, a, b) <= 1.9) return DARK
    return FUR
  }
  if (inHead(x, y, 3.4)) return NAVY // outline
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
        // Miu's face spans roughly x 16..104, y 4..114 in its 120-unit space.
        const X = 5 + ((u - area[0]) / span) * 110
        const Y = 4 + ((v - area[0]) / span) * 110
        c = nearEdge ? NAVY : (faceColor(X, Y) ?? MINT)
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
