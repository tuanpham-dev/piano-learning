import type { ModeKey, ProgressData } from '../store/progress'
import { computeStreak } from './streak'

export const BADGE_IDS = ['first-song', 'streak-7', 'drill-100', 'three-star', 'all-modes', 'ten-songs', 'fifty-drills', 'all-lessons'] as const
export type BadgeId = (typeof BADGE_IDS)[number]

export const ALL_MODES: ModeKey[] = ['free', 'songs', 'drills', 'ear', 'rhythm', 'lessons', 'reference']

type P = Pick<ProgressData, 'songsDone' | 'dailyMinutes' | 'drills' | 'songBest' | 'modesTried' | 'drillRounds' | 'lessonsDone' | 'badges'>

/** Which badges a progress snapshot qualifies for (R28). */
export function qualifies(p: P, totalLessons: number, today?: string): BadgeId[] {
  const drillNotes = p.drills.treble.attempts + p.drills.bass.attempts
  const threeStar = Object.values(p.songBest).some((byKey) => Object.values(byKey).some((r) => r.stars >= 3))
  const checks: Record<BadgeId, boolean> = {
    'first-song': p.songsDone.length >= 1,
    'streak-7': computeStreak(p.dailyMinutes, today) >= 7,
    'drill-100': drillNotes >= 100,
    'three-star': threeStar,
    'all-modes': ALL_MODES.every((m) => p.modesTried.includes(m)),
    'ten-songs': p.songsDone.length >= 10,
    'fifty-drills': p.drillRounds >= 50,
    'all-lessons': totalLessons > 0 && p.lessonsDone.length >= totalLessons,
  }
  return BADGE_IDS.filter((b) => checks[b])
}

/** Badges earned now that weren't held before. */
export function evaluate(p: P, totalLessons: number, today?: string): BadgeId[] {
  return qualifies(p, totalLessons, today).filter((b) => !p.badges.includes(b))
}
