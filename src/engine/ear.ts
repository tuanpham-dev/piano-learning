import { pitchClass } from './notes'
import { CHORDS } from './chords-scales'
import { pick, type Rng } from './drills'
import type { EarType } from './lessons'

export const INTERVALS = [
  { semis: 0, id: 'P1' },
  { semis: 1, id: 'm2' },
  { semis: 2, id: 'M2' },
  { semis: 3, id: 'm3' },
  { semis: 4, id: 'M3' },
  { semis: 5, id: 'P4' },
  { semis: 6, id: 'TT' },
  { semis: 7, id: 'P5' },
  { semis: 8, id: 'm6' },
  { semis: 9, id: 'M6' },
  { semis: 10, id: 'm7' },
  { semis: 11, id: 'M7' },
  { semis: 12, id: 'P8' },
] as const
export type IntervalId = (typeof INTERVALS)[number]['id']
export const KID_INTERVALS: IntervalId[] = ['M2', 'M3', 'P5', 'P8']

export type ChordQuality = 'maj' | 'min' | 'dim' | 'aug'
export const QUALITIES: ChordQuality[] = ['maj', 'min', 'dim', 'aug']

export interface EarQuestion {
  type: EarType
  /** Notes as played to the learner: two for an interval, a chord stack, or the melody in order. */
  notes: number[]
  /** Correct multiple-choice id (interval or chord quality); melodies are answered by playing. */
  answer: string
  /** Choice ids shown as buttons. */
  choices: string[]
}

export interface EarOptions {
  kid?: boolean
  chordTypes?: ChordQuality[]
}

export function makeQuestion(type: EarType, rng: Rng, opts: EarOptions = {}): EarQuestion {
  if (type === 'interval') {
    const pool = opts.kid ? INTERVALS.filter((i) => KID_INTERVALS.includes(i.id)) : INTERVALS
    const iv = pick(pool, rng)
    const root = 55 + Math.floor(rng() * 10) // G3 … E4
    return { type, notes: [root, root + iv.semis], answer: iv.id, choices: pool.map((i) => i.id) }
  }
  if (type === 'chord') {
    const pool = opts.chordTypes ?? (opts.kid ? (['maj', 'min'] as ChordQuality[]) : QUALITIES)
    const q = pick(pool, rng)
    const root = 55 + Math.floor(rng() * 8)
    return { type, notes: CHORDS[q].map(([s]) => root + s), answer: q, choices: pool }
  }
  // Melody: stepwise or small leaps inside the C major scale around middle C.
  const len = opts.kid ? 2 + Math.floor(rng() * 2) : 3 + Math.floor(rng() * 3)
  const scale = [60, 62, 64, 65, 67, 69, 71, 72]
  let idx = Math.floor(rng() * 5)
  const notes = [scale[idx]!]
  for (let i = 1; i < len; i++) {
    const step = pick([-2, -1, 1, 1, 2], rng)
    idx = Math.max(0, Math.min(scale.length - 1, idx + step))
    notes.push(scale[idx]!)
  }
  return { type, notes, answer: notes.join(','), choices: [] }
}

/** How many played notes the checker needs before it can judge. */
export function notesNeeded(q: EarQuestion): number {
  return q.notes.length
}

/**
 * Checks played notes: intervals and chords in any order (chords by pitch class, any octave
 * or inversion), melodies in order and exact pitch, except mic answers, which match by letter.
 */
export function checkPlayed(q: EarQuestion, played: number[], fromMic = false): boolean {
  if (played.length < q.notes.length) return false
  const last = played.slice(-q.notes.length)
  if (q.type === 'melody') return last.every((m, i) => m === q.notes[i] || (fromMic && pitchClass(m) === pitchClass(q.notes[i]!)))
  if (q.type === 'chord') {
    const want = new Set(q.notes.map(pitchClass))
    const got = new Set(last.map(pitchClass))
    return want.size === got.size && [...want].every((p) => got.has(p))
  }
  const a = [...last].sort((x, y) => x - y)
  const b = [...q.notes].sort((x, y) => x - y)
  return a.every((m, i) => m === b[i])
}

export function checkChoice(q: EarQuestion, choice: string): boolean {
  return q.answer === choice
}
