import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import {
  Accidental,
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
  /** Beat the cursor is at; the window pages so it stays visible. */
  cursorBeat: number
  color?: NoteColorFn
  kid?: boolean
  showFingers?: boolean
  /** Which staves to draw. */
  hands?: 'R' | 'L' | 'LR'
  barsPerLine?: number
  className?: string
}

/** Grand staff for a song, showing a page of bars around the cursor (R15, R16). */
export function GrandStaff({ song, cursorBeat, color = () => undefined, kid = false, showFingers = true, hands = 'LR', barsPerLine, className = '' }: GrandStaffProps) {
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
          const beams = Beam.generateBeams(bb.notes.filter((n) => !n.isRest()), { groups: Beam.getDefaultBeamGroups(timeSigString(song.timeSig)) })
          voices[i]!.draw(ctx, bb.stave)
          beams.forEach((bm) => bm.setStyle({ fillStyle: th.fg, strokeStyle: th.fg }).setContext(ctx).draw())
          bb.events.forEach((ev, k) => {
            if (ev.tieNext && bb.notes[k + 1]) {
              new StaveTie({ first_note: bb.notes[k], last_note: bb.notes[k + 1], first_indices: ev.midis.map((_, j) => j), last_indices: ev.midis.map((_, j) => j) }).setContext(ctx).draw()
            }
            cursorPts.push({ beat: ev.start, x: bb.notes[k]!.getAbsoluteX() })
          })
        })
        cursorPts.push({ beat: (b + 1) * bpb, x: x + w - 6 })
      }
      // Cursor band behind the notes at the current beat.
      cursorPts.sort((a, b) => a.beat - b.beat || a.x - b.x)
      const at = (beat: number) => {
        const i = cursorPts.findIndex((p) => p.beat > beat + 1e-6)
        if (i <= 0) return cursorPts[0]?.x ?? 0
        const a = cursorPts[i - 1]!
        const z = cursorPts[i]!
        return a.x + ((z.x - a.x) * (beat - a.beat)) / (z.beat - a.beat || 1)
      }
      const svg = el.querySelector('svg')
      if (svg && cursorBeat >= first * bpb && cursorBeat <= (last + 1) * bpb) {
        const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect')
        rect.setAttribute('x', String((at(cursorBeat) - 4) * scale))
        rect.setAttribute('y', '4')
        rect.setAttribute('width', String((kid ? 22 : 16) * scale))
        rect.setAttribute('height', String(height - 8))
        rect.setAttribute('rx', '4')
        rect.setAttribute('fill', th.accent)
        rect.setAttribute('opacity', '0.13')
        svg.insertBefore(rect, svg.firstChild)
      }
      setError(null)
    } catch (e) {
      console.error('[staff]', e)
      setError(String(e))
    }
  }, [song, first, last, cursorBeat, color, kid, showFingers, hands, width, scale, bpb])

  return (
    <div ref={ref} className={`w-full ${className}`} aria-label={`${song.title.en}, bars ${first + 1} to ${last + 1}`} role="img">
      <div ref={host} className="staff-host" />
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
    <div ref={ref} className={`w-full ${className}`} role="img" aria-label={label}>
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
      const h = 110 * scale
      const renderer = new Renderer(el, Renderer.Backends.SVG)
      renderer.resize(width, h)
      const ctx = renderer.getContext() as RenderContext
      ctx.scale(scale, scale)
      const W = width / scale
      const stave = new Stave(4, 10, W - 8, { num_lines: 1, spacing_between_lines_px: 10 } as never)
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
      const voice = new Voice({ num_beats: total * (timeSig[1] / 4), beat_value: timeSig[1] }).setMode(Voice.Mode.SOFT)
      voice.addTickables(notes)
      new Formatter().joinVoices([voice]).format([voice], Math.max(40, W - stave.getNoteStartX() - 16))
      const beams = Beam.generateBeams(notes.filter((n) => !n.isRest()), { groups: Beam.getDefaultBeamGroups(timeSigString(timeSig)), stem_direction: 1 })
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
