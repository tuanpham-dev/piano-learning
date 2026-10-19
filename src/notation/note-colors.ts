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

/** Text color that reads on each Boomwhacker hue. */
export function inkForMidi(midi: number): string {
  return letterOf(midi) === 'E' ? '#3b2a12' : '#ffffff'
}

/** Resolves a CSS custom property to its current value (for canvas drawing). */
export function cssVar(name: string, el: Element = document.documentElement): string {
  return getComputedStyle(el).getPropertyValue(name).trim()
}
