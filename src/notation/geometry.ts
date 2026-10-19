import { isBlackKey, whiteIndex } from '../engine/notes'

export interface KeyRect {
  midi: number
  x: number
  w: number
  black: boolean
}

export const BLACK_RATIO = 0.6

/** Snap a range outward so it starts and ends on white keys. */
export function snapRange(low: number, high: number): [number, number] {
  return [isBlackKey(low) ? low - 1 : low, isBlackKey(high) ? high + 1 : high]
}

export function whiteCount(low: number, high: number): number {
  return whiteIndex(high) - whiteIndex(low) + 1
}

/** x/width of every key in [low, high] for a keyboard `width` pixels wide. Shared by Keyboard and Lane. */
export function keyGeometry(low: number, high: number, width: number): KeyRect[] {
  const ww = width / whiteCount(low, high)
  const bw = ww * BLACK_RATIO
  const base = whiteIndex(low)
  const out: KeyRect[] = []
  for (let m = low; m <= high; m++) {
    if (isBlackKey(m)) out.push({ midi: m, x: (whiteIndex(m) - base) * ww - bw / 2, w: bw, black: true })
    else out.push({ midi: m, x: (whiteIndex(m) - base) * ww, w: ww, black: false })
  }
  return out
}

/**
 * Picks the visible window: the full [low, high] if keys fit at `minKeyWidth`,
 * otherwise as many whole octaves as fit, positioned to include `focus` notes.
 */
export function visibleWindow(low: number, high: number, width: number, minKeyWidth: number, start?: number): [number, number] {
  const [lo, hi] = snapRange(low, high)
  const fit = Math.max(8, Math.floor(width / minKeyWidth))
  if (whiteCount(lo, hi) <= fit) return [lo, hi]
  // Count whites forward from `start` (or `lo`) until the window is full.
  let s = snapRange(Math.max(lo, Math.min(start ?? lo, hi)), hi)[0]
  let e = s
  let whites = 1
  while (whites < fit && e < hi) {
    e++
    if (!isBlackKey(e)) whites++
  }
  // If we ran into `hi`, extend backwards instead.
  while (whites < fit && s > lo) {
    s--
    if (!isBlackKey(s)) whites++
  }
  return [s, e]
}
