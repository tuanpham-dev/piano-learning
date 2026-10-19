import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { keyGeometry } from './geometry'
import { cssVar, hexForMidi } from './note-colors'
import type { TimedNote } from '../engine/song'
import type { NoteState } from '../engine/playalong'
import { useReducedMotion } from '../hooks/useReducedMotion'

export interface LaneProps {
  notes: TimedNote[]
  /** Visible keyboard window (must match the Keyboard under the lane). */
  low: number
  high: number
  /** Current beat; read every frame. */
  getCursor: () => number
  /** State of a note; read every frame. */
  getNoteState?: (n: TimedNote) => NoteState | undefined
  kid?: boolean
  height?: number
  /** Beats visible above the hit line. */
  lookahead?: number
  /** Bar lines every N beats. */
  beatsPerBar?: number
  /** Hands the learner plays; the other hand is drawn faded. */
  activeHands?: 'L' | 'R' | 'LR'
}

/** Falling-notes lane above the keyboard (R15, R16). Steps per beat under reduced motion (R33). */
export function Lane({ notes, low, high, getCursor, getNoteState, kid = false, height = 220, lookahead = 6, beatsPerBar = 4, activeHands = 'LR' }: LaneProps) {
  const wrap = useRef<HTMLDivElement>(null)
  const canvas = useRef<HTMLCanvasElement>(null)
  const [width, setWidth] = useState(0)
  const reduced = useReducedMotion()
  const live = useRef({ notes, getCursor, getNoteState, low, high, kid, lookahead, beatsPerBar, reduced, activeHands })
  live.current = { notes, getCursor, getNoteState, low, high, kid, lookahead, beatsPerBar, reduced, activeHands }

  useLayoutEffect(() => {
    const el = wrap.current
    if (!el) return
    const ro = new ResizeObserver(([e]) => setWidth(Math.floor(e!.contentRect.width)))
    ro.observe(el)
    setWidth(Math.floor(el.getBoundingClientRect().width))
    return () => ro.disconnect()
  }, [])

  useEffect(() => {
    const c = canvas.current
    if (!c || !width) return
    const dpr = window.devicePixelRatio || 1
    c.width = width * dpr
    c.height = height * dpr
    const g = c.getContext('2d')!
    let raf = 0
    const colors = {
      bg: cssVar('--color-panel'),
      line: cssVar('--color-line'),
      R: cssVar('--color-accent'),
      L: cssVar('--color-left'),
      ok: cssVar('--color-ok'),
      muted: cssVar('--color-muted'),
      warn: cssVar('--color-warn'),
    }
    const draw = () => {
      const s = live.current
      const keys = keyGeometry(s.low, s.high, width)
      const byMidi = new Map(keys.map((k) => [k.midi, k]))
      let cursor = s.getCursor()
      if (s.reduced) cursor = Math.floor(cursor + 1e-6)
      const hitY = height - 4
      const ppb = (height - 8) / s.lookahead
      g.setTransform(dpr, 0, 0, dpr, 0, 0)
      g.clearRect(0, 0, width, height)
      // Octave guides at each C, bar lines across.
      g.fillStyle = colors.line
      for (const k of keys) if (!k.black && k.midi % 12 === 0) g.fillRect(k.x, 0, 1, height)
      const firstBar = Math.ceil(cursor / s.beatsPerBar) * s.beatsPerBar
      for (let b = firstBar; b < cursor + s.lookahead; b += s.beatsPerBar) {
        const y = hitY - (b - cursor) * ppb
        g.fillRect(0, y, width, 1)
      }
      s.notes.forEach((n) => {
        const k = byMidi.get(n.midi)
        if (!k) return
        const y0 = hitY - (n.startBeat - cursor) * ppb
        const y1 = y0 - n.beats * ppb + 2
        if (y0 < 0 || y1 > height) return
        const st = s.getNoteState?.(n)
        let fill = s.kid ? hexForMidi(n.midi) : n.hand === 'L' ? colors.L : colors.R
        let alpha = s.activeHands === 'LR' || s.activeHands === n.hand ? 0.85 : 0.25
        if (st === 'hit') fill = colors.ok
        else if (st === 'early' || st === 'late') fill = colors.warn
        else if (st === 'missed') {
          fill = colors.muted
          alpha = 0.45
        }
        const pad = k.black ? 1 : 3
        const x = k.x + pad
        const w = k.w - pad * 2
        const top = Math.max(0, y1)
        const bottom = Math.min(hitY, y0)
        if (bottom <= top) return
        g.globalAlpha = alpha
        g.fillStyle = fill
        const r = Math.min(s.kid ? 10 : 5, w / 2)
        g.beginPath()
        g.roundRect(x, top, w, bottom - top, r)
        g.fill()
        if (st === 'due') {
          g.globalAlpha = 1
          g.lineWidth = 3
          g.strokeStyle = colors.R
          g.stroke()
        }
        g.globalAlpha = 1
      })
      g.fillStyle = colors.R
      g.fillRect(0, hitY, width, 3)
      raf = requestAnimationFrame(draw)
    }
    raf = requestAnimationFrame(draw)
    return () => cancelAnimationFrame(raf)
  }, [width, height])

  return (
    <div ref={wrap} className="w-full rounded-t-md bg-panel/70" style={{ height }}>
      <canvas ref={canvas} style={{ width: '100%', height }} aria-hidden />
    </div>
  )
}
