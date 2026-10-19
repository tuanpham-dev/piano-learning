import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Page } from '../app/Layout'
import { useT } from '../app/i18n'
import { bundledSongs } from '../content/songs'
import { useSession } from '../store/session'
import { useProgress } from '../store/progress'
import type { Song } from '../engine/song'
import { Stars } from '../components/Stars'
import { Segmented } from '../components/Segmented'
import { Button } from '../components/PrimaryButton'
import { usePracticeClock } from '../hooks/usePracticeClock'

export function useAllSongs(): Song[] {
  const imported = useSession((s) => s.importedSongs)
  return [...bundledSongs, ...imported]
}

export function useSong(id: string | undefined): Song | undefined {
  const all = useAllSongs()
  return all.find((s) => s.id === id)
}

function bestOf(best: Record<string, { percent: number; stars: number }> | undefined) {
  if (!best) return null
  const all = Object.values(best)
  return { stars: Math.max(...all.map((b) => b.stars)), percent: Math.max(...all.map((b) => b.percent)) }
}

const DIFF_COLOR = ['', 'var(--color-nF)', 'var(--color-nD)', 'var(--color-nC)']

type Filter = 'all' | 'bundled' | 'imported'

export function LibraryPage() {
  const { t, tm, L, kid } = useT()
  usePracticeClock('songs')
  const songs = useAllSongs()
  const songBest = useProgress((s) => s.songBest)
  const done = useProgress((s) => s.songsDone)
  const remove = useSession((s) => s.removeImportedSong)
  const [filter, setFilter] = useState<Filter>('all')
  const shown = songs.filter((s) => filter === 'all' || s.source === filter)

  return (
    <Page title={kid ? t('kid.songs.pick') : t('songs.library')}>
      {!kid && (
        <div className="flex flex-wrap items-center gap-3 mb-4">
          <Segmented<Filter>
            id="lib-filter"
            value={filter}
            onChange={setFilter}
            options={[
              { value: 'all', label: t('songs.all') },
              { value: 'bundled', label: t('songs.bundled') },
              { value: 'imported', label: t('songs.imported') },
            ]}
          />
          <Link to="/songs/import" className="inline-flex items-center rounded-[var(--radius)] border border-fg/70 px-4 min-h-[var(--touch)]">
            ＋ {t('songs.import')}
          </Link>
        </div>
      )}
      {filter === 'imported' && shown.length === 0 && <p className="text-muted">{t('songs.noImported')}</p>}
      <div className={`grid gap-3 ${kid ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3' : 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3'}`}>
        {shown.map((s) => {
          const b = bestOf(songBest[s.id])
          const finished = done.includes(s.id)
          return (
            <div key={s.id} className="relative">
              <Link
                to={`/songs/${s.id}`}
                data-song={s.id}
                className={`grid gap-1.5 rounded-[var(--radius)] border bg-bg p-4 hover:bg-panel content-start h-full ${kid ? 'border-4 min-h-28' : 'border-line'}`}
                style={kid ? { borderColor: DIFF_COLOR[s.difficulty] } : undefined}
              >
                <div className="flex items-start justify-between gap-2">
                  <span className={`font-semibold ${kid ? 'text-xl font-extrabold' : ''}`}>{L(s.title)}</span>
                  {(b || finished) && <Stars count={b?.stars ?? (finished ? 1 : 0)} size={kid ? 24 : 18} />}
                </div>
                {!kid && <span className="text-sm text-muted">{s.composer}</span>}
                <span className="flex flex-wrap items-center gap-2 text-xs">
                  <span className="rounded-full px-2 py-0.5 font-semibold text-accent-ink" style={{ background: DIFF_COLOR[s.difficulty] }}>
                    {t(`songs.diff${s.difficulty}`)}
                  </span>
                  {s.source === 'imported' && <span className="rounded-full bg-panel px-2 py-0.5">{t('songs.imported')}</span>}
                  {!kid && b && <span className="text-muted tabular">{t('songs.best', { percent: b.percent })}</span>}
                </span>
                {kid && <span className="text-sm">{tm('common.play')} ▶</span>}
              </Link>
              {!kid && s.source === 'imported' && (
                <Button variant="ghost" className="absolute right-2 bottom-2 text-xs min-h-8 px-2" onClick={() => remove(s.id)}>
                  {t('songs.delete')}
                </Button>
              )}
            </div>
          )
        })}
      </div>
    </Page>
  )
}
