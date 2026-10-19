import { recordingToSong } from './recording'
import { songToDraft } from './song-text'

const opts = { bpm: 80, timeSig: [4, 4] as [number, number], start: 10, id: 'r', title: 'Rec' }
const spb = 60 / 80

describe('recording', () => {
  it('snaps to eighths and splits hands at middle C (A6)', () => {
    const late = 0.03
    const notes = [
      { midi: 60, on: 10 + late, off: 10 + spb * 0.9 },
      { midi: 64, on: 10 + spb + late, off: 10 + spb * 1.9 },
      { midi: 67, on: 10 + 2 * spb + late, off: 10 + spb * 2.9 },
      { midi: 48, on: 10 + late, off: 10 + spb * 3.9 },
    ]
    const d = songToDraft(recordingToSong(notes, opts))
    expect(d.right).toEqual(['C4q E4q G4q rq'])
    expect(d.left).toEqual(['C3w'])
  })
  it('rounds up to whole bars and keeps eighths', () => {
    const d = songToDraft(recordingToSong([{ midi: 62, on: 10 + 4 * spb + spb / 2, off: 10 + 5 * spb }], opts))
    expect(d.right).toEqual(['rw', 're D4e rh.'])
  })
  it('stops a held note at the next note of the same hand', () => {
    const d = songToDraft(
      recordingToSong(
        [
          { midi: 60, on: 10, off: 10 + 4 * spb },
          { midi: 62, on: 10 + spb, off: 10 + 2 * spb },
        ],
        opts,
      ),
    )
    expect(d.right).toEqual(['C4q D4q rh'])
  })
  it('makes an empty one-bar song from nothing', () => {
    const s = recordingToSong([], opts)
    expect(s.hands.R.notes).toHaveLength(0)
  })
})
