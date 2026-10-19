import { parseVoice } from '../../engine/song-dsl'
import type { Localized, Song } from '../../engine/song'

interface SongSource {
  id: string
  title: Localized
  composer: string
  difficulty: 1 | 2 | 3
  bpm: number
  timeSig: [number, number]
  keySig: string
  right: string
  left: string
}

export function makeSong(s: SongSource): Song {
  return {
    id: s.id,
    title: s.title,
    composer: s.composer,
    difficulty: s.difficulty,
    bpm: s.bpm,
    timeSig: s.timeSig,
    keySig: s.keySig,
    source: 'bundled',
    hands: { R: parseVoice(s.right, s.timeSig), L: parseVoice(s.left, s.timeSig) },
  }
}
