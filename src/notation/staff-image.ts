import { barCount, type Song } from '../engine/song'
import { renderGrandStaff, type Theme } from './Staff'

const WIDTH = 1100
const BARS_PER_LINE = 4
/** Printed-page ink, so pictures read the same whatever the app theme. */
const INK: Theme = { fg: '#1c1a17', muted: '#6b655c', accent: '#b5303a' }

/**
 * Draws bars `fromBar`..`toBar` (1-based, inclusive) as sheet music, four bars a line, and returns a base64 PNG data URL.
 * Used by the AI screenshot tool to compare a transcription with the source image (R18).
 */
export async function staffPng(song: Song, fromBar = 1, toBar = barCount(song)): Promise<string> {
  const total = barCount(song)
  const a = Math.max(1, Math.min(total, Math.floor(fromBar)))
  const b = Math.max(a, Math.min(total, Math.floor(toBar)))
  const host = document.createElement('div')
  host.style.cssText = `position:fixed;left:-99999px;top:0;width:${WIDTH}px`
  document.body.append(host)
  try {
    const lines: { svg: string; height: number }[] = []
    for (let first = a - 1; first <= b - 1; first += BARS_PER_LINE) {
      const el = document.createElement('div')
      host.append(el)
      const last = Math.min(b - 1, first + BARS_PER_LINE - 1)
      // A short last line keeps the same bar width as the others.
      const width = last - first + 1 === BARS_PER_LINE || first === a - 1 ? WIDTH : Math.round(96 + ((WIDTH - 96) * (last - first + 1)) / BARS_PER_LINE)
      const { height } = renderGrandStaff(el, { song, first, last, width, theme: INK })
      const svg = el.querySelector('svg')!
      svg.setAttribute('xmlns', 'http://www.w3.org/2000/svg')
      lines.push({ svg: new XMLSerializer().serializeToString(svg), height })
    }
    const pad = 16
    const canvas = document.createElement('canvas')
    canvas.width = WIDTH + pad * 2
    canvas.height = lines.reduce((h, l) => h + l.height, 0) + pad * 2
    const ctx = canvas.getContext('2d')!
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    let y = pad
    for (const line of lines) {
      const img = new Image()
      img.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(line.svg)}`
      await img.decode()
      ctx.drawImage(img, pad, y)
      y += line.height
    }
    return canvas.toDataURL('image/png')
  } finally {
    host.remove()
  }
}
