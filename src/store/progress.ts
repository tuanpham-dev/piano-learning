import { create } from 'zustand'
import { debouncedSaver, load } from './persist'

export type Mode = 'kid' | 'adult'
export type Lang = 'en' | 'vi'
export type Hands = 'L' | 'R' | 'LR'
export type DrillKey = 'treble' | 'bass' | 'interval' | 'chord' | 'melody' | 'rhythm'
export type ModeKey = 'free' | 'songs' | 'drills' | 'ear' | 'rhythm' | 'lessons' | 'reference'
export type NotationView = 'staff' | 'lane' | 'both'

export interface SongBest {
  percent: number
  stars: number
  tempoPct: number
}

export interface DrillStats {
  attempts: number
  correct: number
  totalMs: number
}

export interface Settings {
  view: NotationView
  noteNames: boolean
  skipAhead: boolean
  inputs: { screen: boolean; qwerty: boolean; midi: boolean; mic: boolean }
  micSensitivity: number
  virtualMidi: boolean
}

export interface ProgressData {
  version: 1
  name: string
  mode: Mode
  lang: Lang
  createdAt: string | null
  dailyMinutes: Record<string, number>
  stars: number
  /** songId → `${hands}@${tempoBand}` → best result */
  songBest: Record<string, Record<string, SongBest>>
  songsDone: string[]
  drills: Record<DrillKey, DrillStats>
  drillRounds: number
  lessonsDone: string[]
  badges: string[]
  modesTried: ModeKey[]
  settings: Settings
}

export const PROGRESS_KEY = 'piano.progress'

const emptyDrill = (): DrillStats => ({ attempts: 0, correct: 0, totalMs: 0 })

export function initialProgress(): ProgressData {
  return {
    version: 1,
    name: '',
    mode: 'adult',
    lang: 'en',
    createdAt: null,
    dailyMinutes: {},
    stars: 0,
    songBest: {},
    songsDone: [],
    drills: {
      treble: emptyDrill(),
      bass: emptyDrill(),
      interval: emptyDrill(),
      chord: emptyDrill(),
      melody: emptyDrill(),
      rhythm: emptyDrill(),
    },
    drillRounds: 0,
    lessonsDone: [],
    badges: [],
    modesTried: [],
    settings: {
      view: 'both',
      noteNames: true,
      skipAhead: false,
      inputs: { screen: true, qwerty: true, midi: true, mic: false },
      micSensitivity: 0.85,
      virtualMidi: false,
    },
  }
}

export function tempoBand(tempoPct: number): 'slow' | 'mid' | 'full' {
  return tempoPct < 75 ? 'slow' : tempoPct < 100 ? 'mid' : 'full'
}

interface Actions {
  loaded: boolean
  hydrate: () => Promise<void>
  setProfile: (p: { name: string; mode: Mode; lang: Lang }) => void
  setMode: (mode: Mode) => void
  setLang: (lang: Lang) => void
  setName: (name: string) => void
  addMinutes: (date: string, n: number) => void
  addStars: (n: number) => void
  recordSongResult: (r: { songId: string; hands: Hands; tempoPct: number; percent: number; stars: number }) => { newBest: boolean; firstTime: boolean }
  recordWaitCompletion: (songId: string) => { firstTime: boolean }
  recordDrill: (key: DrillKey, r: { attempts: number; correct: number; totalMs: number }) => void
  completeLesson: (id: string) => void
  awardBadges: (ids: string[]) => void
  markModeTried: (m: ModeKey) => void
  updateSettings: (patch: Partial<Settings>) => void
  replaceAll: (data: ProgressData) => void
}

export type ProgressStore = ProgressData & Actions

const persist = debouncedSaver(PROGRESS_KEY)

function dataOf(s: ProgressStore): ProgressData {
  const {
    loaded: _l,
    hydrate: _h,
    setProfile: _sp,
    setMode: _sm,
    setLang: _sl,
    setName: _sn,
    addMinutes: _am,
    addStars: _as,
    recordSongResult: _rs,
    recordWaitCompletion: _rw,
    recordDrill: _rd,
    completeLesson: _cl,
    awardBadges: _ab,
    markModeTried: _mt,
    updateSettings: _us,
    replaceAll: _ra,
    ...data
  } = s
  return data
}

/** Fills fields added after a stored snapshot was written. */
export function normalize(raw: Partial<ProgressData> | undefined): ProgressData {
  const base = initialProgress()
  if (!raw) return base
  return {
    ...base,
    ...raw,
    drills: { ...base.drills, ...(raw.drills ?? {}) },
    settings: { ...base.settings, ...(raw.settings ?? {}), inputs: { ...base.settings.inputs, ...(raw.settings?.inputs ?? {}) } },
  }
}

export const useProgress = create<ProgressStore>()((set, get) => ({
  ...initialProgress(),
  loaded: false,
  hydrate: async () => {
    const raw = await load<Partial<ProgressData>>(PROGRESS_KEY)
    set({ ...normalize(raw), loaded: true })
  },
  setProfile: ({ name, mode, lang }) => set({ name, mode, lang, createdAt: new Date().toISOString() }),
  setMode: (mode) => set({ mode }),
  setLang: (lang) => set({ lang }),
  setName: (name) => set({ name }),
  addMinutes: (date, n) => set((s) => ({ dailyMinutes: { ...s.dailyMinutes, [date]: (s.dailyMinutes[date] ?? 0) + n } })),
  addStars: (n) => set((s) => ({ stars: s.stars + n })),
  recordSongResult: ({ songId, hands, tempoPct, percent, stars }) => {
    const s = get()
    const key = `${hands}@${tempoBand(tempoPct)}`
    const prev = s.songBest[songId]?.[key]
    const newBest = !prev || percent > prev.percent
    const firstTime = !s.songsDone.includes(songId)
    const prevStars = Math.max(0, ...Object.values(s.songBest[songId] ?? {}).map((b) => b.stars))
    set({
      songBest: newBest ? { ...s.songBest, [songId]: { ...s.songBest[songId], [key]: { percent, stars, tempoPct } } } : s.songBest,
      songsDone: firstTime ? [...s.songsDone, songId] : s.songsDone,
      // Only stars above the song's previous best count toward the total, so replays can't farm stars.
      stars: s.stars + Math.max(0, stars - prevStars),
    })
    return { newBest, firstTime }
  },
  recordWaitCompletion: (songId) => {
    const s = get()
    const firstTime = !s.songsDone.includes(songId)
    if (firstTime) set({ songsDone: [...s.songsDone, songId], stars: s.stars + 1 })
    return { firstTime }
  },
  recordDrill: (key, r) =>
    set((s) => {
      const d = s.drills[key]
      return {
        drills: { ...s.drills, [key]: { attempts: d.attempts + r.attempts, correct: d.correct + r.correct, totalMs: d.totalMs + r.totalMs } },
        drillRounds: s.drillRounds + 1,
      }
    }),
  completeLesson: (id) => set((s) => (s.lessonsDone.includes(id) ? s : { lessonsDone: [...s.lessonsDone, id] })),
  awardBadges: (ids) => set((s) => ({ badges: [...s.badges, ...ids.filter((b) => !s.badges.includes(b))] })),
  markModeTried: (m) => set((s) => (s.modesTried.includes(m) ? s : { modesTried: [...s.modesTried, m] })),
  updateSettings: (patch) => set((s) => ({ settings: { ...s.settings, ...patch } })),
  replaceAll: (data) => set({ ...normalize(data) }),
}))

useProgress.subscribe((s) => {
  if (s.loaded) persist(dataOf(s))
})

export function progressSnapshot(): ProgressData {
  return dataOf(useProgress.getState())
}
