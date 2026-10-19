import type { Song } from './song'
import { draftToSong, songToDraft, type Draft, type HandIssue } from './song-text'

export const SONG_FILE_FORMAT = 'piano-learning-song'

/** A song file: the song's details, and each hand as note text with bar lines. */
export interface SongFile {
  format: typeof SONG_FILE_FORMAT
  version: 1
  id: string
  title: { en: string; vi: string }
  composer: string
  difficulty: 1 | 2 | 3
  bpm: number
  timeSig: [number, number]
  keySig: string
  right: string
  left: string
}

export class SongFileError extends Error {}

const joinBars = (bars: string[]) => bars.map((b) => b.trim()).join(' | ') + ' |'
export const splitBars = (text: string) =>
  text
    .split('|')
    .map((b) => b.trim().replace(/\s+/g, ' '))
    .filter((b, i, arr) => b !== '' || i < arr.length - 1)
    .filter((b) => b !== '')

export function draftToFile(d: Draft): SongFile {
  return {
    format: SONG_FILE_FORMAT,
    version: 1,
    id: d.id,
    title: d.title,
    composer: d.composer,
    difficulty: d.difficulty,
    bpm: d.bpm,
    timeSig: d.timeSig,
    keySig: d.keySig,
    right: joinBars(d.right),
    left: joinBars(d.left),
  }
}

export function writeSongFile(song: Song | Draft): string {
  const d = 'hands' in song ? songToDraft(song) : song
  return JSON.stringify(draftToFile(d), null, 2) + '\n'
}

function check(cond: unknown, reason: string): asserts cond {
  if (!cond) throw new SongFileError(reason)
}

/** Reads a song file into a draft; throws SongFileError with a reason the person can act on. */
export function fileToDraft(text: string): Draft {
  let data: Partial<SongFile>
  try {
    data = JSON.parse(text)
  } catch {
    throw new SongFileError('The file is not valid JSON.')
  }
  check(data && typeof data === 'object', 'The file is empty.')
  check(data.format === SONG_FILE_FORMAT, 'This is not a Piano Learning song file.')
  check(data.version === 1, `Song file version ${data.version} is not supported.`)
  check(typeof data.right === 'string' && typeof data.left === 'string', 'The file has no notes for the right and left hand.')
  const ts = data.timeSig
  check(Array.isArray(ts) && ts.length === 2 && [2, 4, 8, 16].includes(ts[1]!) && ts[0]! > 0, 'The time signature is missing or not valid.')
  const title = data.title && typeof data.title === 'object' ? data.title : { en: 'Untitled', vi: 'Untitled' }
  return {
    id: typeof data.id === 'string' && data.id ? data.id : `my-song-${Date.now().toString(36)}`,
    title: { en: title.en || title.vi || 'Untitled', vi: title.vi || title.en || 'Untitled' },
    composer: typeof data.composer === 'string' ? data.composer : '',
    difficulty: data.difficulty === 2 || data.difficulty === 3 ? data.difficulty : 1,
    bpm: typeof data.bpm === 'number' && data.bpm >= 20 && data.bpm <= 300 ? data.bpm : 90,
    timeSig: [ts![0]!, ts![1]!],
    keySig: typeof data.keySig === 'string' ? data.keySig : 'C',
    right: splitBars(data.right!),
    left: splitBars(data.left!),
  }
}

export function readSongFile(text: string): { song: Song; draft: Draft; issues: HandIssue[] } {
  const draft = fileToDraft(text)
  const { song, issues } = draftToSong(draft)
  return { song, draft, issues }
}
