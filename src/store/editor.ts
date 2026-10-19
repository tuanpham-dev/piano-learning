import { create } from 'zustand'
import type { Draft } from '../engine/song-text'

export type Length = 'w' | 'h' | 'q' | 'e' | 's'
export type EditHand = 'R' | 'L'

export interface EditorCursor {
  hand: EditHand
  /** 0-based bar. */
  bar: number
  /** Token position inside the bar (0 = before the first note). */
  index: number
}

export interface AiActivity {
  at: number
  tool: string
  summary: string
  ok: boolean
}

interface EditorState {
  draft: Draft | null
  /** The My song this draft was opened from or saved as; null until first saved. */
  songId: string | null
  dirty: boolean
  history: Draft[]
  future: Draft[]
  cursor: EditorCursor
  length: Length
  dot: boolean
  finger: number | null
  activity: AiActivity[]
  open: (draft: Draft, songId: string | null) => void
  /** Replace the draft as one undoable step. */
  apply: (draft: Draft) => void
  undo: () => void
  redo: () => void
  setCursor: (c: Partial<EditorCursor>) => void
  setLength: (l: Length) => void
  setDot: (d: boolean) => void
  setFinger: (f: number | null) => void
  markSaved: (songId: string) => void
  log: (a: Omit<AiActivity, 'at'>) => void
  close: () => void
}

const HISTORY_LIMIT = 200

export const useEditor = create<EditorState>()((set, get) => ({
  draft: null,
  songId: null,
  dirty: false,
  history: [],
  future: [],
  cursor: { hand: 'R', bar: 0, index: 0 },
  length: 'q',
  dot: false,
  finger: null,
  activity: [],
  open: (draft, songId) => set({ draft, songId, dirty: false, history: [], future: [], cursor: { hand: 'R', bar: 0, index: 0 }, activity: [] }),
  apply: (draft) => {
    const cur = get().draft
    set({ draft, dirty: true, history: cur ? [...get().history, cur].slice(-HISTORY_LIMIT) : get().history, future: [] })
  },
  undo: () => {
    const { history, draft, future } = get()
    const prev = history[history.length - 1]
    if (!prev || !draft) return
    set({ draft: prev, history: history.slice(0, -1), future: [draft, ...future], dirty: true })
  },
  redo: () => {
    const { history, draft, future } = get()
    const next = future[0]
    if (!next || !draft) return
    set({ draft: next, history: [...history, draft], future: future.slice(1), dirty: true })
  },
  setCursor: (c) => set({ cursor: { ...get().cursor, ...c } }),
  setLength: (length) => set({ length }),
  setDot: (dot) => set({ dot }),
  setFinger: (finger) => set({ finger }),
  markSaved: (songId) => set({ songId, dirty: false }),
  log: (a) => set({ activity: [{ ...a, at: Date.now() }, ...get().activity].slice(0, 50) }),
  close: () => set({ draft: null, songId: null, dirty: false, history: [], future: [] }),
}))
