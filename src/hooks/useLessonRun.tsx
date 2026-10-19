import { useCallback, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useT } from '../app/i18n'
import { lessonById, lessons } from '../content/lessons'
import { passes, type Exercise, type ExerciseResult, type Lesson } from '../engine/lessons'
import { useProgress } from '../store/progress'
import { awardNewBadges } from '../store/badges'
import { Button, PrimaryButton } from '../components/PrimaryButton'
import { Celebration } from '../components/Celebration'
import { Mascot } from '../components/Mascot'

export interface LessonRun {
  lesson?: Lesson
  outcome: { passed: boolean; badges: string[] } | null
  report: (r: ExerciseResult) => void
  reset: () => void
}

/** When an exercise page is opened from a lesson (?lesson=id), judges the result against the lesson's goal. */
export function useLessonRun(): LessonRun {
  const [params] = useSearchParams()
  const id = params.get('lesson')
  const lesson = id ? lessonById(id) : undefined
  const [outcome, setOutcome] = useState<LessonRun['outcome']>(null)
  const report = useCallback(
    (r: ExerciseResult) => {
      if (!lesson) return
      const passed = passes(lesson.exercise, r)
      let badges: string[] = []
      if (passed) {
        useProgress.getState().completeLesson(lesson.id)
        badges = awardNewBadges()
      }
      setOutcome({ passed, badges })
    },
    [lesson],
  )
  return { lesson, outcome, report, reset: () => setOutcome(null) }
}

export function goalText(ex: Exercise, t: (k: string, o?: Record<string, unknown>) => string): string {
  switch (ex.kind) {
    case 'drill':
      return t('lessonRun.goalDrill', { min: ex.minCorrect, of: ex.count })
    case 'ear':
      return t('lessonRun.goalEar', { min: ex.minCorrect, of: ex.count })
    case 'rhythm':
      return t('lessonRun.goalRhythm', { min: ex.minPercent })
    case 'song':
      return ex.play === 'wait' ? t('lessonRun.goalWait') : t('lessonRun.goalPerform', { min: ex.minPercent ?? 0 })
    default:
      return ''
  }
}

/** Banner on an exercise page started from a lesson; shows the goal, then pass/fail with next steps. */
export function LessonBanner({ run, onRetry }: { run: LessonRun; onRetry?: () => void }) {
  const { t, L, kid } = useT()
  const nav = useNavigate()
  const lesson = run.lesson
  if (!lesson) return null
  const next = lessons.find((l) => l.order === lesson.order + 1)
  const o = run.outcome
  return (
    <div className={`rounded-[var(--radius)] border-2 p-3 grid gap-2 ${o?.passed ? 'border-ok' : 'border-line'} bg-panel/60`} data-testid="lesson-banner">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <strong>{t('lessonRun.banner', { n: lesson.order, title: L(lesson.title) })}</strong>
        <span className="text-sm text-muted">{goalText(lesson.exercise, t)}</span>
      </div>
      {o && (
        <div className={`grid gap-3 ${kid ? 'justify-items-center text-center' : ''}`}>
          {o.passed ? (
            kid ? (
              <Celebration stickers={o.badges}>
                <p className="text-xl font-extrabold">{t('kid.lessonRun.passed')}</p>
              </Celebration>
            ) : (
              <p className="text-ok font-semibold">✓ {t('lessonRun.passed')}</p>
            )
          ) : (
            <div className="flex items-center gap-3">
              {kid && <Mascot mood="thinking" size={56} />}
              <p>{kid ? t('kid.lessonRun.failed') : t('lessonRun.failed')}</p>
            </div>
          )}
          <div className="flex flex-wrap gap-2">
            {o.passed && next ? (
              <PrimaryButton onClick={() => nav(`/lessons/${next.id}`)}>{t('lessonRun.nextLesson')} ▶</PrimaryButton>
            ) : (
              !o.passed && (
                <PrimaryButton
                  onClick={() => {
                    run.reset()
                    onRetry?.()
                  }}
                >
                  {t('lessonRun.tryAgain')}
                </PrimaryButton>
              )
            )}
            <Button onClick={() => nav(`/lessons/${lesson.id}`)}>{t('lessonRun.backToLesson')}</Button>
          </div>
        </div>
      )}
    </div>
  )
}
