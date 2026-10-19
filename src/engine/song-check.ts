import { MIDI_A0, MIDI_C8, prettyName } from './notes'
import { beatsPerBar, type Hand, type Song } from './song'
import type { HandIssue } from './song-text'

export type WarningKind = 'bar-length' | 'range' | 'span' | 'empty' | 'tuplet' | 'other'

export interface SongWarning {
  /** 1-based bar, or 0 for the whole song. */
  bar: number
  hand?: Hand
  kind: WarningKind
  message: string
}

/** The widest one hand can comfortably hold at once: an octave and a half. */
export const MAX_SPAN = 18

/** Things worth checking before a song is saved (R4). None of them stop it being saved. */
export function checkSong(song: Song, issues: HandIssue[] = [], extra: SongWarning[] = []): SongWarning[] {
  const out: SongWarning[] = issues.map((i) => ({ bar: i.bar, hand: i.hand, kind: /beats/.test(i.message) ? ('bar-length' as const) : ('other' as const), message: i.message }))
  const len = beatsPerBar(song.timeSig)
  const barOf = (beat: number) => Math.floor(beat / len + 1e-9) + 1
  const all = [...song.hands.R.notes, ...song.hands.L.notes]
  if (!all.length) out.push({ bar: 0, kind: 'empty', message: 'The song has no notes.' })
  for (const hand of ['R', 'L'] as const) {
    const notes = song.hands[hand].notes
    for (const n of notes) {
      if (n.midi < MIDI_A0 || n.midi > MIDI_C8) out.push({ bar: barOf(n.startBeat), hand, kind: 'range', message: `${prettyName(n.midi)} is outside the piano (A0 to C8).` })
    }
    const reported = new Set<number>()
    for (const n of notes) {
      const sounding = notes.filter((m) => m.startBeat <= n.startBeat + 1e-6 && m.startBeat + m.beats > n.startBeat + 1e-6)
      const lo = Math.min(...sounding.map((m) => m.midi))
      const hi = Math.max(...sounding.map((m) => m.midi))
      const bar = barOf(n.startBeat)
      if (hi - lo > MAX_SPAN && !reported.has(bar)) {
        reported.add(bar)
        out.push({ bar, hand, kind: 'span', message: `The ${hand === 'R' ? 'right' : 'left'} hand spans ${prettyName(lo)} to ${prettyName(hi)}, more than one hand can reach.` })
      }
    }
  }
  return [...out, ...extra].sort((a, b) => a.bar - b.bar)
}
