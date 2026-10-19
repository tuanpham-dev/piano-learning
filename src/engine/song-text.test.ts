import { bundledSongs } from '../content/songs'
import { barsToVoice, draftToSong, emptyDraft, evenHands, notesKey, quantize16, restBar, songToBars, songToDraft } from './song-text'
import { parseVoice } from './song-dsl'
import { barCount } from './song'

describe('song text', () => {
  for (const song of bundledSongs) {
    it(`round-trips ${song.id} through bar text`, () => {
      const bars = barCount(song)
      for (const h of ['R', 'L'] as const) {
        const text = songToBars(song.hands[h], song.timeSig, bars, song.keySig)
        expect(text).toHaveLength(bars)
        const { voice, issues } = barsToVoice(text, song.timeSig)
        expect(issues).toEqual([])
        expect(notesKey(voice.notes)).toBe(notesKey(song.hands[h].notes))
      }
    })
  }

  it('writes ties across bar lines', () => {
    const v = parseVoice('C4q C4q C4h~ | C4h D4h |', [4, 4])
    const bars = songToBars(v, [4, 4], 2)
    expect(bars).toEqual(['C4q C4q C4h~', 'C4h D4h'])
    expect(notesKey(barsToVoice(bars, [4, 4]).voice.notes)).toBe(notesKey(v.notes))
  })

  it('writes chords, rests, dots and flats in flat keys', () => {
    const v = parseVoice('[C4 E4 G4]h rq Bb3e. Bb3s |', [4, 4])
    expect(songToBars(v, [4, 4], 1, 'F')).toEqual(['[C4 E4 G4]h rq Bb3e. Bb3s'])
  })

  it('splits odd lengths with ties and snaps to sixteenths', () => {
    const v = quantize16({ notes: [{ midi: 60, startBeat: 0.02, beats: 1.27 }], rests: [] })
    const bars = songToBars(v, [4, 4], 1)
    expect(bars[0]).toBe('C4q~ C4s rh re.')
    expect(notesKey(barsToVoice(bars, [4, 4]).voice.notes)).toBe('60@0+1.25')
  })

  it('reports bad bars leniently', () => {
    const { voice, issues } = barsToVoice(['C4q C4q C4q', 'D4w'], [4, 4])
    expect(issues).toEqual([{ bar: 1, message: 'Bar 1 has 3 beats, expected 4' }])
    expect(voice.notes).toHaveLength(4)
  })

  it('converts between songs and drafts, padding the shorter hand', () => {
    const d = songToDraft(bundledSongs[0]!)
    const { song, issues } = draftToSong({ ...d, left: d.left.slice(0, 2) })
    expect(issues).toEqual([])
    expect(barCount(song)).toBe(barCount(bundledSongs[0]!))
    expect(evenHands({ ...d, left: [] }).left.every((b) => b === restBar([4, 4]))).toBe(true)
  })

  it('makes a one-bar empty draft', () => {
    expect(emptyDraft('x').right).toEqual(['rw'])
    expect(restBar([3, 4])).toBe('rh.')
    expect(restBar([6, 8])).toBe('rh.')
  })
})

describe('editor helpers', () => {
  it('tokenizes bars and counts beats', async () => {
    const { barTokens, barBeats, tokenBeats, noteToken } = await import('./song-text')
    expect(barTokens('[C4 E4 G4]h. rq')).toEqual(['[C4 E4 G4]h.', 'rq'])
    expect(barBeats('C4q3 D4e. E4s rh')).toBe(4)
    expect(tokenBeats('E4h~')).toBe(2)
    expect(noteToken([64, 60, 67], 'q', false, 3)).toBe('[C4 E4 G4]q')
    expect(noteToken([70], 'e', true, 2, 'F')).toBe('Bb4e.2')
  })
})
