import { evaluate } from '../engine/badges'
import { lessons } from '../content/lessons'
import { useProgress } from './progress'

/** Checks the current progress, awards any new badges, and returns them. */
export function awardNewBadges(): string[] {
  const s = useProgress.getState()
  const fresh = evaluate(s, lessons.length)
  if (fresh.length) s.awardBadges(fresh)
  return fresh
}
