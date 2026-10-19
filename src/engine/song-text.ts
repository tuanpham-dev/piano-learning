import { layoutBar } from '../notation/staff-layout'
import { midiToName } from './notes'
import { parseVoice, type ParseIssue } from './song-dsl'
import { beatsPerBar, round, songDuration, type Localized, type NoteSpec, type Song, type Voice } from './song'

/**
 * A song as editable bar text: one string of note text per bar per hand. The editor, its text view
 * and the AI tools all edit this; `draftToSong` turns it back into a playable song.
 */
export interface Draft {
  id: string
  title: Localized
  composer: string
  difficulty: 1 | 2 | 3
  bpm: number
  timeSig: [number, number]
  keySig: string
  right: string[]
  left: string[]
}

export interface HandIssue extends ParseIssue {
  hand: 'R' | 'L'
}

const LETTERS: [number, string, string][] = [
  [4, 'w', ''],
  [3, 'h', '.'],
  [2, 'h', ''],
  [1.5, 'q', '.'],
  [1, 'q', ''],
  [0.75, 'e', '.'],
  [0.5, 'e', ''],
  [0.375, 's', '.'],
  [0.25, 's', ''],
]

function durToken(beats: number): string {
  const hit = LETTERS.find(([b]) => Math.abs(b - beats) < 1e-6)
  if (!hit) throw new Error(`No note length for ${beats} beats`)
  return hit[1] + hit[2]
}

/** Snap starts and lengths to sixteenths (the shortest length the note text has). */
export function quantize16(voice: Voice): Voice {
  const q = (b: number) => Math.round(b * 4) / 4
  const notes = voice.notes.map((n) => ({ ...n, startBeat: q(n.startBeat), beats: Math.max(0.25, q(n.beats)) }))
  const seen = new Set<string>()
  return {
    notes: notes.filter((n) => {
      const k = `${n.midi}@${n.startBeat}`
      if (seen.has(k)) return false
      seen.add(k)
      return true
    }),
    rests: [],
  }
}

/** Note name the way the note text writes it (sharps; flats in flat keys), e.g. 61 → "C#4". */
function noteName(midi: number, flats: boolean): string {
  return midiToName(midi, { flats })
}

const FLAT_KEYS = new Set(['F', 'Bb', 'Eb', 'Ab', 'Db', 'Gb', 'Dm', 'Gm', 'Cm', 'Fm', 'Bbm', 'Ebm'])

/** Writes a voice as bar text, one string per bar. Notes that continue into the next bar end with "~". */
export function songToBars(voice: Voice, timeSig: [number, number], bars: number, keySig = 'C'): string[] {
  const flats = FLAT_KEYS.has(keySig)
  const len = beatsPerBar(timeSig)
  const out: string[] = []
  for (let b = 0; b < bars; b++) {
    const barEnd = round((b + 1) * len)
    const events = layoutBar(voice, b, timeSig)
    const tokens = events.map((ev) => {
      const d = durToken(ev.beats)
      if (!ev.midis.length) return `r${d}`
      const evEnd = round(ev.start + ev.beats)
      // A tie: the piece is split inside the bar, or the note keeps sounding past the bar line.
      const continues =
        ev.tieNext ||
        (evEnd >= barEnd - 1e-6 && ev.midis.some((m) => voice.notes.some((n) => n.midi === m && n.startBeat <= ev.start + 1e-6 && n.startBeat + n.beats > barEnd + 1e-6)))
      const tie = continues ? '~' : ''
      if (ev.midis.length === 1) {
        const f = ev.fingers[0]
        return `${noteName(ev.midis[0]!, flats)}${d}${f ?? ''}${tie}`
      }
      return `[${ev.midis.map((m) => noteName(m, flats)).join(' ')}]${d}${tie}`
    })
    out.push(tokens.join(' '))
  }
  return out
}

/** Parses bar text leniently: problems are reported per bar instead of stopping. */
export function barsToVoice(bars: string[], timeSig: [number, number]): { voice: Voice; issues: ParseIssue[] } {
  const issues: ParseIssue[] = []
  const text = bars.map((b) => b.trim()).join(' | ') + (bars.length ? ' |' : '')
  const voice = parseVoice(text, timeSig, issues)
  return { voice, issues }
}

export function barCountOf(song: Song): number {
  return Math.max(1, Math.ceil(songDuration(song) / beatsPerBar(song.timeSig) - 1e-9))
}

export function songToDraft(song: Song): Draft {
  const bars = barCountOf(song)
  return {
    id: song.id,
    title: { ...song.title },
    composer: song.composer,
    difficulty: song.difficulty,
    bpm: song.bpm,
    timeSig: [...song.timeSig] as [number, number],
    keySig: song.keySig,
    right: songToBars(quantize16(song.hands.R), song.timeSig, bars, song.keySig),
    left: songToBars(quantize16(song.hands.L), song.timeSig, bars, song.keySig),
  }
}

/** A bar of rest the length of one bar, in the shortest text. */
export function restBar(timeSig: [number, number]): string {
  let left = beatsPerBar(timeSig)
  const parts: string[] = []
  for (const [b, l, dot] of LETTERS) {
    while (left >= b - 1e-6) {
      parts.push(`r${l}${dot}`)
      left = round(left - b)
    }
  }
  return parts.join(' ')
}

/** Both hands padded to the same number of bars. */
export function evenHands(d: Draft): Draft {
  const n = Math.max(d.right.length, d.left.length, 1)
  const pad = (bars: string[]) => [...bars, ...Array.from({ length: n - bars.length }, () => restBar(d.timeSig))].map((b) => (b.trim() ? b : restBar(d.timeSig)))
  return { ...d, right: pad(d.right), left: pad(d.left) }
}

export function draftToSong(draft: Draft, source: Song['source'] = 'imported'): { song: Song; issues: HandIssue[] } {
  const d = evenHands(draft)
  const r = barsToVoice(d.right, d.timeSig)
  const l = barsToVoice(d.left, d.timeSig)
  return {
    song: {
      id: d.id,
      title: d.title,
      composer: d.composer,
      difficulty: d.difficulty,
      bpm: d.bpm,
      timeSig: d.timeSig,
      keySig: d.keySig,
      source,
      hands: { R: r.voice, L: l.voice },
    },
    issues: [...r.issues.map((i) => ({ ...i, hand: 'R' as const })), ...l.issues.map((i) => ({ ...i, hand: 'L' as const }))],
  }
}

export function emptyDraft(id: string, title = 'New song'): Draft {
  const timeSig: [number, number] = [4, 4]
  return { id, title: { en: title, vi: title }, composer: '', difficulty: 1, bpm: 90, timeSig, keySig: 'C', right: [restBar(timeSig)], left: [restBar(timeSig)] }
}

export function newSongId(title: string): string {
  const slug =
    title
      .toLowerCase()
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .replace(/đ/g, 'd')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 30) || 'song'
  return `my-${slug}-${Date.now().toString(36)}`
}

/** Notes of a voice compared by pitch, start, length and finger (for round-trip checks). */
export function notesKey(notes: NoteSpec[]): string {
  return [...notes]
    .sort((a, b) => a.startBeat - b.startBeat || a.midi - b.midi)
    .map((n) => `${n.midi}@${round(n.startBeat)}+${round(n.beats)}${n.finger ? 'f' + n.finger : ''}`)
    .join(' ')
}

const TOKENS = /\[[^\]]*\][whqes]\.?~?|\S+/g
const LEN: Record<string, number> = { w: 4, h: 2, q: 1, e: 0.5, s: 0.25 }

/** Splits one bar of note text into tokens. */
export function barTokens(bar: string): string[] {
  return bar.match(TOKENS) ?? []
}

/** Beats a token lasts (0 for anything unreadable). */
export function tokenBeats(token: string): number {
  const m = /([whqes])(\.?)\d?~?$/.exec(token.replace(/^\[[^\]]*\]/, 'X'))
  return m ? LEN[m[1]!]! * (m[2] ? 1.5 : 1) : 0
}

/** Beats written in one bar. */
export function barBeats(bar: string): number {
  return round(barTokens(bar).reduce((s, t) => s + tokenBeats(t), 0))
}

/** Note text for a note or chord typed in the editor. */
export function noteToken(midis: number[], length: string, dot: boolean, finger: number | null, keySig = 'C'): string {
  const flats = FLAT_KEYS.has(keySig)
  const d = `${length}${dot ? '.' : ''}`
  const sorted = [...new Set(midis)].sort((a, b) => a - b)
  if (sorted.length === 1) return `${noteName(sorted[0]!, flats)}${d}${finger ?? ''}`
  return `[${sorted.map((m) => noteName(m, flats)).join(' ')}]${d}`
}
