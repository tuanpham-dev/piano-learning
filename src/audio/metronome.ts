import { create } from 'zustand'
import { ensureRunning, getAudioContext, getMaster } from './context'

export type TimeSigName = '2/4' | '3/4' | '4/4' | '6/8'
export type Accent = 'strong' | 'medium' | 'weak'

export const TIME_SIGS: TimeSigName[] = ['2/4', '3/4', '4/4', '6/8']
export const BPM_MIN = 40
export const BPM_MAX = 208

export function clicksPerBar(sig: TimeSigName): number {
  return Number(sig.split('/')[0])
}

/** 6/8 is felt in two: accents on clicks 1 (strong) and 4 (medium). */
export function accentFor(sig: TimeSigName, clickIndex: number): Accent {
  const i = clickIndex % clicksPerBar(sig)
  if (i === 0) return 'strong'
  if (sig === '6/8' && i === 3) return 'medium'
  return 'weak'
}

export function clampBpm(bpm: number): number {
  return Math.max(BPM_MIN, Math.min(BPM_MAX, Math.round(bpm)))
}

export function playClick(time: number, accent: Accent): void {
  const ctx = getAudioContext()
  const o = ctx.createOscillator()
  const g = ctx.createGain()
  o.type = 'square'
  o.frequency.value = accent === 'strong' ? 1500 : accent === 'medium' ? 1200 : 1000
  const peak = accent === 'strong' ? 0.5 : accent === 'medium' ? 0.32 : 0.25
  g.gain.setValueAtTime(0, time)
  g.gain.linearRampToValueAtTime(peak, time + 0.001)
  g.gain.exponentialRampToValueAtTime(0.001, time + 0.05)
  o.connect(g).connect(getMaster())
  o.start(time)
  o.stop(time + 0.06)
}

interface MetronomeState {
  bpm: number
  sig: TimeSigName
  running: boolean
  /** Index of the click that most recently sounded, within the bar. */
  beat: number
  setBpm: (bpm: number) => void
  setSig: (sig: TimeSigName) => void
  start: (at?: number) => number
  stop: () => void
  toggle: () => void
}

type Listener = (click: number, accent: Accent, time: number) => void
const listeners = new Set<Listener>()
/** Subscribe to every scheduled click (called slightly ahead, with the exact audio time). */
export function onClick(fn: Listener): () => void {
  listeners.add(fn)
  return () => listeners.delete(fn)
}

let timer: ReturnType<typeof setInterval> | null = null
let nextTime = 0
let clickIndex = 0

export const useMetronome = create<MetronomeState>()((set, get) => {
  const schedule = () => {
    const ctx = getAudioContext()
    const { bpm, sig } = get()
    while (nextTime < ctx.currentTime + 0.12) {
      const accent = accentFor(sig, clickIndex)
      const idx = clickIndex % clicksPerBar(sig)
      const t = nextTime
      playClick(t, accent)
      for (const l of listeners) l(clickIndex, accent, t)
      setTimeout(() => set({ beat: idx }), Math.max(0, (t - ctx.currentTime) * 1000))
      nextTime += 60 / bpm
      clickIndex++
    }
  }
  return {
    bpm: 96,
    sig: '4/4',
    running: false,
    beat: -1,
    setBpm: (bpm) => set({ bpm: clampBpm(bpm) }),
    setSig: (sig) => {
      // Restart the bar so the new accent pattern starts on beat 1.
      clickIndex = 0
      set({ sig })
    },
    start: (at) => {
      ensureRunning()
      const ctx = getAudioContext()
      if (timer) clearInterval(timer)
      nextTime = Math.max(at ?? ctx.currentTime + 0.05, ctx.currentTime)
      clickIndex = 0
      set({ running: true, beat: -1 })
      schedule()
      timer = setInterval(schedule, 25)
      return nextTime
    },
    stop: () => {
      if (timer) clearInterval(timer)
      timer = null
      set({ running: false, beat: -1 })
    },
    toggle: () => (get().running ? get().stop() : void get().start()),
  }
})
