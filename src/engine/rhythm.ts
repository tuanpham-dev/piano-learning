import { pick, type Rng } from './drills'

export interface RhythmNote {
  beats: number
  rest?: boolean
}

export type RhythmLevel = 1 | 2 | 3

export const RHYTHM_TOLERANCE = 0.08

/** Building blocks per level; each block sums to whole beats so eighths stay paired. */
const BLOCKS: Record<RhythmLevel, RhythmNote[][]> = {
  1: [[{ beats: 1 }], [{ beats: 1 }], [{ beats: 2 }], [{ beats: 4 }]],
  2: [[{ beats: 1 }], [{ beats: 0.5 }, { beats: 0.5 }], [{ beats: 1, rest: true }], [{ beats: 2 }], [{ beats: 0.5 }, { beats: 0.5 }]],
  3: [[{ beats: 1 }], [{ beats: 0.5 }, { beats: 0.5 }], [{ beats: 1.5 }, { beats: 0.5 }], [{ beats: 1, rest: true }], [{ beats: 2 }], [{ beats: 0.5, rest: true }, { beats: 0.5 }]],
}

/** A pattern of one bar (two at level 3) of 4/4; never starts with a rest and has at least 3 notes. */
export function makePattern(level: RhythmLevel, rng: Rng): RhythmNote[] {
  const bars = level === 3 ? 2 : 1
  for (let attempt = 0; attempt < 50; attempt++) {
    const out: RhythmNote[] = []
    let filled = 0
    while (filled < 4 * bars) {
      const room = 4 * bars - filled
      const inBar = 4 - (filled % 4)
      const fits = BLOCKS[level].filter((b) => {
        const len = b.reduce((s, n) => s + n.beats, 0)
        return len <= room && len <= inBar
      })
      const block = pick(fits, rng)
      out.push(...block.map((n) => ({ ...n })))
      filled += block.reduce((s, n) => s + n.beats, 0)
    }
    const notes = out.filter((n) => !n.rest).length
    if (!out[0]!.rest && notes >= 3) return out
  }
  return Array.from({ length: 4 * bars }, () => ({ beats: 1 }))
}

/** Onset times (seconds) of the notes, from `start`. */
export function gridFor(pattern: RhythmNote[], bpm: number, start = 0): number[] {
  const spb = 60 / bpm
  const out: number[] = []
  let beat = 0
  for (const n of pattern) {
    if (!n.rest) out.push(start + beat * spb)
    beat += n.beats
  }
  return out
}

export interface TapScore {
  hitPercent: number
  /** Mean signed offset of the nearest tap to each onset, ms (positive = late). */
  avgOffsetMs: number
  /** Per onset: hit, late, early or missed. */
  marks: ('hit' | 'early' | 'late' | 'missed')[]
  extra: number
}

/** Each onset matches the nearest unused tap within ±80 ms (R24). Extra taps count against the score. */
export function scoreTaps(onsets: number[], taps: number[], tol = RHYTHM_TOLERANCE, spb = 0.5): TapScore {
  const used = new Set<number>()
  const marks: TapScore['marks'] = []
  const offsets: number[] = []
  for (const o of onsets) {
    let best = -1
    let bestD = Infinity
    taps.forEach((t, j) => {
      const d = Math.abs(t - o)
      if (!used.has(j) && d < bestD) {
        best = j
        bestD = d
      }
    })
    // Offsets are measured against the nearest tap within half a beat, even when it's out of tolerance.
    if (best >= 0 && bestD <= spb / 2) offsets.push(taps[best]! - o)
    if (best >= 0 && bestD <= tol) {
      used.add(best)
      const off = taps[best]! - o
      marks.push(Math.abs(off) <= tol / 2 ? 'hit' : off < 0 ? 'early' : 'late')
    } else marks.push('missed')
  }
  const matched = marks.filter((m) => m !== 'missed').length
  const extra = taps.length - used.size
  const denom = onsets.length + extra
  return {
    hitPercent: denom ? Math.round((100 * matched) / denom) : 0,
    avgOffsetMs: offsets.length ? Math.round((1000 * offsets.reduce((a, b) => a + b, 0)) / offsets.length) : 0,
    marks,
    extra,
  }
}
