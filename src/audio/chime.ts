import { freqOf } from '../engine/notes'
import { ensureRunning, getAudioContext, getMaster } from './context'

function bell(midi: number, t: number, peak: number) {
  const ctx = getAudioContext()
  for (const [mult, amp] of [
    [1, 1],
    [2, 0.35],
    [3.01, 0.15],
  ] as const) {
    const o = ctx.createOscillator()
    const g = ctx.createGain()
    o.type = 'sine'
    o.frequency.value = freqOf(midi) * mult
    g.gain.setValueAtTime(0, t)
    g.gain.linearRampToValueAtTime(peak * amp, t + 0.005)
    g.gain.exponentialRampToValueAtTime(0.0005, t + 0.9)
    o.connect(g).connect(getMaster())
    o.start(t)
    o.stop(t + 1)
  }
}

/** Short rising arpeggio for a pass or a new sticker. */
export function playChime(kind: 'success' | 'sticker' = 'success'): void {
  if (!ensureRunning()) return
  if (import.meta.env.DEV) {
    const w = window as unknown as { __chimes?: number }
    w.__chimes = (w.__chimes ?? 0) + 1
  }
  const t = getAudioContext().currentTime + 0.02
  const notes = kind === 'sticker' ? [84, 88, 91, 96] : [79, 84, 88]
  notes.forEach((m, i) => bell(m, t + i * 0.11, 0.18))
}
