import type { Hand } from './song'

export const HIT_TOLERANCE = 0.15
/** Offsets inside this window count as "on time"; the rest of the tolerance is early/late. */
export const ON_TIME = 0.05

export interface ExpectedNote {
  midi: number
  time: number
  hand: Hand
}

export interface PlayedNote {
  midi: number
  time: number
}

export type Judgement = 'hit' | 'early' | 'late' | 'missed'

export interface PerformanceScore {
  hit: number
  early: number
  late: number
  missed: number
  extra: number
  /** Notes played within ±150 ms, as a percentage of expected notes (R20). */
  percent: number
  avgOffsetMs: number
  perHand: Partial<Record<Hand, number>>
  judgements: Judgement[]
}

export function judge(offsetSec: number, tol = HIT_TOLERANCE): Judgement {
  if (Math.abs(offsetSec) > tol) return 'missed'
  if (offsetSec < -ON_TIME) return 'early'
  if (offsetSec > ON_TIME) return 'late'
  return 'hit'
}

export function starsFor(percent: number): 0 | 1 | 2 | 3 {
  return percent >= 95 ? 3 : percent >= 80 ? 2 : percent >= 60 ? 1 : 0
}

/** Matches each expected note to the nearest unused played note of the same pitch within the tolerance. */
export function scorePerformance(expected: ExpectedNote[], played: PlayedNote[], tol = HIT_TOLERANCE): PerformanceScore {
  const used = new Set<number>()
  const judgements: Judgement[] = []
  const offsets: number[] = []
  const handTotals: Partial<Record<Hand, { n: number; ok: number }>> = {}
  const order = expected.map((_, i) => i).sort((a, b) => expected[a]!.time - expected[b]!.time)
  const result: Judgement[] = new Array(expected.length)
  for (const i of order) {
    const e = expected[i]!
    let best = -1
    let bestDist = Infinity
    played.forEach((p, j) => {
      if (used.has(j) || p.midi !== e.midi) return
      const d = Math.abs(p.time - e.time)
      if (d <= tol && d < bestDist) {
        best = j
        bestDist = d
      }
    })
    const h = (handTotals[e.hand] ??= { n: 0, ok: 0 })
    h.n++
    if (best >= 0) {
      used.add(best)
      const off = played[best]!.time - e.time
      offsets.push(off)
      result[i] = judge(off, tol)
      h.ok++
    } else result[i] = 'missed'
  }
  judgements.push(...result)
  const count = (j: Judgement) => judgements.filter((x) => x === j).length
  const matched = expected.length - count('missed')
  const perHand: Partial<Record<Hand, number>> = {}
  for (const [hand, t] of Object.entries(handTotals)) perHand[hand as Hand] = Math.round((100 * t.ok) / t.n)
  return {
    hit: count('hit'),
    early: count('early'),
    late: count('late'),
    missed: count('missed'),
    extra: played.length - used.size,
    percent: expected.length ? Math.round((100 * matched) / expected.length) : 0,
    avgOffsetMs: offsets.length ? Math.round((1000 * offsets.reduce((a, b) => a + b, 0)) / offsets.length) : 0,
    perHand,
    judgements,
  }
}
