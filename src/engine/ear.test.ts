import { checkChoice, checkPlayed, makeQuestion, KID_INTERVALS } from './ear'
import { seeded } from './drills'

describe('ear training', () => {
  it('makes intervals from unison to octave', () => {
    const rng = seeded(5)
    const qs = Array.from({ length: 200 }, () => makeQuestion('interval', rng))
    const spans = new Set(qs.map((q) => q.notes[1]! - q.notes[0]!))
    expect(Math.min(...spans)).toBe(0)
    expect(Math.max(...spans)).toBe(12)
  })
  it('uses a smaller interval set for kids', () => {
    const q = makeQuestion('interval', seeded(2), { kid: true })
    expect(q.choices).toEqual(KID_INTERVALS)
  })
  it('accepts an interval played in either order (A18)', () => {
    const q = { type: 'interval' as const, notes: [60, 67], answer: 'P5', choices: [] }
    expect(checkPlayed(q, [67, 60])).toBe(true)
    expect(checkPlayed(q, [60, 66])).toBe(false)
    expect(checkChoice(q, 'P5')).toBe(true)
  })
  it('accepts a chord in any inversion', () => {
    const q = makeQuestion('chord', seeded(9))
    const inverted = [q.notes[1]!, q.notes[2]!, q.notes[0]! + 12]
    expect(checkPlayed(q, inverted)).toBe(true)
  })
  it('needs a melody in order (A18)', () => {
    const q = { type: 'melody' as const, notes: [60, 62, 64], answer: '60,62,64', choices: [] }
    expect(checkPlayed(q, [60, 62, 64])).toBe(true)
    expect(checkPlayed(q, [62, 60, 64])).toBe(false)
    expect(checkPlayed(q, [72, 74, 76], true)).toBe(true)
  })
  it('keeps melodies 3–5 notes for adults and 2–3 for kids', () => {
    const rng = seeded(4)
    for (let i = 0; i < 100; i++) {
      expect(makeQuestion('melody', rng).notes.length).toBeGreaterThanOrEqual(3)
      const k = makeQuestion('melody', rng, { kid: true }).notes.length
      expect(k).toBeGreaterThanOrEqual(2)
      expect(k).toBeLessThanOrEqual(3)
    }
  })
})
