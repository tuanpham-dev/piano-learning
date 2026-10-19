import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Page } from '../app/Layout'
import { useT } from '../app/i18n'
import { NARROW_WRAP as narrowWrap } from '../components/BottomSheet'
import { NoteStaff } from '../notation/Staff'
import { Keyboard, type KeyMark } from '../notation/Keyboard'
import { InputPanel } from '../components/InputPanel'
import { Segmented } from '../components/Segmented'
import { Button, PrimaryButton } from '../components/PrimaryButton'
import { Mascot, type MascotMood } from '../components/Mascot'
import { RoundSummary } from '../components/RoundSummary'
import { Toggle } from './Settings'
import { useInputs } from '../input/useInputs'
import { bus } from '../input/bus'
import { DrillRound, clefOf, isCorrectAnswer, nextNote, rangeFor, starsForAccuracy, type DrillConfig } from '../engine/drills'
import { prettyName } from '../engine/notes'
import type { Clef } from '../engine/lessons'
import { useProgress } from '../store/progress'
import { awardNewBadges } from '../store/badges'
import { usePracticeClock } from '../hooks/usePracticeClock'
import { useLessonRun, LessonBanner } from '../hooks/useLessonRun'
import { cssVar } from '../notation/note-colors'
import { useHeldDoNote } from '../store/doNote'

type Phase = 'idle' | 'running' | 'done'
interface Feedback {
  ok: boolean
  played: number
}

export function DrillsPage() {
  const { t, tm, kid } = useT()
  usePracticeClock('drills')
  useInputs({ allowMic: true })
  const lessonRun = useLessonRun()
  const noteNames = useProgress((s) => s.settings.noteNames)
  const lessonEx = lessonRun.lesson?.exercise.kind === 'drill' ? lessonRun.lesson.exercise : undefined

  const [clef, setClef] = useState<Clef>(lessonEx?.clef ?? 'treble')
  const [octaves, setOctaves] = useState<1 | 2 | 3>(1)
  const [accidentals, setAccidentals] = useState(false)
  const [count, setCount] = useState(kid ? 10 : 20)
  const cfg: DrillConfig = useMemo(() => {
    if (lessonEx) return { clef: lessonEx.clef, low: lessonEx.low, high: lessonEx.high, accidentals: lessonEx.accidentals, pool: lessonEx.pool }
    const [low, high] = rangeFor(clef, octaves)
    return { clef, low, high, accidentals }
  }, [lessonEx, clef, octaves, accidentals])
  const roundSize = lessonEx?.count ?? (kid ? 10 : count)

  const [phase, setPhase] = useState<Phase>('idle')
  const [target, setTarget] = useState<number | null>(null)
  const [feedback, setFeedback] = useState<Feedback | null>(null)
  const [newBadges, setNewBadges] = useState<string[]>([])
  const round = useRef(new DrillRound(roundSize))
  const perClef = useRef({ treble: { attempts: 0, correct: 0, totalMs: 0 }, bass: { attempts: 0, correct: 0, totalMs: 0 } })
  const shownAt = useRef(0)
  const rng = useRef(Math.random)
  const [, force] = useState(0)

  const showNext = useCallback(
    (prev?: number) => {
      const n = nextNote(cfg, rng.current, prev)
      setTarget(n)
      setFeedback(null)
      shownAt.current = performance.now()
    },
    [cfg],
  )

  const start = () => {
    round.current = new DrillRound(roundSize)
    perClef.current = { treble: { attempts: 0, correct: 0, totalMs: 0 }, bass: { attempts: 0, correct: 0, totalMs: 0 } }
    setNewBadges([])
    lessonRun.reset()
    setPhase('running')
    showNext()
  }

  const finish = useCallback(() => {
    setPhase('done')
    const store = useProgress.getState()
    for (const c of ['treble', 'bass'] as const) {
      const s = perClef.current[c]
      if (s.attempts) store.recordDrill(c, s)
    }
    setNewBadges(awardNewBadges())
    lessonRun.report({ correct: round.current.correct, of: round.current.count })
  }, [lessonRun])

  // Answer handling.
  const stateRef = useRef({ phase, target, feedback, finish, showNext, cfg })
  stateRef.current = { phase, target, feedback, finish, showNext, cfg }
  useEffect(
    () =>
      bus.subscribe((e) => {
        const s = stateRef.current
        if (e.kind !== 'on' || s.phase !== 'running' || s.target === null || s.feedback) return
        const ok = isCorrectAnswer(s.target, e.midi, e.source === 'mic')
        const ms = Math.round(performance.now() - shownAt.current)
        round.current.record({ midi: s.target, correct: ok, ms })
        const bucket = perClef.current[clefOf(s.cfg, s.target)]
        bucket.attempts++
        if (ok) bucket.correct++
        bucket.totalMs += ms
        setFeedback({ ok, played: e.midi })
        force((x) => x + 1)
        const prev = s.target
        setTimeout(
          () => {
            if (round.current.done) stateRef.current.finish()
            else stateRef.current.showNext(prev)
          },
          ok ? 650 : 1500,
        )
      }),
    [],
  )

  const highlight = useMemo(() => {
    const m = new Map<number, KeyMark>()
    if (feedback && target !== null) {
      m.set(target, 'hit')
      if (!feedback.ok) m.set(feedback.played, 'wrong')
    }
    return m
  }, [feedback, target])

  const r = round.current
  useHeldDoNote(phase === 'running' ? target : null)
  const mood: MascotMood = feedback ? (feedback.ok ? 'cheering' : 'thinking') : 'idle'
  const staffClef = target !== null ? clefOf(cfg, target) : cfg.clef === 'bass' ? 'bass' : 'treble'
  const noteColor = feedback ? (feedback.ok ? cssVar('--color-ok') : cssVar('--color-accent')) : undefined
  const kbLow = Math.min(cfg.low, 48)
  const kbHigh = Math.max(cfg.high, 72)

  const settings = !lessonEx && phase !== 'running' && (
    <div className="flex flex-wrap items-center gap-3">
      <Segmented<Clef>
        id="dr-clef"
        label={t('drills.clef')}
        value={clef}
        onChange={setClef}
        options={[{ value: 'treble', label: t('drills.treble') }, { value: 'bass', label: t('drills.bass') }, ...(kid ? [] : [{ value: 'both' as Clef, label: t('drills.both') }])]}
      />
      {!kid && (
        <>
          <Segmented<'1' | '2' | '3'>
            id="dr-oct"
            label={t('drills.range')}
            value={String(octaves) as '1' | '2' | '3'}
            onChange={(v) => setOctaves(Number(v) as 1 | 2 | 3)}
            options={(['1', '2', '3'] as const).map((n) => ({ value: n, label: t('drills.octaves', { n }) }))}
          />
          <label className="inline-flex items-center gap-2 text-sm">
            <Toggle id="dr-acc" checked={accidentals} onChange={setAccidentals} label={t('drills.accidentals')} />
            {t('drills.accidentals')}
          </label>
          <Segmented<'10' | '20' | '50'>
            id="dr-count"
            label={t('drills.round')}
            value={String(count) as '10' | '20' | '50'}
            onChange={(v) => setCount(Number(v))}
            options={(['10', '20', '50'] as const).map((n) => ({ value: n, label: n }))}
          />
        </>
      )}
    </div>
  )

  return (
    <Page title={tm('modes.drills')} fill>
      <div className="flex flex-col gap-3 py-3 flex-1">
        {lessonRun.lesson && <LessonBanner run={lessonRun} onRetry={start} />}
        {!kid && <h1 className="text-2xl font-bold">{t('modes.drills')}</h1>}
        {settings}
        <div className="flex flex-wrap items-center gap-4 min-h-16">
          {kid && <Mascot mood={mood} size={72} key={`${mood}-${r.answers.length}`} />}
          <div className="flex-1 min-w-0 grid gap-1" aria-live="polite">
            {phase === 'running' && (
              <>
                <span className={kid ? 'text-xl font-extrabold' : 'font-semibold'}>
                  {feedback
                    ? feedback.ok
                      ? kid
                        ? t('kid.drills.right', { note: prettyName(target!, { octave: false }) })
                        : t('drills.right')
                      : kid
                        ? t('kid.drills.wrong', { note: prettyName(target!, { octave: false }) })
                        : t('drills.wrong', { played: prettyName(feedback.played), target: prettyName(target!) })
                    : kid
                      ? t('kid.drills.prompt')
                      : t('drills.prompt')}
                </span>
                <span className="text-sm text-muted tabular">
                  {kid
                    ? `★ ${r.correct} / ${r.count}`
                    : `${t('drills.progress', { n: Math.min(r.count, r.answers.length + 1), total: r.count })} · ${t('drills.correct', { n: r.correct })}${r.avgMs ? ' · ' + t('drills.avg', { s: (r.avgMs / 1000).toFixed(1) }) : ''}`}
                </span>
              </>
            )}
            {phase === 'idle' && <span className="text-muted">{t('drills.idle')}</span>}
          </div>
          {phase === 'idle' && <PrimaryButton onClick={start}>{kid ? t('kid.drills.start') : t('drills.start')} ▶</PrimaryButton>}
          {phase === 'running' && !kid && <Button onClick={() => setPhase('idle')}>{t('drills.stop')}</Button>}
        </div>
        {phase === 'done' && !(kid && lessonRun.lesson) && (
          <RoundSummary
            stars={starsForAccuracy(r.accuracy)}
            kidTitle={t('kid.drills.done', { n: r.correct })}
            adultLines={
              <>
                <span className="font-semibold">{t('drills.summary', { correct: r.correct, total: r.count, pct: r.accuracy, s: (r.avgMs / 1000).toFixed(1) })}</span>
                {cfg.clef === 'both' && (
                  <span className="text-sm text-muted">
                    {t('drills.clefStats', {
                      t: `${perClef.current.treble.correct}/${perClef.current.treble.attempts}`,
                      b: `${perClef.current.bass.correct}/${perClef.current.bass.attempts}`,
                    })}
                  </span>
                )}
              </>
            }
            newBadges={newBadges}
            onAgain={start}
            againLabel={t('common.playAgain')}
          />
        )}
        <div className="mx-auto w-full max-w-md">
          <NoteStaff
            clef={staffClef}
            items={target !== null && phase === 'running' ? [{ midis: [target], color: noteColor }] : []}
            kid={kid}
            label={target !== null ? prettyName(target) : undefined}
          />
        </div>
        <div className="flex-1" />
        <Keyboard low={kbLow} high={kbHigh} highlight={highlight} kid={kid} showNames={!kid && noteNames} height={kid ? 150 : 130} />
      </div>
      <div className={kid ? 'py-2' : narrowWrap}>
        <InputPanel micAllowed />
      </div>
    </Page>
  )
}
