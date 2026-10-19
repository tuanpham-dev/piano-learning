import { Midi } from '@tonejs/midi'
import type { NoteSpec, Song, Voice } from './song'
import { round } from './song'

export class NoNotesError extends Error {}

export interface ParsedTrack {
  index: number
  name: string
  noteCount: number
  /** Quantized to sixteenths, in quarter-note beats. */
  notes: NoteSpec[]
  /** Average pitch, used to suggest left/right. */
  avgMidi: number
}

export interface ParsedMidi {
  bpm: number
  timeSig: [number, number]
  keySig: string
  tracks: ParsedTrack[]
}

const VALID_DENOMS = [2, 4, 8, 16]

function q16(beats: number): number {
  return Math.round(beats * 4) / 4
}

/** Reads a Standard MIDI File into tracks of quantized notes (R21). */
export function parseMidiFile(data: ArrayBuffer | Uint8Array): ParsedMidi {
  let midi: Midi
  try {
    midi = new Midi(data)
  } catch {
    throw new NoNotesError('unreadable')
  }
  const ppq = midi.header.ppq || 480
  const ts = midi.header.timeSignatures[0]?.timeSignature
  const timeSig: [number, number] = ts && ts.length >= 2 && VALID_DENOMS.includes(ts[1]!) && ts[0]! > 0 ? [ts[0]!, ts[1]!] : [4, 4]
  const ks = midi.header.keySignatures[0]
  const keySig = ks ? `${ks.key}${ks.scale === 'minor' ? 'm' : ''}` : 'C'
  const tracks: ParsedTrack[] = midi.tracks
    .map((t, index) => {
      const notes = t.notes
        .map((n) => ({ midi: n.midi, startBeat: q16(n.ticks / ppq), beats: Math.max(0.25, q16(n.durationTicks / ppq)) }))
        .filter((n) => n.midi >= 21 && n.midi <= 108)
        .sort((a, b) => a.startBeat - b.startBeat || a.midi - b.midi)
      // Drop exact duplicates created by quantizing.
      const seen = new Set<string>()
      const unique = notes.filter((n) => {
        const k = `${n.midi}@${n.startBeat}`
        if (seen.has(k)) return false
        seen.add(k)
        return true
      })
      const avg = unique.length ? unique.reduce((a, n) => a + n.midi, 0) / unique.length : 0
      return { index, name: t.name || `Track ${index + 1}`, noteCount: unique.length, notes: unique, avgMidi: avg }
    })
    // Percussion (channel 10) isn't playable on a piano.
    .filter((t, i) => midi.tracks[i]!.channel !== 9 || t.noteCount === 0)
  if (!tracks.some((t) => t.noteCount > 0)) throw new NoNotesError('no notes')
  return { bpm: Math.round(midi.header.tempos[0]?.bpm ?? 100), timeSig, keySig, tracks }
}

export type TrackRole = 'R' | 'L' | 'ignore'

/** Suggests hands: the higher of the two busiest tracks is the right hand. */
export function suggestMapping(p: ParsedMidi): Record<number, TrackRole> {
  const withNotes = p.tracks.filter((t) => t.noteCount > 0).sort((a, b) => b.noteCount - a.noteCount)
  const map: Record<number, TrackRole> = {}
  for (const t of p.tracks) map[t.index] = 'ignore'
  const [a, b] = withNotes
  if (a && b) {
    map[a.index] = a.avgMidi >= b.avgMidi ? 'R' : 'L'
    map[b.index] = a.avgMidi >= b.avgMidi ? 'L' : 'R'
  } else if (a) map[a.index] = a.avgMidi >= 60 ? 'R' : 'L'
  return map
}

function voiceOf(tracks: ParsedTrack[]): Voice {
  const notes = tracks.flatMap((t) => t.notes).sort((a, b) => a.startBeat - b.startBeat || a.midi - b.midi)
  return { notes: notes.map((n) => ({ ...n, startBeat: round(n.startBeat) })), rests: [] }
}

export function toSong(p: ParsedMidi, mapping: Record<number, TrackRole>, title: string): Song {
  const right = voiceOf(p.tracks.filter((t) => mapping[t.index] === 'R'))
  const left = voiceOf(p.tracks.filter((t) => mapping[t.index] === 'L'))
  if (!right.notes.length && !left.notes.length) throw new NoNotesError('no mapped notes')
  const slug =
    title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 30) || 'song'
  return {
    id: `imp-${slug}-${Date.now().toString(36)}`,
    title: { en: title, vi: title },
    composer: 'Imported MIDI',
    difficulty: 2,
    bpm: Math.max(30, Math.min(240, p.bpm)),
    timeSig: p.timeSig,
    keySig: p.keySig,
    source: 'imported',
    hands: { R: right, L: left },
  }
}
