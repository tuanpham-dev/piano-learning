import { todayISO } from './notes'

export const STREAK_MIN_MINUTES = 5

function shiftDay(iso: string, delta: number): string {
  const [y, m, d] = iso.split('-').map(Number) as [number, number, number]
  return todayISO(new Date(y, m - 1, d + delta))
}

/**
 * Consecutive days with at least `minMinutes`. Today counts if it already qualifies;
 * if today doesn't qualify yet, the streak ending yesterday is still alive.
 */
export function computeStreak(daily: Record<string, number>, today = todayISO(), minMinutes = STREAK_MIN_MINUTES): number {
  let day = (daily[today] ?? 0) >= minMinutes ? today : shiftDay(today, -1)
  let n = 0
  while ((daily[day] ?? 0) >= minMinutes) {
    n++
    day = shiftDay(day, -1)
  }
  return n
}

export function last7Days(daily: Record<string, number>, today = todayISO()): { date: string; minutes: number }[] {
  const out = []
  for (let i = 6; i >= 0; i--) {
    const date = shiftDay(today, -i)
    out.push({ date, minutes: daily[date] ?? 0 })
  }
  return out
}
