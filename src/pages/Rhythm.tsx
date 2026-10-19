import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Icon } from '../components/Icon'
import { Page } from '../app/Layout'
import { useT } from '../app/i18n'
import { NARROW_WRAP as narrowWrap } from '../components/BottomSheet'
import { RhythmStaff, type RhythmItem } from '../notation/Staff'
import { InputPanel } from '../components/InputPanel'
import { Segmented } from '../components/Segmented'
import { Button, PrimaryButton } from '../components/PrimaryButton'
import { Mascot } from '../components/Mascot'
import { RoundSummary } from '../components/RoundSummary'
import { useInputs } from '../input/useInputs'
import { bus, emitNote, audioNow } from '../input/bus'
import { registerScript } from '../input/virtual-midi'
import { gridFor, makePattern, scoreTaps, type RhythmLevel, type RhythmNote, type TapScore } from '../engine/rhythm'
import { starsForAccuracy } from '../engine/drills'
import { playClick } from '../audio/metronome'
import { noteOn } from '../audio/sampler'
import { ensureRunning } from '../audio/context'
import { Scheduler } from '../audio/scheduler'
import { useProgress } from '../store/progress'
import { awardNewBadges } from '../store/badges'
import { usePracticeClock } from '../hooks/usePracticeClock'
import { useLessonRun, LessonBanner } from '../hooks/useLessonRun'
import { cssVar } from '../notation/note-colors'

type Phase = 'idle' | 'countIn' | 'tapping' | 'done'
const COUNT_IN = 4

export function RhythmPage() {
  const { t, tm, kid } = useT()
  usePracticeClock('rhythm')
  useInputs({ tapOnSpace: true })
  const lessonRun = useLessonRun()
  const lessonEx = lessonRun.lesson?.exercise.kind === 'rhythm' ? lessonRun.lesson.exercise : undefined
  const [bpm, setBpm] = useState(lessonEx?.bpm ?? 80)
  const [level, setLevel] = useState<RhythmLevel>(lessonEx?.level ?? 1)
  const [pattern, setPattern] = useState<RhythmNote[]>(() => makePattern(lessonEx?.level ?? 1, Math.random))
  const [phase, setPhase] = useState<Phase>('idle')
  const [count, setCount] = useState(0)
  const [score, setScore] = useState<TapScore | null>(null)
  const [newBadges, setNewBadges] = useState<string[]>([])
  const [beatFlash, setBeatFlash] = useState(-1)
  const taps = useRef<number[]>([])
  const run = useRef<{ start: number; end: number; onsets: number[] } | null>(null)
  const scheduler = useRef(new Scheduler())
  const spb = 60 / bpm
  const totalBeats = pattern.reduce((a, n) => a + n.beats, 0)

  useEffect(() => () => scheduler.current.clear(), [])

  const newPattern = (lv = level) => {
    setPattern(makePattern(lv, Math.random))
    setScore(null)
    setPhase('idle')
  }

  const finish = useCallback(() => {
    const r = run.current
    if (!r) return
    const s = scoreTaps(r.onsets, taps.current, undefined, spb)
    setScore(s)
    setPhase('done')
    run.current = null
    const matched = s.marks.filter((m) => m !== 'missed').length
    useProgress.getState().recordDrill('rhythm', { attempts: r.onsets.length, correct: matched, totalMs: Math.abs(s.avgOffsetMs) * r.onsets.length })
    setNewBadges(awardNewBadges())
    lessonRun.report({ percent: s.hitPercent })
  }, [spb, lessonRun])

  /** Starts a run; returns the audio time of the first onset so scripts can tap exactly. */
  const start = useCallback((): number | null => {
    if (!ensureRunning()) return null
    scheduler.current.clear()
    taps.current = []
    setScore(null)
    lessonRun.reset()
    const t0 = audioNow() + 0.2
    const patStart = t0 + COUNT_IN * spb
    const onsets = gridFor(pattern, bpm, patStart)
    const end = patStart + totalBeats * spb
    run.current = { start: patStart, end, onsets }
    setPhase('countIn')
    const beats = COUNT_IN + totalBeats
    for (let i = 0; i < beats; i++) {
      const at = t0 + i * spb
      const counting = i < COUNT_IN
      scheduler.current.at(at, (tt) => playClick(tt, i % 4 === 0 ? 'strong' : 'weak'))
      scheduler.current.ui(at, () => {
        setBeatFlash(i % 4)
        if (counting) setCount(i + 1)
        if (i === COUNT_IN) setPhase('tapping')
      })
    }
    scheduler.current.ui(end + spb * 0.6, finish)
    return patStart
  }, [pattern, bpm, spb, totalBeats, finish, lessonRun])

  const hear = () => {
    if (!ensureRunning()) return
    scheduler.current.clear()
    const t0 = audioNow() + 0.15
    for (const o of gridFor(pattern, bpm, t0)) scheduler.current.at(o, (tt) => noteOn(84, 100, tt, 0.15))
  }

  // Taps from any key, the space bar, MIDI or the pad.
  const live = useRef({ phase })
  live.current = { phase }
  useEffect(
    () =>
      bus.subscribe((e) => {
        if ((e.kind !== 'on' && e.kind !== 'tap') || !run.current) return
        const r = run.current
        if (e.time < r.start - spb / 2 || e.time > r.end + spb / 2) return
        taps.current.push(e.time)
        if (e.kind === 'tap') playClick(audioNow(), 'medium')
      }),
    [spb],
  )

  // Ready-made Virtual MIDI scripts for A19.
  useEffect(() => {
    const make = (offsetMs: number) => () => {
      const patStart = start()
      if (patStart === null) return []
      const base = audioNow() + 0.05
      return gridFor(pattern, bpm, patStart).map((o) => ({ t: o - base + offsetMs / 1000, midi: 60, dur: 0.1 }))
    }
    const a = registerScript({ id: 'rhythm-exact', label: 'Tap on the beat', build: make(0) })
    const b = registerScript({ id: 'rhythm-late', label: 'Tap 120 ms late', build: make(120) })
    return () => {
      a()
      b()
    }
  }, [start, pattern, bpm])

  const items: RhythmItem[] = useMemo(() => {
    const ok = cssVar('--color-ok')
    const bad = cssVar('--color-accent')
    const warn = cssVar('--color-warn')
    let k = 0
    return pattern.map((n) => {
      if (n.rest) return { beats: n.beats, rest: true }
      const mark = score?.marks[k++]
      return { beats: n.beats, color: mark === 'hit' ? ok : mark === 'missed' ? bad : mark ? warn : undefined }
    })
  }, [pattern, score])

  const stars = score ? starsForAccuracy(score.hitPercent) : 0
  const timing = score
    ? Math.abs(score.avgOffsetMs) < 15
      ? t('result.offsetOn')
      : score.avgOffsetMs > 0
        ? t('result.offsetLate', { ms: score.avgOffsetMs })
        : t('result.offsetEarly', { ms: -score.avgOffsetMs })
    : ''

  return (
    <Page title={tm('modes.rhythm')} fill>
      <div className="flex flex-col gap-3 py-3 flex-1">
        {lessonRun.lesson && <LessonBanner run={lessonRun} onRetry={() => start()} />}
        {!kid && <h1 className="text-2xl font-bold">{t('modes.rhythm')}</h1>}
        {!lessonEx && (phase === 'idle' || phase === 'done') && (
          <div className="flex flex-wrap items-center gap-3">
            {!kid && (
              <label className="inline-flex items-center gap-2 text-sm" htmlFor="rh-bpm">
                {t('rhythm.tempo')}
                <input
                  id="rh-bpm"
                  type="range"
                  min={50}
                  max={140}
                  step={5}
                  value={bpm}
                  onChange={(e) => setBpm(Number(e.target.value))}
                  className="w-28 accent-[var(--color-accent)]"
                />
                <span className="tabular w-16">{bpm} BPM</span>
              </label>
            )}
            <Segmented<'1' | '2' | '3'>
              id="rh-level"
              value={String(level) as '1' | '2' | '3'}
              onChange={(v) => {
                const lv = Number(v) as RhythmLevel
                setLevel(lv)
                newPattern(lv)
              }}
              options={(kid ? (['1', '2'] as const) : (['1', '2', '3'] as const)).map((n) => ({ value: n, label: t('rhythm.level', { n }) }))}
            />
            <Button onClick={() => newPattern()}>↻ {t('rhythm.again')}</Button>
          </div>
        )}
        <div className="flex flex-wrap items-center gap-4 min-h-16">
          {kid && <Mascot mood={phase === 'done' ? (stars ? 'cheering' : 'thinking') : 'idle'} size={72} />}
          <div className="flex-1 min-w-0 text-lg font-semibold" aria-live="polite">
            {phase === 'idle' && <span className="text-muted font-normal">{kid ? t('kid.rhythm.idle') : t('rhythm.idle')}</span>}
            {phase === 'countIn' && t('rhythm.countIn', { n: count })}
            {phase === 'tapping' && (kid ? t('kid.rhythm.go') : t('rhythm.go'))}
          </div>
          {phase === 'idle' && (
            <>
              <Button onClick={hear}>
                <Icon name="speaker" /> {t('rhythm.listen')}
              </Button>
              <PrimaryButton onClick={() => start()}>{kid ? t('kid.rhythm.start') : t('rhythm.start')} ▶</PrimaryButton>
            </>
          )}
          <span className="flex gap-1.5" aria-hidden>
            {[0, 1, 2, 3].map((i) => (
              <span
                key={`${i}-${beatFlash === i ? count : 'x'}`}
                className="size-3 rounded-full"
                style={{
                  background: (phase === 'countIn' || phase === 'tapping') && beatFlash === i ? (i === 0 ? 'var(--color-accent)' : 'var(--color-fg)') : 'var(--color-line)',
                  animation: beatFlash === i && phase !== 'idle' && phase !== 'done' ? 'beat-flash .4s ease-out forwards' : undefined,
                }}
              />
            ))}
          </span>
        </div>
        <div className="mx-auto w-full max-w-2xl">
          <RhythmStaff items={items} timeSig={[4, 4]} kid={kid} />
        </div>
        {phase === 'done' && score && !(kid && lessonRun.lesson) && (
          <RoundSummary
            stars={stars}
            kidTitle={t('kid.rhythm.done')}
            adultLines={<span className="font-semibold">{t('rhythm.summary', { pct: score.hitPercent, timing })}</span>}
            newBadges={newBadges}
            onAgain={() => start()}
            againLabel={t('rhythm.retry')}
          />
        )}
        <div className="flex-1" />
        <button
          type="button"
          data-testid="tap-pad"
          onPointerDown={(e) => {
            e.preventDefault()
            emitNote('tap', 0, 'screen')
          }}
          className={`grid place-items-center rounded-[var(--radius)] border-4 border-dashed select-none font-extrabold active:scale-[.98] transition-transform ${kid ? 'lifted h-44 text-2xl bg-surface' : 'h-32 text-lg border-line bg-panel/60'}`}
          style={{ touchAction: 'none' }}
        >
          {kid ? (
            <span className="grid justify-items-center gap-2">
              <Icon name="drum" size={56} /> {t('kid.rhythm.tapPad')}
            </span>
          ) : (
            t('rhythm.tapPad')
          )}
        </button>
      </div>
      <div className={kid ? 'py-2' : narrowWrap}>
        <InputPanel tapOnSpace />
      </div>
    </Page>
  )
}
