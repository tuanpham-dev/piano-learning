import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import i18n, { useT } from '../app/i18n'
import { bus } from '../input/bus'
import { now } from '../audio/context'
import { clicksPerBar, useMetronome, type TimeSigName } from '../audio/metronome'
import { recordingToSong, type RecordedNote } from '../engine/recording'
import { checkSong } from '../engine/song-check'
import { newSongId } from '../engine/song-text'
import type { Song } from '../engine/song'
import { useSession } from '../store/session'
import { useProgress } from '../store/progress'
import { useSongPlayer } from './SongPlayer'
import { Button } from './PrimaryButton'
import { Celebration } from './Celebration'
import { Icon } from './Icon'

type Phase = 'idle' | 'count' | 'rec'

/** Records notes from any input against the metronome (R11, R12). */
function useRecorder() {
  const [phase, setPhase] = useState<Phase>('idle')
  const [bar, setBar] = useState(0)
  const notes = useRef<RecordedNote[]>([])
  const held = useRef(new Map<number, number>())
  const start = useRef(0)
  const opts = useRef<{ bpm: number; sig: TimeSigName }>({ bpm: 96, sig: '4/4' })

  useEffect(() => {
    if (phase === 'idle') return
    const offBus = bus.subscribe((e) => {
      if (e.kind === 'on') held.current.set(e.midi, e.time)
      else if (e.kind === 'off') {
        const on = held.current.get(e.midi)
        held.current.delete(e.midi)
        // Notes a little ahead of beat 1 still count; snapping pulls them onto it.
        if (on !== undefined && on >= start.current - 60 / opts.current.bpm / 4) notes.current.push({ midi: e.midi, on, off: e.time })
      }
    })
    const timer = setInterval(() => {
      const spb = 60 / opts.current.bpm
      const t = now()
      if (t >= start.current) {
        setPhase('rec')
        setBar(Math.floor((t - start.current) / spb / clicksPerBar(opts.current.sig)) + 1)
      }
    }, 50)
    return () => {
      offBus()
      clearInterval(timer)
    }
  }, [phase])

  useEffect(() => () => useMetronome.getState().stop(), [])

  const begin = (sig?: TimeSigName) => {
    const m = useMetronome.getState()
    if (sig && m.sig !== sig) m.setSig(sig)
    opts.current = { bpm: m.bpm, sig: sig ?? m.sig }
    notes.current = []
    held.current.clear()
    const first = m.start()
    // One bar of count-in clicks, then beat 1 of bar 1.
    start.current = first + (clicksPerBar(opts.current.sig) * 60) / m.bpm
    setBar(0)
    setPhase('count')
  }

  /** Stops and returns the notes (still-held keys end now), or null when nothing was played. */
  const finish = (): { notes: RecordedNote[]; start: number; bpm: number; sig: TimeSigName } | null => {
    useMetronome.getState().stop()
    const t = now()
    for (const [midi, on] of held.current) if (on >= start.current - 0.2) notes.current.push({ midi, on, off: t })
    held.current.clear()
    setPhase('idle')
    if (!notes.current.length) return null
    return { notes: notes.current, start: start.current, ...opts.current }
  }

  const countLeft = phase === 'count' ? Math.max(1, Math.ceil((start.current - now()) / (60 / opts.current.bpm))) : 0
  return { phase, bar, countLeft, begin, finish }
}

const toSig = (sig: TimeSigName) => sig.split('/').map(Number) as [number, number]

/** Adult: record with the metronome's tempo and time, then review (R11). */
export function RecordPanel() {
  const { t } = useT()
  const nav = useNavigate()
  const rec = useRecorder()
  const setPending = useSession((s) => s.setPendingReview)
  const [empty, setEmpty] = useState(false)
  useTick(rec.phase !== 'idle')

  const stop = () => {
    const r = rec.finish()
    if (!r) return setEmpty(true)
    const title = t('record.untitled', { date: new Date().toLocaleString(i18n.language, { dateStyle: 'medium', timeStyle: 'short' }) })
    const song = recordingToSong(r.notes, { bpm: r.bpm, timeSig: toSig(r.sig), start: r.start, id: newSongId(title), title })
    setPending({ song, warnings: checkSong(song, []), origin: 'recording' })
    nav('/songs/review')
  }

  return (
    <div className="flex flex-wrap items-center gap-2" data-testid="record-panel">
      {rec.phase === 'idle' ? (
        <Button
          onClick={() => {
            setEmpty(false)
            rec.begin()
          }}
        >
          <Icon name="record" className="text-accent" /> {t('record.start')}
        </Button>
      ) : (
        <Button variant="primary" onClick={stop} aria-live="polite">
          <Icon name="stop" /> {t('record.stop')} · {rec.phase === 'count' ? t('record.countIn', { n: rec.countLeft }) : t('record.recording', { bar: rec.bar })}
        </Button>
      )}
      {empty ? <span className="text-sm text-muted" role="status">{t('record.empty')}</span> : rec.phase === 'idle' && <span className="text-sm text-muted max-w-80">{t('record.hint')}</span>}
    </div>
  )
}

/** Kid: one big button; the song is named and saved straight away with a celebration (R12). */
export function KidRecord() {
  const { t } = useT()
  const rec = useRecorder()
  const add = useSession((s) => s.addImportedSong)
  const name = useProgress((s) => s.name.trim())
  const [saved, setSaved] = useState<Song | null>(null)
  const [empty, setEmpty] = useState(false)
  const player = useSongPlayer(saved)
  useTick(rec.phase !== 'idle')

  const stop = () => {
    const r = rec.finish()
    if (!r) return setEmpty(true)
    const titleIn = (lng: string, n: number) => i18n.getFixedT(lng)(name ? 'kid.record.named' : 'kid.record.mine', { name, n })
    // Next number after the highest one already used for this name.
    const pattern = new RegExp(`^${titleIn('en', 0).replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/0$/, '(\\d+)$')}`)
    const used = useSession.getState().importedSongs.map((s) => Number(pattern.exec(s.title.en)?.[1] ?? 0))
    const n = Math.max(0, ...used) + 1
    const en = titleIn('en', n)
    const song: Song = { ...recordingToSong(r.notes, { bpm: r.bpm, timeSig: [4, 4], start: r.start, id: newSongId(en), title: en }), title: { en, vi: titleIn('vi', n) } }
    add(song)
    setSaved(song)
  }

  const big = 'min-h-16 px-6 text-xl font-extrabold rounded-full'
  if (saved && rec.phase === 'idle')
    return (
      <div className="rounded-[var(--radius)] bg-panel p-4" data-testid="kid-record-done">
        <Celebration>
          <p className="text-2xl font-extrabold">{t('kid.record.saved')}</p>
          <p className="text-xl" data-testid="kid-record-title">
            {saved.title[i18n.language === 'vi' ? 'vi' : 'en']}
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            <Button className={big} onClick={() => (player.playing ? player.stop() : player.play(0))} aria-pressed={player.playing}>
              <Icon name={player.playing ? 'stop' : 'speaker'} size={28} /> {player.playing ? t('kid.record.stop') : t('kid.record.listen')}
            </Button>
            <Button
              className={big}
              onClick={() => {
                player.stop()
                setSaved(null)
                rec.begin('4/4')
              }}
            >
              <Icon name="record" size={28} className="text-accent" /> {t('kid.record.again')}
            </Button>
          </div>
        </Celebration>
      </div>
    )
  return (
    <div className="flex flex-wrap items-center gap-3" data-testid="kid-record">
      {rec.phase === 'idle' ? (
        <Button
          className={big}
          onClick={() => {
            setEmpty(false)
            rec.begin('4/4')
          }}
        >
          <Icon name="record" size={28} className="text-accent" /> {t('kid.record.start')}
        </Button>
      ) : (
        <Button variant="primary" className={big} onClick={stop}>
          <Icon name="stop" size={28} /> {t('kid.record.stop')}
        </Button>
      )}
      <span className="text-xl font-bold" aria-live="polite">
        {rec.phase === 'count' ? `${t('kid.record.ready')} ${rec.countLeft}` : rec.phase === 'rec' ? t('kid.record.go') : empty ? t('kid.record.empty') : ''}
      </span>
    </div>
  )
}

/** Re-render a few times a second while recording so the count-in number moves. */
function useTick(on: boolean) {
  const [, set] = useState(0)
  useEffect(() => {
    if (!on) return
    const id = setInterval(() => set((n) => n + 1), 100)
    return () => clearInterval(id)
  }, [on])
}
