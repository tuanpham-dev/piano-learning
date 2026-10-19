import type { Song } from '../engine/song'
import { initialProgress, normalize, progressSnapshot, useProgress, type ProgressData } from './progress'
import { remove, save } from './persist'
import { PROGRESS_KEY } from './progress'
import { SONGS_KEY, useSession } from './session'

export interface ExportFile {
  app: 'piano-learning'
  version: 1
  exportedAt: string
  progress: ProgressData
  songs: Song[]
}

export function buildExport(): ExportFile {
  return {
    app: 'piano-learning',
    version: 1,
    exportedAt: new Date().toISOString(),
    progress: progressSnapshot(),
    songs: useSession.getState().importedSongs,
  }
}

export function downloadExport(): void {
  const data = buildExport()
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `piano-progress-${data.exportedAt.slice(0, 10)}.json`
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

export function parseExport(text: string): ExportFile | null {
  try {
    const data = JSON.parse(text) as Partial<ExportFile>
    if (data.app !== 'piano-learning' || data.version !== 1 || typeof data.progress !== 'object' || !data.progress) return null
    return { ...(data as ExportFile), songs: Array.isArray(data.songs) ? data.songs : [] }
  } catch {
    return null
  }
}

function maxMap(a: Record<string, number>, b: Record<string, number>): Record<string, number> {
  const out = { ...a }
  for (const [k, v] of Object.entries(b)) out[k] = Math.max(out[k] ?? 0, v)
  return out
}

const union = <T>(a: T[], b: T[]): T[] => [...new Set([...a, ...b])]

/** Merge keeps the better of each value: max minutes per day, best score per song, union of lessons, badges, songs. */
export function mergeProgress(cur: ProgressData, inc: ProgressData): ProgressData {
  const songBest = { ...cur.songBest }
  for (const [id, byKey] of Object.entries(inc.songBest)) {
    songBest[id] = { ...songBest[id] }
    for (const [k, r] of Object.entries(byKey)) {
      const prev = songBest[id]![k]
      if (!prev || r.percent > prev.percent) songBest[id]![k] = r
    }
  }
  const drills = { ...cur.drills }
  for (const k of Object.keys(drills) as (keyof typeof drills)[]) {
    const a = cur.drills[k]
    const b = inc.drills[k]
    drills[k] = b && b.attempts > a.attempts ? b : a
  }
  return {
    ...cur,
    dailyMinutes: maxMap(cur.dailyMinutes, inc.dailyMinutes),
    stars: Math.max(cur.stars, inc.stars),
    songBest,
    songsDone: union(cur.songsDone, inc.songsDone),
    drills,
    drillRounds: Math.max(cur.drillRounds, inc.drillRounds),
    lessonsDone: union(cur.lessonsDone, inc.lessonsDone),
    badges: union(cur.badges, inc.badges),
    modesTried: union(cur.modesTried, inc.modesTried),
  }
}

export function applyImport(file: ExportFile, how: 'merge' | 'replace'): void {
  const inc = normalize(file.progress)
  const cur = progressSnapshot()
  useProgress.getState().replaceAll(how === 'replace' ? inc : mergeProgress(cur, inc))
  const session = useSession.getState()
  if (how === 'replace') session.setImportedSongs(file.songs)
  else session.setImportedSongs([...session.importedSongs.filter((s) => !file.songs.some((f) => f.id === s.id)), ...file.songs])
}

export async function resetAll(): Promise<void> {
  const keep = progressSnapshot()
  const fresh = initialProgress()
  useProgress.getState().replaceAll({ ...fresh, name: keep.name, mode: keep.mode, lang: keep.lang, createdAt: keep.createdAt })
  useSession.getState().setImportedSongs([])
  await remove(SONGS_KEY)
  await save(PROGRESS_KEY, progressSnapshot())
}
