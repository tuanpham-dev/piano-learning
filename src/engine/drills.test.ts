import { DrillRound, clefOf, isCorrectAnswer, nextNote, rangeFor, seeded } from './drills'
import { isBlackKey } from './notes'

describe('note drills', () => {
  it('stays in range, skips black keys without accidentals, never repeats', () => {
    const rng = seeded(7)
    const cfg = { clef: 'treble' as const, low: 60, high: 72, accidentals: false }
    let prev: number | undefined
    for (let i = 0; i < 200; i++) {
      const n = nextNote(cfg, rng, prev)
      expect(n).toBeGreaterThanOrEqual(60)
      expect(n).toBeLessThanOrEqual(72)
      expect(isBlackKey(n)).toBe(false)
      expect(n).not.toBe(prev)
      prev = n
    }
  })
  it('includes black keys with accidentals on', () => {
    const rng = seeded(3)
    const cfg = { clef: 'treble' as const, low: 60, high: 72, accidentals: true }
    const seen = new Set(Array.from({ length: 300 }, () => nextNote(cfg, rng)))
    expect([...seen].some(isBlackKey)).toBe(true)
  })
  it('keeps bass drills in the bass clef', () => {
    const [lo, hi] = rangeFor('bass', 1)
    expect([lo, hi]).toEqual([48, 60])
    const cfg = { clef: 'both' as const, low: 48, high: 72, accidentals: false }
    expect(clefOf(cfg, 55)).toBe('bass')
    expect(clefOf(cfg, 64)).toBe('treble')
  })
  it('draws only from a fixed pool when given', () => {
    const rng = seeded(1)
    const cfg = { clef: 'both' as const, low: 0, high: 127, accidentals: false, pool: [48, 60, 72] }
    for (let i = 0; i < 50; i++) expect([48, 60, 72]).toContain(nextNote(cfg, rng))
  })
  it('accepts octave errors only from the mic', () => {
    expect(isCorrectAnswer(69, 81, false)).toBe(false)
    expect(isCorrectAnswer(69, 81, true)).toBe(true)
  })
  it('scores a round', () => {
    const r = new DrillRound(4)
    r.record({ midi: 60, correct: true, ms: 1000 })
    r.record({ midi: 62, correct: false, ms: 3000 })
    r.record({ midi: 64, correct: true, ms: 2000 })
    expect(r.done).toBe(false)
    r.record({ midi: 65, correct: true, ms: 1500 })
    r.record({ midi: 67, correct: true, ms: 1 })
    expect(r.done).toBe(true)
    expect(r.answers).toHaveLength(4)
    expect(r.accuracy).toBe(75)
    expect(r.avgMs).toBe(1500)
  })
})
