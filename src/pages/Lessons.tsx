import { Link, useNavigate } from 'react-router-dom'
import { Page } from '../app/Layout'
import { useT } from '../app/i18n'
import { lessons } from '../content/lessons'
import { isUnlocked, nextLesson } from '../engine/lessons'
import { useProgress } from '../store/progress'
import { Mascot } from '../components/Mascot'
import { PrimaryButton } from '../components/PrimaryButton'
import { StarIcon } from '../components/Stars'
import { usePracticeClock } from '../hooks/usePracticeClock'

const ISLAND = ['var(--color-nC)', 'var(--color-nD)', 'var(--color-nE)', 'var(--color-nF)', 'var(--color-nG)', 'var(--color-nA)', 'var(--color-nB)']

export function LessonsPage() {
  const { kid } = useT()
  usePracticeClock('lessons')
  return kid ? <JourneyMap /> : <LessonList />
}

function LessonList() {
  const { t, L } = useT()
  const p = useProgress()
  const next = nextLesson(lessons, p)
  return (
    <Page title={t('lessons.title')}>
      <p className="text-muted mb-3 tabular">
        {t('lessons.doneCount', { done: p.lessonsDone.length, total: lessons.length })} · {t('lessons.skip', { state: p.settings.skipAhead ? t('common.on') : t('common.off') })}
      </p>
      <ol className="grid gap-1.5 list-none p-0 max-w-3xl">
        {lessons.map((l) => {
          const done = p.lessonsDone.includes(l.id)
          const open = isUnlocked(l, lessons, p)
          const current = next?.id === l.id
          return (
            <li key={l.id}>
              {open ? (
                <Link
                  to={`/lessons/${l.id}`}
                  data-lesson={l.id}
                  className={`flex items-center gap-3 rounded-[var(--radius)] border px-4 py-3 hover:bg-panel ${current ? 'border-accent' : 'border-line'}`}
                >
                  <span className={`grid size-7 place-items-center rounded-full text-sm font-semibold tabular ${done ? 'bg-ok text-accent-ink' : current ? 'bg-accent text-accent-ink' : 'bg-panel'}`}>{done ? '✓' : l.order}</span>
                  <span className="flex-1 min-w-0">{L(l.title)}</span>
                  {done && <span className="text-xs text-ok">{t('lessons.completed')}</span>}
                  {current && <span className="text-xs text-accent">▶</span>}
                </Link>
              ) : (
                <div data-lesson={l.id} aria-disabled="true" className="flex items-center gap-3 rounded-[var(--radius)] border border-line px-4 py-3 text-muted" title={t('lessons.locked', { n: l.order - 1 })}>
                  <span className="grid size-7 place-items-center rounded-full bg-panel text-sm" aria-label="locked">
                    🔒
                  </span>
                  <span className="flex-1 min-w-0">
                    {l.order} · {L(l.title)}
                  </span>
                </div>
              )}
            </li>
          )
        })}
      </ol>
    </Page>
  )
}

function JourneyMap() {
  const { t, L } = useT()
  const nav = useNavigate()
  const p = useProgress()
  const next = nextLesson(lessons, p)
  return (
    <Page title={t('kid.lessons.title')}>
      <div className="grid gap-5 pb-4">
        <div className="flex items-center gap-4 rounded-[var(--radius)] bg-panel p-4">
          <Mascot mood={next ? 'idle' : 'cheering'} size={80} />
          <div className="flex-1 min-w-0 text-xl font-extrabold">{next ? t('kid.lessons.island', { n: next.order, title: L(next.title) }) : t('kid.lessons.done')}</div>
          {next && <PrimaryButton onClick={() => nav(`/lessons/${next.id}`)}>{t('common.start')} ▶</PrimaryButton>}
        </div>
        <ol className="flex flex-wrap items-center gap-y-6 list-none p-0" aria-label={t('kid.lessons.title')} data-testid="journey">
          {lessons.map((l, i) => {
            const done = p.lessonsDone.includes(l.id)
            const open = isUnlocked(l, lessons, p)
            const current = next?.id === l.id
            const color = ISLAND[i % ISLAND.length]
            return (
              <li key={l.id} className="flex items-center">
                {i > 0 && <span className="w-5 sm:w-8 border-t-4 border-dotted border-muted/50" aria-hidden />}
                <button
                  type="button"
                  disabled={!open}
                  data-island={l.order}
                  data-state={done ? 'done' : current ? 'current' : open ? 'open' : 'locked'}
                  onClick={() => nav(`/lessons/${l.id}`)}
                  aria-label={`${l.order}. ${L(l.title)}${done ? ' ✓' : open ? '' : ' 🔒'}`}
                  className={`relative grid size-16 place-items-center rounded-full text-2xl font-extrabold transition-transform ${current ? 'scale-110 ring-4 ring-nE ring-offset-4 ring-offset-bg' : ''} ${open ? 'text-white shadow-md active:scale-95' : 'bg-line text-muted opacity-60'}`}
                  style={open ? { background: color } : undefined}
                >
                  {open ? l.order : '🔒'}
                  {done && (
                    <span className="absolute -top-3 -right-2">
                      <StarIcon size={26} />
                    </span>
                  )}
                </button>
              </li>
            )
          })}
        </ol>
      </div>
    </Page>
  )
}
