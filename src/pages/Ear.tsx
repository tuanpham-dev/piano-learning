import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Icon } from '../components/Icon'
import { Page } from '../app/Layout'
import { useT } from '../app/i18n'
import { NARROW_WRAP as narrowWrap } from '../components/BottomSheet'
import { Keyboard, type KeyMark } from '../notation/Keyboard'
import { InputPanel } from '../components/InputPanel'
import { Segmented } from '../components/Segmented'
import { Button, PrimaryButton } from '../components/PrimaryButton'
import { Mascot, type MascotMood } from '../components/Mascot'
import { RoundSummary } from '../components/RoundSummary'
import { useInputs } from '../input/useInputs'
import { bus } from '../input/bus'
import { checkChoice, checkPlayed, makeQuestion, type ChordQuality, type EarQuestion } from '../engine/ear'
import { starsForAccuracy } from '../engine/drills'
import type { EarType } from '../engine/lessons'
import { playNotes, playSequence } from '../audio/sampler'
import { ensureRunning } from '../audio/context'
import { useProgress } from '../store/progress'
import { awardNewBadges } from '../store/badges'
import { usePracticeClock } from '../hooks/usePracticeClock'
import { useLessonRun, LessonBanner } from '../hooks/useLessonRun'
import { useHeldDoNote } from '../store/doNote'

type Phase = 'idle' | 'running' | 'done'
const BTN_COLORS = ['var(--color-nC)', 'var(--color-nA)', 'var(--color-nF)', 'var(--color-nB)', 'var(--color-nD)', 'var(--color-nG)']

export function EarPage() {
  const { t, tm, kid } = useT()
  usePracticeClock('ear')
  useInputs({ allowMic: true })
  const lessonRun = useLessonRun()
  const lessonEx = lessonRun.lesson?.exercise.kind === 'ear' ? lessonRun.lesson.exercise : undefined
  const [type, setType] = useState<EarType>(lessonEx?.type ?? (kid ? 'melody' : 'interval'))
  const total = lessonEx?.count ?? 10
  const [phase, setPhase] = useState<Phase>('idle')
  const [q, setQ] = useState<EarQuestion | null>(null)
  const [n, setN] = useState(0)
  const [correct, setCorrect] = useState(0)
  const [feedback, setFeedback] = useState<{ ok: boolean } | null>(null)
  const [newBadges, setNewBadges] = useState<string[]>([])
  const played = useRef<{ midi: number; mic: boolean }[]>([])
  const opts = useMemo(() => ({ kid, chordTypes: lessonEx?.chordTypes as ChordQuality[] | undefined }), [kid, lessonEx])

  const playQuestion = useCallback((question: EarQuestion) => {
    if (!ensureRunning()) return
    if (question.type === 'chord') playNotes(question.notes, 1.6)
    else playSequence(question.notes, question.type === 'interval' ? 0.7 : 0.55)
  }, [])

  const ask = useCallback(() => {
    const question = makeQuestion(type, Math.random, opts)
    played.current = []
    setQ(question)
    setFeedback(null)
    playQuestion(question)
  }, [type, opts, playQuestion])

  const start = () => {
    setN(0)
    setCorrect(0)
    setNewBadges([])
    lessonRun.reset()
    setPhase('running')
    ask()
  }

  const answer = useCallback(
    (ok: boolean) => {
      setFeedback({ ok })
      const nextN = n + 1
      const nextCorrect = correct + (ok ? 1 : 0)
      setN(nextN)
      setCorrect(nextCorrect)
      setTimeout(
        () => {
          if (nextN >= total) {
            setPhase('done')
            useProgress.getState().recordDrill(type, { attempts: nextN, correct: nextCorrect, totalMs: 0 })
            setNewBadges(awardNewBadges())
            lessonRun.report({ correct: nextCorrect, of: nextN })
          } else ask()
        },
        ok ? 800 : 1800,
      )
    },
    [n, correct, total, type, ask, lessonRun],
  )

  const live = useRef({ phase, q, feedback, answer })
  live.current = { phase, q, feedback, answer }
  useEffect(
    () =>
      bus.subscribe((e) => {
        const s = live.current
        if (e.kind !== 'on' || s.phase !== 'running' || !s.q || s.feedback) return
        played.current.push({ midi: e.midi, mic: e.source === 'mic' })
        if (played.current.length < s.q.notes.length) return
        const midis = played.current.map((p) => p.midi)
        s.answer(
          checkPlayed(
            s.q,
            midis,
            played.current.some((p) => p.mic),
          ),
        )
      }),
    [],
  )

  useHeldDoNote(phase === 'running' ? q?.notes[0] : null)
  const highlight = useMemo(() => {
    const m = new Map<number, KeyMark>()
    if (!q) return m
    if (feedback) for (const x of q.notes) m.set(x, feedback.ok ? 'hit' : 'show')
    else if (q.type === 'melody' || q.type === 'interval') m.set(q.notes[0]!, 'show')
    return m
  }, [q, feedback])

  const label = (id: string) => {
    if (!q) return id
    if (q.type === 'interval') return t(`ear.i.${id}`)
    return kid && (id === 'maj' || id === 'min') ? t(`kid.ear.q.${id}`) : t(`ear.q.${id}`)
  }
  const prompt = q ? (kid ? t(`kid.ear.prompt${q.type[0]!.toUpperCase()}${q.type.slice(1)}`) : t(`ear.prompt${q.type[0]!.toUpperCase()}${q.type.slice(1)}`)) : ''
  const mood: MascotMood = feedback ? (feedback.ok ? 'cheering' : 'thinking') : 'idle'
  const answerText = q ? (q.type === 'melody' ? q.notes.map((m) => ['C', 'C♯', 'D', 'E♭', 'E', 'F', 'F♯', 'G', 'A♭', 'A', 'B♭', 'B'][m % 12]).join(' ') : label(q.answer)) : ''

  return (
    <Page title={tm('modes.ear')} fill>
      <div className="flex flex-col gap-3 py-3 flex-1">
        {lessonRun.lesson && <LessonBanner run={lessonRun} onRetry={start} />}
        {!kid && <h1 className="text-2xl font-bold">{t('modes.ear')}</h1>}
        {!lessonEx && phase !== 'running' && (
          <Segmented<EarType>
            id="ear-type"
            label={t('ear.type')}
            value={type}
            onChange={setType}
            options={[
              { value: 'interval', label: t('ear.interval') },
              { value: 'chord', label: t('ear.chord') },
              { value: 'melody', label: t('ear.melody') },
            ]}
          />
        )}
        <div className="flex flex-wrap items-center gap-4 min-h-16">
          {kid && <Mascot mood={mood} size={72} key={`${mood}-${n}`} />}
          <div className="flex-1 min-w-0 grid gap-1" aria-live="polite">
            {phase === 'running' && q && (
              <>
                <span className={kid ? 'text-xl font-extrabold' : 'font-semibold'}>
                  {feedback ? (feedback.ok ? (kid ? t('kid.ear.right') : t('ear.right')) : kid ? t('kid.ear.wrong') : t('ear.wrong', { answer: answerText })) : prompt}
                </span>
                <span className="text-sm text-muted tabular">
                  {kid ? `★ ${correct} / ${total}` : `${t('ear.progress', { n: Math.min(total, n + 1), total })} · ${t('drills.correct', { n: correct })}`}
                </span>
              </>
            )}
            {phase === 'idle' && <span className="text-muted">{t('ear.idle')}</span>}
          </div>
          {phase === 'idle' && <PrimaryButton onClick={start}>{kid ? t('kid.ear.start') : t('ear.start')} ▶</PrimaryButton>}
          {phase === 'running' && q && (
            <Button onClick={() => playQuestion(q)} className={kid ? 'text-lg font-extrabold' : ''}>
              <Icon name="speaker" /> {t('ear.playAgain')}
            </Button>
          )}
        </div>
        {import.meta.env.DEV && q && <span hidden data-testid="ear-q" data-notes={q.notes.join(',')} data-answer={q.answer} />}
        {phase === 'running' && q && q.choices.length > 0 && (
          <div className={`grid gap-2 ${kid ? 'grid-cols-2' : 'grid-cols-[repeat(auto-fill,minmax(120px,1fr))]'}`}>
            {q.choices.map((c, i) => (
              <button
                key={c}
                type="button"
                data-choice={c}
                disabled={!!feedback}
                onClick={() => answer(checkChoice(q, c))}
                className={`rounded-[var(--radius)] border min-h-[var(--touch)] px-3 ${kid ? 'border-0 text-white text-xl font-extrabold min-h-16' : 'border-line bg-bg hover:bg-panel'} ${feedback && c === q.answer ? 'ring-4 ring-ok' : ''}`}
                style={kid ? { background: BTN_COLORS[i % BTN_COLORS.length] } : undefined}
              >
                {label(c)}
              </button>
            ))}
          </div>
        )}
        {phase === 'done' && !(kid && lessonRun.lesson) && (
          <RoundSummary
            stars={starsForAccuracy(Math.round((100 * correct) / total))}
            kidTitle={t('kid.ear.done')}
            adultLines={<span className="font-semibold">{t('ear.summary', { correct, total, pct: Math.round((100 * correct) / total) })}</span>}
            newBadges={newBadges}
            onAgain={start}
            againLabel={t('common.playAgain')}
          />
        )}
        <div className="flex-1" />
        <Keyboard low={48} high={84} highlight={highlight} kid={kid} height={kid ? 150 : 130} />
      </div>
      <div className={kid ? 'py-2' : narrowWrap}>
        <InputPanel micAllowed />
      </div>
    </Page>
  )
}
