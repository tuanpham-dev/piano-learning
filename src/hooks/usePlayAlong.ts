import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { PlayAlong, type NoteState, type PlayMode, type PlayStatus } from '../engine/playalong'
import { notesFor, beatsPerBar, songDuration, type Song, type TimedNote } from '../engine/song'
import { starsFor, type PerformanceScore } from '../engine/scoring'
import { bus } from '../input/bus'
import { getAudioContext, ensureRunning } from '../audio/context'
import { noteOn, allNotesOff } from '../audio/sampler'
import { playClick, accentFor, type TimeSigName } from '../audio/metronome'
import { Scheduler } from '../audio/scheduler'
import { registerScript } from '../input/virtual-midi'
import { useProgress, type Hands } from '../store/progress'
import { awardNewBadges } from '../store/badges'

export interface PlayAlongOptions {
  song: Song
  hands: Hands
  mode: PlayMode
  tempoPct: number
  bars?: [number, number]
  loop?: boolean
}

export interface PlayResult {
  mode: PlayMode
  score?: PerformanceScore
  stars: number
  newBest: boolean
  firstTime: boolean
  missedBars: number[]
  newBadges: string[]
}

export interface Snapshot {
  status: PlayStatus | 'listening'
  /** Cursor for the staff, quantized to an eighth so the SVG doesn't redraw every frame. */
  staffBeat: number
  due: TimedNote[]
  states: NoteState[]
  wrong: number | null
}

function now(): number {
  try {
    return getAudioContext().currentTime
  } catch {
    return 0
  }
}

export function usePlayAlong(opts: PlayAlongOptions) {
  const { song, hands, mode, tempoPct, bars, loop } = opts
  const barsKey = bars ? `${bars[0]}-${bars[1]}` : 'all'
  const engine = useMemo(
    () => new PlayAlong({ song, hands, mode, tempoPct, bars, loop }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [song, hands, mode, tempoPct, barsKey, loop],
  )
  const engineRef = useRef(engine)
  engineRef.current = engine
  if (import.meta.env.DEV) (window as unknown as { __pa: PlayAlong }).__pa = engine
  const scheduler = useRef(new Scheduler())
  const listen = useRef<{ anchorTime: number; anchorBeat: number; spb: number; end: number } | null>(null)
  const [snap, setSnap] = useState<Snapshot>({ status: 'idle', staffBeat: engine.startBeat, due: [], states: engine.states.slice(), wrong: null })
  const [result, setResult] = useState<PlayResult | null>(null)
  const wrongTimer = useRef<ReturnType<typeof setTimeout>>()
  const lastSig = useRef('')

  const allNotes = useMemo(() => notesFor(song, 'LR'), [song])

  const cursor = useCallback((): number => {
    const l = listen.current
    if (l) return l.anchorBeat + (now() - l.anchorTime) / l.spb
    return engineRef.current.cursor
  }, [])

  const publish = useCallback((wrong: number | null = null, force = false) => {
    const e = engineRef.current
    const l = listen.current
    const beat = l ? cursor() : e.cursor
    const staffBeat = Math.floor(Math.max(beat, e.startBeat) * 2) / 2
    const due = e.dueIndices().map((i) => e.notes[i]!)
    const status = l ? 'listening' : e.status
    const sig = `${status}|${staffBeat}|${due.map((d) => d.midi + '@' + d.startBeat).join(',')}|${e.states.join('')}|${wrong}`
    if (!force && sig === lastSig.current) return
    lastSig.current = sig
    setSnap({ status, staffBeat, due, states: e.states.slice(), wrong })
  }, [cursor])

  const stop = useCallback(() => {
    scheduler.current.clear()
    listen.current = null
    allNotesOff()
    engineRef.current.status = 'idle'
    engineRef.current.cursor = engineRef.current.startBeat
    publish(null, true)
  }, [publish])

  // New engine → reset view.
  useEffect(() => {
    scheduler.current.clear()
    listen.current = null
    setResult(null)
    publish(null, true)
    return () => scheduler.current.clear()
  }, [engine, publish])

  const finish = useCallback(
    (score?: PerformanceScore) => {
      const e = engineRef.current
      const store = useProgress.getState()
      let r: PlayResult
      if (e.cfg.mode === 'perform' && score) {
        const stars = starsFor(score.percent)
        const { newBest, firstTime } = store.recordSongResult({ songId: song.id, hands, tempoPct, percent: score.percent, stars })
        r = { mode: 'perform', score, stars, newBest, firstTime, missedBars: e.missedBars(), newBadges: [] }
      } else {
        const { firstTime } = store.recordWaitCompletion(song.id)
        r = { mode: 'wait', stars: firstTime ? 1 : 0, newBest: false, firstTime, missedBars: [], newBadges: [] }
      }
      r.newBadges = awardNewBadges()
      setResult(r)
    },
    [song.id, hands, tempoPct],
  )

  // Main loop.
  useEffect(() => {
    let raf = 0
    const loopFn = () => {
      const e = engineRef.current
      const l = listen.current
      if (l) {
        if (cursor() >= l.end) {
          listen.current = null
          e.cursor = e.startBeat
        }
        publish()
      } else if (e.status !== 'idle' && e.status !== 'done') {
        const ev = e.tick(now())
        if (e.cfg.mode === 'wait' && ev.accompaniment?.length) {
          for (const n of ev.accompaniment) noteOn(n.midi, 70, undefined, n.beats * e.spb)
        }
        if (ev.looped && e.cfg.mode === 'perform') scheduleAccompaniment()
        if (ev.finished) finish(ev.finished.score)
        publish()
      }
      raf = requestAnimationFrame(loopFn)
    }
    raf = requestAnimationFrame(loopFn)
    return () => cancelAnimationFrame(raf)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [engine, publish, finish, cursor])

  const scheduleAccompaniment = useCallback(() => {
    const e = engineRef.current
    for (const n of e.other) {
      const t = e.timeOf(n.startBeat)
      scheduler.current.at(t, (tt) => noteOn(n.midi, 70, tt, n.beats * e.spb))
    }
  }, [])

  // Input.
  useEffect(
    () =>
      bus.subscribe((ev) => {
        if (listen.current) return
        const e = engineRef.current
        if (ev.kind !== 'on') return
        const out = e.input({ kind: ev.kind, midi: ev.midi, time: ev.time || now() })
        if (e.cfg.mode === 'wait' && out.accompaniment?.length) {
          for (const n of out.accompaniment) noteOn(n.midi, 70, undefined, n.beats * e.spb)
        }
        if (out.wrong !== undefined) {
          clearTimeout(wrongTimer.current)
          publish(out.wrong, true)
          wrongTimer.current = setTimeout(() => publish(null, true), 350)
        } else publish()
      }),
    [publish],
  )

  const start = useCallback(() => {
    if (!ensureRunning()) return
    scheduler.current.clear()
    listen.current = null
    setResult(null)
    const e = engineRef.current
    const t0 = now() + 0.15
    e.start(t0)
    if (e.cfg.mode === 'perform') {
      const sig = `${song.timeSig[0]}/${song.timeSig[1]}` as TimeSigName
      for (let i = 0; i < e.countInBeats; i++) {
        const t = e.timeOf(e.startBeat - e.countInBeats + i)
        scheduler.current.at(t, (tt) => playClick(tt, accentFor(sig, i)))
      }
      scheduleAccompaniment()
    }
    publish(null, true)
  }, [publish, scheduleAccompaniment, song.timeSig])

  const listenAll = useCallback(() => {
    if (!ensureRunning()) return
    scheduler.current.clear()
    const e = engineRef.current
    e.status = 'idle'
    const spb = e.spb
    const t0 = now() + 0.15
    listen.current = { anchorTime: t0, anchorBeat: e.startBeat, spb, end: e.endBeat }
    for (const n of allNotes) {
      if (n.startBeat < e.startBeat - 1e-6 || n.startBeat >= e.endBeat - 1e-6) continue
      const t = t0 + (n.startBeat - e.startBeat) * spb
      scheduler.current.at(t, (tt) => noteOn(n.midi, n.hand === 'R' ? 85 : 65, tt, n.beats * spb))
    }
    publish(null, true)
  }, [allNotes, publish])

  // Ready-made script for the Virtual MIDI panel: plays the selected notes exactly on time.
  useEffect(
    () =>
      registerScript({
        id: 'song-perfect',
        label: 'Play this song perfectly',
        build: () => {
          const e = engineRef.current
          if (e.status === 'idle' || e.status === 'done') start()
          const base = now() + 0.05
          const dur = (n: TimedNote) => Math.max(0.05, n.beats * e.spb * 0.9)
          if (e.cfg.mode === 'perform') return e.notes.map((n) => ({ t: Math.max(0, e.timeOf(n.startBeat) - base), midi: n.midi, dur: dur(n) }))
          // Wait mode: time the remaining notes from the cursor at tempo.
          const from = e.cursor
          return e.notes.flatMap((n, i) =>
            e.states[i] === 'pending' || e.states[i] === 'due' ? [{ t: Math.max(0, (n.startBeat - from) * e.spb) + 0.02, midi: n.midi, dur: dur(n) }] : [],
          )
        },
      }),
    [start],
  )

  useEffect(() => () => allNotesOff(), [])

  return {
    engine,
    snap,
    result,
    allNotes,
    cursor,
    start,
    stop,
    listen: listenAll,
    dismissResult: () => setResult(null),
    beatsPerBar: beatsPerBar(song.timeSig),
    duration: songDuration(song),
  }
}
