import { get, set, del } from 'idb-keyval'

/**
 * Storage: IndexedDB is the main store; every write is also mirrored synchronously to
 * localStorage so a write made just before the page closes survives. Load takes the newer copy.
 * When both fail (private windows), state lives in memory and the UI shows a banner.
 */

let unavailable = false
const memory = new Map<string, unknown>()

interface Stamped {
  savedAt: number
  value: unknown
}

export function storageUnavailable(): boolean {
  return unavailable
}

function mirrorWrite(key: string, rec: Stamped): boolean {
  try {
    localStorage.setItem(key, JSON.stringify(rec))
    return true
  } catch {
    return false
  }
}

function mirrorRead(key: string): Stamped | undefined {
  try {
    const raw = localStorage.getItem(key)
    return raw ? (JSON.parse(raw) as Stamped) : undefined
  } catch {
    return undefined
  }
}

function isStamped(v: unknown): v is Stamped {
  return !!v && typeof v === 'object' && 'savedAt' in v && 'value' in v
}

export async function load<T>(key: string): Promise<T | undefined> {
  const mirror = mirrorRead(key)
  let idb: Stamped | undefined
  if (!unavailable) {
    try {
      const raw = await get(key)
      // Older records were stored unwrapped.
      idb = raw === undefined ? undefined : isStamped(raw) ? raw : { savedAt: 0, value: raw }
    } catch {
      unavailable = !mirror && !mirrorWrite('__probe', { savedAt: 0, value: 0 })
    }
  }
  const best = [idb, mirror].filter(Boolean).sort((a, b) => b!.savedAt - a!.savedAt)[0]
  return (best?.value ?? memory.get(key)) as T | undefined
}

export async function save(key: string, value: unknown): Promise<void> {
  memory.set(key, value)
  const rec: Stamped = { savedAt: Date.now(), value }
  const mirrored = mirrorWrite(key, rec)
  if (unavailable) return
  try {
    await set(key, rec)
  } catch {
    unavailable = !mirrored
  }
}

export async function remove(key: string): Promise<void> {
  memory.delete(key)
  try {
    localStorage.removeItem(key)
  } catch {
    /* ignore */
  }
  if (unavailable) return
  try {
    await del(key)
  } catch {
    /* ignore */
  }
}

/** Debounced writer: coalesces bursts of updates; flushes when the page is hidden or closed. */
export function debouncedSaver(key: string, ms = 250): (value: unknown) => void {
  let timer: ReturnType<typeof setTimeout> | undefined
  let pending: unknown
  let dirty = false
  const flush = () => {
    if (!dirty) return
    dirty = false
    clearTimeout(timer)
    void save(key, pending)
  }
  if (typeof window !== 'undefined') {
    window.addEventListener('pagehide', flush)
    document.addEventListener('visibilitychange', () => document.visibilityState === 'hidden' && flush())
  }
  return (value) => {
    pending = value
    dirty = true
    clearTimeout(timer)
    timer = setTimeout(flush, ms)
  }
}
