import type { ReactNode } from 'react'
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom'
import { useT } from './i18n'
import { useProgress } from '../store/progress'
import { useSession } from '../store/session'
import { computeStreak } from '../engine/streak'
import { SoundGate } from '../components/SoundGate'
import { Icon, type IconName } from '../components/Icon'

export const MODE_ROUTES = [
  { key: 'free', to: '/free', icon: 'piano', kidIcon: 'piano' },
  { key: 'songs', to: '/songs', icon: 'note', kidIcon: 'note' },
  { key: 'drills', to: '/drills', icon: 'clef', kidIcon: 'clef' },
  { key: 'ear', to: '/ear', icon: 'ear', kidIcon: 'ear' },
  { key: 'rhythm', to: '/rhythm', icon: 'drum', kidIcon: 'drum' },
  { key: 'lessons', to: '/lessons', icon: 'book', kidIcon: 'map' },
  { key: 'reference', to: '/reference', icon: 'chords', kidIcon: 'chords' },
  { key: 'progress', to: '/progress', icon: 'chart', kidIcon: 'trophy' },
] as const satisfies readonly { key: string; to: string; icon: IconName; kidIcon: IconName }[]

interface PageProps {
  title: string
  children: ReactNode
  /** Where the kid back button goes. */
  back?: string
  /** Extra controls on the right of the header. */
  actions?: ReactNode
  /** Full-bleed playing screens use the whole viewport height. */
  fill?: boolean
}

function AdultBar({ actions }: { actions?: ReactNode }) {
  const { t } = useT()
  const daily = useProgress((s) => s.dailyMinutes)
  const streak = computeStreak(daily)
  return (
    <header className="sticky top-0 z-20 border-b border-line bg-panel/95 backdrop-blur" style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}>
      <div className="flex items-center gap-3 px-[max(16px,env(safe-area-inset-left,0px))] py-2">
        <Link to="/" className="font-[family-name:var(--font-head)] font-bold text-lg whitespace-nowrap">
          {t('common.appName')}
        </Link>
        <nav className="flex gap-1 overflow-x-auto min-w-0 flex-1 [scrollbar-width:none]" aria-label="Modes">
          {MODE_ROUTES.map((r) => (
            <NavLink
              key={r.key}
              to={r.to}
              className={({ isActive }) => `px-2.5 py-1.5 rounded-md text-sm whitespace-nowrap ${isActive ? 'bg-accent text-accent-ink font-semibold' : 'hover:bg-bg'}`}
            >
              {t(`modes.${r.key}`)}
            </NavLink>
          ))}
        </nav>
        {actions}
        {streak > 0 && (
          <span className="text-sm whitespace-nowrap tabular hidden sm:inline-flex items-center gap-1 text-nD" title={t('home.streak', { count: streak })}>
            <Icon name="fire" size={16} /> <span className="text-fg">{streak}</span>
          </span>
        )}
        <NavLink to="/settings" aria-label={t('common.settings')} className="p-2 rounded-md hover:bg-bg">
          <Icon name="gear" />
        </NavLink>
      </div>
    </header>
  )
}

function KidBar({ title, back, actions }: { title: string; back?: string; actions?: ReactNode }) {
  const { t } = useT()
  const nav = useNavigate()
  const isHome = useLocation().pathname === '/'
  const stars = useProgress((s) => s.stars)
  return (
    <header className="sticky top-0 z-20 bg-panel" style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}>
      <div className="flex items-center gap-3 px-[max(16px,env(safe-area-inset-left,0px))] py-2">
        {isHome ? (
          <span className="w-2" />
        ) : (
          <button
            type="button"
            onClick={() => nav(back ?? '/')}
            className="min-h-[var(--touch)] min-w-[var(--touch)] rounded-full bg-bg text-2xl font-extrabold"
            aria-label={t('common.back')}
          >
            ←
          </button>
        )}
        <h1 className="flex-1 text-xl font-extrabold truncate">{title}</h1>
        {actions}
        <Link
          to="/progress"
          className="grid place-items-center min-h-[var(--touch)] min-w-[var(--touch)] px-2 text-lg font-extrabold whitespace-nowrap tabular"
          aria-label={`${stars} stars`}
        >
          <span className="inline-flex items-center gap-1">
            <span className="text-nE">
              <Icon name="star" size={22} />
            </span>
            {stars}
          </span>
        </Link>
      </div>
    </header>
  )
}

export function Page({ title, children, back, actions, fill }: PageProps) {
  const { kid, t } = useT()
  const storageBad = useSession((s) => s.storageUnavailable)
  return (
    <div className={`flex flex-col ${fill ? 'h-full' : 'min-h-full'}`}>
      {kid ? <KidBar title={title} back={back} actions={actions} /> : <AdultBar actions={actions} />}
      {storageBad && <div className="bg-warn/20 text-center text-sm py-1 px-4">{t('common.storageBanner')}</div>}
      <SoundGate />
      <main
        className={`flex-1 min-h-0 w-full mx-auto ${fill ? 'flex flex-col overflow-y-auto' : 'max-w-6xl py-5'} px-[max(16px,env(safe-area-inset-left,0px))]`}
        style={{ paddingBottom: fill ? 'env(safe-area-inset-bottom, 0px)' : undefined }}
      >
        {!kid && !fill && <h1 className="text-2xl font-bold mb-4">{title}</h1>}
        {children}
      </main>
    </div>
  )
}
