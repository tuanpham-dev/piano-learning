import { bundledSongs } from '../content/songs'
import { readSongFile, writeSongFile, SongFileError, SONG_FILE_FORMAT } from './song-file'
import { checkSong } from './song-check'
import { notesKey } from './song-text'

describe('song files', () => {
  it('round-trips a bundled song exactly (A2)', () => {
    const ode = bundledSongs.find((s) => s.id === 'ode-to-joy')!
    const text = writeSongFile(ode)
    expect(JSON.parse(text).format).toBe(SONG_FILE_FORMAT)
    const { song, issues, draft } = readSongFile(text)
    expect(issues).toEqual([])
    expect(draft.right).toHaveLength(16)
    expect(notesKey(song.hands.R.notes)).toBe(notesKey(ode.hands.R.notes))
    expect(notesKey(song.hands.L.notes)).toBe(notesKey(ode.hands.L.notes))
    expect(song.title).toEqual(ode.title)
  })
  it('names the reason a file cannot be read', () => {
    expect(() => readSongFile('nope')).toThrow(new SongFileError('The file is not valid JSON.'))
    expect(() => readSongFile('{"format":"other"}')).toThrow(/not a Piano Learning song file/)
    expect(() => readSongFile(JSON.stringify({ format: SONG_FILE_FORMAT, version: 1, right: 'C4w |', left: 'C3w |' }))).toThrow(/time signature/)
  })
  it('reads a bad bar as a warning, not an error (A3)', () => {
    const file = JSON.stringify({ format: SONG_FILE_FORMAT, version: 1, id: 'x', title: { en: 'X', vi: 'X' }, timeSig: [4, 4], right: 'C4q C4q C4q | C9w |', left: 'C3w | C3w |' })
    const { song, issues } = readSongFile(file)
    const w = checkSong(song, issues)
    expect(w.map((x) => [x.bar, x.kind])).toEqual([
      [1, 'bar-length'],
      [2, 'range'],
    ])
  })
})

describe('song checks', () => {
  const base = bundledSongs[0]!
  it('passes the bundled songs', () => {
    for (const s of bundledSongs) expect(checkSong(s), s.id).toEqual([])
  })
  it('flags empty songs and wide spans', () => {
    expect(checkSong({ ...base, hands: { R: { notes: [], rests: [] }, L: { notes: [], rests: [] } } })[0]!.kind).toBe('empty')
    const wide = {
      ...base,
      hands: {
        R: {
          notes: [
            { midi: 48, startBeat: 0, beats: 1 },
            { midi: 72, startBeat: 0, beats: 1 },
          ],
          rests: [],
        },
        L: { notes: [], rests: [] },
      },
    }
    expect(checkSong(wide).map((w) => w.kind)).toEqual(['span'])
  })
})
