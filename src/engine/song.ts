export type Finger = 1 | 2 | 3 | 4 | 5
export type Hand = 'R' | 'L'

export interface NoteSpec {
  midi: number
  startBeat: number
  beats: number
  finger?: Finger
}

export interface RestSpec {
  startBeat: number
  beats: number
}

export interface Voice {
  notes: NoteSpec[]
  rests: RestSpec[]
}

export interface Localized {
  en: string
  vi: string
}

export interface Song {
  id: string
  title: Localized
  composer: string
  difficulty: 1 | 2 | 3
  bpm: number
  /** [beats per bar, beat unit]. Beats in a Song are always quarter notes. */
  timeSig: [number, number]
  /** VexFlow key name, e.g. "C", "G", "F", "Am". */
  keySig: string
  source: 'bundled' | 'imported'
  hands: { R: Voice; L: Voice }
}

export interface TimedNote extends NoteSpec {
  hand: Hand
}

/** Quarter-note beats per bar (6/8 → 3). */
export function beatsPerBar(timeSig: [number, number]): number {
  return (timeSig[0] * 4) / timeSig[1]
}

export function voiceEnd(v: Voice): number {
  let end = 0
  for (const n of v.notes) end = Math.max(end, n.startBeat + n.beats)
  for (const r of v.rests) end = Math.max(end, r.startBeat + r.beats)
  return end
}

export function songDuration(song: Song): number {
  return Math.max(voiceEnd(song.hands.R), voiceEnd(song.hands.L))
}

export function barCount(song: Song): number {
  return Math.ceil(songDuration(song) / beatsPerBar(song.timeSig) - 1e-9)
}

/** All notes for the chosen hands, sorted by start then pitch. */
export function notesFor(song: Song, hands: 'L' | 'R' | 'LR'): TimedNote[] {
  const out: TimedNote[] = []
  if (hands !== 'L') for (const n of song.hands.R.notes) out.push({ ...n, hand: 'R' })
  if (hands !== 'R') for (const n of song.hands.L.notes) out.push({ ...n, hand: 'L' })
  return out.sort((a, b) => a.startBeat - b.startBeat || a.midi - b.midi)
}

/** Distinct start beats in ascending order. */
export function eventBeats(notes: TimedNote[]): number[] {
  const set = new Set<number>()
  for (const n of notes) set.add(round(n.startBeat))
  return [...set].sort((a, b) => a - b)
}

export function notesAtBeat(notes: TimedNote[], beat: number): TimedNote[] {
  return notes.filter((n) => Math.abs(n.startBeat - beat) < 1e-6)
}

export function hasChords(v: Voice): boolean {
  const seen = new Set<number>()
  for (const n of v.notes) {
    const b = round(n.startBeat)
    if (seen.has(b)) return true
    seen.add(b)
  }
  return false
}

/** Beats at which the voice plays more than one note. */
export function chordBeats(v: Voice): number[] {
  const counts = new Map<number, number>()
  for (const n of v.notes) counts.set(round(n.startBeat), (counts.get(round(n.startBeat)) ?? 0) + 1)
  return [...counts]
    .filter(([, c]) => c > 1)
    .map(([b]) => b)
    .sort((a, b) => a - b)
}

export function noteRange(song: Song): [number, number] {
  let lo = 127
  let hi = 0
  for (const v of [song.hands.R, song.hands.L])
    for (const n of v.notes) {
      lo = Math.min(lo, n.midi)
      hi = Math.max(hi, n.midi)
    }
  return lo > hi ? [60, 72] : [lo, hi]
}

export function round(beat: number): number {
  return Math.round(beat * 1000) / 1000
}

export function beatsToSeconds(beats: number, bpm: number, tempoPct = 100): number {
  return (beats * 60) / (bpm * (tempoPct / 100))
}
