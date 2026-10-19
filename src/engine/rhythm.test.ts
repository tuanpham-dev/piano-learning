import { gridFor, makePattern, scoreTaps } from './rhythm'
import { seeded } from './drills'

const sum = (p: { beats: number }[]) => p.reduce((a, n) => a + n.beats, 0)

describe('rhythm', () => {
  it('fills whole bars per level', () => {
    const rng = seeded(11)
    for (let i = 0; i < 100; i++) {
      expect(sum(makePattern(1, rng))).toBe(4)
      expect(sum(makePattern(2, rng))).toBe(4)
      expect(sum(makePattern(3, rng))).toBe(8)
    }
  })
  it('uses only quarters and longer at level 1', () => {
    const rng = seeded(2)
    for (let i = 0; i < 50; i++) for (const n of makePattern(1, rng)) expect(n.beats).toBeGreaterThanOrEqual(1)
  })
  it('scores exact taps 100% (A19)', () => {
    const grid = gridFor([{ beats: 1 }, { beats: 1 }, { beats: 1 }, { beats: 1 }], 80, 10)
    const s = scoreTaps(grid, grid, 0.08, 0.75)
    expect(s.hitPercent).toBe(100)
    expect(s.avgOffsetMs).toBe(0)
  })
  it('scores taps 120 ms late 0% with +120 ms offset (A19)', () => {
    const grid = gridFor([{ beats: 1 }, { beats: 1 }, { beats: 1 }, { beats: 1 }], 80, 10)
    const s = scoreTaps(grid, grid.map((t) => t + 0.12), 0.08, 0.75)
    expect(s.hitPercent).toBe(0)
    expect(s.avgOffsetMs).toBe(120)
  })
  it('penalises extra taps', () => {
    const grid = [0, 1]
    expect(scoreTaps(grid, [0, 0.5, 1]).hitPercent).toBe(67)
  })
  it('skips rests in the grid', () => {
    expect(gridFor([{ beats: 1 }, { beats: 1, rest: true }, { beats: 2 }], 60)).toEqual([0, 2])
  })
})
