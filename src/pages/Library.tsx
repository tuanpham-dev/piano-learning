import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Page } from '../app/Layout'
import { useT } from '../app/i18n'
import { bundledSongs } from '../content/songs'
import { useSession } from '../store/session'
import { useProgress } from '../store/progress'
import type { Song } from '../engine/song'
import { Stars } from '../components/Stars'
import { Bar } from '../components/Bar'
import type { Letter } from '../engine/notes'
import { Segmented } from '../components/Segmented'
import { Button } from '../components/PrimaryButton'
import { usePracticeClock } from '../hooks/usePracticeClock'
import { Icon } from '../components/Icon'
import { useEditor } from '../store/editor'
import { emptyDraft, newSongId, songToDraft } from '../engine/song-text'
import { writeSongFile } from '../engine/song-file'
import { downloadText, songFileName } from '../store/download'

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
const DIFF_NOTE: Record<number, Letter> = { 1: 'F', 2: 'D', 3: 'C' }

type Filter = 'all' | 'bundled' | 'imported'

/** Adult song card menu: edit, duplicate, export, rename, delete (own songs) — R2, R5. */
function SongMenu({ song, onRename }: { song: Song; onRename: () => void }) {
  const { t, L } = useT()
  const nav = useNavigate()
  const [open, setOpen] = useState(false)
  const [confirm, setConfirm] = useState(false)
  const remove = useSession((s) => s.removeImportedSong)
  const duplicate = useSession((s) => s.duplicateSong)
  const mine = song.source !== 'bundled'
  const item = 'flex w-full items-center gap-2 rounded px-3 min-h-10 text-left hover:bg-panel'
  return (
    <div className="absolute right-2 top-2">
      <button
        type="button"
        aria-label={t('songs.menu')}
        aria-expanded={open}
        data-menu={song.id}
        onClick={() => setOpen((o) => !o)}
        className="grid size-9 place-items-center rounded-md hover:bg-panel"
      >
        <Icon name="more" size={22} />
      </button>
      {open && (
        <div role="menu" className="absolute right-0 z-30 mt-1 w-56 rounded-[var(--radius)] border border-line bg-surface p-1 shadow-xl" onMouseLeave={() => setOpen(false)}>
          {mine && (
            <button
              role="menuitem"
              type="button"
              className={item}
              onClick={() => {
                useEditor.getState().open(songToDraft(song), song.id)
                nav(`/songs/edit/${song.id}`)
              }}
            >
              <Icon name="pencil" /> {t('songs.edit')}
            </button>
          )}
          <button
            role="menuitem"
            type="button"
            className={item}
            onClick={() => {
              const id = duplicate(song, t('songs.copyOf', { title: L(song.title) }))
              setOpen(false)
              if (!mine) nav(`/songs/edit/${id}`)
            }}
          >
            <Icon name="copy" /> {t('songs.duplicate')}
          </button>
          <button
            role="menuitem"
            type="button"
            className={item}
            onClick={() => {
              downloadText(songFileName(L(song.title)), writeSongFile(song))
              setOpen(false)
            }}
          >
            <Icon name="export" /> {t('songs.exportFile')}
          </button>
          {mine && (
            <button
              role="menuitem"
              type="button"
              className={item}
              onClick={() => {
                setOpen(false)
                onRename()
              }}
            >
              <Icon name="pencil" /> {t('songs.rename')}
            </button>
          )}
          {mine &&
            (confirm ? (
              <div className="grid gap-2 p-2 text-sm">
                <p>{t('songs.deleteConfirm', { title: L(song.title) })}</p>
                <div className="flex gap-2">
                  <Button variant="primary" onClick={() => remove(song.id)} className="min-h-9">
                    {t('songs.deleteYes')}
                  </Button>
                  <Button variant="ghost" onClick={() => setConfirm(false)} className="min-h-9">
                    {t('common.cancel')}
                  </Button>
                </div>
              </div>
            ) : (
              <button role="menuitem" type="button" className={`${item} text-accent`} onClick={() => setConfirm(true)}>
                <Icon name="trash" /> {t('songs.delete')}
              </button>
            ))}
        </div>
      )}
    </div>
  )
}

function RenameField({ song, onDone }: { song: Song; onDone: () => void }) {
  const { t, L } = useT()
  const rename = useSession((s) => s.renameSong)
  const [value, setValue] = useState(L(song.title))
  return (
    <form
      className="flex gap-2"
      onSubmit={(e) => {
        e.preventDefault()
        if (value.trim()) rename(song.id, value.trim())
        onDone()
      }}
    >
      <input
        id={`rename-${song.id}`}
        aria-label={t('songs.rename')}
        autoFocus
        value={value}
        onChange={(e) => setValue(e.target.value.slice(0, 60))}
        className="min-w-0 flex-1 rounded border border-line bg-bg px-2 min-h-9"
      />
      <Button type="submit" className="min-h-9">
        {t('songs.saveName')}
      </Button>
    </form>
  )
}

export function LibraryPage() {
  const { t, L, kid } = useT()
  const nav = useNavigate()
  usePracticeClock('songs')
  const songs = useAllSongs()
  const songBest = useProgress((s) => s.songBest)
  const done = useProgress((s) => s.songsDone)
  const [filter, setFilter] = useState<Filter>('all')
  const [renaming, setRenaming] = useState<string | null>(null)
  const mine = songs.filter((s) => s.source !== 'bundled')
  const bundled = songs.filter((s) => s.source === 'bundled')

  const card = (s: Song) => {
    const b = bestOf(songBest[s.id])
    const finished = done.includes(s.id)
    if (kid)
      return (
        <Bar
          key={s.id}
          to={`/songs/${s.id}`}
          note={s.source === 'bundled' ? (DIFF_NOTE[s.difficulty] ?? 'D') : 'B'}
          icon={s.source === 'bundled' ? 'note' : 'record'}
          iconSize={30}
          label={L(s.title)}
          data={{ song: s.id }}
          className="h-full min-h-32"
          sublabel={
            <span className="inline-flex items-center gap-2 rounded-full bg-plate px-2.5 py-0.5 text-sm font-semibold text-plate-ink">
              {s.source === 'bundled' ? t(`songs.diff${s.difficulty}`) : t('songs.mySongs')}
              {(b || finished) && <Stars count={b?.stars ?? (finished ? 1 : 0)} size={18} />}
            </span>
          }
        />
      )
    return (
      <div key={s.id} className="relative">
        <Link to={`/songs/${s.id}`} data-song={s.id} className="grid gap-1.5 rounded-[var(--radius)] border border-line bg-surface p-4 pr-12 hover:bg-panel content-start h-full">
          <div className="flex items-start justify-between gap-2">
            <span className="font-semibold">{L(s.title)}</span>
            {(b || finished) && <Stars count={b?.stars ?? (finished ? 1 : 0)} size={18} />}
          </div>
          <span className="text-sm text-muted">{s.composer || '\u00a0'}</span>
          <span className="flex flex-wrap items-center gap-2 text-xs">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-line px-2 py-0.5 font-semibold">
              <span className="size-2.5 rounded-full" style={{ background: DIFF_COLOR[s.difficulty] }} aria-hidden />
              {t(`songs.diff${s.difficulty}`)}
            </span>
            {b && <span className="text-muted tabular">{t('songs.best', { percent: b.percent })}</span>}
          </span>
        </Link>
        {renaming === s.id && (
          <div className="absolute inset-x-2 bottom-2 rounded bg-surface p-1 shadow">
            <RenameField song={s} onDone={() => setRenaming(null)} />
          </div>
        )}
        <SongMenu song={s} onRename={() => setRenaming(s.id)} />
      </div>
    )
  }

  const grid = 'grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3'
  return (
    <Page title={kid ? t('kid.songs.pick') : t('songs.library')}>
      {kid ? (
        <div className={grid}>{[...mine, ...bundled].map(card)}</div>
      ) : (
        <div className="grid gap-6">
          <div className="flex flex-wrap items-center gap-3">
            <Segmented<Filter>
              id="lib-filter"
              value={filter}
              onChange={setFilter}
              options={[
                { value: 'all', label: t('songs.all') },
                { value: 'bundled', label: t('songs.learnSongs') },
                { value: 'imported', label: t('songs.mySongs') },
              ]}
            />
            <Link to="/songs/import" className="lifted inline-flex items-center gap-2 rounded-[var(--radius)] border border-line bg-surface px-4 min-h-[var(--touch)]">
              <Icon name="upload" /> {t('songs.import')}
            </Link>
            <Button
              onClick={() => {
                const id = newSongId(t('songs.newSong'))
                useEditor.getState().open(emptyDraft(id, t('songs.newSong')), null)
                nav('/songs/edit/draft')
              }}
            >
              <Icon name="plus" /> {t('songs.newSong')}
            </Button>
          </div>
          {filter !== 'bundled' && (
            <section className="grid gap-3" aria-labelledby="my-songs-h">
              <h2 id="my-songs-h" className="text-lg font-semibold">
                {t('songs.mySongs')}
              </h2>
              {mine.length ? <div className={grid}>{mine.map(card)}</div> : <p className="text-muted">{t('songs.noMine')}</p>}
            </section>
          )}
          {filter !== 'imported' && (
            <section className="grid gap-3" aria-labelledby="learn-songs-h">
              <h2 id="learn-songs-h" className="text-lg font-semibold">
                {t('songs.learnSongs')}
              </h2>
              <div className={grid}>{bundled.map(card)}</div>
            </section>
          )}
        </div>
      )}
    </Page>
  )
}
