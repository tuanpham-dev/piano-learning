import { chordNotes, identifyChord, scaleNotes } from './chords-scales'

describe('chords and scales', () => {
  it('spells F# minor 7 (A21)', () => {
    const c = chordNotes('F#', 'min7')
    expect(c.names).toEqual(['F♯', 'A', 'C♯', 'E'])
    expect(c.midis.map((m) => m % 12)).toEqual([6, 9, 1, 4])
  })
  it('gives 6 notes for the D blues scale (A21)', () => {
    const s = scaleNotes('D', 'blues')
    expect(s.midis).toHaveLength(6)
    expect(s.names).toEqual(['D', 'F', 'G', 'A♭', 'A', 'C'])
  })
  it('spells flat keys with flats', () => {
    expect(scaleNotes('Eb', 'major').names).toEqual(['E♭', 'F', 'G', 'A♭', 'B♭', 'C', 'D'])
    expect(chordNotes('Bb', 'maj').names).toEqual(['B♭', 'D', 'F'])
  })
  it('spells harmonic minor and pentatonics', () => {
    expect(scaleNotes('A', 'harmonicMinor').names).toEqual(['A', 'B', 'C', 'D', 'E', 'F', 'G♯'])
    expect(scaleNotes('C', 'pentatonicMinor').names).toEqual(['C', 'E♭', 'F', 'G', 'B♭'])
  })
  it('identifies chords in any inversion', () => {
    expect(identifyChord([64, 67, 72])).toEqual({ root: 'C', type: 'maj' })
    expect(identifyChord([57, 60, 64, 67])).toEqual({ root: 'A', type: 'min7' })
    expect(identifyChord([60, 62])).toBeNull()
  })
})
