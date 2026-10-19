import { MIDDLE_C } from './notes'
import type { NoteSpec, Song } from './song'
import { beatsPerBar } from './song'

export interface RecordedNote {
  midi: number
  /** Audio-clock seconds. */
  on: number
  off: number
}

export interface RecordingOptions {
  bpm: number
  timeSig: [number, number]
  /** Audio time of beat 1 of the first recorded bar (after the count-in). */
  start: number
  id: string
  title: string
}

const snap = (beats: number) => Math.round(beats * 2) / 2

/**
 * Turns notes played in Free play into a song (R11): starts and lengths snap to the nearest eighth,
 * notes below middle C go to the left hand, and the song is rounded up to whole bars.
 */
export function recordingToSong(notes: RecordedNote[], o: RecordingOptions): Song {
  const spb = 60 / o.bpm
  const R: NoteSpec[] = []
  const L: NoteSpec[] = []
  for (const n of [...notes].sort((a, b) => a.on - b.on)) {
    const startBeat = Math.max(0, snap((n.on - o.start) / spb))
    const beats = Math.max(0.5, snap((n.off - n.on) / spb))
    const hand = n.midi < MIDDLE_C ? L : R
    // The same key snapped onto the same eighth twice: keep one.
    if (hand.some((x) => x.midi === n.midi && x.startBeat === startBeat)) continue
    hand.push({ midi: n.midi, startBeat, beats })
  }
  // A note may not ring past the next note of the same hand that starts later, so bars stay readable.
  for (const hand of [R, L]) {
    hand.sort((a, b) => a.startBeat - b.startBeat || a.midi - b.midi)
    for (const n of hand) {
      const next = hand.find((x) => x.startBeat > n.startBeat)
      if (next && n.startBeat + n.beats > next.startBeat) n.beats = next.startBeat - n.startBeat
    }
  }
  const len = beatsPerBar(o.timeSig)
  const end = Math.max(len, ...[...R, ...L].map((n) => n.startBeat + n.beats))
  const bars = Math.ceil(end / len - 1e-9)
  // Trailing notes stop at the last bar line.
  for (const n of [...R, ...L]) n.beats = Math.min(n.beats, bars * len - n.startBeat)
  return {
    id: o.id,
    title: { en: o.title, vi: o.title },
    composer: '',
    difficulty: 1,
    bpm: o.bpm,
    timeSig: o.timeSig,
    keySig: 'C',
    source: 'imported',
    hands: { R: { notes: R, rests: [] }, L: { notes: L, rests: [] } },
  }
}
