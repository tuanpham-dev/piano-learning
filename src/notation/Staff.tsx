import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import {
  Accidental,
  BarNote,
  Annotation,
  AnnotationVerticalJustify,
  Beam,
  Dot,
  Formatter,
  Renderer,
  Stave,
  StaveConnector,
  StaveNote,
  StaveTie,
  Voice,
  type RenderContext,
} from 'vexflow'
import { beatsPerBar, barCount, type Hand, type Song, type Voice as SongVoice } from '../engine/song'
import { layoutBar, vexDuration, vexKey, type StaffEvent } from './staff-layout'
import { cssVar, hexForMidi } from './note-colors'
import { prefersReducedMotion } from '../hooks/useReducedMotion'

/** Color for a note at (hand, start beat, midi); undefined = default ink. */
export type NoteColorFn = (hand: Hand, start: number, midi: number) => string | undefined

interface Theme {
  fg: string
  muted: string
  accent: string
}

function theme(): Theme {
  return { fg: cssVar('--color-fg') || '#1c1a17', muted: cssVar('--color-muted') || '#6b655c', accent: cssVar('--color-accent') || '#b5303a' }
}

function useWidth(): [React.RefObject<HTMLDivElement>, number] {
  const ref = useRef<HTMLDivElement>(null)
  const [w, setW] = useState(0)
  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    const ro = new ResizeObserver(([e]) => setW(Math.floor(e!.contentRect.width)))
    ro.observe(el)
    setW(Math.floor(el.getBoundingClientRect().width))
    return () => ro.disconnect()
  }, [])
  return [ref, w]
}

function timeSigString(ts: [number, number]): string {
  return `${ts[0]}/${ts[1]}`
}

interface BuiltBar {
  notes: StaveNote[]
  events: StaffEvent[]
}

function buildBar(voice: SongVoice, bar: number, song: Song, clef: 'treble' | 'bass', hand: Hand, color: NoteColorFn, kid: boolean, fingers: boolean, th: Theme): BuiltBar {
  const events = layoutBar(voice, bar, song.timeSig)
  const notes = events.map((ev) => {
    const { duration, dots } = vexDuration(ev.beats)
    const rest = ev.midis.length === 0
    const note = new StaveNote({
      keys: rest ? [clef === 'treble' ? 'b/4' : 'd/3'] : ev.midis.map((m) => vexKey(m, song.keySig)),
      duration: rest ? `${duration}r` : duration,
      dots,
      clef,
      auto_stem: true,
    })
    if (dots) Dot.buildAndAttach([note], { all: true })
    note.setStyle({ fillStyle: th.fg, strokeStyle: th.fg })
    note.setLedgerLineStyle({ fillStyle: th.fg, strokeStyle: th.fg })
    if (!rest) {
      ev.midis.forEach((m, k) => {
        const c = color(hand, ev.sourceStart, m) ?? (kid ? hexForMidi(m) : undefined)
        if (c) note.setKeyStyle(k, { fillStyle: c, strokeStyle: c })
      })
      if (fingers) {
        const f = ev.fingers.filter(Boolean)
        if (f.length === 1) {
          const ann = new Annotation(String(f[0])).setVerticalJustification(clef === 'treble' ? AnnotationVerticalJustify.TOP : AnnotationVerticalJustify.BOTTOM)
          ann.setFont('Arial', 11, 'bold')
          ann.setStyle({ fillStyle: th.muted, strokeStyle: th.muted })
          note.addModifier(ann, 0)
        }
      }
    } else {
      note.setStyle({ fillStyle: th.muted, strokeStyle: th.muted })
    }
    return note
  })
  return { notes, events }
}

export interface GrandStaffProps {
  song: Song
  /** Beat used to pick which page of bars is shown (changes rarely). */
  cursorBeat: number
  /** Live beat for the cursor band, read every frame; falls back to `cursorBeat`. */
  getCursor?: () => number
  color?: NoteColorFn
  kid?: boolean
  showFingers?: boolean
  /** Which staves to draw. */
  hands?: 'R' | 'L' | 'LR'
  barsPerLine?: number
  className?: string
}

/** Grand staff for a song, showing a page of bars around the cursor (R15, R16). */
export function GrandStaff({ song, cursorBeat, getCursor, color = () => undefined, kid = false, showFingers = true, hands = 'LR', barsPerLine, className = '' }: GrandStaffProps) {
  const [ref, width] = useWidth()
  const host = useRef<HTMLDivElement>(null)
  const [error, setError] = useState<string | null>(null)
  const bpb = beatsPerBar(song.timeSig)
  const perLine = barsPerLine ?? Math.max(1, Math.min(4, Math.floor(width / (kid ? 300 : 230))))
  const totalBars = barCount(song)
  const curBar = Math.max(0, Math.min(totalBars - 1, Math.floor(cursorBeat / bpb + 1e-6)))
  const first = Math.floor(curBar / perLine) * perLine
  const last = Math.min(totalBars - 1, first + perLine - 1)
  const scale = kid ? 1.15 : 1
  const band = useRef<HTMLDivElement>(null)
  // Notehead centers per beat on the current page, in SVG units (the viewBox maps them to CSS px × scale).
  const points = useRef<{ beat: number; x: number }[]>([])
  const live = useRef({ getCursor, cursorBeat })
  live.current = { getCursor, cursorBeat }

  useEffect(() => {
    const el = host.current
    if (!el || !width) return
    el.innerHTML = ''
    try {
      const th = theme()
      const showR = hands !== 'L'
      const showL = hands !== 'R'
      const staveH = 78
      const top = 6
      const height = (top + (showR ? staveH + 8 : 0) + (showL ? staveH : 0) + 22) * scale
      const renderer = new Renderer(el, Renderer.Backends.SVG)
      renderer.resize(width, height)
      const ctx = renderer.getContext() as RenderContext
      ctx.scale(scale, scale)
      ctx.setFillStyle(th.fg)
      ctx.setStrokeStyle(th.fg)
      const W = width / scale
      const left = 8
      const headW = 80
      const barW = (W - left - headW - 8) / (last - first + 1)
      const cursorPts: { beat: number; x: number }[] = []
      for (let b = first; b <= last; b++) {
        const isFirst = b === first
        const x = isFirst ? left : left + headW + barW * (b - first)
        const w = isFirst ? headW + barW : barW
        const yR = top
        const yL = top + (showR ? staveH + 8 : 0)
        const staves: { stave: Stave; clef: 'treble' | 'bass'; hand: Hand }[] = []
        if (showR) staves.push({ stave: new Stave(x, yR, w), clef: 'treble', hand: 'R' })
        if (showL) staves.push({ stave: new Stave(x, yL, w), clef: 'bass', hand: 'L' })
        for (const s of staves) {
          if (isFirst) {
            s.stave.addClef(s.clef).addKeySignature(song.keySig)
            if (b === 0) s.stave.addTimeSignature(timeSigString(song.timeSig))
          }
          s.stave.setStyle({ fillStyle: th.fg, strokeStyle: th.fg })
          s.stave.setContext(ctx).draw()
        }
        if (staves.length === 2) {
          if (isFirst) {
            new StaveConnector(staves[0]!.stave, staves[1]!.stave).setType('brace').setContext(ctx).draw()
            new StaveConnector(staves[0]!.stave, staves[1]!.stave).setType('singleLeft').setContext(ctx).draw()
          }
          new StaveConnector(staves[0]!.stave, staves[1]!.stave).setType('singleRight').setContext(ctx).draw()
        }
        const built = staves.map((s) => ({ ...s, ...buildBar(song.hands[s.hand], b, song, s.clef, s.hand, color, kid, showFingers && s.hand === 'R', th) }))
        const voices = built.map((bb) => {
          const v = new Voice({ num_beats: song.timeSig[0], beat_value: song.timeSig[1] }).setMode(Voice.Mode.SOFT)
          v.addTickables(bb.notes)
          Accidental.applyAccidentals([v], song.keySig)
          return v
        })
        const fmt = new Formatter()
        voices.forEach((v) => fmt.joinVoices([v]))
        const noteStart = Math.max(...built.map((bb) => bb.stave.getNoteStartX()))
        built.forEach((bb) => bb.stave.setNoteStartX(noteStart))
        fmt.format(voices, Math.max(40, x + w - noteStart - 14))
        built.forEach((bb, i) => {
          const beams = Beam.generateBeams(
            bb.notes.filter((n) => !n.isRest()),
            { groups: Beam.getDefaultBeamGroups(timeSigString(song.timeSig)) },
          )
          voices[i]!.draw(ctx, bb.stave)
          beams.forEach((bm) => bm.setStyle({ fillStyle: th.fg, strokeStyle: th.fg }).setContext(ctx).draw())
          bb.events.forEach((ev, k) => {
            if (ev.tieNext && bb.notes[k + 1]) {
              new StaveTie({ first_note: bb.notes[k], last_note: bb.notes[k + 1], first_indices: ev.midis.map((_, j) => j), last_indices: ev.midis.map((_, j) => j) })
                .setContext(ctx)
                .draw()
            }
            const n = bb.notes[k]!
            // Center on the notehead itself (getAbsoluteX is the note's left edge).
            const cx = n.isRest() ? n.getAbsoluteX() + n.getGlyphWidth() / 2 : (n.getNoteHeadBeginX() + n.getNoteHeadEndX()) / 2
            cursorPts.push({ beat: ev.start, x: cx })
          })
        })
        // Only the page's last bar gets an end point; elsewhere the cursor flows straight to the next bar's first note.
        if (b === last) cursorPts.push({ beat: (b + 1) * bpb, x: x + w - 6 })
      }
      // Keep one point per beat (both staves share x positions), sorted.
      cursorPts.sort((a, b) => a.beat - b.beat || a.x - b.x)
      points.current = cursorPts.filter((p, i, arr) => i === 0 || Math.abs(p.beat - arr[i - 1]!.beat) > 1e-6)
      if (band.current) band.current.style.height = `${height - 8}px`
      setError(null)
    } catch (e) {
      console.error('[staff]', e)
      setError(String(e))
    }
  }, [song, first, last, color, kid, showFingers, hands, width, scale, bpb])

  // Cursor band: moved every frame from the live beat, so it tracks the music smoothly instead of redrawing the SVG.
  useEffect(() => {
    let raf = 0
    const reduced = prefersReducedMotion()
    const tick = () => {
      const el = band.current
      const pts = points.current
      if (el && pts.length) {
        let beat = live.current.getCursor ? live.current.getCursor() : live.current.cursorBeat
        if (reduced) beat = Math.floor(beat + 1e-6)
        const inPage = beat >= first * bpb - 1e-6 && beat <= (last + 1) * bpb + 1e-6
        el.style.opacity = inPage ? '1' : '0'
        if (inPage) {
          const i = pts.findIndex((p) => p.beat > beat + 1e-6)
          let x: number
          if (i <= 0) x = pts[i === 0 ? 0 : pts.length - 1]!.x
          else {
            const a = pts[i - 1]!
            const z = pts[i]!
            x = a.x + ((z.x - a.x) * (beat - a.beat)) / (z.beat - a.beat || 1)
          }
          el.style.transform = `translateX(${x * scale - el.offsetWidth / 2}px)`
        }
      }
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [first, last, bpb, scale])

  return (
    <div ref={ref} className={`w-full ${className}`} aria-label={`${song.title.en}, bars ${first + 1} to ${last + 1}`} role="img">
      <div className="relative">
        <div
          ref={band}
          aria-hidden="true"
          data-testid="staff-cursor"
          className="pointer-events-none absolute left-0 top-1 rounded-md bg-accent/15"
          style={{ width: (kid ? 24 : 18) * scale, opacity: 0 }}
        />
        <div ref={host} className="staff-host relative" />
      </div>
      {error && <p className="text-sm text-muted">Sheet music can't be drawn for this part.</p>}
    </div>
  )
}

export interface NoteStaffProps {
  clef: 'treble' | 'bass'
  /** Each item is drawn as one chord/note, left to right. */
  items: { midis: number[]; color?: string }[]
  keySig?: string
  kid?: boolean
  /** Draw all items as one chord stack instead of a sequence. */
  height?: number
  className?: string
  label?: string
}

/** Single staff with a few whole notes: drills, the chord & scale reference, lesson diagrams. */
export function NoteStaff({ clef, items, keySig = 'C', kid = false, height, className = '', label }: NoteStaffProps) {
  const [ref, width] = useWidth()
  const host = useRef<HTMLDivElement>(null)
  const key = JSON.stringify(items)
  useEffect(() => {
    const el = host.current
    if (!el || !width) return
    el.innerHTML = ''
    try {
      const th = theme()
      const scale = kid ? 1.6 : 1.3
      const h = height ?? 130 * scale
      const renderer = new Renderer(el, Renderer.Backends.SVG)
      renderer.resize(width, h)
      const ctx = renderer.getContext() as RenderContext
      ctx.scale(scale, scale)
      ctx.setFillStyle(th.fg)
      ctx.setStrokeStyle(th.fg)
      const W = width / scale
      const stave = new Stave(4, (h / scale - 90) / 2 - 5, W - 8)
      stave.addClef(clef).addKeySignature(keySig)
      stave.setStyle({ fillStyle: th.fg, strokeStyle: th.fg })
      stave.setContext(ctx).draw()
      if (!items.length) return
      const notes = items.map((it) => {
        const n = new StaveNote({ keys: it.midis.map((m) => vexKey(m, keySig)), duration: 'w', clef })
        n.setStyle({ fillStyle: th.fg, strokeStyle: th.fg })
        n.setLedgerLineStyle({ fillStyle: th.fg, strokeStyle: th.fg })
        it.midis.forEach((m, k) => {
          const c = it.color ?? (kid ? hexForMidi(m) : undefined)
          if (c) n.setKeyStyle(k, { fillStyle: c, strokeStyle: c })
        })
        return n
      })
      const voice = new Voice({ num_beats: 4 * notes.length, beat_value: 4 }).setMode(Voice.Mode.SOFT)
      voice.addTickables(notes)
      Accidental.applyAccidentals([voice], keySig)
      new Formatter().joinVoices([voice]).format([voice], Math.max(40, W - stave.getNoteStartX() - 20))
      voice.draw(ctx, stave)
    } catch (e) {
      console.error('[staff]', e)
    }
  }, [clef, key, keySig, kid, width, height])
  return (
    <div ref={ref} className={`w-full ${className}`} role={label ? 'img' : undefined} aria-label={label}>
      <div ref={host} />
    </div>
  )
}

export interface RhythmItem {
  beats: number
  rest?: boolean
  color?: string
}

/** One-line rhythm notation for rhythm training (R24). */
export function RhythmStaff({ items, timeSig, kid = false, className = '' }: { items: RhythmItem[]; timeSig: [number, number]; kid?: boolean; className?: string }) {
  const [ref, width] = useWidth()
  const host = useRef<HTMLDivElement>(null)
  const key = JSON.stringify(items)
  useEffect(() => {
    const el = host.current
    if (!el || !width) return
    el.innerHTML = ''
    try {
      const th = theme()
      const scale = kid ? 1.7 : 1.4
      const h = 100 * scale
      const renderer = new Renderer(el, Renderer.Backends.SVG)
      renderer.resize(width, h)
      const ctx = renderer.getContext() as RenderContext
      ctx.scale(scale, scale)
      const W = width / scale
      const stave = new Stave(4, 0, W - 8)
      stave.addClef('percussion').addTimeSignature(timeSigString(timeSig))
      stave.setStyle({ fillStyle: th.fg, strokeStyle: th.fg })
      stave.setContext(ctx).draw()
      const notes = items.map((it) => {
        const { duration, dots } = vexDuration(it.beats)
        const n = new StaveNote({ keys: ['b/4'], duration: it.rest ? `${duration}r` : duration, dots, clef: 'percussion', stem_direction: 1 })
        if (dots) Dot.buildAndAttach([n], { all: true })
        const c = it.color ?? th.fg
        n.setStyle({ fillStyle: c, strokeStyle: c })
        return n
      })
      const total = items.reduce((a, b) => a + b.beats, 0)
      const barLen = (timeSig[0] * 4) / timeSig[1]
      const tickables: (StaveNote | BarNote)[] = []
      let acc = 0
      notes.forEach((n, i) => {
        tickables.push(n)
        acc += items[i]!.beats
        if (Math.abs(acc % barLen) < 1e-6 && acc < total - 1e-6) tickables.push(new BarNote())
      })
      const voice = new Voice({ num_beats: total * (timeSig[1] / 4), beat_value: timeSig[1] }).setMode(Voice.Mode.SOFT)
      voice.addTickables(tickables)
      new Formatter().joinVoices([voice]).format([voice], Math.max(40, W - stave.getNoteStartX() - 16))
      const beams = Beam.generateBeams(
        notes.filter((n) => !n.isRest()),
        { groups: Beam.getDefaultBeamGroups(timeSigString(timeSig)), stem_direction: 1 },
      )
      voice.draw(ctx, stave)
      beams.forEach((b) => b.setStyle({ fillStyle: th.fg, strokeStyle: th.fg }).setContext(ctx).draw())
    } catch (e) {
      console.error('[rhythm staff]', e)
    }
  }, [key, timeSig[0], timeSig[1], kid, width])
  return (
    <div ref={ref} className={`w-full ${className}`}>
      <div ref={host} />
    </div>
  )
}
