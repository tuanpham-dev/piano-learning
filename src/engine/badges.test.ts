import { evaluate, qualifies, ALL_MODES } from './badges'
import { initialProgress } from '../store/progress'

describe('badges', () => {
  const base = initialProgress()
  it('earns nothing on a fresh start', () => {
    expect(qualifies(base, 18)).toEqual([])
  })
  it('earns first song and ten songs', () => {
    expect(qualifies({ ...base, songsDone: ['a'] }, 18)).toEqual(['first-song'])
    expect(qualifies({ ...base, songsDone: Array.from({ length: 10 }, (_, i) => `s${i}`) }, 18)).toContain('ten-songs')
  })
  it('earns a 7-day streak', () => {
    const daily: Record<string, number> = {}
    for (let d = 13; d <= 19; d++) daily[`2026-10-${d}`] = 6
    expect(qualifies({ ...base, dailyMinutes: daily }, 18, '2026-10-19')).toContain('streak-7')
  })
  it('earns 100 drill notes across clefs and 50 rounds', () => {
    const drills = { ...base.drills, treble: { attempts: 60, correct: 50, totalMs: 0 }, bass: { attempts: 40, correct: 30, totalMs: 0 } }
    expect(qualifies({ ...base, drills }, 18)).toContain('drill-100')
    expect(qualifies({ ...base, drillRounds: 50 }, 18)).toContain('fifty-drills')
  })
  it('earns a 3-star song', () => {
    expect(qualifies({ ...base, songBest: { x: { 'R@full': { percent: 97, stars: 3, tempoPct: 100 } } } }, 18)).toContain('three-star')
  })
  it('earns every mode tried and all lessons', () => {
    expect(qualifies({ ...base, modesTried: ALL_MODES }, 18)).toContain('all-modes')
    expect(qualifies({ ...base, lessonsDone: Array.from({ length: 18 }, (_, i) => `l${i}`) }, 18)).toContain('all-lessons')
    expect(qualifies(base, 0)).not.toContain('all-lessons')
  })
  it('only reports badges not yet held', () => {
    expect(evaluate({ ...base, songsDone: ['a'], badges: ['first-song'] }, 18)).toEqual([])
  })
})
