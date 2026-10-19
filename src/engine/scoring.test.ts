import { judge, scorePerformance, starsFor } from './scoring'

describe('scoring', () => {
  const expected = [0, 0.5, 1, 1.5].map((t, i) => ({ midi: 60 + i, time: t, hand: 'R' as const }))
  it('scores an exact performance 100%', () => {
    const s = scorePerformance(expected, expected.map((e) => ({ midi: e.midi, time: e.time })))
    expect(s).toMatchObject({ percent: 100, hit: 4, missed: 0, avgOffsetMs: 0 })
    expect(s.perHand.R).toBe(100)
  })
  it('counts 120 ms late notes as late but within tolerance', () => {
    const s = scorePerformance(expected, expected.map((e) => ({ midi: e.midi, time: e.time + 0.12 })))
    expect(s).toMatchObject({ percent: 100, late: 4, avgOffsetMs: 120 })
  })
  it('misses notes beyond ±150 ms and wrong pitches', () => {
    const s = scorePerformance(expected, [
      { midi: 60, time: 0.2 },
      { midi: 99, time: 0.5 },
      { midi: 62, time: 1.01 },
    ])
    expect(s).toMatchObject({ missed: 3, hit: 1, percent: 25, extra: 2 })
  })
  it('scores nothing played as 0%', () => {
    expect(scorePerformance(expected, []).percent).toBe(0)
  })
  it('maps percent to stars', () => {
    expect([59, 60, 80, 94, 95].map(starsFor)).toEqual([0, 1, 2, 2, 3])
  })
  it('judges offsets', () => {
    expect([-0.1, 0, 0.1, 0.2].map((o) => judge(o))).toEqual(['early', 'hit', 'late', 'missed'])
  })
})
