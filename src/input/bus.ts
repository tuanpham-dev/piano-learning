import { noteOff, noteOn, setSustain } from '../audio/sampler'
import { getAudioContext } from '../audio/context'
import type { InputSource, NoteEvent } from './types'

type Listener = (e: NoteEvent) => void

const listeners = new Set<Listener>()
const held = new Set<number>()
const sustainListeners = new Set<(on: boolean) => void>()

/**
 * Every input source publishes here and every mode subscribes here (R11).
 * The bus also sounds the piano for live input, except for the microphone,
 * where the real instrument is already sounding.
 */
export const bus = {
  /** When true, the bus doesn't sound notes (a mode handles audio itself). */
  silent: false,
  /** Date.now() of the latest note or tap, for the practice clock. */
  lastActivityAt: 0,

  emit(e: NoteEvent): void {
    if (e.kind === 'on') held.add(e.midi)
    if (e.kind === 'off') held.delete(e.midi)
    if (e.kind !== 'off') bus.lastActivityAt = Date.now()
    if (!bus.silent && e.source !== 'mic') {
      if (e.kind === 'on') noteOn(e.midi, e.velocity)
      else if (e.kind === 'off') noteOff(e.midi)
    }
    for (const l of listeners) l(e)
  },

  subscribe(fn: Listener): () => void {
    listeners.add(fn)
    return () => listeners.delete(fn)
  },

  heldNotes(): Set<number> {
    return new Set(held)
  },

  sustain(on: boolean): void {
    if (!bus.silent) setSustain(on)
    for (const l of sustainListeners) l(on)
  },

  onSustain(fn: (on: boolean) => void): () => void {
    sustainListeners.add(fn)
    return () => sustainListeners.delete(fn)
  },

  /** Releases every held note from a source (device unplugged, tab hidden). */
  releaseAll(source?: InputSource): void {
    for (const midi of [...held]) bus.emit({ kind: 'off', midi, velocity: 0, time: audioNow(), source: source ?? 'screen' })
  },
}

/** Current AudioContext time, or 0 where there is no Web Audio (tests). */
export function audioNow(): number {
  try {
    return getAudioContext().currentTime
  } catch {
    return 0
  }
}

/** Convenience for adapters. */
export function emitNote(kind: NoteEvent['kind'], midi: number, source: InputSource, velocity = 90, time = audioNow()): void {
  bus.emit({ kind, midi, velocity, time, source })
}
