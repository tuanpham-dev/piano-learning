import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Page } from '../app/Layout'
import { useT } from '../app/i18n'
import { lessonById, lessons } from '../content/lessons'
import { isUnlocked, type Lesson } from '../engine/lessons'
import { useProgress } from '../store/progress'
import { awardNewBadges } from '../store/badges'
import { Keyboard, type KeyMark } from '../notation/Keyboard'
import { LessonDiagram, KEYBOARD_DIAGRAMS } from '../components/LessonDiagram'
import { Button, PrimaryButton } from '../components/PrimaryButton'
import { Celebration } from '../components/Celebration'
import { Mascot } from '../components/Mascot'
import { goalText } from '../hooks/useLessonRun'
import { Scheduler } from '../audio/scheduler'
import { noteOn } from '../audio/sampler'
import { ensureRunning } from '../audio/context'
import { audioNow } from '../input/bus'
import { usePracticeClock } from '../hooks/usePracticeClock'

export function exerciseUrl(l: Lesson): string | null {
  const ex = l.exercise
  switch (ex.kind) {
    case 'drill':
      return `/drills?lesson=${l.id}`
    case 'ear':
      return `/ear?lesson=${l.id}`
    case 'rhythm':
      return `/rhythm?lesson=${l.id}`
    case 'song':
      return `/songs/${ex.songId}?lesson=${l.id}&hands=${ex.hands}&mode=${ex.play}`
    case 'none':
      return null
  }
}

export function LessonPage() {
  const { id } = useParams()
  const lesson = id ? lessonById(id) : undefined
  const { t } = useT()
  if (!lesson)
    return (
      <Page title={t('lessons.title')} back="/lessons">
        <p className="text-muted">{t('lessons.notFound')}</p>
      </Page>
    )
  return <LessonView key={lesson.id} lesson={lesson} />
}

function LessonView({ lesson }: { lesson: Lesson }) {
  const { t, L, kid, lang } = useT()
  const nav = useNavigate()
  usePracticeClock('lessons')
  const p = useProgress()
  const open = isUnlocked(lesson, lessons, p)
  const done = p.lessonsDone.includes(lesson.id)
  const [lit, setLit] = useState<number[]>([])
  const [finished, setFinished] = useState<string[] | null>(null)
  const scheduler = useRef(new Scheduler())
  useEffect(() => () => scheduler.current.clear(), [])

  const demoRange = useMemo<[number, number]>(() => {
    const ms = lesson.demo?.notes.map((n) => n.midi) ?? [60, 72]
    return [Math.min(48, ...ms), Math.max(76, ...ms)]
  }, [lesson])

  const showMe = () => {
    if (!lesson.demo || !ensureRunning()) return
    scheduler.current.clear()
    const spb = 60 / (lesson.demoBpm ?? 90)
    const t0 = audioNow() + 0.15
    const byStart = new Map<number, number[]>()
    for (const n of lesson.demo.notes) {
      const at = t0 + n.startBeat * spb
      scheduler.current.at(at, (tt) => noteOn(n.midi, 85, tt, n.beats * spb * 0.95))
      byStart.set(n.startBeat, [...(byStart.get(n.startBeat) ?? []), n.midi])
    }
    for (const [start, midis] of byStart) scheduler.current.ui(t0 + start * spb, () => setLit(midis))
    const end = Math.max(...lesson.demo.notes.map((n) => n.startBeat + n.beats))
    scheduler.current.ui(t0 + end * spb, () => setLit([]))
  }

  const highlight = useMemo(() => new Map<number, KeyMark>(lit.map((m) => [m, 'due'])), [lit])
  const url = exerciseUrl(lesson)
  const next = lessons.find((l) => l.order === lesson.order + 1)
  const body = lesson.body[lang] ?? lesson.body.en

  if (!open)
    return (
      <Page title={L(lesson.title)} back="/lessons">
        <div className="grid justify-items-center gap-4 py-10 text-center">
          {kid && <Mascot mood="sleeping" size={96} />}
          <p className="text-lg">{t('lessons.locked', { n: lesson.order - 1 })}</p>
          <Button onClick={() => nav('/lessons')}>{t('common.back')}</Button>
        </div>
      </Page>
    )

  return (
    <Page title={kid ? t('kid.lessons.island', { n: lesson.order, title: L(lesson.title) }) : `${lesson.order} · ${L(lesson.title)}`} back="/lessons">
      <article className="grid gap-5 max-w-3xl mx-auto pb-6">
        <div className="flex flex-wrap items-center justify-between gap-2 text-sm text-muted">
          <span>{t('lessons.step', { n: lesson.order, total: lessons.length })}</span>
          {done && <span className="text-ok font-semibold">✓ {t('lessons.completed')}</span>}
        </div>
        <div className={`grid gap-3 ${kid ? 'text-xl leading-relaxed' : 'text-lg'}`} data-testid="lesson-body">
          {body.map((para, i) => (
            <p key={i} className={`m-0 max-w-[65ch] ${para.startsWith('Exercise') || para.startsWith('Bài tập') ? 'font-semibold' : ''}`}>
              {para}
            </p>
          ))}
        </div>
        {lesson.diagram && <LessonDiagram kind={lesson.diagram} lit={lit} />}
        {lesson.demo && (
          <div className="grid gap-2">
            <Button onClick={showMe} className="justify-self-start">
              ▶ {t('lessons.showMe')}
            </Button>
            {!(lesson.diagram && KEYBOARD_DIAGRAMS.includes(lesson.diagram)) && (
              <Keyboard low={demoRange[0]} high={demoRange[1]} highlight={highlight} kid={kid} interactive height={100} focus={lit} />
            )}
          </div>
        )}
        {finished ? (
          kid ? (
            <Celebration stickers={finished}>
              <p className="text-2xl font-extrabold">{t('kid.lessons.done')}</p>
            </Celebration>
          ) : (
            <p className="text-ok font-semibold">✓ {t('lessonRun.passed')}</p>
          )
        ) : (
          <div className="flex flex-wrap items-center gap-3 rounded-[var(--radius)] bg-panel p-4">
            <span className="flex-1 min-w-0 text-sm text-muted">{goalText(lesson.exercise, t)}</span>
            {url ? (
              <PrimaryButton onClick={() => nav(url)}>{t('lessons.tryIt')} ▶</PrimaryButton>
            ) : (
              <PrimaryButton
                onClick={() => {
                  useProgress.getState().completeLesson(lesson.id)
                  setFinished(awardNewBadges())
                }}
              >
                {t('lessons.finish')}
              </PrimaryButton>
            )}
          </div>
        )}
        {done && next && (
          <Button onClick={() => nav(`/lessons/${next.id}`)} className="justify-self-start">
            {t('lessonRun.nextLesson')}: {L(next.title)} ▶
          </Button>
        )}
      </article>
    </Page>
  )
}
