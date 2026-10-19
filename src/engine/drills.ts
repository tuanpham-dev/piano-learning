import { isBlackKey, MIDDLE_C, pitchClass } from './notes'
import type { Clef } from './lessons'

export type Rng = () => number

/** Deterministic RNG for tests. */
export function seeded(seed: number): Rng {
  let s = seed % 2147483647 || 1
  return () => {
    s = (s * 16807) % 2147483647
    return (s - 1) / 2147483646
  }
}

export function pick<T>(xs: readonly T[], rng: Rng): T {
  return xs[Math.floor(rng() * xs.length) % xs.length]!
}

/** Default note range for a clef and number of octaves around middle C (R22). */
export function rangeFor(clef: Clef, octaves: 1 | 2 | 3): [number, number] {
  if (clef === 'treble') return [MIDDLE_C, MIDDLE_C + 12 * octaves]
  if (clef === 'bass') return [MIDDLE_C - 12 * octaves, MIDDLE_C]
  return [MIDDLE_C - 6 * octaves, MIDDLE_C + 6 * octaves]
}

export interface DrillConfig {
  clef: Clef
  low: number
  high: number
  accidentals: boolean
}

/** Next drill note: in range, white keys unless accidentals are on, never the same as the last one. */
export function nextNote(cfg: DrillConfig, rng: Rng, prev?: number): number {
  const pool: number[] = []
  for (let m = cfg.low; m <= cfg.high; m++) {
    if (!cfg.accidentals && isBlackKey(m)) continue
    if (cfg.clef === 'treble' && m < MIDDLE_C - 3) continue
    if (cfg.clef === 'bass' && m > MIDDLE_C + 3) continue
    pool.push(m)
  }
  const options = pool.length > 1 ? pool.filter((m) => m !== prev) : pool
  return pick(options, rng)
}

/** Clef a drill note is shown on. */
export function clefOf(cfg: DrillConfig, midi: number): 'treble' | 'bass' {
  if (cfg.clef !== 'both') return cfg.clef
  return midi >= MIDDLE_C ? 'treble' : 'bass'
}

/** Mic pitch detection can jump an octave; for mic answers the letter is enough. */
export function isCorrectAnswer(target: number, played: number, fromMic: boolean): boolean {
  return played === target || (fromMic && pitchClass(played) === pitchClass(target))
}

export interface DrillAnswer {
  midi: number
  correct: boolean
  ms: number
}

export class DrillRound {
  readonly answers: DrillAnswer[] = []
  constructor(readonly count: number) {}

  record(a: DrillAnswer): void {
    if (!this.done) this.answers.push(a)
  }

  get done(): boolean {
    return this.answers.length >= this.count
  }

  get correct(): number {
    return this.answers.filter((a) => a.correct).length
  }

  get accuracy(): number {
    return this.answers.length ? Math.round((100 * this.correct) / this.answers.length) : 0
  }

  /** Average response time of correct answers. */
  get avgMs(): number {
    const ok = this.answers.filter((a) => a.correct)
    return ok.length ? Math.round(ok.reduce((s, a) => s + a.ms, 0) / ok.length) : 0
  }

  get totalMs(): number {
    return this.answers.reduce((s, a) => s + a.ms, 0)
  }
}

export function starsForAccuracy(pct: number): 0 | 1 | 2 | 3 {
  return pct >= 95 ? 3 : pct >= 80 ? 2 : pct >= 60 ? 1 : 0
}
