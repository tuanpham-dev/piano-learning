import { useNavigate } from 'react-router-dom'
import { Page } from '../app/Layout'
import { useT } from '../app/i18n'
import { useSession } from '../store/session'
import { useSongPlayer } from '../components/SongPlayer'
import { ScoreLines } from '../components/ScoreLines'
import { Button, PrimaryButton } from '../components/PrimaryButton'
import { Icon } from '../components/Icon'
import { barCount } from '../engine/song'
import { bundledSongById } from '../content/songs'
import { useWarningText } from '../components/WarningText'
import { useEditor } from '../store/editor'
import { songToDraft } from '../engine/song-text'

/** Review an imported or recorded song before it is saved (R3, R11). */
export function SongReviewPage() {
  const { t, L } = useT()
  const nav = useNavigate()
  const pending = useSession((s) => s.pendingReview)
  const setPending = useSession((s) => s.setPendingReview)
  const add = useSession((s) => s.addImportedSong)
  const player = useSongPlayer(pending?.song ?? null)
  const warningText = useWarningText()

  if (!pending)
    return (
      <Page title={t('review.title')} back="/songs">
        <p className="text-muted">{t('review.nothing')}</p>
      </Page>
    )
  const { song, warnings, origin, fileName } = pending
  const marked = [...new Set(warnings.map((w) => w.bar).filter((b) => b > 0))]

  return (
    <Page title={t('review.title')} back="/songs">
      <div className="grid gap-4 max-w-5xl">
        <div className="flex flex-wrap items-center gap-3">
          <div className="min-w-0 flex-1">
            <h2 className="text-xl font-semibold">{L(song.title)}</h2>
            <p className="text-sm text-muted tabular">
              {origin === 'file' && fileName ? t('review.fromFile', { file: fileName }) : t('review.fromRecording')} · {t('review.bars', { count: barCount(song) })} · {song.bpm}{' '}
              BPM · {song.timeSig.join('/')} · {song.keySig}
            </p>
          </div>
          <Button onClick={() => (player.playing ? player.stop() : player.play(0))} aria-pressed={player.playing}>
            <Icon name={player.playing ? 'stop' : 'speaker'} /> {player.playing ? t('play.stop') : t('play.listen')}
          </Button>
        </div>

        <section className="grid gap-2 rounded-[var(--radius)] border border-line bg-surface p-3" aria-live="polite" data-testid="review-warnings">
          <h3 className="font-semibold">{warnings.length ? t('review.check') : t('review.clean')}</h3>
          {warnings.length > 0 && (
            <ul className="grid gap-1 text-sm list-none p-0">
              {warnings.map((w, i) => (
                <li key={i} className="flex gap-2">
                  <span className="rounded border border-warn/60 bg-warn/10 px-1.5 font-semibold tabular whitespace-nowrap">{w.bar ? t('review.bar', { bar: w.bar }) : t('review.whole')}</span>
                  <span>{warningText(w)}</span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <ScoreLines song={song} getCursor={player.cursor} marked={marked} />

        <div className="flex flex-wrap gap-2">
          <PrimaryButton
            onClick={() => {
              // A song can't share an id with a bundled one; re-importing one of your own songs replaces it.
              const saved = bundledSongById(song.id) ? { ...song, id: `my-${song.id}-${Date.now().toString(36)}` } : song
              add(saved)
              setPending(null)
              nav(`/songs/${saved.id}`)
            }}
          >
            {t('review.save')}
          </PrimaryButton>
          <Button
            onClick={() => {
              useEditor.getState().open(songToDraft(song), null)
              setPending(null)
              nav('/songs/edit/draft')
            }}
          >
            <Icon name="pencil" /> {t('review.edit')}
          </Button>
          <Button
            variant="ghost"
            onClick={() => {
              setPending(null)
              nav('/songs')
            }}
          >
            {t('review.cancel')}
          </Button>
        </div>
      </div>
    </Page>
  )
}
