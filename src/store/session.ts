import { create } from 'zustand'
import type { Song } from '../engine/song'
import type { SongWarning } from '../engine/song-check'
import { load, save, storageUnavailable } from './persist'

export const SONGS_KEY = 'piano.songs'

/** A song waiting on the review screen before it is saved (R3, R11). */
export interface PendingReview {
  song: Song
  warnings: SongWarning[]
  origin: 'file' | 'recording'
  fileName?: string
}

interface SessionStore {
  importedSongs: Song[]
  pendingReview: PendingReview | null
  setPendingReview: (r: PendingReview | null) => void
  renameSong: (id: string, title: string) => void
  /** Copies a song into My songs with a new id; returns the id. */
  duplicateSong: (song: Song, title?: string) => string
  storageUnavailable: boolean
  hydrateSongs: () => Promise<void>
  addImportedSong: (song: Song) => void
  removeImportedSong: (id: string) => void
  setImportedSongs: (songs: Song[]) => void
}

export const useSession = create<SessionStore>()((set, get) => ({
  importedSongs: [],
  pendingReview: null,
  setPendingReview: (r) => set({ pendingReview: r }),
  renameSong: (id, title) => {
    const songs = get().importedSongs.map((s) => (s.id === id ? { ...s, title: { en: title, vi: title } } : s))
    set({ importedSongs: songs })
    void save(SONGS_KEY, songs)
  },
  duplicateSong: (song, title) => {
    const id = `my-${song.id.replace(/^my-/, '').slice(0, 24)}-${Date.now().toString(36)}`
    const copy: Song = { ...song, id, source: 'imported', title: title ? { en: title, vi: title } : song.title }
    get().addImportedSong(copy)
    return id
  },
  storageUnavailable: false,
  hydrateSongs: async () => {
    const songs = (await load<Song[]>(SONGS_KEY)) ?? []
    set({ importedSongs: songs, storageUnavailable: storageUnavailable() })
  },
  addImportedSong: (song) => {
    const songs = [...get().importedSongs.filter((s) => s.id !== song.id), song]
    set({ importedSongs: songs })
    void save(SONGS_KEY, songs)
  },
  removeImportedSong: (id) => {
    const songs = get().importedSongs.filter((s) => s.id !== id)
    set({ importedSongs: songs })
    void save(SONGS_KEY, songs)
  },
  setImportedSongs: (songs) => {
    set({ importedSongs: songs })
    void save(SONGS_KEY, songs)
  },
}))
