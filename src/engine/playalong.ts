import { beatsPerBar, eventBeats, notesFor, round, songDuration, type Song, type TimedNote } from './song'
import { HIT_TOLERANCE, judge, scorePerformance, type ExpectedNote, type Judgement, type PerformanceScore } from './scoring'
import type { Hands } from '../store/progress'

export type PlayMode = 'wait' | 'perform'
export type PlayStatus = 'idle' | 'countIn' | 'moving' | 'waiting' | 'playing' | 'done'
export type NoteState = 'pending' | 'due' | Judgement

export interface PlayAlongConfig {
  song: Song
  hands: Hands
  mode: PlayMode
  tempoPct: number
  /** Bar range, 0-based, inclusive. Defaults to the whole song. */
  bars?: [number, number]
  loop?: boolean
}

export interface InputNote {
  kind: 'on' | 'off' | 'tap'
  midi: number
  /** Seconds on the same clock as `tick`. */
  time: number
}

export interface StepEvent {
  /** Notes of the other hand (and of the selected hands in "listen") that the app should sound now. */
  accompaniment?: TimedNote[]
  wrong?: number
  finished?: { score?: PerformanceScore; completed: boolean }
  looped?: boolean
}

/**
 * Play-along state machine (R19, R20). Pure: callers feed it a clock (`tick`) and input
 * (`input`); it reports which notes are due and what the app should play.
 *
 * Wait mode: the cursor glides at tempo to the next note, then stops until every due note
 * has been pressed since the previous step. Perform mode: after a one-bar count-in the cursor
 * runs at tempo and each note is judged hit / early / late / missed within ±150 ms.
 */
export class PlayAlong {
  readonly cfg: PlayAlongConfig
  readonly notes: TimedNote[]
  readonly other: TimedNote[]
  readonly states: NoteState[]
  readonly offsets: (number | null)[]
  readonly startBeat: number
  readonly endBeat: number
  readonly spb: number
  status: PlayStatus = 'idle'
  cursor: number
  private events: number[]
  private eventIdx = 0
  private anchorBeat = 0
  private anchorTime = 0
  private target = 0
  private pressed = new Set<number>()
  private playedOther = new Set<TimedNote>()

  constructor(cfg: PlayAlongConfig) {
    this.cfg = cfg
    const bpb = beatsPerBar(cfg.song.timeSig)
    const total = songDuration(cfg.song)
    const [b0, b1] = cfg.bars ?? [0, Math.ceil(total / bpb - 1e-9) - 1]
    this.startBeat = b0 * bpb
    this.endBeat = Math.min(total, (b1 + 1) * bpb)
    const inRange = (n: TimedNote) => n.startBeat >= this.startBeat - 1e-6 && n.startBeat < this.endBeat - 1e-6
    this.notes = notesFor(cfg.song, cfg.hands).filter(inRange)
    const otherHands: Hands | null = cfg.hands === 'LR' ? null : cfg.hands === 'R' ? 'L' : 'R'
    this.other = otherHands ? notesFor(cfg.song, otherHands).filter(inRange) : []
    this.states = this.notes.map(() => 'pending')
    this.offsets = this.notes.map(() => null)
    this.events = eventBeats(this.notes)
    this.spb = 60 / (cfg.song.bpm * (cfg.tempoPct / 100))
    this.cursor = this.startBeat
  }

  get countInBeats(): number {
    return beatsPerBar(this.cfg.song.timeSig)
  }

  /** Audio time at which a beat sounds, on the current anchor. */
  timeOf(beat: number): number {
    return this.anchorTime + (beat - this.anchorBeat) * this.spb
  }

  beatAt(time: number): number {
    return this.anchorBeat + (time - this.anchorTime) / this.spb
  }

  /** Indices of notes due now (wait) or within the hit window (perform). */
  dueIndices(): number[] {
    const out: number[] = []
    this.states.forEach((s, i) => s === 'due' && out.push(i))
    return out
  }

  dueMidis(): number[] {
    return this.dueIndices().map((i) => this.notes[i]!.midi)
  }

  start(now: number): void {
    this.reset()
    if (this.cfg.mode === 'perform') {
      this.status = 'countIn'
      this.anchorBeat = this.startBeat - this.countInBeats
      this.anchorTime = now
      this.cursor = this.anchorBeat
    } else {
      this.anchorBeat = this.startBeat
      this.anchorTime = now
      this.cursor = this.startBeat
      this.moveTo(this.events[0] ?? this.endBeat, now)
    }
  }

  private reset() {
    this.states.fill('pending')
    this.offsets.fill(null)
    this.eventIdx = 0
    this.pressed.clear()
    this.playedOther.clear()
  }

  private moveTo(beat: number, now: number) {
    this.target = beat
    this.anchorBeat = this.cursor
    this.anchorTime = now
    this.status = 'moving'
  }

  private markDue() {
    const beat = this.events[this.eventIdx]
    this.notes.forEach((n, i) => {
      if (beat !== undefined && Math.abs(n.startBeat - beat) < 1e-6 && this.states[i] === 'pending') this.states[i] = 'due'
    })
  }

  /** Other-hand notes whose start lies in [from, to). */
  private accompanimentBetween(from: number, to: number): TimedNote[] {
    const out: TimedNote[] = []
    for (const n of this.other) {
      if (!this.playedOther.has(n) && n.startBeat >= from - 1e-6 && n.startBeat < to - 1e-6) {
        this.playedOther.add(n)
        out.push(n)
      }
    }
    return out
  }

  tick(now: number): StepEvent {
    const ev: StepEvent = {}
    if (this.status === 'idle' || this.status === 'done') return ev
    if (this.cfg.mode === 'wait') {
      if (this.status === 'moving') {
        const b = Math.min(this.target, this.beatAt(now))
        // Other-hand notes before the step sound while gliding; the ones on the step sound when it's played.
        ev.accompaniment = this.accompanimentBetween(this.cursor, Math.min(b, this.target - 1e-6))
        this.cursor = b
        if (b >= this.target - 1e-6) {
          this.cursor = this.target
          if (this.eventIdx >= this.events.length) return this.finish(ev, now)
          this.status = 'waiting'
          this.markDue()
          // Notes pressed while gliding toward this step count for it.
          this.trySatisfy(now, ev)
        }
      }
      return ev
    }
    // Perform
    const b = this.beatAt(now)
    ev.accompaniment = this.accompanimentBetween(Math.max(this.cursor, this.startBeat), Math.max(b, this.startBeat))
    this.cursor = b
    if (this.status === 'countIn' && b >= this.startBeat) this.status = 'playing'
    if (this.status === 'playing') {
      this.notes.forEach((n, i) => {
        const t = this.timeOf(n.startBeat)
        if (this.states[i] === 'pending' && now >= t - HIT_TOLERANCE) this.states[i] = 'due'
        if (this.states[i] === 'due' && now > t + HIT_TOLERANCE) this.states[i] = 'missed'
      })
      if (b >= this.endBeat + 0.25) {
        if (this.cfg.loop) {
          this.reset()
          this.anchorBeat = this.startBeat
          this.anchorTime = now
          this.cursor = this.startBeat
          ev.looped = true
          return ev
        }
        return this.finish(ev, now)
      }
    }
    return ev
  }

  private finish(ev: StepEvent, now: number): StepEvent {
    if (this.cfg.loop && this.cfg.mode === 'wait') {
      this.reset()
      this.cursor = this.startBeat
      this.moveTo(this.events[0] ?? this.endBeat, now)
      ev.looped = true
      return ev
    }
    this.status = 'done'
    ev.finished = this.cfg.mode === 'perform' ? { score: this.score(), completed: true } : { completed: true }
    return ev
  }

  input(e: InputNote): StepEvent {
    const ev: StepEvent = {}
    if (e.kind !== 'on') return ev
    if (this.cfg.mode === 'wait') {
      if (this.status !== 'waiting' && this.status !== 'moving') return ev
      const upcoming = this.status === 'waiting' ? this.events[this.eventIdx] : this.target
      const isDue = this.notes.some((n) => n.midi === e.midi && upcoming !== undefined && Math.abs(n.startBeat - upcoming) < 1e-6)
      if (!isDue) {
        ev.wrong = e.midi
        return ev
      }
      this.pressed.add(e.midi)
      if (this.status === 'waiting') this.trySatisfy(e.time, ev)
      return ev
    }
    if (this.status !== 'playing' && this.status !== 'countIn') return ev
    let best = -1
    let bestDist = Infinity
    this.notes.forEach((n, i) => {
      if (n.midi !== e.midi || (this.states[i] !== 'due' && this.states[i] !== 'pending')) return
      const d = Math.abs(e.time - this.timeOf(n.startBeat))
      if (d <= HIT_TOLERANCE && d < bestDist) {
        best = i
        bestDist = d
      }
    })
    if (best < 0) {
      ev.wrong = e.midi
      return ev
    }
    const off = e.time - this.timeOf(this.notes[best]!.startBeat)
    this.offsets[best] = off
    this.states[best] = judge(off)
    return ev
  }

  private trySatisfy(now: number, ev: StepEvent) {
    const due = this.dueIndices()
    if (!due.length || !due.every((i) => this.pressed.has(this.notes[i]!.midi))) return
    for (const i of due) this.states[i] = 'hit'
    this.pressed.clear()
    this.eventIdx++
    this.moveTo(this.events[this.eventIdx] ?? this.endBeat, now)
    ev.accompaniment = [...(ev.accompaniment ?? []), ...this.accompanimentBetween(this.cursor, this.cursor + 1e-3)]
  }

  /** Expected times of the selected notes on the current anchor (perform mode). */
  expected(): ExpectedNote[] {
    return this.notes.map((n) => ({ midi: n.midi, time: this.timeOf(n.startBeat), hand: n.hand }))
  }

  score(): PerformanceScore {
    const played = this.notes.flatMap((n, i) => (this.offsets[i] === null ? [] : [{ midi: n.midi, time: this.timeOf(n.startBeat) + this.offsets[i]! }]))
    return scorePerformance(this.expected(), played)
  }

  /** Bars (0-based) that contain a missed note, for "loop the bars you missed". */
  missedBars(): number[] {
    const bpb = beatsPerBar(this.cfg.song.timeSig)
    const bars = new Set<number>()
    this.notes.forEach((n, i) => this.states[i] === 'missed' && bars.add(Math.floor(round(n.startBeat) / bpb)))
    return [...bars].sort((a, b) => a - b)
  }
}
