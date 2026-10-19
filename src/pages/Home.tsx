import { Link, useNavigate } from 'react-router-dom'
import { Page, MODE_ROUTES } from '../app/Layout'
import { useT } from '../app/i18n'
import { useProgress } from '../store/progress'
import { computeStreak } from '../engine/streak'
import { nextLesson } from '../engine/lessons'
import { lessons } from '../content/lessons'
import { Mascot } from '../components/Mascot'
import { PrimaryButton } from '../components/PrimaryButton'

function useHomeData() {
  const p = useProgress()
  const streak = computeStreak(p.dailyMinutes)
  const next = nextLesson(lessons, p)
  const threeStar = Object.values(p.songBest).filter((b) => Object.values(b).some((r) => r.stars === 3)).length
  const drillAll = (['treble', 'bass'] as const).reduce(
    (acc, k) => ({ a: acc.a + p.drills[k].attempts, c: acc.c + p.drills[k].correct }),
    { a: 0, c: 0 },
  )
  return { p, streak, next, threeStar, drillPct: drillAll.a ? Math.round((100 * drillAll.c) / drillAll.a) : null }
}

export function HomePage() {
  const { kid } = useT()
  return kid ? <KidHome /> : <AdultHome />
}

function AdultHome() {
  const { t, L } = useT()
  const nav = useNavigate()
  const { p, streak, next, threeStar, drillPct } = useHomeData()
  const pills: Partial<Record<string, string>> = {
    songs: threeStar ? `${threeStar} ★★★` : undefined,
    drills: drillPct !== null ? `${drillPct}%` : undefined,
    lessons: lessons.length ? t('home.lessonsPill', { done: p.lessonsDone.length, total: lessons.length }) : undefined,
    progress: streak ? t('home.streak', { count: streak }) : undefined,
  }
  return (
    <Page title={p.name ? `${t('common.home')} · ${p.name}` : t('common.home')}>
      <div className="grid gap-5">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {MODE_ROUTES.map((r) => (
            <Link
              key={r.key}
              to={r.to}
              className="rounded-[var(--radius)] border border-line bg-bg hover:bg-panel p-4 grid gap-1 content-start min-h-28"
            >
              <span className="text-2xl" aria-hidden>
                {r.icon}
              </span>
              <span className="font-semibold">{t(`modes.${r.key}`)}</span>
              {pills[r.key] && <span className="text-xs text-muted tabular">{pills[r.key]}</span>}
            </Link>
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-3 rounded-[var(--radius)] bg-panel p-4">
          {next ? (
            <>
              <span className="flex-1 min-w-0">{t('home.continue', { title: `${next.order} · ${L(next.title)}` })}</span>
              <PrimaryButton onClick={() => nav(`/lessons/${next.id}`)}>{t('common.resume')}</PrimaryButton>
            </>
          ) : (
            <span className="text-muted">{t('home.allLessonsDone')}</span>
          )}
        </div>
      </div>
    </Page>
  )
}

const KID_TILE_COLORS = ['var(--color-nC)', 'var(--color-nD)', 'var(--color-nF)', 'var(--color-nG)', 'var(--color-nA)', 'var(--color-nB)', 'var(--color-nE)', 'var(--color-nC)']

function KidHome() {
  const { t, tm, L } = useT()
  const nav = useNavigate()
  const { p, next } = useHomeData()
  return (
    <Page title={p.name ? t('kid.hi', { name: p.name }) : t('kid.hiNoName')}>
      <div className="grid gap-5 pb-4">
        <div className="flex items-center gap-4">
          <Mascot mood="idle" size={88} />
          <div className="flex-1 min-w-0 text-xl font-extrabold">
            {next ? t('kid.next', { title: L(next.title) }) : t('kid.allDone')}
          </div>
        </div>
        {next && (
          <PrimaryButton onClick={() => nav(`/lessons/${next.id}`)} className="w-full text-2xl min-h-16">
            {t('common.start')} ▶
          </PrimaryButton>
        )}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {MODE_ROUTES.map((r, i) => (
            <Link
              key={r.key}
              to={r.to}
              className="rounded-[var(--radius)] border-4 bg-bg p-4 grid justify-items-center gap-1 text-center font-extrabold text-lg min-h-32 content-center active:scale-95 transition-transform"
              style={{ borderColor: KID_TILE_COLORS[i] }}
            >
              <span className="text-4xl" aria-hidden>
                {r.icon === '📊' ? '🏆' : r.icon === '📖' ? '🗺️' : r.icon}
              </span>
              {tm(`modes.${r.key}`)}
            </Link>
          ))}
        </div>
        <Link to="/settings" className="justify-self-center text-sm text-muted underline underline-offset-4 py-2">
          {t('kid.grownUps')}
        </Link>
      </div>
    </Page>
  )
}
