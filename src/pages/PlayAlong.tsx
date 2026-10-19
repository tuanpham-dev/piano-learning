import { useCallback, useEffect, useMemo, useState } from 'react'
import { Icon } from '../components/Icon'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { Page } from '../app/Layout'
import { useT } from '../app/i18n'
import { useSong, useAllSongs } from './Library'
import { usePlayAlong, type PlayResult } from '../hooks/usePlayAlong'
import { useInputs } from '../input/useInputs'
import { useProgress, type Hands, type NotationView } from '../store/progress'
import { useMetronome } from '../audio/metronome'
import { GrandStaff, type NoteColorFn } from '../notation/Staff'
import { Lane } from '../notation/Lane'
import { Keyboard, type KeyMark } from '../notation/Keyboard'
import { snapRange } from '../notation/geometry'
import { cssVar } from '../notation/note-colors'
import { InputPanel } from '../components/InputPanel'
import { BottomSheet } from '../components/BottomSheet'
import { useNarrow } from '../hooks/useMedia'
import { Button, PrimaryButton } from '../components/PrimaryButton'
import { Segmented } from '../components/Segmented'
import { Stars } from '../components/Stars'
import { Celebration } from '../components/Celebration'
import { Mascot } from '../components/Mascot'
import { barCount, chordBeats, noteRange, type Song, type TimedNote } from '../engine/song'
import type { PlayMode } from '../engine/playalong'
import { usePracticeClock } from '../hooks/usePracticeClock'
import { useLessonRun, LessonBanner } from '../hooks/useLessonRun'

export function PlayAlongPage() {
  const { id } = useParams()
  const song = useSong(id)
  const { t } = useT()
  if (!song)
    return (
      <Page title={t('modes.songs')} back="/songs">
        <p className="text-muted">{t('songs.notFound')}</p>
      </Page>
    )
  return <PlayAlongScreen key={song.id} song={song} />
}

function keyboardRange(song: Song): [number, number] {
  const [lo, hi] = noteRange(song)
  let a = lo - 2
  let b = hi + 2
  while (b - a < 24) {
    a--
    b++
  }
  return snapRange(Math.max(21, a), Math.min(108, b))
}

function PlayAlongScreen({ song }: { song: Song }) {
  const { t, L, kid } = useT()
  const nav = useNavigate()
  const [params] = useSearchParams()
  const lessonRun = useLessonRun()
  const settings = useProgress((s) => s.settings)
  const update = useProgress((s) => s.updateSettings)
  const [hands, setHands] = useState<Hands>((params.get('hands') as Hands) || (kid ? 'R' : 'LR'))
  const [mode, setMode] = useState<PlayMode>((params.get('mode') as PlayMode) || 'wait')
  const [tempo, setTempo] = useState(kid ? 80 : 100)
  const [loopOn, setLoopOn] = useState(false)
  const total = barCount(song)
  const [loopFrom, setLoopFrom] = useState(1)
  const [loopTo, setLoopTo] = useState(Math.min(4, total))
  const [askHand, setAskHand] = useState(false)
  const [win, setWin] = useState<[number, number]>(() => keyboardRange(song))
  const range = useMemo(() => keyboardRange(song), [song])
  usePracticeClock('songs')
  const narrow = useNarrow()

  const micMelody = mode === 'wait' && hands !== 'LR'
  const { screen, micOn } = useInputs({ allowMic: micMelody })

  // Turning the mic on while both hands are selected asks which hand (R10).
  useEffect(() => {
    if (settings.inputs.mic && hands === 'LR' && mode === 'wait') setAskHand(true)
  }, [settings.inputs.mic, hands, mode])

  const bars: [number, number] | undefined = loopOn ? [Math.max(0, loopFrom - 1), Math.max(loopFrom - 1, Math.min(total - 1, loopTo - 1))] : undefined
  const pa = usePlayAlong({ song, hands, mode, tempoPct: tempo, bars, loop: loopOn })
  const { snap, result } = pa

  useEffect(() => () => useMetronome.getState().stop(), [])

  // Lessons that use a song report when it's finished.
  useEffect(() => {
    if (!result || !lessonRun.lesson) return
    lessonRun.report({ completed: true, percent: result.score?.percent })
  }, [result])

  const chordSteps = useMemo(() => new Set(hands === 'LR' ? [] : chordBeats(song.hands[hands])), [song, hands])
  const atChord = micOn && snap.due.length > 0 && chordSteps.has(snap.due[0]!.startBeat)

  const highlight = useMemo(() => {
    const m = new Map<number, KeyMark>()
    for (const n of snap.due) m.set(n.midi, kid || n.hand === 'R' ? 'due' : 'dueL')
    if (snap.wrong !== null) m.set(snap.wrong, 'wrong')
    return m
  }, [snap.due, snap.wrong, kid])

  const colorFn: NoteColorFn = useMemo(() => {
    const ok = cssVar('--color-ok')
    const accent = cssVar('--color-accent')
    const muted = cssVar('--color-muted')
    const warn = cssVar('--color-warn')
    const left = cssVar('--color-lh')
    const map = new Map<string, string>()
    pa.engine.notes.forEach((n, i) => {
      const st = snap.states[i]
      const c = st === 'due' ? accent : st === 'hit' ? ok : st === 'missed' ? muted : st === 'early' || st === 'late' ? warn : undefined
      if (c) map.set(`${n.hand}:${n.startBeat}:${n.midi}`, c)
      else if (!kid && n.hand === 'L' && hands === 'LR') map.set(`${n.hand}:${n.startBeat}:${n.midi}`, left)
    })
    return (hand, start, midi) => map.get(`${hand}:${start}:${midi}`)
  }, [snap.states, pa.engine, kid, hands])

  // Keep the keys the learner needs in view: due notes, or before starting, the first notes of the selected hands.
  // On a narrow keyboard both hands may not fit; the right hand wins.
  const focusNotes = useMemo(() => {
    const pool = snap.due.length ? snap.due : pa.engine.notes.filter((n) => Math.abs(n.startBeat - (pa.engine.notes[0]?.startBeat ?? 0)) < 1e-6)
    const right = pool.filter((n) => n.hand === 'R')
    return (right.length ? right : pool).map((n) => n.midi)
  }, [snap.due, pa.engine])
  const onWindow = useCallback((lo: number, hi: number) => setWin((w) => (w[0] === lo && w[1] === hi ? w : [lo, hi])), [])
  const stateIndex = useMemo(() => new Map(pa.engine.notes.map((n, i) => [`${n.hand}:${n.startBeat}:${n.midi}`, i])), [pa.engine])
  const getNoteState = useCallback(
    (n: TimedNote) => {
      const i = stateIndex.get(`${n.hand}:${n.startBeat}:${n.midi}`)
      return i === undefined ? undefined : pa.engine.states[i]
    },
    [stateIndex, pa.engine],
  )
  const view = settings.view
  const running = snap.status !== 'idle' && snap.status !== 'done'
  const curBar = Math.min(total, Math.floor(snap.staffBeat / pa.beatsPerBar) + 1)
  const songs = useAllSongs()
  const nextSong = songs[(songs.findIndex((s) => s.id === song.id) + 1) % songs.length]

  const controls = kid ? (
    <div className="flex flex-wrap items-center justify-center gap-3">
      <Button onClick={pa.listen} className="text-lg font-extrabold">
        <Icon name="speaker" /> {t('play.listen')}
      </Button>
      <PrimaryButton onClick={running ? pa.stop : pa.start} className="text-xl min-w-36">
        {running ? (
          <>
            <Icon name="stop" /> {t('play.stop')}
          </>
        ) : (
          <>
            <Icon name="play" /> {t('common.play')}
          </>
        )}
      </PrimaryButton>
      <Button onClick={() => setTempo(tempo === 60 ? 80 : 60)} aria-pressed={tempo === 60} className={`text-lg font-extrabold ${tempo === 60 ? 'bg-panel' : ''}`}>
        <Icon name="turtle" size={22} /> {t('kid.play.slower')}
      </Button>
      <Segmented<Hands>
        id="kid-hands"
        value={hands}
        onChange={setHands}
        options={[
          { value: 'L', label: t('play.left') },
          { value: 'R', label: t('play.right') },
          { value: 'LR', label: t('play.both') },
        ]}
      />
      <Button onClick={() => setMode(mode === 'wait' ? 'perform' : 'wait')} aria-pressed={mode === 'perform'} className={mode === 'perform' ? 'bg-panel font-extrabold' : ''}>
        <span className="text-nE">
          <Icon name="star" />
        </span>{' '}
        {t('kid.play.challenge')}
      </Button>
    </div>
  ) : null

  const titleBlock = (
    <div className="min-w-0">
      <div className="font-semibold text-base truncate">{L(song.title)}</div>
      <div className="text-muted text-xs">
        {song.composer} · {t('play.barOf', { bar: curBar, total })}
      </div>
    </div>
  )

  const actions = (
    <div className="flex gap-2 ml-auto">
      <Button onClick={pa.listen}>
        <Icon name="speaker" /> {t('play.listen')}
      </Button>
      {running ? (
        <Button onClick={pa.stop}>
          <Icon name="stop" /> {t('play.stop')}
        </Button>
      ) : (
        <Button variant="primary" onClick={pa.start}>
          <Icon name="play" /> {snap.status === 'done' ? t('play.restart') : t('play.start')}
        </Button>
      )}
    </div>
  )

  const settingsRow = (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
      <Segmented<PlayMode>
        id="pa-mode"
        label={t('play.mode')}
        value={mode}
        onChange={setMode}
        options={[
          { value: 'wait', label: t('play.wait') },
          { value: 'perform', label: t('play.perform') },
        ]}
      />
      <label className="inline-flex items-center gap-2" htmlFor="pa-tempo">
        {t('play.tempo')}
        <input
          id="pa-tempo"
          type="range"
          min={25}
          max={150}
          step={5}
          value={tempo}
          onChange={(e) => setTempo(Number(e.target.value))}
          className="w-24 accent-[var(--color-accent)]"
        />
        <span className="tabular w-10">{tempo}%</span>
      </label>
      <Segmented<Hands>
        id="pa-hands"
        label={t('play.hands')}
        value={hands}
        onChange={setHands}
        options={[
          { value: 'L', label: t('play.left') },
          { value: 'R', label: t('play.right') },
          { value: 'LR', label: t('play.both') },
        ]}
      />
      <span className="inline-flex items-center gap-1.5">
        <label className="inline-flex items-center gap-1.5" htmlFor="pa-loop">
          <input id="pa-loop" type="checkbox" className="size-4 accent-[var(--color-accent)]" checked={loopOn} onChange={(e) => setLoopOn(e.target.checked)} />
          {t('play.loop')}
        </label>
        <input
          id="pa-loop-from"
          type="number"
          min={1}
          max={total}
          value={loopFrom}
          onChange={(e) => setLoopFrom(Math.max(1, Math.min(total, Number(e.target.value))))}
          className="w-12 rounded border border-line bg-bg px-1"
          aria-label="Loop from bar"
        />
        {t('play.to')}
        <input
          id="pa-loop-to"
          type="number"
          min={1}
          max={total}
          value={loopTo}
          onChange={(e) => setLoopTo(Math.max(1, Math.min(total, Number(e.target.value))))}
          className="w-12 rounded border border-line bg-bg px-1"
          aria-label="Loop to bar"
        />
      </span>
      <Segmented<NotationView>
        id="pa-view"
        label={t('play.view')}
        value={view}
        onChange={(v) => update({ view: v })}
        options={[
          { value: 'staff', label: t('settings.viewStaff') },
          { value: 'lane', label: t('settings.viewLane') },
          { value: 'both', label: t('settings.viewBoth') },
        ]}
      />
    </div>
  )
  const inputPanel = <InputPanel inline={narrow} micAllowed micDisabledReason={mode === 'wait' ? undefined : t('play.micNeedsWait')} />

  return (
    <Page title={L(song.title)} back="/songs" fill>
      <div className="flex flex-col gap-2 py-2 flex-1">
        {lessonRun.lesson && <LessonBanner run={lessonRun} />}
        {kid ? (
          controls
        ) : (
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
            {titleBlock}
            {!narrow && settingsRow}
            {actions}
          </div>
        )}
        <p className="text-sm text-muted min-h-5" aria-live="polite">
          {snap.status === 'countIn'
            ? t('play.countIn')
            : atChord
              ? t('play.micChord')
              : mode === 'wait'
                ? kid
                  ? t('kid.play.waitHint')
                  : t('play.waitHint')
                : t('play.performHint')}
        </p>
        {askHand && (
          <div className="flex flex-wrap items-center gap-3 rounded-[var(--radius)] border border-accent p-3" role="dialog" aria-label={t('play.whichHand')}>
            <strong>{t('play.whichHand')}</strong>
            <Button
              onClick={() => {
                setHands('R')
                setMode('wait')
                setAskHand(false)
              }}
            >
              {t('play.right')}
            </Button>
            <Button
              onClick={() => {
                setHands('L')
                setMode('wait')
                setAskHand(false)
              }}
            >
              {t('play.left')}
            </Button>
            <Button
              variant="ghost"
              onClick={() => {
                update({ inputs: { ...settings.inputs, mic: false } })
                setAskHand(false)
              }}
            >
              {t('play.micOff')}
            </Button>
          </div>
        )}
        {atChord && (
          <div className="rounded-[var(--radius)] bg-warn/15 px-3 py-2 text-sm" role="status">
            {t('play.micPart')}
          </div>
        )}
        <div className="flex-1 flex flex-col justify-end gap-1">
          {view !== 'lane' && (
            <div>
              <GrandStaff song={song} cursorBeat={snap.staffBeat} color={colorFn} kid={kid} hands="LR" />
            </div>
          )}
          {view !== 'staff' && (
            <Lane
              notes={pa.allNotes}
              low={win[0]}
              high={win[1]}
              getCursor={pa.cursor}
              getNoteState={getNoteState}
              kid={kid}
              height={view === 'both' ? 120 : 260}
              beatsPerBar={pa.beatsPerBar}
              activeHands={hands}
            />
          )}
          <Keyboard
            low={range[0]}
            high={range[1]}
            highlight={highlight}
            focus={focusNotes}
            kid={kid}
            showNames={settings.noteNames}
            interactive={screen}
            onWindow={onWindow}
            height={kid ? 150 : 130}
          />
        </div>
      </div>
      {kid ? (
        <div className="py-2">{inputPanel}</div>
      ) : narrow ? (
        <BottomSheet
          label={t('play.settings')}
          summary={`${mode === 'wait' ? t('play.wait') : t('play.perform')} · ${tempo}% · ${hands === 'LR' ? t('play.both') : hands === 'R' ? t('play.right') : t('play.left')}`}
        >
          {settingsRow}
          <div className="-mx-[max(16px,env(safe-area-inset-left,0px))]">{inputPanel}</div>
        </BottomSheet>
      ) : (
        <div className="-mx-[max(16px,env(safe-area-inset-left,0px))]">{inputPanel}</div>
      )}
      {result && !(kid && lessonRun.lesson) && (
        <ResultCard
          song={song}
          result={result}
          tempo={tempo}
          onAgain={() => {
            pa.dismissResult()
            pa.start()
          }}
          onClose={pa.dismissResult}
          onLoop={(from, to) => {
            setLoopFrom(from)
            setLoopTo(to)
            setLoopOn(true)
            pa.dismissResult()
          }}
          onFullTempo={() => {
            setTempo(100)
            pa.dismissResult()
          }}
          onPerform={() => {
            setMode('perform')
            pa.dismissResult()
          }}
          onNext={() => nextSong && nav(`/songs/${nextSong.id}`)}
        />
      )}
    </Page>
  )
}

function ResultCard({
  song,
  result,
  tempo,
  onAgain,
  onClose,
  onLoop,
  onFullTempo,
  onPerform,
  onNext,
}: {
  song: Song
  result: PlayResult
  tempo: number
  onAgain: () => void
  onClose: () => void
  onLoop: (from: number, to: number) => void
  onFullTempo: () => void
  onPerform: () => void
  onNext: () => void
}) {
  const { t, L, kid } = useT()
  const name = useProgress((s) => s.name)
  const s = result.score
  const stars = result.mode === 'perform' ? result.stars : result.firstTime ? 1 : 0
  const passed = result.mode === 'wait' || (s?.percent ?? 0) >= 60

  return (
    <div className="fixed inset-0 z-40 grid place-items-center bg-fg/40 p-4" role="dialog" aria-modal="true">
      <div className={`w-full max-w-lg rounded-[var(--radius)] bg-bg p-6 shadow-2xl grid gap-4 ${kid ? 'text-center' : ''}`}>
        {kid ? (
          <>
            {passed ? (
              <Celebration stickers={result.newBadges}>
                <h2 className="text-3xl font-extrabold">{name ? t('kid.result.great', { name }) : t('kid.result.greatNoName')}</h2>
                <Stars count={Math.max(stars, result.mode === 'wait' ? 1 : 0)} size={48} />
              </Celebration>
            ) : (
              <div className="grid justify-items-center gap-3">
                <Mascot mood="thinking" size={100} />
                <h2 className="text-2xl font-extrabold">{t('kid.result.again')}</h2>
                <Stars count={stars} size={40} />
              </div>
            )}
            <div className="flex flex-wrap justify-center gap-3">
              <Button onClick={onAgain} className="text-lg font-extrabold">
                ↺ {t('common.playAgain')}
              </Button>
              <PrimaryButton onClick={onNext}>{t('kid.result.nextSong')} ▶</PrimaryButton>
            </div>
          </>
        ) : (
          <>
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-xl font-bold">
                {result.mode === 'perform' ? t('result.performTitle', { title: L(song.title) }) : t('result.waitTitle', { title: L(song.title) })}
              </h2>
              {result.newBest && <span className="rounded-full bg-ok/15 text-ok px-2 py-0.5 text-sm">{t('result.newBest')}</span>}
            </div>
            {s ? (
              <>
                <div className="flex items-center gap-3">
                  <span className="text-4xl font-bold tabular">{s.percent}%</span>
                  <Stars count={stars} size={30} />
                </div>
                <p className="text-sm tabular">{t('result.counts', { hit: s.hit, early: s.early, late: s.late, missed: s.missed })}</p>
                {s.hit + s.early + s.late > 0 && (
                  <p className="text-sm tabular text-muted">
                    {Math.abs(s.avgOffsetMs) < 10
                      ? t('result.offsetOn')
                      : s.avgOffsetMs > 0
                        ? t('result.offsetLate', { ms: s.avgOffsetMs })
                        : t('result.offsetEarly', { ms: -s.avgOffsetMs })}
                    {s.perHand.R !== undefined && s.perHand.L !== undefined && ` · ${t('result.perHand', { r: s.perHand.R, l: s.perHand.L })}`}
                  </p>
                )}
                {result.missedBars.length > 0 && (
                  <div className="flex flex-wrap items-center gap-2 text-sm">
                    {t('result.missedBars', { bars: result.missedBars.map((b) => b + 1).join(', ') })}
                    <Button onClick={() => onLoop(result.missedBars[0]! + 1, result.missedBars[result.missedBars.length - 1]! + 1)}>
                      {t('result.loopMissed', { from: result.missedBars[0]! + 1, to: result.missedBars[result.missedBars.length - 1]! + 1 })}
                    </Button>
                  </div>
                )}
              </>
            ) : (
              <p>
                {t('result.waitDone')} {result.firstTime && t('result.firstStar')}
              </p>
            )}
            {result.newBadges.length > 0 && (
              <p className="text-sm inline-flex items-center gap-1">
                <Icon name="medal" /> {result.newBadges.map((b) => t(`badges.${b}`)).join(', ')}
              </p>
            )}
            <div className="flex flex-wrap gap-2">
              <Button variant="primary" onClick={onAgain}>
                {t('common.playAgain')}
              </Button>
              {result.mode === 'perform' && tempo < 100 && <Button onClick={onFullTempo}>{t('result.tryFull')}</Button>}
              {result.mode === 'wait' && <Button onClick={onPerform}>{t('result.tryPerform')}</Button>}
              <Link to="/songs" className="inline-flex items-center rounded-[var(--radius)] border border-fg/70 px-4 min-h-[var(--touch)]" onClick={onClose}>
                {t('result.library')}
              </Link>
            </div>
          </>
        )}
        <button type="button" className="text-sm text-muted justify-self-center" onClick={onClose}>
          {t('common.close')}
        </button>
      </div>
    </div>
  )
}
