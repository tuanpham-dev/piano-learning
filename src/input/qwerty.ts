import { create } from 'zustand'
import { emitNote, bus } from './bus'

/** Home row = white keys, row above = sharps: A W S E D F T G Y H U J K O L P ; → C … F (R8). */
export const QWERTY_LAYOUT: { code: string; label: string; offset: number }[] = [
  { code: 'KeyA', label: 'A', offset: 0 },
  { code: 'KeyW', label: 'W', offset: 1 },
  { code: 'KeyS', label: 'S', offset: 2 },
  { code: 'KeyE', label: 'E', offset: 3 },
  { code: 'KeyD', label: 'D', offset: 4 },
  { code: 'KeyF', label: 'F', offset: 5 },
  { code: 'KeyT', label: 'T', offset: 6 },
  { code: 'KeyG', label: 'G', offset: 7 },
  { code: 'KeyY', label: 'Y', offset: 8 },
  { code: 'KeyH', label: 'H', offset: 9 },
  { code: 'KeyU', label: 'U', offset: 10 },
  { code: 'KeyJ', label: 'J', offset: 11 },
  { code: 'KeyK', label: 'K', offset: 12 },
  { code: 'KeyO', label: 'O', offset: 13 },
  { code: 'KeyL', label: 'L', offset: 14 },
  { code: 'KeyP', label: 'P', offset: 15 },
  { code: 'Semicolon', label: ';', offset: 16 },
]

const BY_CODE = new Map(QWERTY_LAYOUT.map((k) => [k.code, k]))

interface QwertyState {
  octave: number
  shift: (d: number) => void
}

export const useQwerty = create<QwertyState>()((set) => ({
  octave: 4,
  shift: (d) => set((s) => ({ octave: Math.max(1, Math.min(7, s.octave + d)) })),
}))

export function qwertyBase(octave = useQwerty.getState().octave): number {
  return (octave + 1) * 12
}

/** midi → key label for the current octave, so the keyboard can draw the mapping. */
export function qwertyLabels(octave = useQwerty.getState().octave): Map<number, string> {
  const base = qwertyBase(octave)
  return new Map(QWERTY_LAYOUT.map((k) => [base + k.offset, k.label]))
}

function isTyping(target: EventTarget | null): boolean {
  const el = target as HTMLElement | null
  if (!el) return false
  return el.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(el.tagName)
}

/** Starts listening; returns a stop function. `tapOnSpace` makes space a rhythm tap instead of sustain. */
export function startQwerty(opts: { tapOnSpace?: boolean } = {}): () => void {
  const down = new Map<string, number>()
  const onDown = (e: KeyboardEvent) => {
    if (e.repeat || e.metaKey || e.ctrlKey || e.altKey || isTyping(e.target)) return
    if (e.code === 'KeyZ' || e.code === 'KeyX') {
      useQwerty.getState().shift(e.code === 'KeyZ' ? -1 : 1)
      e.preventDefault()
      return
    }
    if (e.code === 'Space') {
      e.preventDefault()
      if (opts.tapOnSpace) emitNote('tap', 0, 'qwerty')
      else bus.sustain(true)
      return
    }
    const k = BY_CODE.get(e.code)
    if (!k) return
    e.preventDefault()
    const midi = qwertyBase() + k.offset
    down.set(e.code, midi)
    emitNote('on', midi, 'qwerty', 90)
  }
  const onUp = (e: KeyboardEvent) => {
    if (e.code === 'Space') {
      if (!opts.tapOnSpace) bus.sustain(false)
      return
    }
    const midi = down.get(e.code)
    if (midi === undefined) return
    down.delete(e.code)
    emitNote('off', midi, 'qwerty', 0)
  }
  const onBlur = () => {
    for (const midi of down.values()) emitNote('off', midi, 'qwerty', 0)
    down.clear()
    bus.sustain(false)
  }
  window.addEventListener('keydown', onDown)
  window.addEventListener('keyup', onUp)
  window.addEventListener('blur', onBlur)
  return () => {
    onBlur()
    window.removeEventListener('keydown', onDown)
    window.removeEventListener('keyup', onUp)
    window.removeEventListener('blur', onBlur)
  }
}
