import { pitchClass } from './notes'

const LETTERS = ['C', 'D', 'E', 'F', 'G', 'A', 'B']
const LETTER_PC = [0, 2, 4, 5, 7, 9, 11]

/** Roots as usually spelled. */
export const ROOTS = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B'] as const
export type Root = (typeof ROOTS)[number]

/** [semitones, scale degree] — the degree decides the letter, so notes are spelled correctly. */
type Formula = [number, number][]

export const SCALES = {
  major: [
    [0, 1],
    [2, 2],
    [4, 3],
    [5, 4],
    [7, 5],
    [9, 6],
    [11, 7],
  ],
  naturalMinor: [
    [0, 1],
    [2, 2],
    [3, 3],
    [5, 4],
    [7, 5],
    [8, 6],
    [10, 7],
  ],
  harmonicMinor: [
    [0, 1],
    [2, 2],
    [3, 3],
    [5, 4],
    [7, 5],
    [8, 6],
    [11, 7],
  ],
  pentatonicMajor: [
    [0, 1],
    [2, 2],
    [4, 3],
    [7, 5],
    [9, 6],
  ],
  pentatonicMinor: [
    [0, 1],
    [3, 3],
    [5, 4],
    [7, 5],
    [10, 7],
  ],
  blues: [
    [0, 1],
    [3, 3],
    [5, 4],
    [6, 5],
    [7, 5],
    [10, 7],
  ],
} satisfies Record<string, Formula>

export const CHORDS = {
  maj: [
    [0, 1],
    [4, 3],
    [7, 5],
  ],
  min: [
    [0, 1],
    [3, 3],
    [7, 5],
  ],
  dim: [
    [0, 1],
    [3, 3],
    [6, 5],
  ],
  aug: [
    [0, 1],
    [4, 3],
    [8, 5],
  ],
  '7': [
    [0, 1],
    [4, 3],
    [7, 5],
    [10, 7],
  ],
  maj7: [
    [0, 1],
    [4, 3],
    [7, 5],
    [11, 7],
  ],
  min7: [
    [0, 1],
    [3, 3],
    [7, 5],
    [10, 7],
  ],
  sus2: [
    [0, 1],
    [2, 2],
    [7, 5],
  ],
  sus4: [
    [0, 1],
    [5, 4],
    [7, 5],
  ],
} satisfies Record<string, Formula>

export type ScaleType = keyof typeof SCALES
export type ChordType = keyof typeof CHORDS

// Blues ♭5 is spelled as a lowered 5th.
const BLUES_FLAT5 = 3

function rootPc(root: Root): number {
  return ROOTS.indexOf(root)
}

function spell(root: Root, formula: Formula): string[] {
  const rootLetter = LETTERS.indexOf(root[0]!)
  const rPc = rootPc(root)
  return formula.map(([semi, degree], i) => {
    const deg = formula === SCALES.blues && i === BLUES_FLAT5 ? 5 : degree
    const letterIdx = (rootLetter + deg - 1) % 7
    const natural = LETTER_PC[letterIdx]!
    const target = (rPc + semi) % 12
    let diff = (target - natural + 12) % 12
    if (diff > 6) diff -= 12
    const acc = diff === 0 ? '' : diff === 1 ? '♯' : diff === 2 ? '𝄪' : diff === -1 ? '♭' : '𝄫'
    return LETTERS[letterIdx]! + acc
  })
}

/** MIDI notes from the root in octave 4 (or 3 for G and above, so chords stay central). */
function midisFrom(root: Root, formula: Formula, octaveBase?: number): number[] {
  const pc = rootPc(root)
  const base = octaveBase ?? (pc >= 7 ? 48 : 60)
  return formula.map(([semi]) => base + pc + semi)
}

export function scaleNotes(root: Root, type: ScaleType, octaveBase?: number): { midis: number[]; names: string[] } {
  const f = SCALES[type]
  return { midis: midisFrom(root, f, octaveBase), names: spell(root, f) }
}

export function chordNotes(root: Root, type: ChordType, octaveBase?: number): { midis: number[]; names: string[] } {
  const f = CHORDS[type]
  return { midis: midisFrom(root, f, octaveBase), names: spell(root, f) }
}

/** Names the chord formed by a set of notes (any inversion/octave), e.g. "C maj", or null. */
export function identifyChord(midis: number[]): { root: Root; type: ChordType } | null {
  const pcs = new Set(midis.map(pitchClass))
  if (pcs.size < 3) return null
  const bass = Math.min(...midis)
  const matches: { root: Root; type: ChordType }[] = []
  for (const root of ROOTS) {
    for (const type of Object.keys(CHORDS) as ChordType[]) {
      const want = new Set(CHORDS[type].map(([s]) => (rootPc(root) + s) % 12))
      if (want.size === pcs.size && [...want].every((p) => pcs.has(p))) matches.push({ root, type })
    }
  }
  // Prefer the reading whose root is in the bass (C6 vs Am7 style ambiguity).
  return matches.find((m) => rootPc(m.root) === pitchClass(bass)) ?? matches[0] ?? null
}
