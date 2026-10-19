import { create } from 'zustand'
import type { Song } from '../engine/song'
import { load, save, storageUnavailable } from './persist'

export const SONGS_KEY = 'piano.songs'

interface SessionStore {
  importedSongs: Song[]
  storageUnavailable: boolean
  hydrateSongs: () => Promise<void>
  addImportedSong: (song: Song) => void
  removeImportedSong: (id: string) => void
  setImportedSongs: (songs: Song[]) => void
}

export const useSession = create<SessionStore>()((set, get) => ({
  importedSongs: [],
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
