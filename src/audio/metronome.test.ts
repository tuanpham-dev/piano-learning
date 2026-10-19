import { accentFor, clampBpm, clicksPerBar } from './metronome'

describe('metronome accents', () => {
  it('accents beat 1 of every 4/4 bar', () => {
    expect([0, 1, 2, 3, 4, 5, 6, 7].map((i) => accentFor('4/4', i))).toEqual([
      'strong', 'weak', 'weak', 'weak', 'strong', 'weak', 'weak', 'weak',
    ])
  })
  it('feels 6/8 in two', () => {
    expect([0, 1, 2, 3, 4, 5].map((i) => accentFor('6/8', i))).toEqual(['strong', 'weak', 'weak', 'medium', 'weak', 'weak'])
    expect(clicksPerBar('6/8')).toBe(6)
  })
  it('handles 3/4 and 2/4', () => {
    expect(accentFor('3/4', 3)).toBe('strong')
    expect(accentFor('2/4', 1)).toBe('weak')
  })
  it('clamps tempo to 40–208', () => {
    expect(clampBpm(10)).toBe(40)
    expect(clampBpm(300)).toBe(208)
    expect(clampBpm(96.4)).toBe(96)
  })
})
