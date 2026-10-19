#!/usr/bin/env node
/**
 * Piano Learning MCP server. Speaks MCP over stdio to an AI client and runs song tools either
 * on a song file (file mode) or in the app open in a browser (live mode, over a WebSocket on
 * this machine only).
 */
import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, extname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import { WebSocketServer, type WebSocket } from 'ws'
import { z } from 'zod'
import { LIVE_TOOLS, TOOLS, fmtWarning, runTool, toolsFingerprint } from '../src/engine/song-tools'
import { SongFileError, fileToDraft, readSongFile, writeSongFile } from '../src/engine/song-file'
import { emptyDraft, newSongId, type Draft } from '../src/engine/song-text'
import { MusicXmlError, musicXmlToSong, unzipMxl } from '../src/engine/musicxml'
import { checkSong } from '../src/engine/song-check'
import { BUNDLE_ID, bundleIdFor, bundleSource, registerInIndex } from '../src/engine/song-bundle'

const PORT = Number(process.env.PIANO_PORT) || 8766
const EXTRA_ORIGINS = (process.env.PIANO_ALLOWED_ORIGINS ?? '').split(',').map((s) => s.trim()).filter(Boolean)
const TIMEOUT_MS = 15000
/** The project folder (this file is built to mcp/dist/). */
const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..')
const log = (...a: unknown[]) => console.error('[piano-mcp]', ...a)

// ---- Live bridge to the browser app ----

function originAllowed(origin: string | undefined): boolean {
  if (!origin) return false
  if (EXTRA_ORIGINS.includes(origin)) return true
  try {
    const host = new URL(origin).hostname
    return host === 'localhost' || host === '127.0.0.1' || host === '[::1]'
  } catch {
    return false
  }
}

let app: WebSocket | null = null
let bridgeError: string | null = null
const FINGERPRINT = toolsFingerprint(LIVE_TOOLS)
/** Set when the connected app was built from different tool definitions than this server. */
let stale = false
let newerTools: string[] = []
const staleNote = () =>
  'Note: this Piano Learning MCP server was started from an older build than the app. ' +
  (newerTools.length ? `The app has gained: ${newerTools.join(', ')}. ` : 'Some descriptions here may be out of date. ') +
  'Everything still works through call_tool, which passes any tool name and arguments straight to the app. To refresh the tool list, rebuild the server (npm run build:mcp in the piano-learning folder) and restart it (in Claude Code: /mcp, then reconnect piano).'
let nextCall = 1
const pending = new Map<number, { resolve: (v: unknown) => void; reject: (e: Error) => void; timer: NodeJS.Timeout }>()

const wss = new WebSocketServer({ host: '127.0.0.1', port: PORT, verifyClient: (info: { origin?: string }) => originAllowed(info.origin) })
wss.on('listening', () => log(`waiting for the app on ws://127.0.0.1:${PORT}`))
wss.on('error', (e: NodeJS.ErrnoException) => {
  bridgeError =
    e.code === 'EADDRINUSE'
      ? `Port ${PORT} is already in use (another Piano Learning MCP server may be running). Set PIANO_PORT to a free port and enter the same port in the app's Settings.`
      : e.message
  log('live mode unavailable:', bridgeError)
})
wss.on('connection', (ws) => {
  // One app at a time. Tell the tab that is let go, so it stops reconnecting and taking the connection back.
  if (app && app.readyState === app.OPEN) app.send(JSON.stringify({ type: 'replaced' }))
  app?.close()
  app = ws
  log('app connected')
  ws.on('message', (data) => {
    let msg: { id?: number; ok?: boolean; result?: unknown; error?: string; type?: string; fingerprint?: string; tools?: string[] }
    try {
      msg = JSON.parse(String(data))
    } catch {
      return
    }
    if (msg.type === 'hello') {
      stale = !!msg.fingerprint && msg.fingerprint !== FINGERPRINT
      const mine = new Set<string>([...TOOLS.map((t) => t.name), ...LIVE_TOOLS])
      newerTools = (msg.tools ?? []).filter((x) => !mine.has(x))
      if (stale) log('the app is newer than this server: rebuild and restart the MCP server')
      ws.send(JSON.stringify({ type: 'hello', fingerprint: FINGERPRINT }))
      return
    }
    const call = msg.id !== undefined ? pending.get(msg.id) : undefined
    if (!call) return
    pending.delete(msg.id!)
    clearTimeout(call.timer)
    if (msg.ok) call.resolve(msg.result)
    else call.reject(new Error(msg.error ?? 'The app reported an error.'))
  })
  ws.on('close', () => {
    if (app === ws) {
      app = null
      stale = false
    }
    log('app disconnected')
  })
})

function callApp(tool: string, args: unknown): Promise<unknown> {
  if (!app || app.readyState !== app.OPEN)
    return Promise.reject(
      new Error(
        bridgeError ??
          'The Piano Learning app is not connected. Open the app in a browser (adult mode) and press "Connect AI" in the song editor or Settings — or pass "file" with a song file path to work without the app.',
      ),
    )
  const id = nextCall++
  return new Promise((res, rej) => {
    const timer = setTimeout(() => {
      pending.delete(id)
      rej(new Error('The app did not answer in time.'))
    }, TIMEOUT_MS)
    pending.set(id, { resolve: res, reject: rej, timer })
    app!.send(JSON.stringify({ id, tool, args }))
  })
}

// ---- File mode ----

function readDraft(file: string): Draft {
  const path = resolve(file)
  if (!existsSync(path)) throw new Error(`No song file at ${path}. Create one with new_song or import_musicxml.`)
  try {
    return fileToDraft(readFileSync(path, 'utf8'))
  } catch (e) {
    throw new Error(`${path}: ${(e as Error).message}`)
  }
}

function writeNew(path: string, text: string, overwrite?: boolean): void {
  if (existsSync(path) && !overwrite) throw new Error(`${path} already exists. Pass overwrite: true to replace it.`)
  writeFileSync(path, text)
}

function runOnFile(file: string, tool: string, args: unknown): unknown {
  const draft = readDraft(file)
  const out = runTool(draft, tool, args)
  if (out.draft !== draft) writeFileSync(resolve(file), writeSongFile(out.draft))
  return out.result
}

function readMusicXml(path: string): string {
  const p = resolve(path)
  if (!existsSync(p)) throw new Error(`No file at ${p}.`)
  if (extname(p).toLowerCase() === '.mxl') return unzipMxl(new Uint8Array(readFileSync(p)))
  return readFileSync(p, 'utf8')
}

// ---- MCP ----

const FILE_ARG = z
  .string()
  .optional()
  .describe('Path to a song file (.song.json). Omit to work live on the song open in the app\'s editor.')

const note = () => (stale ? [{ type: 'text' as const, text: staleNote() }] : [])
const text = (value: unknown) => ({ content: [{ type: 'text' as const, text: typeof value === 'string' ? value : JSON.stringify(value, null, 1) }, ...note()] })
const failure = (e: unknown) => ({ isError: true, content: [{ type: 'text' as const, text: (e as Error).message }, ...note()] })
const guard =
  <A,>(fn: (a: A) => Promise<unknown> | unknown) =>
  async (a: A) => {
    try {
      return text(await fn(a))
    } catch (e) {
      return failure(e)
    }
  }

const server = new McpServer(
  { name: 'piano', version: '0.1.0' },
  {
    instructions:
      'Builds songs for the Piano Learning app. Call get_reference first for the note text format and how to transcribe sheet music from an image. Work on a song file by passing "file", or live in the app\'s song editor (the user presses Connect AI) by leaving "file" out. After writing bars, call check_song and fix every warning; in live mode, screenshot shows the result as sheet music to compare with the source.',
  },
)

for (const tool of TOOLS) {
  server.registerTool(
    tool.name,
    { description: tool.description, inputSchema: { ...tool.shape, file: FILE_ARG } },
    guard(async (input: Record<string, unknown>) => {
      const { file, ...args } = input
      return typeof file === 'string' ? runOnFile(file, tool.name, args) : await callApp(tool.name, args)
    }),
  )
}

server.registerTool(
  'call_tool',
  {
    description: 'Run any Piano Learning tool in the app by name, passing the arguments through unchecked. Use it when the app is newer than this server and has tools this server does not list. Needs the app open and connected.',
    inputSchema: { name: z.string().min(1), args: z.record(z.string(), z.unknown()).optional() },
  },
  guard(({ name, args }: { name: string; args?: Record<string, unknown> }) => callApp(name, args ?? {})),
)

server.registerTool(
  'new_song',
  {
    description: 'Start a new, empty song (one bar of rest). With "file": create that song file (fails if it exists unless overwrite is true). Without: open a new song in the app\'s editor (refused if the open song has unsaved changes).',
    inputSchema: { title: z.string().min(1), file: FILE_ARG, overwrite: z.boolean().optional() },
  },
  guard(({ title, file, overwrite }: { title: string; file?: string; overwrite?: boolean }) => {
    if (!file) return callApp('new_song', { title })
    const path = resolve(file)
    writeNew(path, writeSongFile(emptyDraft(newSongId(title), title)), overwrite)
    return { created: path, title }
  }),
)

server.registerTool(
  'import_musicxml',
  {
    description:
      'Convert a MusicXML score (.musicxml, .xml, or compressed .mxl) into a song. Part 1 staff 1 becomes the right hand and staff 2 (or part 2) the left hand; rhythms are rounded to sixteenths. With "file": write the song file. Without: load it into the app\'s editor, unsaved, for the user to check. Returns what could not be converted exactly.',
    inputSchema: {
      path: z.string().min(1).describe('Path to the MusicXML file.'),
      title: z.string().optional().describe('Title to use when the score has none.'),
      file: FILE_ARG,
      overwrite: z.boolean().optional(),
    },
  },
  guard(async ({ path, title, file, overwrite }: { path: string; title?: string; file?: string; overwrite?: boolean }) => {
    let converted
    try {
      converted = musicXmlToSong(readMusicXml(path), { title })
    } catch (e) {
      if (e instanceof MusicXmlError) throw new Error(`${resolve(path)}: ${e.message}`)
      throw e
    }
    const { song, warnings } = converted
    const all = [...warnings, ...checkSong(song, [])].map(fmtWarning)
    const songText = writeSongFile(song)
    if (file) {
      const out = resolve(file)
      writeNew(out, songText, overwrite)
      return { created: out, title: song.title.en, warnings: all }
    }
    const loaded = (await callApp('load_song', { text: songText })) as Record<string, unknown>
    return { ...loaded, conversion: warnings.map(fmtWarning) }
  }),
)

server.registerTool(
  'export_song_file',
  {
    description: 'Write a song file to "path": the song open in the app\'s editor, or with "file" a copy of that song file (rewritten in the current format).',
    inputSchema: { path: z.string().min(1), file: FILE_ARG, overwrite: z.boolean().optional() },
  },
  guard(async ({ path, file, overwrite }: { path: string; file?: string; overwrite?: boolean }) => {
    const out = resolve(path)
    const body = file ? writeSongFile(readDraft(file)) : String(await callApp('get_song_file', {}))
    writeNew(out, body, overwrite)
    return { written: out }
  }),
)

server.registerTool(
  'add_to_bundled',
  {
    description:
      'Add a song file to the songs that ship with the app: writes src/content/songs/<id>.ts and lists it in src/content/songs/index.ts. Only when the user asks for it; they rebuild the app afterwards. Refuses an existing id unless replace is true.',
    inputSchema: {
      file: z.string().min(1).describe('Path to the song file.'),
      id: z.string().regex(BUNDLE_ID).optional().describe('Lower-case id with dashes, like "moon-river". Defaults to one made from the song.'),
      replace: z.boolean().optional(),
    },
  },
  guard(({ file, id, replace }: { file: string; id?: string; replace?: boolean }) => {
    const draft = readDraft(file)
    const songId = id ?? bundleIdFor(draft)
    const { issues } = readSongFile(readFileSync(resolve(file), 'utf8'))
    if (issues.length) throw new Error(`The song has bars that can't be read: ${issues.map((i) => `${i.hand} bar ${i.bar}: ${i.message}`).join('; ')}. Fix them first.`)
    const dir = resolve(ROOT, 'src/content/songs')
    const indexPath = resolve(dir, 'index.ts')
    if (!existsSync(indexPath)) throw new Error(`Can't find ${indexPath}. Run the server from the piano-learning build (mcp/dist).`)
    const out = resolve(dir, `${songId}.ts`)
    if (existsSync(out) && !replace) throw new Error(`${out} already exists. Pass replace: true to overwrite it, or another id.`)
    writeFileSync(out, bundleSource(draft, songId))
    const index = readFileSync(indexPath, 'utf8')
    const next = registerInIndex(index, songId)
    if (next !== index) writeFileSync(indexPath, next)
    return { wrote: out, registered: next !== index ? indexPath : 'already listed', id: songId, note: 'Rebuild the app (npm run build) to ship it.' }
  }),
)

const live = (name: string, description: string, shape: z.ZodRawShape = {}) =>
  server.registerTool(name, { description, inputSchema: shape }, guard((args: Record<string, unknown>) => callApp(name, args)))

live('list_songs', 'List the songs in the app: My songs (editable) and the bundled songs, and which song is open in the editor. Live mode only.')
live('open_song', 'Open a song in the app\'s editor by id or title (part of the title is enough when only one matches). A bundled song is copied into My songs first. Refused if the open song has unsaved changes. Live mode only.', {
  song: z.string().min(1).describe('Id or title, from list_songs.'),
})
live('save_song', 'Save the song open in the app\'s editor to My songs. Live mode only.')
live('play_song', 'Play the open song aloud in the app, optionally only bars "from" to "to", with the cursor following on the staff. Live mode only.', {
  from: z.number().int().min(1).optional(),
  to: z.number().int().min(1).optional(),
})

server.registerTool(
  'screenshot',
  {
    description: 'Picture of the open song as sheet music (bars "from" to "to", four bars a line), to compare a transcription with the source image. Needs the app open and connected.',
    inputSchema: { from: z.number().int().min(1).optional(), to: z.number().int().min(1).optional(), file: FILE_ARG },
  },
  async ({ from, to, file }: { from?: number; to?: number; file?: string }) => {
    try {
      if (file) throw new Error('Pictures need the app: load the file there first (import or load it with Connect AI on), then call screenshot without "file".')
      const out = (await callApp('screenshot', { from, to })) as { image: string }
      return { content: [{ type: 'image' as const, data: out.image.replace(/^data:image\/png;base64,/, ''), mimeType: 'image/png' }, ...note()] }
    } catch (e) {
      return failure(e)
    }
  },
)

server.registerTool(
  'open_file',
  {
    description: 'Load a song file into the app\'s editor (unsaved), for example to play it or take a screenshot. Refused if the open song has unsaved changes. Needs the app connected.',
    inputSchema: { file: z.string().min(1) },
  },
  guard(({ file }: { file: string }) => {
    const path = resolve(file)
    if (!existsSync(path)) throw new Error(`No song file at ${path}.`)
    try {
      readSongFile(readFileSync(path, 'utf8'))
    } catch (e) {
      if (e instanceof SongFileError) throw new Error(`${path}: ${e.message}`)
      throw e
    }
    return callApp('load_song', { text: readFileSync(path, 'utf8') })
  }),
)

await server.connect(new StdioServerTransport())
log('ready')
