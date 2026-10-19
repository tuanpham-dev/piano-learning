import { parseVoice, SongSyntaxError } from './song-dsl'
import { chordBeats, hasChords } from './song'

const FOUR: [number, number] = [4, 4]

describe('song DSL', () => {
  it('parses Twinkle’s first line with fingering', () => {
    const v = parseVoice('C4q1 C4q1 G4q5 G4q5 | A4q5 A4q5 G4h5 |', FOUR)
    expect(v.notes.map((n) => [n.midi, n.startBeat, n.beats, n.finger])).toEqual([
      [60, 0, 1, 1], [60, 1, 1, 1], [67, 2, 1, 5], [67, 3, 1, 5],
      [69, 4, 1, 5], [69, 5, 1, 5], [67, 6, 2, 5],
    ])
  })
  it('parses chords, dotted notes, accidentals and rests', () => {
    const v = parseVoice('[C4 E4 G4]h F#4q. Bb3e |', FOUR)
    expect(v.notes.filter((n) => n.startBeat === 0).map((n) => n.midi)).toEqual([60, 64, 67])
    expect(v.notes.find((n) => n.midi === 66)).toMatchObject({ startBeat: 2, beats: 1.5 })
    expect(v.notes.find((n) => n.midi === 58)).toMatchObject({ startBeat: 3.5, beats: 0.5 })
    expect(hasChords(v)).toBe(true)
    expect(chordBeats(v)).toEqual([0])
    const r = parseVoice('rh G3e. G3s |', [3, 4])
    expect(r.rests).toEqual([{ startBeat: 0, beats: 2 }])
    expect(r.notes[1]).toMatchObject({ startBeat: 2.75, beats: 0.25 })
  })
  it('handles ties within a bar', () => {
    const v = parseVoice('E4h~ E4q D4q |', FOUR)
    expect(v.notes).toHaveLength(2)
    expect(v.notes[0]).toMatchObject({ midi: 64, beats: 3 })
  })
  it('handles 3/8 bars of 1.5 beats', () => {
    expect(() => parseVoice('E5s D#5s E5s B4s D5s C5s |', [3, 8])).not.toThrow()
  })
  it('rejects a bar with 5 beats in 4/4', () => {
    expect(() => parseVoice('C4q C4q C4q C4q C4q |', FOUR)).toThrow(SongSyntaxError)
    expect(() => parseVoice('C4q C4q C4q | D4w |', FOUR)).toThrow(/Bar 1 has 3 beats/)
  })
  it('rejects unknown tokens with the bar number', () => {
    expect(() => parseVoice('C4q C4q C4q C4q | X9 |', FOUR)).toThrow(/Bar 2/)
  })
})
