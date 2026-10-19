import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Page } from '../app/Layout'
import { useT } from '../app/i18n'
import { useEditor, type Length } from '../store/editor'
import { useSession } from '../store/session'
import { barBeats, barTokens, draftToSong, evenHands, noteToken, restBar, songToDraft, type Draft } from '../engine/song-text'
import { beatsPerBar } from '../engine/song'
import { checkSong } from '../engine/song-check'
import { writeSongFile, splitBars } from '../engine/song-file'
import { downloadText, songFileName } from '../store/download'
import { GrandStaff } from '../notation/Staff'
import { Keyboard } from '../notation/Keyboard'
import { InputPanel } from '../components/InputPanel'
import { Button, PrimaryButton } from '../components/PrimaryButton'
import { Segmented } from '../components/Segmented'
import { Icon } from '../components/Icon'
import { useSongPlayer } from '../components/SongPlayer'
import { useWarningText } from '../components/WarningText'
import { useInputs } from '../input/useInputs'
import { bus } from '../input/bus'
import { AiConnectButton, AiActivityList, AiStatusLine } from '../ai/AiControls'
import { useAi } from '../ai/bridge'

const LENGTHS: Length[] = ['w', 'h', 'q', 'e', 's']

/** A small note glyph for the length palette (music symbols are missing from the UI font). */
function NoteGlyph({ length }: { length: Length }) {
  const filled = length !== 'w' && length !== 'h'
  const flags = length === 'e' ? 1 : length === 's' ? 2 : 0
  return (
    <svg width="18" height="22" viewBox="0 0 18 22" aria-hidden className="inline-block">
      <ellipse cx="6" cy="17" rx="4.6" ry="3.4" transform="rotate(-20 6 17)" fill={filled ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.6" />
      {length !== 'w' && <line x1="10.2" y1="16" x2="10.2" y2="2" stroke="currentColor" strokeWidth="1.6" />}
      {Array.from({ length: flags }, (_, i) => (
        <path key={i} d={`M10.2 ${2 + i * 4} q5 3 4 8`} fill="none" stroke="currentColor" strokeWidth="1.6" />
      ))}
    </svg>
  )
}
const KEYS = ['C', 'G', 'D', 'A', 'E', 'B', 'F#', 'F', 'Bb', 'Eb', 'Ab', 'Db', 'Am', 'Em', 'Bm', 'Dm', 'Gm', 'Cm']
const TIME_SIGS = ['2/4', '3/4', '4/4', '6/8']
/** Keys pressed within this window form one chord. */
const CHORD_MS = 60

export function SongEditorPage() {
  const { id } = useParams()
  const { t } = useT()
  const draft = useEditor((s) => s.draft)
  const songId = useEditor((s) => s.songId)
  const own = useSession((s) => s.importedSongs)
  // Open the requested song unless the editor already holds it ("draft" = whatever is open).
  useEffect(() => {
    if (!id || id === 'draft') return
    const st = useEditor.getState()
    if (st.draft && (st.songId === id || st.draft.id === id)) return
    const song = own.find((s) => s.id === id)
    if (song) st.open(songToDraft(song), song.id)
  }, [id, own])
  if (!draft || (id !== 'draft' && songId !== id && draft.id !== id && !own.some((s) => s.id === id)))
    return (
      <Page title={t('editor.title')} back="/songs">
        <p className="text-muted">{t('editor.notFound')}</p>
      </Page>
    )
  return <Editor />
}

function Editor() {
  const { t } = useT()
  const nav = useNavigate()
  const ed = useEditor()
  const draft = ed.draft!
  const add = useSession((s) => s.addImportedSong)
  const [mode, setMode] = useState<'play' | 'text'>('play')
  const [leaving, setLeaving] = useState<string | null>(null)
  const [savedFlash, setSavedFlash] = useState(false)
  const warningText = useWarningText()
  const { screen } = useInputs({ allowMic: true })

  const even = useMemo(() => evenHands(draft), [draft])
  const { song, issues } = useMemo(() => draftToSong(draft), [draft])
  const warnings = useMemo(() => checkSong(song, issues), [song, issues])
  const bars = even.right.length
  const barLen = beatsPerBar(draft.timeSig)
  const cur = ed.cursor
  const handBars = cur.hand === 'R' ? even.right : even.left
  const barText = handBars[cur.bar] ?? ''
  const tokens = barTokens(barText)
  const player = useSongPlayer(song)

  // play_song from the AI: play the asked bars here, with the staff cursor following.
  const aiPlay = useAi((s) => s.play)
  const playRef = useRef(player.play)
  playRef.current = player.play
  useEffect(() => {
    if (!aiPlay) return
    useEditor.getState().setCursor({ bar: aiPlay.fromBar - 1, index: 0 })
    playRef.current((aiPlay.fromBar - 1) * barLen, aiPlay.toBar * barLen)
  }, [aiPlay, barLen])

  const setBarText = useCallback(
    (hand: 'R' | 'L', bar: number, text: string) => {
      const d = evenHands(useEditor.getState().draft!)
      const list = [...(hand === 'R' ? d.right : d.left)]
      list[bar] = text.trim() || restBar(d.timeSig)
      useEditor.getState().apply(hand === 'R' ? { ...d, right: list } : { ...d, left: list })
    },
    [],
  )

  /** Insert a token at the cursor; when the bar fills up, move on to the next bar (adding one at the end). */
  const insert = useCallback(
    (token: string) => {
      const st = useEditor.getState()
      const d = evenHands(st.draft!)
      const c = st.cursor
      const list = c.hand === 'R' ? d.right : d.left
      // A bar that is only the default rest is treated as empty.
      const existing = list[c.bar] === restBar(d.timeSig) ? [] : barTokens(list[c.bar] ?? '')
      const index = Math.min(c.index, existing.length)
      const next = [...existing.slice(0, index), token, ...existing.slice(index)]
      setBarText(c.hand, c.bar, next.join(' '))
      if (barBeats(next.join(' ')) >= beatsPerBar(d.timeSig) - 1e-6) {
        const after = useEditor.getState().draft!
        const total = evenHands(after).right.length
        if (c.bar + 1 >= total) useEditor.getState().apply(evenHands({ ...after, right: [...evenHands(after).right, restBar(d.timeSig)], left: [...evenHands(after).left, restBar(d.timeSig)] }))
        st.setCursor({ bar: c.bar + 1, index: 0 })
      } else st.setCursor({ index: index + 1 })
    },
    [setBarText],
  )

  const deleteBefore = useCallback(() => {
    const st = useEditor.getState()
    const c = st.cursor
    if (c.index === 0) {
      if (c.bar > 0) {
        const prev = barTokens((c.hand === 'R' ? evenHands(st.draft!).right : evenHands(st.draft!).left)[c.bar - 1] ?? '')
        st.setCursor({ bar: c.bar - 1, index: prev.length })
      }
      return
    }
    const list = barTokens((c.hand === 'R' ? evenHands(st.draft!).right : evenHands(st.draft!).left)[c.bar] ?? '')
    list.splice(c.index - 1, 1)
    setBarText(c.hand, c.bar, list.join(' '))
    st.setCursor({ index: c.index - 1 })
  }, [setBarText])

  // Notes from any input go into the bar at the cursor; keys within 60 ms form a chord (R7).
  const pendingChord = useRef<{ midis: number[]; timer: ReturnType<typeof setTimeout> } | null>(null)
  useEffect(() => {
    if (mode !== 'play') return
    return bus.subscribe((e) => {
      if (e.kind !== 'on') return
      const active = document.activeElement as HTMLElement | null
      if (active && ['INPUT', 'TEXTAREA', 'SELECT'].includes(active.tagName)) return
      const p = pendingChord.current
      if (p) {
        p.midis.push(e.midi)
        return
      }
      const entry = { midis: [e.midi], timer: setTimeout(() => {
        pendingChord.current = null
        const st = useEditor.getState()
        insert(noteToken(entry.midis, st.length, st.dot, st.finger, st.draft!.keySig))
      }, CHORD_MS) }
      pendingChord.current = entry
    })
  }, [mode, insert])

  // Keyboard shortcuts in the play-to-enter view.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(el.tagName)) return
      const st = useEditor.getState()
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
        e.preventDefault()
        if (e.shiftKey) st.redo()
        else st.undo()
        return
      }
      if (mode !== 'play') return
      const c = st.cursor
      const list = c.hand === 'R' ? evenHands(st.draft!).right : evenHands(st.draft!).left
      if (e.key === 'Backspace') {
        e.preventDefault()
        deleteBefore()
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault()
        if (c.index > 0) st.setCursor({ index: c.index - 1 })
        else if (c.bar > 0) st.setCursor({ bar: c.bar - 1, index: barTokens(list[c.bar - 1] ?? '').length })
      } else if (e.key === 'ArrowRight') {
        e.preventDefault()
        const n = barTokens(list[c.bar] ?? '').length
        if (c.index < n) st.setCursor({ index: c.index + 1 })
        else if (c.bar + 1 < list.length) st.setCursor({ bar: c.bar + 1, index: 0 })
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [mode, deleteBefore])

  const save = () => {
    const { song } = draftToSong(useEditor.getState().draft!)
    add(song)
    ed.markSaved(song.id)
    setSavedFlash(true)
    setTimeout(() => setSavedFlash(false), 1500)
    nav(`/songs/edit/${song.id}`, { replace: true })
  }

  // Unsaved-changes guard for in-app links and closing the tab (R10).
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (!useEditor.getState().dirty) return
      const a = (e.target as HTMLElement).closest('a[href]') as HTMLAnchorElement | null
      if (!a || a.target === '_blank' || a.origin !== location.origin) return
      e.preventDefault()
      e.stopPropagation()
      setLeaving(a.pathname + a.search)
    }
    const onUnload = (e: BeforeUnloadEvent) => {
      if (useEditor.getState().dirty) e.preventDefault()
    }
    document.addEventListener('click', onClick, true)
    window.addEventListener('beforeunload', onUnload)
    return () => {
      document.removeEventListener('click', onClick, true)
      window.removeEventListener('beforeunload', onUnload)
    }
  }, [])

  const info = (patch: Partial<Draft>) => ed.apply({ ...draft, ...patch })
  const cursorBeat = cur.bar * barLen + barBeats(tokens.slice(0, cur.index).join(' '))
  const getCursor = useCallback(() => (player.playing ? player.cursor() : cursorBeat), [player, cursorBeat])
  const field = 'rounded border border-line bg-bg px-2 min-h-9'
  const curWarnings = warnings.filter((w) => w.bar === cur.bar + 1)

  return (
    <Page title={t('editor.title')} back="/songs" fill>
      <div className="flex flex-col gap-3 py-3 flex-1">
        {/* Song details */}
        <div className="flex flex-wrap items-end gap-2 text-sm">
          <label className="grid gap-0.5" htmlFor="ed-title">
            {t('editor.songTitle')}
            <input id="ed-title" className={`${field} w-52`} value={draft.title.en} onChange={(e) => info({ title: { en: e.target.value, vi: draft.title.vi === draft.title.en ? e.target.value : draft.title.vi } })} />
          </label>
          <label className="grid gap-0.5" htmlFor="ed-title-vi">
            {t('editor.titleVi')}
            <input id="ed-title-vi" className={`${field} w-44`} value={draft.title.vi} onChange={(e) => info({ title: { ...draft.title, vi: e.target.value } })} />
          </label>
          <label className="grid gap-0.5" htmlFor="ed-composer">
            {t('editor.composer')}
            <input id="ed-composer" className={`${field} w-40`} value={draft.composer} onChange={(e) => info({ composer: e.target.value })} />
          </label>
          <label className="grid gap-0.5" htmlFor="ed-tempo">
            {t('editor.tempo')}
            <input id="ed-tempo" type="number" min={30} max={240} className={`${field} w-20`} value={draft.bpm} onChange={(e) => info({ bpm: Math.max(30, Math.min(240, Number(e.target.value) || 90)) })} />
          </label>
          <label className="grid gap-0.5" htmlFor="ed-time">
            {t('editor.timeSig')}
            <select id="ed-time" className={field} value={draft.timeSig.join('/')} onChange={(e) => info({ timeSig: e.target.value.split('/').map(Number) as [number, number] })}>
              {TIME_SIGS.map((s) => (
                <option key={s}>{s}</option>
              ))}
            </select>
          </label>
          <label className="grid gap-0.5" htmlFor="ed-key">
            {t('editor.key')}
            <select id="ed-key" className={field} value={draft.keySig} onChange={(e) => info({ keySig: e.target.value })}>
              {KEYS.map((k) => (
                <option key={k}>{k}</option>
              ))}
            </select>
          </label>
          <label className="grid gap-0.5" htmlFor="ed-level">
            {t('editor.difficulty')}
            <select id="ed-level" className={field} value={draft.difficulty} onChange={(e) => info({ difficulty: Number(e.target.value) as Draft['difficulty'] })}>
              {[1, 2, 3].map((d) => (
                <option key={d} value={d}>
                  {t(`songs.diff${d}`)}
                </option>
              ))}
            </select>
          </label>
        </div>

        {/* Toolbar */}
        <div className="flex flex-wrap items-center gap-2">
          <Segmented<'play' | 'text'>
            id="ed-mode"
            value={mode}
            onChange={setMode}
            options={[
              { value: 'play', label: t('editor.playMode') },
              { value: 'text', label: t('editor.textMode') },
            ]}
          />
          <Button onClick={ed.undo} disabled={!ed.history.length} aria-label={t('editor.undo')}>
            <Icon name="undo" /> {t('editor.undo')}
          </Button>
          <Button onClick={ed.redo} disabled={!ed.future.length} aria-label={t('editor.redo')}>
            <Icon name="redo" /> {t('editor.redo')}
          </Button>
          <Button onClick={() => (player.playing ? player.stop() : player.play(cur.bar * barLen))} aria-pressed={player.playing}>
            <Icon name={player.playing ? 'stop' : 'speaker'} /> {player.playing ? t('play.stop') : t('editor.listenHere', { n: cur.bar + 1 })}
          </Button>
          <span className="ml-auto flex flex-wrap gap-2">
            <AiConnectButton />
            <Button onClick={() => downloadText(songFileName(draft.title.en), writeSongFile(draft))}>
              <Icon name="export" /> {t('editor.export')}
            </Button>
            <Button variant="primary" onClick={save} data-testid="ed-save">
              <Icon name="check" /> {savedFlash ? t('editor.saved') : t('editor.save')}
            </Button>
          </span>
        </div>

        {/* Bar strip */}
        <div className="flex flex-wrap gap-1" role="tablist" aria-label="Bars">
          {Array.from({ length: bars }, (_, i) => {
            const warn = warnings.some((w) => w.bar === i + 1)
            return (
              <button
                key={i}
                type="button"
                role="tab"
                aria-selected={i === cur.bar}
                data-bar={i + 1}
                onClick={() => ed.setCursor({ bar: i, index: barTokens(handBars[i] ?? '').length })}
                className={`relative min-w-9 min-h-9 rounded-md border px-2 text-sm tabular ${i === cur.bar ? 'bg-accent text-accent-ink border-accent' : 'border-line bg-surface hover:bg-panel'}`}
              >
                {i + 1}
                {warn && <span className="absolute -right-1 -top-1 size-2.5 rounded-full bg-warn" aria-label="has a warning" />}
              </button>
            )
          })}
          <button
            type="button"
            className="min-h-9 rounded-md border border-dashed border-line px-2 text-sm"
            onClick={() => {
              ed.apply({ ...even, right: [...even.right, restBar(draft.timeSig)], left: [...even.left, restBar(draft.timeSig)] })
              ed.setCursor({ bar: bars, index: 0 })
            }}
          >
            <Icon name="plus" size={14} /> {t('editor.addBar')}
          </button>
        </div>

        {mode === 'play' ? (
          <div className="grid gap-2 rounded-[var(--radius)] border border-line bg-surface p-3" data-testid="ed-play">
            <div className="flex flex-wrap items-center gap-3 text-sm">
              <Segmented<'R' | 'L'>
                id="ed-hand"
                label={t('editor.hand')}
                value={cur.hand}
                onChange={(hand) => ed.setCursor({ hand, index: barTokens((hand === 'R' ? even.right : even.left)[cur.bar] ?? '').length })}
                options={[
                  { value: 'R', label: t('play.right') },
                  { value: 'L', label: t('play.left') },
                ]}
              />
              <Segmented<Length> id="ed-length" label={t('editor.length')} value={ed.length} onChange={ed.setLength} options={LENGTHS.map((l) => ({ value: l, label: <NoteGlyph length={l} />, ariaLabel: t(`editor.lengths.${l}`) }))} />
              <Button aria-pressed={ed.dot} onClick={() => ed.setDot(!ed.dot)} className="min-h-9">
                {t('editor.dot')}
              </Button>
              <Button onClick={() => insert(`r${ed.length}${ed.dot ? '.' : ''}`)} className="min-h-9">
                {t('editor.rest')}
              </Button>
              <span className="inline-flex items-center gap-1">
                {t('editor.finger')}
                <Segmented<string>
                  id="ed-finger"
                  value={ed.finger ? String(ed.finger) : '0'}
                  onChange={(v) => ed.setFinger(v === '0' ? null : Number(v))}
                  options={[{ value: '0', label: t('editor.noFinger') }, ...[1, 2, 3, 4, 5].map((f) => ({ value: String(f), label: String(f) }))]}
                />
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-1.5 font-mono text-sm" data-testid="ed-bar-tokens" aria-label={t('editor.bar', { n: cur.bar + 1 })}>
              <span className="mr-1 font-sans font-semibold">{t('editor.bar', { n: cur.bar + 1 })}:</span>
              {tokens.map((tok, i) => (
                <span key={i} className="contents">
                  {i === cur.index && <span className="h-7 w-0.5 bg-accent" aria-hidden />}
                  <button type="button" className="rounded border border-line bg-bg px-1.5 min-h-7" onClick={() => ed.setCursor({ index: i + 1 })}>
                    {tok}
                  </button>
                </span>
              ))}
              {cur.index >= tokens.length && <span className="h-7 w-0.5 bg-accent" aria-hidden />}
              <span className="font-sans text-muted">
                {t('editor.barCount', { beats: barBeats(barText), expected: barLen })}
              </span>
              <Button variant="ghost" onClick={deleteBefore} className="min-h-8 px-2" aria-label={t('editor.deleteNote')}>
                <Icon name="trash" size={16} />
              </Button>
            </div>
            <p className="text-sm text-muted">{t('editor.barHint')}</p>
          </div>
        ) : (
          <TextView draft={even} />
        )}

        <div className="overflow-hidden">
          <GrandStaff song={song} cursorBeat={cur.bar * barLen} getCursor={getCursor} />
        </div>

        <section className="grid gap-1 text-sm" aria-live="polite" data-testid="ed-warnings">
          <strong>{warnings.length ? t('editor.warnings') : t('editor.clean')}</strong>
          {warnings.slice(0, 8).map((w, i) => (
            <button key={i} type="button" className={`text-left ${curWarnings.includes(w) ? 'font-semibold' : ''}`} onClick={() => w.bar && ed.setCursor({ bar: w.bar - 1, index: 0 })}>
              <span className="rounded bg-warn/15 px-1.5 text-warn tabular">{w.bar ? t('review.bar', { bar: w.bar }) : t('review.whole')}</span> {warningText(w)}
            </button>
          ))}
        </section>

        <AiStatusLine />
        <AiActivityList />
        <div className="flex-1" />
        <Keyboard low={36} high={84} interactive={screen} focus={[]} height={110} />
      </div>
      <div className="max-lg:contents lg:-mx-[max(16px,env(safe-area-inset-left,0px))]">
        <InputPanel micAllowed />
      </div>

      {leaving && (
        <div className="fixed inset-0 z-40 grid place-items-center bg-fg/40 p-4" role="dialog" aria-modal="true" aria-labelledby="leave-h">
          <div className="grid w-full max-w-sm gap-4 rounded-[var(--radius)] bg-bg p-5 shadow-2xl">
            <h2 id="leave-h" className="text-lg font-semibold">
              {t('editor.leaveTitle')}
            </h2>
            <div className="flex flex-wrap gap-2">
              <PrimaryButton
                onClick={() => {
                  save()
                  const to = leaving
                  setLeaving(null)
                  nav(to)
                }}
              >
                {t('editor.leaveSave')}
              </PrimaryButton>
              <Button
                onClick={() => {
                  const to = leaving
                  ed.close()
                  setLeaving(null)
                  nav(to)
                }}
              >
                {t('editor.leaveDiscard')}
              </Button>
              <Button variant="ghost" onClick={() => setLeaving(null)}>
                {t('editor.leaveStay')}
              </Button>
            </div>
          </div>
        </div>
      )}
    </Page>
  )
}

/** Text view: each hand as note text with bar lines; applied only once it reads cleanly (R8). */
function TextView({ draft }: { draft: Draft }) {
  const { t } = useT()
  const apply = useEditor((s) => s.apply)
  const fromDraft = (d: Draft) => ({ R: d.right.join(' | ') + ' |', L: d.left.join(' | ') + ' |' })
  const [text, setText] = useState(() => fromDraft(draft))
  const [errors, setErrors] = useState<{ R: string[]; L: string[] }>({ R: [], L: [] })
  const editing = useRef(false)
  // Follow outside changes (undo, AI tools) unless the person is typing.
  useEffect(() => {
    if (!editing.current) setText(fromDraft(draft))
  }, [draft])

  const change = (hand: 'R' | 'L', value: string) => {
    setText((t0) => ({ ...t0, [hand]: value }))
    const bars = splitBars(value)
    const test = draftToSong({ ...draft, [hand === 'R' ? 'right' : 'left']: bars })
    const mine = test.issues.filter((i) => i.hand === hand).map((i) => i.message)
    setErrors((e) => ({ ...e, [hand]: mine }))
    if (!mine.length) apply({ ...draft, [hand === 'R' ? 'right' : 'left']: bars })
  }

  return (
    <div className="grid gap-2 rounded-[var(--radius)] border border-line bg-surface p-3" data-testid="ed-text">
      <p className="text-sm text-muted">{t('editor.textHint')}</p>
      {(['R', 'L'] as const).map((hand) => (
        <label key={hand} className="grid gap-1 text-sm" htmlFor={`ed-text-${hand}`}>
          <span className="font-semibold">{hand === 'R' ? t('play.right') : t('play.left')}</span>
          <textarea
            id={`ed-text-${hand}`}
            className="min-h-20 rounded border border-line bg-bg p-2 font-mono text-sm"
            value={text[hand]}
            spellCheck={false}
            onFocus={() => (editing.current = true)}
            onBlur={() => (editing.current = false)}
            onChange={(e) => change(hand, e.target.value)}
          />
          {errors[hand].map((m, i) => (
            <span key={i} role="alert" className="text-accent">
              {t('editor.textError', { message: m })}
            </span>
          ))}
        </label>
      ))}
    </div>
  )
}
