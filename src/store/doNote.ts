import { useEffect } from 'react'
import { create } from 'zustand'
import { letterOf, type Letter } from '../engine/notes'
import { bus } from '../input/bus'

/** How long Do keeps a played note's color before going back to red (C). */
export const DO_RESET_MS = 3000

interface DoNoteState {
  letter: Letter
  /** The note being asked for, which Do returns to; C when nothing is asked. */
  held: Letter
  /** Show a note briefly (a key was played); returns to the held note after 3 s. */
  pulse: (letter: Letter) => void
  /** Hold a note's color (the note the learner is asked for). */
  set: (letter: Letter) => void
  /** Stop holding; back to red C. */
  release: () => void
}

let timer: ReturnType<typeof setTimeout> | undefined

export const useDoNote = create<DoNoteState>()((setState, get) => ({
  letter: 'C',
  held: 'C',
  pulse: (letter) => {
    clearTimeout(timer)
    setState({ letter })
    timer = setTimeout(() => setState({ letter: get().held }), DO_RESET_MS)
  },
  set: (letter) => {
    clearTimeout(timer)
    setState({ letter, held: letter })
  },
  release: () => {
    clearTimeout(timer)
    setState({ letter: 'C', held: 'C' })
  },
}))

/** Do takes the color of every note played, from any input. */
export function installDoNoteFollower(): () => void {
  return bus.subscribe((e) => {
    if (e.kind === 'on') useDoNote.getState().pulse(letterOf(e.midi))
  })
}

/** While a page asks for a note, Do wears its color; released when the page closes. */
export function useHeldDoNote(midi: number | null | undefined): void {
  useEffect(() => {
    if (midi !== null && midi !== undefined) useDoNote.getState().set(letterOf(midi))
  }, [midi])
  useEffect(() => () => useDoNote.getState().release(), [])
}
