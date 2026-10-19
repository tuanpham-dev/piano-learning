import { freqOf } from '../engine/notes'
import { ensureRunning, getAudioContext, getMaster, useAudioStatus } from './context'

const NAMES = ['C', 'Cs', 'D', 'Ds', 'E', 'F', 'Fs', 'G', 'Gs', 'A', 'As', 'B']
/** One Salamander sample every 3 semitones, A0 … C8. */
export const SAMPLE_MIDIS: number[] = Array.from({ length: 30 }, (_, i) => 21 + i * 3)

export function sampleFile(midi: number): string {
  return `${NAMES[midi % 12]}${Math.floor(midi / 12) - 1}.mp3`
}

const buffers = new Map<number, AudioBuffer>()
let loading: Promise<void> | null = null

interface ActiveVoice {
  src: AudioScheduledSourceNode
  gain: GainNode
}

const active = new Map<number, ActiveVoice[]>()
const sustained = new Set<number>()
let sustain = false

const RELEASE = 0.18

export function loadSamples(base = '/samples/'): Promise<void> {
  if (loading) return loading
  const ctx = getAudioContext()
  let done = 0
  let failed = 0
  loading = Promise.all(
    SAMPLE_MIDIS.map(async (m) => {
      try {
        const res = await fetch(base + sampleFile(m))
        if (!res.ok) throw new Error(String(res.status))
        const data = await res.arrayBuffer()
        buffers.set(m, await ctx.decodeAudioData(data))
      } catch {
        failed++
      } finally {
        done++
        useAudioStatus.setState({ samplesProgress: done / SAMPLE_MIDIS.length })
      }
    }),
  ).then(() => {
    const fallback = buffers.size === 0
    if (failed) console.warn(`[sampler] ${failed} samples failed to load${fallback ? '; using synthesized tone' : ''}`)
    useAudioStatus.setState({ samplesLoaded: true, fallback })
  })
  return loading
}

export function isLoaded(): boolean {
  return useAudioStatus.getState().samplesLoaded
}

function nearestSample(midi: number): number | undefined {
  let best: number | undefined
  let dist = Infinity
  for (const m of buffers.keys()) {
    const d = Math.abs(m - midi)
    if (d < dist) {
      dist = d
      best = m
    }
  }
  return best
}

function stopVoice(v: ActiveVoice, at: number, release = RELEASE) {
  v.gain.gain.cancelScheduledValues(at)
  v.gain.gain.setValueAtTime(v.gain.gain.value, at)
  v.gain.gain.setTargetAtTime(0, at, release / 3)
  try {
    v.src.stop(at + release * 2)
  } catch {
    /* already stopped */
  }
}

/**
 * Starts a note. `when` is in AudioContext seconds (defaults to now); `duration` schedules
 * its own release, used for playback of songs, demos and questions.
 */
export function noteOn(midi: number, velocity = 90, when?: number, duration?: number): void {
  if (!ensureRunning()) return
  const ctx = getAudioContext()
  const t = Math.max(when ?? ctx.currentTime, ctx.currentTime)
  const vel = Math.max(0.05, Math.min(1, velocity / 127))
  const gain = ctx.createGain()
  const peak = 0.25 + 0.75 * vel * vel
  gain.gain.setValueAtTime(0, t)
  gain.gain.linearRampToValueAtTime(peak, t + 0.004)
  gain.connect(getMaster())

  let src: AudioScheduledSourceNode
  const sm = nearestSample(midi)
  if (sm !== undefined) {
    const s = ctx.createBufferSource()
    s.buffer = buffers.get(sm)!
    s.playbackRate.value = Math.pow(2, (midi - sm) / 12)
    s.connect(gain)
    src = s
  } else {
    // Synth fallback: triangle with a piano-like decay.
    const o = ctx.createOscillator()
    o.type = 'triangle'
    o.frequency.value = freqOf(midi)
    gain.gain.setTargetAtTime(peak * 0.25, t + 0.01, 0.6)
    o.connect(gain)
    src = o
  }
  src.start(t)
  if (import.meta.env.DEV) devLog(midi, t, ctx)
  if (duration === undefined) {
    // Live input: a re-struck key cuts its previous voice.
    for (const v of active.get(midi) ?? []) stopVoice(v, t, 0.05)
    active.set(midi, [{ src, gain }])
    sustained.delete(midi)
  } else {
    stopVoice({ src, gain }, t + duration)
  }
}

export function noteOff(midi: number, when?: number): void {
  const ctx = getAudioContext()
  if (sustain) {
    sustained.add(midi)
    return
  }
  const t = Math.max(when ?? ctx.currentTime, ctx.currentTime)
  for (const v of active.get(midi) ?? []) stopVoice(v, t)
  active.delete(midi)
}

export function setSustain(on: boolean): void {
  sustain = on
  if (!on) {
    for (const m of sustained) noteOff(m)
    sustained.clear()
  }
}

export function isSustain(): boolean {
  return sustain
}

/** Plays a group of notes together for a duration (chords, intervals, questions). */
export function playNotes(midis: number[], duration = 1, when?: number, velocity = 90): void {
  for (const m of midis) noteOn(m, velocity, when, duration)
}

/** Plays notes one after another. */
export function playSequence(midis: number[], step = 0.45, when?: number, velocity = 90): void {
  if (!ensureRunning()) return
  const t0 = when ?? getAudioContext().currentTime + 0.05
  midis.forEach((m, i) => noteOn(m, velocity, t0 + i * step, step * 1.1))
}

export function allNotesOff(): void {
  sustain = false
  sustained.clear()
  const t = getAudioContext().currentTime
  for (const vs of active.values()) for (const v of vs) stopVoice(v, t, 0.05)
  active.clear()
}

/** Dev-only record of played notes for automated QA (A7, A10). */
function devLog(midi: number, t: number, ctx: AudioContext) {
  const w = window as unknown as { __notes?: { midi: number; at: number; wall: number; latencyMs: number }[] }
  ;(w.__notes ??= []).push({
    midi,
    at: t,
    wall: performance.now(),
    latencyMs: ((t - ctx.currentTime) + ctx.baseLatency + (ctx.outputLatency || 0)) * 1000,
  })
}
