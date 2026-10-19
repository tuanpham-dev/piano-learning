import { useEffect } from 'react'
import { bus } from '../input/bus'
import { todayISO } from '../engine/notes'
import { useProgress, type ModeKey } from '../store/progress'

/** Whether a minute should count: some note or tap within the last 60 s (R17, idle tabs don't count). */
export function isActiveMinute(lastActivityAt: number, now: number): boolean {
  return lastActivityAt > 0 && now - lastActivityAt <= 60_000
}

/** Counts practice minutes on a playing screen and marks the mode as tried. */
export function usePracticeClock(mode: ModeKey): void {
  useEffect(() => {
    useProgress.getState().markModeTried(mode)
    let elapsed = 0
    const id = setInterval(() => {
      if (document.hidden || !isActiveMinute(bus.lastActivityAt, Date.now())) return
      elapsed += 5
      if (elapsed >= 60) {
        elapsed -= 60
        useProgress.getState().addMinutes(todayISO(), 1)
      }
    }, 5000)
    return () => clearInterval(id)
  }, [mode])
}
