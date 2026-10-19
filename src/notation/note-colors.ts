import { letterOf, type Letter } from '../engine/notes'

/** Boomwhacker colors, one per letter (R3b). Values live in theme.css. */
export const LETTER_COLOR: Record<Letter, string> = {
  C: 'var(--color-nC)',
  D: 'var(--color-nD)',
  E: 'var(--color-nE)',
  F: 'var(--color-nF)',
  G: 'var(--color-nG)',
  A: 'var(--color-nA)',
  B: 'var(--color-nB)',
}

/** Same hues as literals, for canvas and VexFlow which can't read CSS variables directly. */
export const LETTER_HEX: Record<Letter, string> = {
  C: '#e63946',
  D: '#f4811f',
  E: '#f6c90e',
  F: '#3fb34f',
  G: '#1fa8b5',
  A: '#2d5fd1',
  B: '#8e44ad',
}

export function colorForMidi(midi: number): string {
  return LETTER_COLOR[letterOf(midi)]
}

export function hexForMidi(midi: number): string {
  return LETTER_HEX[letterOf(midi)]
}

const NAVY = '#14213d'
const WHITE = '#ffffff'

function luminance(hex: string): number {
  const c = hex
    .slice(1)
    .match(/../g)!
    .map((h) => parseInt(h, 16) / 255)
    .map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4))
  return 0.2126 * c[0]! + 0.7152 * c[1]! + 0.0722 * c[2]!
}

/** WCAG contrast ratio between two hex colors. */
export function contrastRatio(a: string, b: string): number {
  const [x, y] = [luminance(a), luminance(b)].sort((p, q) => q - p)
  return (x! + 0.05) / (y! + 0.05)
}

/** Navy or white, whichever reads better on a note's color. */
export function inkForLetter(letter: Letter): string {
  const bg = LETTER_HEX[letter]
  return contrastRatio(NAVY, bg) >= contrastRatio(WHITE, bg) ? NAVY : WHITE
}

/** Text color that reads on each Boomwhacker hue. */
export function inkForMidi(midi: number): string {
  return inkForLetter(letterOf(midi))
}

/** Resolves a CSS custom property to its current value (for canvas drawing). */
export function cssVar(name: string, el: Element = document.documentElement): string {
  return getComputedStyle(el).getPropertyValue(name).trim()
}
