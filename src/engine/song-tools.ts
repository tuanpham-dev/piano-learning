import { z } from 'zod'
import { checkSong, type SongWarning } from './song-check'
import { splitBars } from './song-file'
import { draftToSong, evenHands, restBar, songToDraft, type Draft } from './song-text'
import type { Hand } from './song'

/**
 * Song tools shared by the MCP server (file mode) and the app (live mode), so both behave the same.
 * Each tool is a pure function on a draft: one string of note text per bar per hand.
 */

export const REFERENCE = `Piano Learning song format

A song has two hands, right (treble staff) and left (bass staff). Each hand is note text, one bar at a time.
Bars are separated by "|". Every bar must add up to the time signature (4/4 = 4 quarter beats; 3/4 = 3; 6/8 = 3).

Tokens
  C4q3     a note: pitch, length, optional finger (1 = thumb … 5 = little finger)
  F#4e.    sharps with #, flats with b (Bb3); "." makes it dotted (1.5×)
  [C4 E4 G4]h   a chord (notes sounding together), no fingers inside
  rq / rh.      rests
  E4h~ E4q      "~" ties a note into the next one of the same pitch, also across a bar line
Lengths: w = whole (4 beats), h = half (2), q = quarter (1), e = eighth (½), s = sixteenth (¼).
Middle C is C4. The octave number changes at C (B3 is just below C4).
No triplets: write them as the nearest sixteenths.

Transcribing sheet music
1. Read the key, time signature and tempo first; call set_song_info.
2. Write 2–4 bars at a time with set_bars, right and left together, starting at bar 1.
   Treble staff → right, bass staff → left. If the left hand rests for a bar, write a rest bar (rw in 4/4).
3. Copy finger numbers printed above or below notes onto the note (C4q3).
4. After each group, run check_song. Fix every bar it reports.
5. In live mode, call screenshot for the bars you wrote and compare them with the original image.
6. When done, call play_song so the person can listen, and tell them to review and save.`

export interface ToolDef {
  name: string
  description: string
  shape: z.ZodRawShape
  run: (draft: Draft, args: Record<string, unknown>) => { draft: Draft; result: unknown }
}

const handsArg = z.enum(['R', 'L', 'both']).optional().describe('Which hand: R (right), L (left) or both (default).')

function summary(d: Draft) {
  const { song, issues } = draftToSong(d)
  const warnings = checkSong(song, issues)
  return { bars: Math.max(d.right.length, d.left.length), warnings: warnings.map(fmtWarning) }
}

export function fmtWarning(w: SongWarning): string {
  return w.bar ? `Bar ${w.bar}${w.hand ? ` (${w.hand === 'R' ? 'right' : 'left'} hand)` : ''}: ${w.message.replace(/^Bar \d+ /, '')}` : w.message
}

function spliceBars(bars: string[], at: number, remove: number, add: string[], fill: string): string[] {
  const out = [...bars]
  while (out.length < at) out.push(fill)
  out.splice(at, remove, ...add)
  return out
}

export const TOOLS: ToolDef[] = [
  {
    name: 'get_song',
    description: 'Read the song: its details and the note text of every bar for both hands, with any problems found. Bars are numbered from 1.',
    shape: {},
    run: (d) => {
      const e = evenHands(d)
      return {
        draft: d,
        result: {
          id: d.id,
          title: d.title,
          composer: d.composer,
          tempo: d.bpm,
          timeSignature: `${d.timeSig[0]}/${d.timeSig[1]}`,
          key: d.keySig,
          difficulty: d.difficulty,
          bars: e.right.map((r, i) => ({ bar: i + 1, right: r, left: e.left[i] })),
          warnings: summary(d).warnings,
        },
      }
    },
  },
  {
    name: 'set_song_info',
    description:
      'Change the song details: title (English and Vietnamese), composer, tempo in quarter-note beats per minute, time signature like "3/4", key like "G" or "Am", difficulty 1–3.',
    shape: {
      title: z.string().min(1).optional(),
      titleVi: z.string().min(1).optional().describe('Vietnamese title; defaults to the English one.'),
      composer: z.string().optional(),
      tempo: z.number().min(20).max(300).optional(),
      timeSignature: z
        .string()
        .regex(/^\d{1,2}\/(2|4|8|16)$/)
        .optional(),
      key: z
        .string()
        .regex(/^[A-G](#|b)?m?$/)
        .optional(),
      difficulty: z.union([z.literal(1), z.literal(2), z.literal(3)]).optional(),
    },
    run: (d, a) => {
      const ts = typeof a.timeSignature === 'string' ? (a.timeSignature.split('/').map(Number) as [number, number]) : d.timeSig
      const title =
        typeof a.title === 'string'
          ? { en: a.title, vi: typeof a.titleVi === 'string' ? a.titleVi : a.title }
          : typeof a.titleVi === 'string'
            ? { ...d.title, vi: a.titleVi }
            : d.title
      const next: Draft = {
        ...d,
        title,
        composer: typeof a.composer === 'string' ? a.composer : d.composer,
        bpm: typeof a.tempo === 'number' ? Math.round(a.tempo) : d.bpm,
        timeSig: ts,
        keySig: typeof a.key === 'string' ? a.key : d.keySig,
        difficulty: (a.difficulty as Draft['difficulty']) ?? d.difficulty,
      }
      return { draft: next, result: { ok: true, ...summary(next) } }
    },
  },
  {
    name: 'set_bars',
    description:
      'Write note text into bars starting at a bar number (from 1). Give right and/or left as note text for one or more bars, separated by "|" (see get_reference). mode "replace" (default) overwrites those bars; "insert" adds new bars before that bar, filling the other hand with rests. Writing past the end adds bars.',
    shape: {
      bar: z.number().int().min(1),
      right: z.string().optional(),
      left: z.string().optional(),
      mode: z.enum(['replace', 'insert']).optional(),
    },
    run: (d, a) => {
      const at = (a.bar as number) - 1
      const fill = restBar(d.timeSig)
      const r = typeof a.right === 'string' ? splitBars(a.right) : null
      const l = typeof a.left === 'string' ? splitBars(a.left) : null
      if (!r && !l) throw new Error('Give right, left or both.')
      let { right, left } = evenHands(d)
      if (a.mode === 'insert') {
        const n = Math.max(r?.length ?? 0, l?.length ?? 0)
        const pad = (bars: string[] | null) => [...(bars ?? []), ...Array.from({ length: n - (bars?.length ?? 0) }, () => fill)]
        right = spliceBars(right, at, 0, pad(r), fill)
        left = spliceBars(left, at, 0, pad(l), fill)
      } else {
        if (r) right = spliceBars(right, at, r.length, r, fill)
        if (l) left = spliceBars(left, at, l.length, l, fill)
      }
      const next = evenHands({ ...d, right, left })
      const written = Math.max(r?.length ?? 0, l?.length ?? 0)
      return { draft: next, result: { wrote: `bars ${at + 1}–${at + written}`, ...summary(next) } }
    },
  },
  {
    name: 'delete_bars',
    description: 'Delete bars from both hands, from bar "from" to bar "to" (inclusive, numbered from 1).',
    shape: { from: z.number().int().min(1), to: z.number().int().min(1) },
    run: (d, a) => {
      const from = (a.from as number) - 1
      const to = a.to as number
      if (to <= from) throw new Error('"to" must be at or after "from".')
      const e = evenHands(d)
      const cut = (bars: string[]) => bars.filter((_, i) => i < from || i >= to)
      const next = evenHands({ ...d, right: cut(e.right), left: cut(e.left) })
      return { draft: next, result: { deleted: `bars ${from + 1}–${to}`, ...summary(next) } }
    },
  },
  {
    name: 'transpose',
    description: 'Move every note up or down by a number of semitones (12 = an octave), in one or both hands.',
    shape: { semitones: z.number().int().min(-36).max(36), hands: handsArg },
    run: (d, a) => {
      const { song } = draftToSong(d)
      const which: Hand[] = a.hands === 'R' ? ['R'] : a.hands === 'L' ? ['L'] : ['R', 'L']
      for (const h of which) song.hands[h] = { ...song.hands[h], notes: song.hands[h].notes.map((n) => ({ ...n, midi: n.midi + (a.semitones as number) })) }
      const next = { ...songToDraft(song), id: d.id }
      return { draft: next, result: { ok: true, ...summary(next) } }
    },
  },
  {
    name: 'check_song',
    description: 'Check the song: bars that do not add up to the time signature, notes off the piano, chords one hand cannot reach, empty songs. Returns the problems by bar.',
    shape: {},
    run: (d) => ({ draft: d, result: summary(d) }),
  },
  {
    name: 'get_reference',
    description: 'How to write songs: the note text, hands, chords, ties, rests, fingering, and the steps for transcribing sheet music from an image.',
    shape: {},
    run: (d) => ({ draft: d, result: REFERENCE }),
  },
]

export const TOOL_NAMES = TOOLS.map((t) => t.name)

export function runTool(draft: Draft, name: string, args: unknown): { draft: Draft; result: unknown } {
  const tool = TOOLS.find((t) => t.name === name)
  if (!tool) throw new Error(`Unknown tool "${name}". Tools: ${TOOL_NAMES.join(', ')}.`)
  const parsed = z.object(tool.shape).safeParse(args ?? {})
  if (!parsed.success) throw new Error(`${name}: ${parsed.error.issues.map((i) => `${i.path.join('.') || 'arguments'}: ${i.message}`).join('; ')}`)
  return tool.run(draft, parsed.data as Record<string, unknown>)
}

/** Changes whenever a tool is added or reworded, so server and app can tell they come from different builds. */
export function toolsFingerprint(extra: string[] = []): string {
  const text = [...TOOLS.map((t) => `${t.name}:${t.description}`), ...extra].join('\n')
  let h = 5381
  for (let i = 0; i < text.length; i++) h = ((h << 5) + h + text.charCodeAt(i)) >>> 0
  return h.toString(16)
}
