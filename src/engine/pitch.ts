import { PitchDetector } from 'pitchy'
import { MIDI_A0, MIDI_C8, centsOff, midiOfFreq } from './notes'

export interface PitchReading {
  hz: number
  clarity: number
  /** Root-mean-square level of the frame, 0–1. */
  rms: number
}

const detectors = new Map<number, PitchDetector<Float32Array>>()

export function rmsOf(frame: Float32Array): number {
  let sum = 0
  for (let i = 0; i < frame.length; i++) sum += frame[i]! * frame[i]!
  return Math.sqrt(sum / frame.length)
}

/** McLeod pitch method via pitchy. */
export function detect(frame: Float32Array, sampleRate: number): PitchReading {
  let d = detectors.get(frame.length)
  if (!d) {
    d = PitchDetector.forFloat32Array(frame.length)
    d.minVolumeDecibels = -50
    detectors.set(frame.length, d)
  }
  const [hz, clarity] = d.findPitch(frame, sampleRate)
  return { hz, clarity, rms: rmsOf(frame) }
}

export interface TrackerOptions {
  /** Max distance from the nearest semitone. */
  maxCents?: number
  /** How long a pitch must hold steady before it counts. */
  holdMs?: number
  /** Silence that ends a note. */
  releaseMs?: number
  /** Minimum clarity, 0–1; higher = stricter. */
  clarity?: number
  /** Minimum frame level. */
  minRms?: number
}

export type TrackerEvent = { kind: 'on' | 'off'; midi: number; t: number }

/**
 * Turns a stream of pitch readings into note on/off events (R10):
 * a pitch within ±30 cents held for 120 ms is a note; 150 ms of silence or a
 * new steady pitch ends it; a fresh attack (level jump) re-strikes the same note.
 */
export class NoteTracker {
  private opts: Required<TrackerOptions>
  private candidate: number | null = null
  private candidateSince = 0
  private current: number | null = null
  private lastVoicedAt = -Infinity
  private recentRms: number[] = []
  /** Live reading for the UI meter. */
  heard: number | null = null

  constructor(opts: TrackerOptions = {}) {
    this.opts = { maxCents: 30, holdMs: 120, releaseMs: 150, clarity: 0.85, minRms: 0.01, ...opts }
  }

  setClarity(c: number): void {
    this.opts.clarity = c
  }

  feed(r: PitchReading, t: number): TrackerEvent[] {
    const out: TrackerEvent[] = []
    const voiced = r.clarity >= this.opts.clarity && r.rms >= this.opts.minRms && r.hz > 0
    const midi = voiced ? Math.round(midiOfFreq(r.hz)) : null
    const inTune = midi !== null && midi >= MIDI_A0 && midi <= MIDI_C8 && Math.abs(centsOff(r.hz, midi)) <= this.opts.maxCents

    // Onset: level jumps well above the recent floor → a new attack.
    const floor = this.recentRms.length ? Math.min(...this.recentRms) : r.rms
    const onset = this.recentRms.length >= 2 && r.rms > floor * 1.8 && r.rms > this.opts.minRms * 2
    this.recentRms.push(r.rms)
    if (this.recentRms.length > 4) this.recentRms.shift()

    if (onset && this.current !== null) {
      out.push({ kind: 'off', midi: this.current, t })
      this.current = null
      this.candidate = null
    }

    if (inTune) {
      this.lastVoicedAt = t
      this.heard = midi
      if (midi !== this.candidate) {
        this.candidate = midi
        this.candidateSince = t
      }
      if (t - this.candidateSince >= this.opts.holdMs && this.current !== midi) {
        if (this.current !== null) out.push({ kind: 'off', midi: this.current, t })
        this.current = midi
        out.push({ kind: 'on', midi: midi!, t })
      }
    } else {
      if (!voiced) this.heard = null
      this.candidate = null
      if (this.current !== null && t - this.lastVoicedAt >= this.opts.releaseMs) {
        out.push({ kind: 'off', midi: this.current, t })
        this.current = null
      }
    }
    return out
  }

  reset(): void {
    this.candidate = null
    this.current = null
    this.heard = null
    this.recentRms = []
  }
}
