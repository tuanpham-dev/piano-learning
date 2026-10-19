import { useCallback, useEffect, useRef, useState } from 'react'
import { notesFor, type Song } from '../engine/song'
import { Scheduler } from '../audio/scheduler'
import { noteOn, allNotesOff } from '../audio/sampler'
import { ensureRunning, getAudioContext } from '../audio/context'

/** Plays a whole song (both hands) from a beat, for the review screen and the editor. */
export function useSongPlayer(song: Song | null) {
  const scheduler = useRef(new Scheduler())
  const run = useRef<{ t0: number; from: number; spb: number; end: number } | null>(null)
  const [playing, setPlaying] = useState(false)

  const stop = useCallback(() => {
    scheduler.current.clear()
    allNotesOff()
    run.current = null
    setPlaying(false)
  }, [])

  const play = useCallback(
    (fromBeat = 0, toBeat = Infinity) => {
      if (!song || !ensureRunning()) return
      stop()
      const spb = 60 / song.bpm
      const t0 = getAudioContext().currentTime + 0.12
      const notes = notesFor(song, 'LR').filter((n) => n.startBeat >= fromBeat - 1e-6 && n.startBeat < toBeat - 1e-6)
      const end = Math.min(toBeat, Math.max(fromBeat, ...notes.map((n) => n.startBeat + n.beats)))
      for (const n of notes) scheduler.current.at(t0 + (n.startBeat - fromBeat) * spb, (t) => noteOn(n.midi, n.hand === 'R' ? 85 : 65, t, Math.min(n.beats, toBeat - n.startBeat) * spb))
      scheduler.current.ui(t0 + (end - fromBeat) * spb + 0.2, () => {
        run.current = null
        setPlaying(false)
      })
      run.current = { t0, from: fromBeat, spb, end }
      setPlaying(true)
    },
    [song, stop],
  )

  /** Current beat while playing (for the staff cursor), else the last start beat. */
  const cursor = useCallback(() => {
    const r = run.current
    if (!r) return -1
    return Math.min(r.end, r.from + Math.max(0, getAudioContext().currentTime - r.t0) / r.spb)
  }, [])

  useEffect(() => stop, [stop, song])
  return { play, stop, playing, cursor }
}
