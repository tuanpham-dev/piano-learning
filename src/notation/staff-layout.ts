import { beatsPerBar, round, type Finger, type Voice } from '../engine/song'
import { pitchClass, octaveOf } from '../engine/notes'

/** One drawable symbol in a bar: a note/chord piece or a rest, with a standard duration. */
export interface StaffEvent {
  start: number
  beats: number
  /** Empty for a rest. */
  midis: number[]
  /** Source note start beat, used to color due/hit notes. */
  sourceStart: number
  fingers: (Finger | undefined)[]
  /** This piece ties into the next one (durations that need splitting). */
  tieNext: boolean
}

const STANDARD: [number, string, number][] = [
  [4, 'w', 0],
  [3, 'h', 1],
  [2, 'h', 0],
  [1.5, 'q', 1],
  [1, 'q', 0],
  [0.75, '8', 1],
  [0.5, '8', 0],
  [0.375, '16', 1],
  [0.25, '16', 0],
  [0.125, '32', 0],
]

/** VexFlow duration and dot count for a standard length. */
export function vexDuration(beats: number): { duration: string; dots: number } {
  const hit = STANDARD.find(([b]) => Math.abs(b - beats) < 1e-6)
  if (!hit) throw new Error(`Non-standard duration ${beats}`)
  return { duration: hit[1], dots: hit[2] }
}

/** Splits a length into standard durations, largest first. */
export function decompose(beats: number): number[] {
  const out: number[] = []
  let left = round(beats)
  while (left > 0.124) {
    const piece = STANDARD.find(([b]) => b <= left + 1e-6)?.[0] ?? 0.125
    out.push(piece)
    left = round(left - piece)
  }
  return out
}

/**
 * Lays out one bar of a voice as a gapless run of standard-length events. Overlapping notes
 * in one hand are trimmed to the next onset so the bar always adds up (needed for imported MIDI).
 */
export function layoutBar(voice: Voice, bar: number, timeSig: [number, number]): StaffEvent[] {
  const len = beatsPerBar(timeSig)
  const bs = round(bar * len)
  const be = round(bs + len)
  const groups = new Map<number, { end: number; midis: number[]; fingers: (Finger | undefined)[]; sourceStart: number }>()
  for (const n of voice.notes) {
    const ne = n.startBeat + n.beats
    if (n.startBeat >= be - 1e-6 || ne <= bs + 1e-6) continue
    const s = round(Math.max(bs, n.startBeat))
    const e = round(Math.min(be, ne))
    const g = groups.get(s) ?? { end: e, midis: [], fingers: [], sourceStart: n.startBeat }
    if (!g.midis.includes(n.midi)) {
      g.midis.push(n.midi)
      g.fingers.push(n.finger)
    }
    g.end = Math.min(g.end, e)
    groups.set(s, g)
  }
  const starts = [...groups.keys()].sort((a, b) => a - b)
  const out: StaffEvent[] = []
  let t = bs
  let gi = 0
  while (t < be - 1e-6) {
    const nextStart = starts[gi]
    if (nextStart !== undefined && Math.abs(nextStart - t) < 1e-6) {
      const g = groups.get(nextStart)!
      const following = starts[gi + 1] ?? be
      const end = Math.min(g.end, following)
      const pieces = decompose(end - t)
      let pt = t
      pieces.forEach((p, i) => {
        const order = g.midis.map((m, k) => [m, g.fingers[k]] as const).sort((a, b) => a[0] - b[0])
        out.push({ start: round(pt), beats: p, midis: order.map((o) => o[0]), fingers: i === 0 ? order.map((o) => o[1]) : [], sourceStart: g.sourceStart, tieNext: i < pieces.length - 1 })
        pt = round(pt + p)
      })
      t = round(end)
      gi++
    } else {
      const restEnd = Math.min(nextStart ?? be, be)
      for (const p of decompose(restEnd - t)) {
        out.push({ start: t, beats: p, midis: [], fingers: [], sourceStart: t, tieNext: false })
        t = round(t + p)
      }
      t = round(restEnd)
    }
  }
  return out
}

const SHARP = ['c', 'c#', 'd', 'd#', 'e', 'f', 'f#', 'g', 'g#', 'a', 'a#', 'b']
const FLAT = ['c', 'db', 'd', 'eb', 'e', 'f', 'gb', 'g', 'ab', 'a', 'bb', 'b']
const FLAT_KEYS = new Set(['F', 'Bb', 'Eb', 'Ab', 'Db', 'Gb', 'Dm', 'Gm', 'Cm', 'Fm', 'Bbm', 'Ebm'])

/** VexFlow key string, spelled with flats in flat keys: 61 → "c#/4" or "db/4". */
export function vexKey(midi: number, keySig = 'C'): string {
  const names = FLAT_KEYS.has(keySig) ? FLAT : SHARP
  return `${names[pitchClass(midi)]}/${octaveOf(midi)}`
}
