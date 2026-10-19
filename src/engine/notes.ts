export const LETTERS = ['C', 'D', 'E', 'F', 'G', 'A', 'B'] as const
export type Letter = (typeof LETTERS)[number]

const SHARP_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']
const FLAT_NAMES = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B']
const LETTER_PC: Record<Letter, number> = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 }

export const MIDI_A0 = 21
export const MIDI_C8 = 108
export const MIDDLE_C = 60

export function pitchClass(midi: number): number {
  return ((midi % 12) + 12) % 12
}

export function octaveOf(midi: number): number {
  return Math.floor(midi / 12) - 1
}

export function midiToName(midi: number, opts: { flats?: boolean; octave?: boolean } = {}): string {
  const names = opts.flats ? FLAT_NAMES : SHARP_NAMES
  const base = names[pitchClass(midi)]!
  return opts.octave === false ? base : `${base}${octaveOf(midi)}`
}

/** Display name with ♯/♭ glyphs. */
export function prettyName(midi: number, opts: { flats?: boolean; octave?: boolean } = {}): string {
  return midiToName(midi, opts)
    .replace('#', '♯')
    .replace(/([A-G])b/, '$1♭')
}

/** Parses names like C4, C#4, Db3, Eb, F#. Without an octave, octave 4 is assumed. */
export function nameToMidi(name: string): number {
  const m = /^([A-Ga-g])([#♯b♭]{0,2})(-?\d)?$/.exec(name.trim())
  if (!m) throw new Error(`Bad note name: ${name}`)
  const letter = m[1]!.toUpperCase() as Letter
  let pc = LETTER_PC[letter]
  for (const acc of m[2] ?? '') pc += acc === '#' || acc === '♯' ? 1 : -1
  const octave = m[3] === undefined ? 4 : Number(m[3])
  return (octave + 1) * 12 + pc
}

export function isBlackKey(midi: number): boolean {
  return [1, 3, 6, 8, 10].includes(pitchClass(midi))
}

/** Letter of the white key at or just below this pitch (C# → C). */
export function letterOf(midi: number): Letter {
  const pc = pitchClass(midi)
  const whitePc = isBlackKey(midi) ? pc - 1 : pc
  return LETTERS.find((l) => LETTER_PC[l] === whitePc)!
}

export function freqOf(midi: number): number {
  return 440 * Math.pow(2, (midi - 69) / 12)
}

/** Fractional MIDI number for a frequency. */
export function midiOfFreq(hz: number): number {
  return 69 + 12 * Math.log2(hz / 440)
}

export function centsOff(hz: number, midi: number): number {
  return (midiOfFreq(hz) - midi) * 100
}

/** Count of white keys strictly below this note, from MIDI 0. Used for keyboard layout. */
export function whiteIndex(midi: number): number {
  const oct = Math.floor(midi / 12)
  const pc = pitchClass(midi)
  const whitesBelowInOctave = [0, 1, 1, 2, 2, 3, 4, 4, 5, 5, 6, 6][pc]!
  return oct * 7 + whitesBelowInOctave
}

export function clefFor(midi: number): 'treble' | 'bass' {
  return midi >= MIDDLE_C ? 'treble' : 'bass'
}

export function range(low: number, high: number): number[] {
  const out: number[] = []
  for (let m = low; m <= high; m++) out.push(m)
  return out
}

export function todayISO(d = new Date()): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}
