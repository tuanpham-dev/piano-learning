import { create } from 'zustand'
import { LIVE_TOOLS, TOOL_NAMES, runTool, toolsFingerprint, fmtWarning } from '../engine/song-tools'
import { draftToSong, emptyDraft, evenHands, newSongId, songToDraft, type Draft } from '../engine/song-text'
import { readSongFile, writeSongFile } from '../engine/song-file'
import { checkSong } from '../engine/song-check'
import { barCount } from '../engine/song'
import { bundledSongs } from '../content/songs'
import { useEditor } from '../store/editor'
import { useSession } from '../store/session'
import { useProgress } from '../store/progress'
import { staffPng } from '../notation/staff-image'

export type AiStatus = 'off' | 'connecting' | 'connected'
/** Warnings are string keys under `ai.*`, so they show in the app's language. */
export type AiWarning = 'stale' | 'replaced' | null

interface AiState {
  status: AiStatus
  warning: AiWarning
  /** A page the bridge wants the app to show (picked up by AiNavigator inside the router). */
  goto: string | null
  /** Ask the open editor to play bars; `n` changes on every request. */
  play: { fromBar: number; toBar: number; n: number } | null
}

export const useAi = create<AiState>()(() => ({ status: 'off', warning: null, goto: null, play: null }))

export const fingerprint = () => toolsFingerprint(LIVE_TOOLS)

const PORT_KEY = 'piano:ai-port'
const WANTED_KEY = 'piano:ai-connect'
const LET_GO_KEY = 'piano:ai-let-go'
export const DEFAULT_PORT = 8766

export function aiPort(): number {
  try {
    return Number(localStorage.getItem(PORT_KEY)) || DEFAULT_PORT
  } catch {
    return DEFAULT_PORT
  }
}

export function setAiPort(port: number): void {
  try {
    if (port && port !== DEFAULT_PORT) localStorage.setItem(PORT_KEY, String(port))
    else localStorage.removeItem(PORT_KEY)
  } catch {
    // The default port is used next time.
  }
}

function store(kind: 'local' | 'session', key: string, on?: boolean): boolean {
  try {
    const s = kind === 'local' ? localStorage : sessionStorage
    if (on === true) s.setItem(key, '1')
    else if (on === false) s.removeItem(key)
    return !!s.getItem(key)
  } catch {
    return false
  }
}

const log = (tool: string, summary: string, ok = true) => useEditor.getState().log({ tool, summary, ok })
const show = (path: string) => useAi.setState({ goto: path })
const barsOf = (d: Draft) => evenHands(d).right.length

function openDraft(): Draft {
  const d = useEditor.getState().draft
  if (!d) throw new Error('No song is open in the app editor. Use new_song, open_song or load_song first.')
  return d
}

function refuseUnsaved(): void {
  const st = useEditor.getState()
  if (st.draft && st.dirty)
    throw new Error(`"${st.draft.title.en}" is open in the editor with unsaved changes. Call save_song first, or ask the user to save or discard it in the app.`)
}

async function handle(tool: string, args: Record<string, unknown>): Promise<unknown> {
  const st = useEditor.getState()
  if (tool === 'list_songs') {
    const own = useSession.getState().importedSongs
    return {
      open: st.draft ? { title: st.draft.title.en, id: st.songId, unsaved: st.dirty } : null,
      mySongs: own.map((s) => ({ id: s.id, title: s.title.en, bars: barCount(s) })),
      bundled: bundledSongs.map((s) => ({ id: s.id, title: s.title.en, bars: barCount(s), note: 'open_song makes an editable copy in My songs' })),
    }
  }
  if (tool === 'new_song') {
    refuseUnsaved()
    const title = String(args.title ?? '').trim() || 'New song'
    useEditor.getState().open(emptyDraft(newSongId(title), title), null)
    show('/songs/edit/draft')
    log(tool, title)
    return { opened: title, note: 'Not saved yet: call save_song when done.' }
  }
  if (tool === 'open_song') {
    refuseUnsaved()
    const want = String(args.song ?? '').trim()
    if (!want) throw new Error('Say which song: pass "song" with its id or title (see list_songs).')
    const own = useSession.getState().importedSongs
    const lower = want.toLowerCase()
    const pick = <T extends { id: string; title: { en: string } }>(list: T[]) => {
      const byId = list.filter((s) => s.id === want)
      const exact = list.filter((s) => s.title.en.toLowerCase() === lower)
      return byId.length ? byId : exact.length ? exact : list.filter((s) => s.title.en.toLowerCase().includes(lower))
    }
    const mine = pick(own)
    const found = mine.length ? mine : pick(bundledSongs)
    if (!found.length) throw new Error(`No song matches "${want}". Call list_songs to see them.`)
    if (found.length > 1) throw new Error(`"${want}" matches ${found.map((s) => `"${s.title.en}" (id ${s.id})`).join(', ')}. Pass the id.`)
    let song = found[0]!
    let copied: string | undefined
    if (!mine.length) {
      // Bundled songs are not edited in place: work on a copy in My songs.
      const id = useSession.getState().duplicateSong(song)
      song = useSession.getState().importedSongs.find((s) => s.id === id)!
      copied = `"${song.title.en}" is a bundled song, so a copy was made in My songs (id ${id}).`
    }
    useEditor.getState().open(songToDraft(song), song.id)
    show(`/songs/edit/${song.id}`)
    log(tool, song.title.en)
    return { opened: song.title.en, id: song.id, bars: barCount(song), note: copied }
  }
  if (tool === 'load_song') {
    refuseUnsaved()
    const text = String(args.text ?? '')
    const { song, draft, issues } = readSongFile(text)
    useEditor.getState().open(draft, useSession.getState().importedSongs.some((s) => s.id === song.id) ? song.id : null)
    useEditor.setState({ dirty: true })
    show('/songs/edit/draft')
    log(tool, draft.title.en)
    return { opened: draft.title.en, bars: barsOf(draft), warnings: checkSong(song, issues).map(fmtWarning), note: 'Not saved yet: call save_song when the user is happy with it.' }
  }
  if (tool === 'get_song_file') return writeSongFile(openDraft())
  if (tool === 'save_song') {
    const { song } = draftToSong(openDraft())
    useSession.getState().addImportedSong(song)
    useEditor.getState().markSaved(song.id)
    show(`/songs/edit/${song.id}`)
    log(tool, song.title.en)
    return { saved: song.title.en, id: song.id, bars: barCount(song) }
  }
  if (tool === 'play_song') {
    const d = openDraft()
    const bars = barsOf(d)
    const fromBar = Math.max(1, Math.min(bars, Number(args.from) || 1))
    const toBar = Math.max(fromBar, Math.min(bars, Number(args.to) || bars))
    show(useEditor.getState().songId ? `/songs/edit/${useEditor.getState().songId}` : '/songs/edit/draft')
    useAi.setState({ play: { fromBar, toBar, n: Date.now() } })
    log(tool, `bars ${fromBar}–${toBar}`)
    return { playing: `bars ${fromBar} to ${toBar}`, seconds: Math.round(((toBar - fromBar + 1) * (d.timeSig[0] * (4 / d.timeSig[1])) * 60) / d.bpm) }
  }
  if (tool === 'screenshot') {
    const { song } = draftToSong(openDraft())
    const image = await staffPng(song, Number(args.from) || 1, Number(args.to) || barCount(song))
    log(tool, `bars ${Number(args.from) || 1}–${Number(args.to) || barCount(song)}`)
    return { image }
  }
  // A shared tool: one undo step on the open draft.
  const draft = openDraft()
  try {
    const out = runTool(draft, tool, args)
    // Reads (get_song, check_song, get_reference) change nothing and are not listed.
    if (out.draft !== draft) {
      useEditor.getState().apply(out.draft)
      log(tool, describe(tool, args))
    }
    return out.result
  } catch (e) {
    log(tool, (e as Error).message, false)
    throw e
  }
}

function describe(tool: string, args: Record<string, unknown>): string {
  if (tool === 'set_bars') return `bar ${String(args.bar)}${args.mode === 'insert' ? ' (insert)' : ''}`
  if (tool === 'delete_bars') return `bars ${String(args.from)}–${String(args.to)}`
  if (tool === 'transpose') return `${Number(args.semitones) > 0 ? '+' : ''}${String(args.semitones)}`
  if (tool === 'set_song_info') return Object.keys(args).join(', ')
  return ''
}

let socket: WebSocket | null = null
let wanted = false
let retry: ReturnType<typeof setTimeout> | undefined
let helloTimer: ReturnType<typeof setTimeout> | undefined

function open(): void {
  clearTimeout(retry)
  useAi.setState({ status: 'connecting' })
  let ws: WebSocket
  try {
    ws = new WebSocket(`ws://127.0.0.1:${aiPort()}`)
  } catch {
    retry = setTimeout(() => wanted && open(), 2000)
    return
  }
  socket = ws
  ws.onopen = () => {
    useAi.setState({ status: 'connected', warning: null })
    // A server from another build answers with a different fingerprint; one that never answers is older still.
    helloTimer = setTimeout(() => socket === ws && useAi.setState({ warning: 'stale' }), 2500)
    ws.send(JSON.stringify({ type: 'hello', fingerprint: fingerprint(), tools: [...TOOL_NAMES, ...LIVE_TOOLS] }))
  }
  ws.onmessage = async (ev) => {
    let msg: { id?: number; tool?: string; args?: Record<string, unknown>; type?: string; fingerprint?: string }
    try {
      msg = JSON.parse(String(ev.data))
    } catch {
      return
    }
    if (msg.type === 'replaced') {
      // Another tab took the connection: stop, so the two don't take it back from each other in turn.
      wanted = false
      store('session', LET_GO_KEY, true)
      clearTimeout(retry)
      clearTimeout(helloTimer)
      useAi.setState({ status: 'off', warning: 'replaced' })
      return
    }
    if (msg.type === 'hello') {
      clearTimeout(helloTimer)
      if (msg.fingerprint !== fingerprint()) useAi.setState({ warning: 'stale' })
      return
    }
    if (msg.id === undefined || !msg.tool) return
    try {
      // Connect AI is adult-only; a kid-mode device does not take edits.
      if (useProgress.getState().mode !== 'adult') throw new Error('The app is in kid mode. Ask the user to switch to adult mode to edit songs.')
      ws.send(JSON.stringify({ id: msg.id, ok: true, result: await handle(msg.tool, msg.args ?? {}) }))
    } catch (e) {
      ws.send(JSON.stringify({ id: msg.id, ok: false, error: (e as Error).message }))
    }
  }
  ws.onclose = () => {
    if (socket === ws) socket = null
    if (!wanted) return
    useAi.setState({ status: 'connecting' })
    retry = setTimeout(() => wanted && open(), 2000)
  }
}

/** Connect to the local Piano Learning MCP server, retrying until disconnected. */
export function connectAi(): void {
  wanted = true
  store('session', LET_GO_KEY, false)
  store('local', WANTED_KEY, true)
  open()
}

export function disconnectAi(): void {
  wanted = false
  store('local', WANTED_KEY, false)
  clearTimeout(retry)
  clearTimeout(helloTimer)
  socket?.close()
  socket = null
  useAi.setState({ status: 'off', warning: null })
}

/** Re-open after a reload (or a dev hot reload) if the user left it connected in this browser. */
export function resumeAi(): void {
  if (wanted || !store('local', WANTED_KEY)) return
  if (store('session', LET_GO_KEY)) useAi.setState({ warning: 'replaced' })
  else connectAi()
}

if (import.meta.hot)
  import.meta.hot.dispose(() => {
    wanted = false
    clearTimeout(retry)
    clearTimeout(helloTimer)
    socket?.close()
  })
