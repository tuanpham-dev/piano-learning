import { useRef, useState } from 'react'
import { Icon } from '../components/Icon'
import { Link } from 'react-router-dom'
import { Page } from '../app/Layout'
import { useT } from '../app/i18n'
import { useProgress, type DrillKey } from '../store/progress'
import { computeStreak, last7Days } from '../engine/streak'
import { BADGE_IDS } from '../engine/badges'
import { lessons } from '../content/lessons'
import { useAllSongs } from './Library'
import { Stars } from '../components/Stars'
import { Sticker } from '../components/Sticker'
import { Button } from '../components/PrimaryButton'
import { applyImport, downloadExport, parseExport, type ExportFile } from '../store/export'
import { todayISO } from '../engine/notes'

const DRILL_KEYS: DrillKey[] = ['treble', 'bass', 'interval', 'chord', 'melody', 'rhythm']

function Card({ title, children, className = '' }: { title: string; children: React.ReactNode; className?: string }) {
  return (
    <section className={`grid gap-3 content-start rounded-[var(--radius)] border border-line p-4 min-w-0 ${className}`}>
      <h2 className="text-base font-semibold text-muted">{title}</h2>
      {children}
    </section>
  )
}

/** Seven-day minutes bar chart drawn in SVG from theme tokens. */
export function WeekChart({ daily, lang }: { daily: Record<string, number>; lang: string }) {
  const days = last7Days(daily)
  const max = Math.max(10, ...days.map((d) => d.minutes))
  const W = 320
  const H = 140
  const pad = { l: 26, b: 22, t: 14 }
  const bw = (W - pad.l) / 7
  const y = (v: number) => H - pad.b - ((H - pad.b - pad.t) * v) / max
  const today = todayISO()
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label={days.map((d) => `${d.date}: ${d.minutes} min`).join(', ')} data-testid="week-chart">
      {[0, max / 2, max].map((v) => (
        <g key={v}>
          <line x1={pad.l} x2={W} y1={y(v)} y2={y(v)} stroke="var(--color-line)" strokeDasharray={v ? '3 3' : undefined} />
          <text x={pad.l - 4} y={y(v) + 4} textAnchor="end" fontSize="10" fill="var(--color-muted)">
            {Math.round(v)}
          </text>
        </g>
      ))}
      {days.map((d, i) => {
        const x = pad.l + i * bw + bw * 0.18
        const isToday = d.date === today
        const label = new Date(d.date + 'T12:00').toLocaleDateString(lang === 'vi' ? 'vi-VN' : 'en-US', { weekday: 'short' })
        return (
          <g key={d.date}>
            <rect
              x={x}
              y={y(d.minutes)}
              width={bw * 0.64}
              height={Math.max(0, H - pad.b - y(d.minutes))}
              rx="3"
              fill={isToday ? 'var(--color-accent)' : 'color-mix(in srgb, var(--color-accent) 55%, var(--color-bg))'}
            />
            {d.minutes > 0 && (
              <text x={x + bw * 0.32} y={y(d.minutes) - 3} textAnchor="middle" fontSize="10" fill="var(--color-fg)">
                {d.minutes}
              </text>
            )}
            <text x={x + bw * 0.32} y={H - 6} textAnchor="middle" fontSize="10" fill={isToday ? 'var(--color-fg)' : 'var(--color-muted)'} fontWeight={isToday ? 700 : 400}>
              {label}
            </text>
          </g>
        )
      })}
    </svg>
  )
}

export function DashboardPage() {
  const { t, L, lang } = useT()
  const p = useProgress()
  const songs = useAllSongs()
  const streak = computeStreak(p.dailyMinutes)
  const todayMin = p.dailyMinutes[todayISO()] ?? 0
  const fileRef = useRef<HTMLInputElement>(null)
  const [pending, setPending] = useState<ExportFile | null>(null)
  const [msg, setMsg] = useState<string | null>(null)

  const best = Object.entries(p.songBest)
    .map(([id, byKey]) => {
      const vals = Object.values(byKey)
      return { id, song: songs.find((s) => s.id === id), percent: Math.max(...vals.map((v) => v.percent)), stars: Math.max(...vals.map((v) => v.stars)) }
    })
    .sort((a, b) => b.percent - a.percent)

  return (
    <Page title={t('dash.title')}>
      <div className="grid gap-4 md:grid-cols-3">
        <Card title={t('dash.streak')}>
          <div className="text-4xl font-bold tabular" data-testid="streak">
            <span className="text-nD">
              <Icon name="fire" size={34} />
            </span>{' '}
            {t('dash.days', { count: streak })}
          </div>
          <div className="text-sm text-muted tabular">
            {t('dash.today')}: {t('dash.minutes', { count: todayMin })}
          </div>
        </Card>
        <Card title={t('dash.week')} className="md:col-span-2">
          <WeekChart daily={p.dailyMinutes} lang={lang} />
        </Card>
        <Card title={t('dash.lessons')}>
          <div className="text-4xl font-bold tabular" data-testid="lessons-done">
            {p.lessonsDone.length} <span className="text-lg text-muted">/ {lessons.length}</span>
          </div>
          <div className="h-2 rounded bg-line overflow-hidden">
            <div className="h-full bg-ok" style={{ width: `${(100 * p.lessonsDone.length) / lessons.length}%` }} />
          </div>
        </Card>
        <Card title={t('dash.accuracy')} className="md:col-span-2">
          <ul className="grid gap-2 list-none p-0 sm:grid-cols-2" data-testid="accuracy">
            {DRILL_KEYS.map((k) => {
              const d = p.drills[k]
              const pct = d.attempts ? Math.round((100 * d.correct) / d.attempts) : null
              return (
                <li key={k} className="grid gap-1">
                  <div className="flex justify-between text-sm">
                    <span>{t(`dash.k.${k}`)}</span>
                    <span className="tabular text-muted">{pct === null ? t('dash.notYet') : `${pct}% · ${d.correct}/${d.attempts}`}</span>
                  </div>
                  <div className="h-1.5 rounded bg-line overflow-hidden">
                    <div className="h-full" style={{ width: `${pct ?? 0}%`, background: pct !== null && pct < 60 ? 'var(--color-warn)' : 'var(--color-ok)' }} />
                  </div>
                </li>
              )
            })}
          </ul>
        </Card>
        <Card title={t('dash.best')} className="md:col-span-2">
          {best.length ? (
            <ul className="grid gap-1 list-none p-0" data-testid="best-scores">
              {best.map((b) => (
                <li key={b.id} className="flex items-center justify-between gap-2 border-b border-line py-1.5 last:border-0">
                  <Link to={`/songs/${b.id}`} className="min-w-0 truncate hover:underline">
                    {b.song ? L(b.song.title) : b.id}
                  </Link>
                  <span className="flex items-center gap-2 tabular">
                    <Stars count={b.stars} size={16} /> {b.percent}%
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-muted">{t('dash.noSongs')}</p>
          )}
        </Card>
        <Card title={t('dash.badges')}>
          <ul className="grid grid-cols-4 gap-2 list-none p-0" data-testid="badges">
            {BADGE_IDS.map((b) => (
              <li key={b} title={`${t(`badges.${b}`)}: ${t(`badges.${b}Hint`)}`} className="grid justify-items-center gap-1 text-center">
                <Sticker id={b} earned={p.badges.includes(b)} size={44} label={t(`badges.${b}`)} />
                <span className="text-[10px] leading-tight text-muted">{t(`badges.${b}`)}</span>
              </li>
            ))}
          </ul>
        </Card>
        <Card title={t('dash.data')} className="md:col-span-3">
          <div className="flex flex-wrap gap-2">
            <Button onClick={downloadExport}>{t('settings.export')}</Button>
            <Button onClick={() => fileRef.current?.click()}>{t('settings.import')}</Button>
            <input
              ref={fileRef}
              id="dash-import"
              type="file"
              accept="application/json,.json"
              hidden
              onChange={async (e) => {
                const f = e.target.files?.[0]
                if (!f) return
                const parsed = parseExport(await f.text())
                if (parsed) setPending(parsed)
                else setMsg(t('settings.importBad', { file: f.name }))
                e.target.value = ''
              }}
            />
          </div>
          {pending && (
            <div className="flex flex-wrap items-center gap-2">
              <span>{t('settings.importAsk', { file: 'progress' })}</span>
              {(['merge', 'replace'] as const).map((how) => (
                <Button
                  key={how}
                  onClick={() => {
                    applyImport(pending, how)
                    setPending(null)
                    setMsg(t('settings.importDone'))
                  }}
                >
                  {how === 'merge' ? t('settings.importMerge') : t('settings.importReplace')}
                </Button>
              ))}
            </div>
          )}
          {msg && <p role="status">{msg}</p>}
        </Card>
      </div>
    </Page>
  )
}
