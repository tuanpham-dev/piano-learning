import { create } from 'zustand'
import { audioNow, bus, emitNote } from './bus'

export interface ScriptNote {
  /** Seconds from the start of the script. */
  t: number
  midi: number
  /** Seconds held. */
  dur: number
  vel?: number
}

/** Injects one event exactly as a MIDI keyboard would (R12). */
export function inject(kind: 'on' | 'off', midi: number, vel = 90): void {
  emitNote(kind, midi, 'virtual', vel)
}

export function injectSustain(on: boolean): void {
  bus.sustain(on)
}

let timers: ReturnType<typeof setTimeout>[] = []

/** Plays a scripted sequence through the bus; events carry exact audio-clock times. */
export function playScript(script: ScriptNote[], onDone?: () => void): () => void {
  stopScript()
  const t0 = audioNow() + 0.05
  const startMs = performance.now() + 50
  let end = 0
  for (const n of script) {
    const vel = n.vel ?? 90
    const onAt = n.t
    const offAt = n.t + n.dur
    end = Math.max(end, offAt)
    timers.push(setTimeout(() => emitNote('on', n.midi, 'virtual', vel, t0 + onAt), Math.max(0, startMs + onAt * 1000 - performance.now())))
    timers.push(setTimeout(() => emitNote('off', n.midi, 'virtual', 0, t0 + offAt), Math.max(0, startMs + offAt * 1000 - performance.now())))
  }
  if (onDone) timers.push(setTimeout(onDone, startMs + end * 1000 - performance.now() + 50))
  return stopScript
}

export function stopScript(): void {
  for (const t of timers) clearTimeout(t)
  timers = []
}

/** Builds a script that taps one note on every beat: handy for rhythm and Perform-mode checks. */
export function beatScript(count: number, bpm: number, opts: { midi?: number; offsetMs?: number; startBeat?: number } = {}): ScriptNote[] {
  const spb = 60 / bpm
  return Array.from({ length: count }, (_, i) => ({
    t: ((opts.startBeat ?? 0) + i) * spb + (opts.offsetMs ?? 0) / 1000,
    midi: opts.midi ?? 60,
    dur: spb * 0.5,
  }))
}


interface ScriptProvider {
  id: string
  label: string
  build: () => ScriptNote[]
}

/** Pages register ready-made scripts (e.g. "play this song perfectly") for the Virtual MIDI panel. */
export const useScripts = create<{ providers: ScriptProvider[] }>()(() => ({ providers: [] }))

export function registerScript(p: ScriptProvider): () => void {
  useScripts.setState((s) => ({ providers: [...s.providers.filter((x) => x.id !== p.id), p] }))
  return () => useScripts.setState((s) => ({ providers: s.providers.filter((x) => x.id !== p.id) }))
}
