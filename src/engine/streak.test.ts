import { computeStreak, last7Days } from './streak'

describe('streak', () => {
  it('counts consecutive qualifying days including today', () => {
    expect(computeStreak({ '2026-10-17': 6, '2026-10-18': 10, '2026-10-19': 5 }, '2026-10-19')).toBe(3)
  })
  it('stops at a gap', () => {
    expect(computeStreak({ '2026-10-16': 9, '2026-10-18': 10, '2026-10-19': 5 }, '2026-10-19')).toBe(2)
  })
  it('keeps yesterday’s streak alive when today is not done yet', () => {
    expect(computeStreak({ '2026-10-17': 6, '2026-10-18': 10, '2026-10-19': 2 }, '2026-10-19')).toBe(2)
  })
  it('ignores days under the minimum', () => {
    expect(computeStreak({ '2026-10-19': 4 }, '2026-10-19')).toBe(0)
  })
  it('crosses month boundaries', () => {
    expect(computeStreak({ '2026-09-30': 5, '2026-10-01': 5 }, '2026-10-01')).toBe(2)
  })
  it('lists the last 7 days oldest first', () => {
    const days = last7Days({ '2026-10-19': 3 }, '2026-10-19')
    expect(days).toHaveLength(7)
    expect(days[0]!.date).toBe('2026-10-13')
    expect(days[6]).toEqual({ date: '2026-10-19', minutes: 3 })
  })
})
