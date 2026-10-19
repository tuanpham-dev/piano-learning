import { centsOff, freqOf, isBlackKey, letterOf, midiOfFreq, midiToName, nameToMidi, whiteIndex, clefFor } from './notes'

describe('notes', () => {
  it('maps A4 and middle C', () => {
    expect(nameToMidi('A4')).toBe(69)
    expect(nameToMidi('C4')).toBe(60)
    expect(freqOf(69)).toBeCloseTo(440)
    expect(midiOfFreq(261.63)).toBeCloseTo(60, 2)
  })
  it('handles enharmonics and default octave', () => {
    expect(nameToMidi('C#4')).toBe(nameToMidi('Db4'))
    expect(nameToMidi('F#')).toBe(66)
    expect(midiToName(61)).toBe('C#4')
    expect(midiToName(61, { flats: true })).toBe('Db4')
    expect(midiToName(21)).toBe('A0')
  })
  it('computes cents', () => {
    expect(centsOff(440, 69)).toBeCloseTo(0)
    expect(centsOff(446.16, 69)).toBeCloseTo(24, 0)
  })
  it('knows key colors, letters and layout', () => {
    expect(isBlackKey(61)).toBe(true)
    expect(isBlackKey(64)).toBe(false)
    expect(letterOf(61)).toBe('C')
    expect(whiteIndex(62) - whiteIndex(60)).toBe(1)
    expect(whiteIndex(72) - whiteIndex(60)).toBe(7)
    expect(clefFor(59)).toBe('bass')
  })
})
