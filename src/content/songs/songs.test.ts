import { bundledSongs } from '.'
import { songDuration, voiceEnd } from '../../engine/song'
import { MIDI_A0, MIDI_C8 } from '../../engine/notes'

describe('bundled songs', () => {
  it('has the 12 songs from the spec', () => {
    expect(bundledSongs.map((s) => s.id)).toEqual([
      'twinkle',
      'mary-lamb',
      'au-clair',
      'kia-con-buom-vang',
      'jingle-bells',
      'happy-birthday',
      'ode-to-joy',
      'amazing-grace',
      'greensleeves',
      'minuet-in-g',
      'fur-elise',
      'canon-in-d',
    ])
  })
  for (const song of bundledSongs) {
    describe(song.id, () => {
      it('has hands of equal length', () => {
        expect(voiceEnd(song.hands.L)).toBeCloseTo(voiceEnd(song.hands.R))
        expect(songDuration(song)).toBeGreaterThan(0)
      })
      it('stays on the piano', () => {
        for (const v of [song.hands.R, song.hands.L])
          for (const n of v.notes) {
            expect(n.midi).toBeGreaterThanOrEqual(MIDI_A0)
            expect(n.midi).toBeLessThanOrEqual(MIDI_C8)
          }
      })
      it('has right-hand fingering', () => {
        expect(song.hands.R.notes.some((n) => n.finger)).toBe(true)
      })
      it('has both titles', () => {
        expect(song.title.en && song.title.vi).toBeTruthy()
      })
      if (song.difficulty === 1) {
        it('keeps each hand within two octaves', () => {
          for (const v of [song.hands.R, song.hands.L]) {
            const ms = v.notes.map((n) => n.midi)
            expect(Math.max(...ms) - Math.min(...ms)).toBeLessThanOrEqual(24)
          }
        })
      }
    })
  }
})
